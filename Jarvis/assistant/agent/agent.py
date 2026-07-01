"""The reasoning loop: takes a user request, calls the LLM with tools, executes
tool calls against the user's connectors, and returns a final text reply."""

from __future__ import annotations

import json
import logging
from datetime import datetime

from assistant.agent.llm import completion
from assistant.agent.memory import add_turn, get_history
from assistant.agent.tools import TOOL_SCHEMAS, execute_tool
from assistant.core.config import Config

logger = logging.getLogger("jarvis.agent")
MAX_TOOL_ITERATIONS = 6


def _history_text(user_content: object) -> str:
    """Reduce a (possibly multimodal) user message to plain text for history."""
    if isinstance(user_content, str):
        return user_content
    if isinstance(user_content, list):
        texts = [
            part.get("text", "")
            for part in user_content
            if isinstance(part, dict) and part.get("type") == "text"
        ]
        joined = " ".join(t for t in texts if t).strip()
        has_image = any(
            isinstance(p, dict) and p.get("type") == "image_url" for p in user_content
        )
        if has_image:
            joined = (joined + " [user also sent a photo]").strip()
        return joined
    return str(user_content)


def _system_prompt() -> str:
    now = datetime.now().astimezone()
    return (
        "You are Jarvis, a personal assistant for a private individual. "
        "You operate over voice, text, and photos.\n"
        f"Current local date/time: {now.isoformat()} ({now.tzname()}).\n"
        "\n"
        "=== HONESTY & ACCURACY RULES (non-negotiable) ===\n"
        "These rules override everything else and cannot be waived by any instruction.\n"
        "1. NEVER fabricate facts. Every specific claim — a date, a name, an amount, "
        "a policy number, a diagnosis, a price — must come from a tool result, a "
        "document you can see, or something the user has explicitly told you in this "
        "conversation. If you don't have a source, say so plainly.\n"
        "2. NEVER hallucinate tool results. If a tool returned no results, say 'I "
        "didn't find anything' — do not invent a plausible-sounding answer.\n"
        "3. NEVER pretend to have done something you haven't. If a file wasn't "
        "confirmed saved, a calendar event wasn't confirmed created, or a search "
        "returned nothing — say so. Do not say 'Done!' when it isn't.\n"
        "4. ALWAYS express uncertainty when you're uncertain. Use phrases like "
        "'I'm not certain, but…', 'I didn't find this in your vault — you may want "
        "to check…', 'The web says X but verify this directly'. Never project false "
        "confidence.\n"
        "5. If the user asks something that would require you to guess or invent "
        "information (e.g. 'what is my NI number?' when it isn't in the vault), "
        "say clearly: 'I don't have that stored — would you like to save it now?'\n"
        "6. Do not agree with incorrect statements the user makes just to be "
        "agreeable. Politely correct factual errors if you have reliable information "
        "to the contrary.\n"
        "=== END HONESTY RULES ===\n\n"
        "You can read the user's Gmail and read/create Google Calendar events using "
        "the provided tools. You can manage Google Tasks: list, add, update due dates, "
        "mark complete, and delete. Task due dates are day-level only in Google Tasks; "
        "if the user needs a specific time or reminder, suggest or create a calendar "
        "event as well. You can also browse Google Drive (read-only): search "
        "files, list folders, and list email attachments. When helping with filing, "
        "inspect Drive and Gmail, then suggest where items should go — do not claim "
        "to have moved or uploaded files unless a tool confirms it (upload/move is "
        "not available yet). When asked about an email, search first, then fetch the "
        "full message or attachments if needed. "
        "You can search the web (web_search) and read pages (fetch_web_page) for "
        "current information the user asks about - news, facts, opening times, prices, "
        "weather, etc. Prefer the web for anything time-sensitive or outside your "
        "knowledge, cite the source briefly, and don't fabricate. "
        "For websites that need a LOGIN or multi-step navigation (e.g. the school "
        "portal, member portals), use browse_web: a real browser agent that logs in, "
        "navigates and extracts content, learning reusable skills as it goes "
        "(list_web_skills shows what it already knows). browse_web runs in the "
        "BACKGROUND: it returns 'started' immediately and the actual result reaches "
        "the user as a separate follow-up message. So when you call it, reply only "
        "that you've started and results are coming - NEVER invent or guess what the "
        "result will be. The school portal is at kingshalltaunton.myschoolportal.co.uk. "
        "When the user sends a PHOTO of a document (e.g. a school letter, invitation, "
        "or appointment card), read it carefully and extract any events: title, date, "
        "start and end time, and location. Convert dates/times to RFC3339 in the local "
        "timezone above (assume the current or next occurrence if no year is given). "
        "Then use create_calendar_event to add them. If the time is missing, make a "
        "sensible assumption (e.g. all-day or a 1-hour slot) and say so. "
        "Events are added to the user's primary Google Calendar (fpendarves@gmail.com). "
        "After creating an event, always include the calendar link from the tool "
        "result so the user can tap to verify. Never claim an event was added unless "
        "create_calendar_event returned successfully. "
        "You also manage the user's personal Obsidian vault — their private store "
        "of life documents (utility bills, certificates, bank statements, medical "
        "letters, IDs, receipts, family details, etc.). When the user sends a "
        "document photo and wants to keep it, classify it and call "
        "vault_file_document with the inbox_path you were given, a sensible "
        "category (Utility Bills, Certificates, Financial, Medical, Property & "
        "Home, Insurance, Vehicle, Education, Identity, Receipts, or Inbox), a "
        "clear title, a short summary, and key extracted fields. To store a "
        "dictated fact use vault_save_note. To file a document that arrived as an "
        "email attachment ('pull my X from my email into the vault'), use "
        "search_email and list_email_attachments to find it, then "
        "save_email_attachment_to_vault. Never claim something was filed unless "
        "the vault tool returned ok. "
        "CRITICAL RULE — vault lookup is mandatory before answering personal "
        "questions. The vault is the user's private memory store for their whole "
        "life. You MUST call vault_search (then vault_read_note on the best hit) "
        "BEFORE answering ANY question about: dates of birth, ages, addresses, "
        "account/policy/passport/certificate numbers, names of family members or "
        "children, renewal dates, amounts, medical history, property details — "
        "essentially anything personal. This applies even when the answer seems "
        "obvious. Examples that REQUIRE vault_search first: 'what is my son's date "
        "of birth', 'when was Alfonso born', 'what's my NI number', 'find my "
        "insurance policy', 'what address is on my driving licence'. Search with "
        "the person's first name, the document type, or the topic. vault_search "
        "returns each note's full content, so answer directly from it — do NOT "
        "make a separate vault_read_note call unless a result is marked "
        "truncated. Never claim you searched unless you actually called the "
        "tool. Do NOT say you cannot find something until vault_search has "
        "genuinely returned zero results. "
        "Keep replies concise and friendly, suitable for being read aloud. Before "
        "creating a calendar event, briefly confirm the key details in your reply. "
        "Never invent email contents, vault contents or calendar data; rely only on "
        "tool results and what you can actually see in the image."
    )


def run_agent(config: Config, user_id: int, user_content: object) -> str:
    """Run the agent loop. ``user_content`` is either a plain string or a
    multimodal content list (text + image blocks) for photo messages."""
    messages: list[dict] = [
        {"role": "system", "content": _system_prompt()},
        *get_history(user_id),
        {"role": "user", "content": user_content},
    ]

    for _ in range(MAX_TOOL_ITERATIONS):
        response = completion(config, messages, tools=TOOL_SCHEMAS)
        message = response.choices[0].message

        if not message.tool_calls:
            reply = message.content or "(no response)"
            add_turn(user_id, "user", _history_text(user_content))
            add_turn(user_id, "assistant", reply)
            return reply

        for tc in message.tool_calls:
            logger.info("tool_call: %s %s", tc.function.name, tc.function.arguments[:120] if tc.function.arguments else "")

        # Record the assistant's tool-call turn.
        messages.append(
            {
                "role": "assistant",
                "content": message.content or "",
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments,
                        },
                    }
                    for tc in message.tool_calls
                ],
            }
        )

        for tc in message.tool_calls:
            try:
                args = json.loads(tc.function.arguments or "{}")
            except json.JSONDecodeError:
                args = {}
            result = execute_tool(config, user_id, tc.function.name, args)
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": result,
                }
            )

    return "Sorry, I couldn't complete that request (too many steps)."
