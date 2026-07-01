"""Tool definitions (LLM-facing schemas) and their execution against connectors."""

from __future__ import annotations

import json
from dataclasses import asdict

from assistant.connectors import calendar as cal
from assistant.connectors import drive
from assistant.connectors import gmail
from assistant.connectors import tasks as gtasks
from assistant.connectors import vault as vault_conn
from assistant.connectors import web
from assistant.connectors.google_errors import format_google_api_error
from assistant.core.config import Config

TOOL_SCHEMAS: list[dict] = [
    {
        "type": "function",
        "function": {
            "name": "search_email",
            "description": (
                "Search the user's Gmail and return lightweight summaries "
                "(sender, subject, date, snippet, id). Use Gmail search syntax, "
                "e.g. 'guitar lessons', 'from:john subject:invoice newer_than:30d'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Gmail search query."},
                    "max_results": {
                        "type": "integer",
                        "description": "Max messages to return (1-20).",
                        "default": 5,
                    },
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_email",
            "description": (
                "Fetch the full content (body + headers) of a single email by id. "
                "Call this after search_email when you need the full message, e.g. "
                "to find payment/account details."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "message_id": {"type": "string"},
                },
                "required": ["message_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_calendar_events",
            "description": "List upcoming calendar events between two RFC3339 times.",
            "parameters": {
                "type": "object",
                "properties": {
                    "time_min": {
                        "type": "string",
                        "description": "RFC3339 start, e.g. 2026-06-24T00:00:00Z. Defaults to now.",
                    },
                    "time_max": {
                        "type": "string",
                        "description": "RFC3339 end, optional.",
                    },
                    "max_results": {"type": "integer", "default": 10},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_calendar_event",
            "description": "Create a calendar event. Confirm details with the user first.",
            "parameters": {
                "type": "object",
                "properties": {
                    "summary": {"type": "string"},
                    "start": {"type": "string", "description": "RFC3339 datetime."},
                    "end": {"type": "string", "description": "RFC3339 datetime."},
                    "description": {"type": "string", "default": ""},
                    "location": {"type": "string", "default": ""},
                    "attendees": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Attendee email addresses.",
                    },
                },
                "required": ["summary", "start", "end"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_drive",
            "description": (
                "Search Google Drive (Docs, Sheets, PDFs, folders). Use Drive query "
                "syntax, e.g. \"name contains 'school'\", "
                "\"mimeType = 'application/pdf'\", "
                "\"'root' in parents\" for top-level files."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Drive search query."},
                    "max_results": {"type": "integer", "default": 20},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_drive_folder",
            "description": (
                "List files inside a Drive folder. Use folder_id='root' for the "
                "top level of My Drive."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "folder_id": {
                        "type": "string",
                        "description": "Drive folder id, or 'root'.",
                        "default": "root",
                    },
                    "max_results": {"type": "integer", "default": 30},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_drive_file",
            "description": "Get metadata for a single Drive file by id.",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_id": {"type": "string"},
                },
                "required": ["file_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_email_attachments",
            "description": (
                "List attachments on a Gmail message (filename, type, size). "
                "Use after search_email when the user wants to file documents "
                "from an email. Does not download or move files yet."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "message_id": {"type": "string"},
                },
                "required": ["message_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_task_lists",
            "description": "List the user's Google Tasks lists (My Tasks and any custom lists).",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_tasks",
            "description": (
                "List tasks from Google Tasks. Use task_list_id '@default' for the "
                "main My Tasks list unless the user specifies another list."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "task_list_id": {
                        "type": "string",
                        "description": "Task list id, or '@default'.",
                        "default": "@default",
                    },
                    "show_completed": {
                        "type": "boolean",
                        "description": "Include completed tasks.",
                        "default": False,
                    },
                    "max_results": {"type": "integer", "default": 50},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_task",
            "description": (
                "Add a task to Google Tasks. Due dates are day-level (YYYY-MM-DD or "
                "RFC3339). For a specific time, also offer a calendar event if needed."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "notes": {"type": "string", "default": ""},
                    "due": {
                        "type": "string",
                        "description": "Due date ISO (YYYY-MM-DD) or RFC3339, optional.",
                    },
                    "task_list_id": {
                        "type": "string",
                        "default": "@default",
                    },
                },
                "required": ["title"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_task",
            "description": (
                "Update a Google Task: change title/notes/due date, or mark "
                "completed/reopen. Requires task_id from list_tasks."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {"type": "string"},
                    "task_list_id": {"type": "string", "default": "@default"},
                    "title": {"type": "string"},
                    "notes": {"type": "string"},
                    "due": {"type": "string"},
                    "completed": {
                        "type": "boolean",
                        "description": "True to mark done, false to reopen.",
                    },
                },
                "required": ["task_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_task",
            "description": "Permanently delete a Google Task.",
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {"type": "string"},
                    "task_list_id": {"type": "string", "default": "@default"},
                },
                "required": ["task_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": (
                "Search the web for current information (news, facts, opening hours, "
                "prices, weather, etc.). Returns a list of {title, url, snippet}. "
                "Follow up with fetch_web_page to read a result in full if needed."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query."},
                    "max_results": {"type": "integer", "default": 5},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "fetch_web_page",
            "description": (
                "Fetch a single web page by URL and return its readable text. "
                "Use after web_search, or when the user gives you a link."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {"type": "string"},
                },
                "required": ["url"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "vault_file_document",
            "description": (
                "File a document the user just photographed/sent into their "
                "Obsidian vault. Use this after reading a document image when the "
                "user wants to keep/file/store it (utility bill, certificate, "
                "statement, letter, receipt, etc.). The image is already saved at "
                "the inbox_path given to you in the message; this tool moves it "
                "into the right category and writes a linked note. Pick the best "
                "category from: Utility Bills, Certificates, Financial, Medical, "
                "Property & Home, Insurance, Vehicle, Education, Identity, "
                "Receipts, Inbox (or a sensible new one). Give a clear title like "
                "'British Gas electricity bill - May 2026'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "inbox_path": {
                        "type": "string",
                        "description": "The inbox file path provided to you in the message.",
                    },
                    "category": {"type": "string", "description": "Vault category folder."},
                    "title": {"type": "string", "description": "Human-readable note title."},
                    "summary": {
                        "type": "string",
                        "description": "1-3 sentence summary of what the document is.",
                        "default": "",
                    },
                    "date": {
                        "type": "string",
                        "description": "Document date YYYY-MM-DD if known.",
                    },
                    "tags": {"type": "array", "items": {"type": "string"}},
                    "fields": {
                        "type": "object",
                        "description": (
                            "Key details extracted from the document, e.g. "
                            "{'Provider':'British Gas','Amount':'£84.20','Account':'1234'}."
                        ),
                    },
                },
                "required": ["inbox_path", "category", "title"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "save_email_attachment_to_vault",
            "description": (
                "Download an attachment from a Gmail message and file it directly "
                "into the Obsidian vault in one step. Use this to 'pull documents "
                "from my email' into the vault. First use search_email and "
                "list_email_attachments to find the message_id, attachment_id and "
                "filename, then call this. Choose a category (Utility Bills, "
                "Certificates, Financial, Medical, Property & Home, Insurance, "
                "Vehicle, Education, Identity, Receipts, Inbox), a clear title, and "
                "a short summary based on the email's sender/subject."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "message_id": {"type": "string"},
                    "attachment_id": {"type": "string"},
                    "filename": {"type": "string", "description": "Attachment filename."},
                    "category": {"type": "string"},
                    "title": {"type": "string"},
                    "summary": {"type": "string", "default": ""},
                    "date": {"type": "string", "description": "Document date YYYY-MM-DD if known."},
                    "tags": {"type": "array", "items": {"type": "string"}},
                    "fields": {"type": "object"},
                },
                "required": ["message_id", "attachment_id", "filename", "category", "title"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "vault_save_note",
            "description": (
                "Save a plain text note/fact into the Obsidian vault (no document "
                "image). Use when the user dictates information to store, e.g. "
                "'save my passport number is 123', 'note the boiler service is "
                "annual in October'. Choose a fitting category."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {"type": "string"},
                    "title": {"type": "string"},
                    "content": {"type": "string", "description": "Markdown body of the note."},
                    "tags": {"type": "array", "items": {"type": "string"}},
                    "date": {"type": "string", "description": "YYYY-MM-DD, optional."},
                },
                "required": ["category", "title", "content"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "vault_search",
            "description": (
                "Search the personal Obsidian vault (filed documents and notes) "
                "by keyword. Returns matching notes INCLUDING their full text "
                "content, so you can answer directly from the result without a "
                "separate vault_read_note call (only call vault_read_note if a "
                "result is marked truncated). Use for questions like 'find my "
                "last water bill' or 'what's my NI number'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "max_results": {"type": "integer", "default": 20},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "vault_read_note",
            "description": "Read a full note from the vault by its path (from vault_search).",
            "parameters": {
                "type": "object",
                "properties": {"path": {"type": "string"}},
                "required": ["path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "browse_web",
            "description": (
                "Browse a website with a real browser to do things simple page "
                "fetching cannot: log into portals, navigate multi-step sites, "
                "extract content behind logins (e.g. the school portal "
                "newsletter). Runs in the background — it immediately returns "
                "'started' and the full result is sent to the user as a "
                "follow-up Telegram message a minute or two later. If Jarvis "
                "has done this task before it replays a saved skill (fast); "
                "otherwise an AI browsing agent learns the site and saves the "
                "skill for next time. It may message the user mid-task if it "
                "needs a captcha/code. Use fetch_web_page instead for simple "
                "public pages."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "task": {
                        "type": "string",
                        "description": (
                            "Full task in plain English, e.g. 'Log into the "
                            "school portal and summarise the latest pre-prep "
                            "newsletter'. Include what to extract/return."
                        ),
                    },
                    "site": {
                        "type": "string",
                        "description": (
                            "The website domain or URL to use, e.g. "
                            "'kingshalltaunton.myschoolportal.co.uk'. Use "
                            "list_web_skills / stored knowledge to pick the "
                            "right site; leave empty only if unknown."
                        ),
                        "default": "",
                    },
                },
                "required": ["task"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_web_skills",
            "description": (
                "List the website skills Jarvis has already learned (site, "
                "task, last success). Use to check what browse_web can replay "
                "quickly, or when the user asks what Jarvis knows how to do "
                "on the web."
            ),
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "vault_list",
            "description": (
                "List vault categories, or notes within a category if given. "
                "Use to see what's stored."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {"type": "string", "description": "Optional category folder."},
                },
                "required": [],
            },
        },
    },
]


def execute_tool(config: Config, user_id: int, name: str, args: dict) -> str:
    """Execute a tool call and return a JSON string result for the LLM."""
    try:
        if name == "search_email":
            results = gmail.search_email(
                config, user_id, args["query"], args.get("max_results", 5)
            )
            return json.dumps([asdict(r) for r in results])

        if name == "get_email":
            return json.dumps(gmail.get_email(config, user_id, args["message_id"]))

        if name == "list_calendar_events":
            return json.dumps(
                cal.list_events(
                    config,
                    user_id,
                    args.get("time_min"),
                    args.get("time_max"),
                    args.get("max_results", 10),
                )
            )

        if name == "create_calendar_event":
            return json.dumps(
                cal.create_event(
                    config,
                    user_id,
                    summary=args["summary"],
                    start=args["start"],
                    end=args["end"],
                    description=args.get("description", ""),
                    location=args.get("location", ""),
                    attendees=args.get("attendees"),
                )
            )

        if name == "search_drive":
            return json.dumps(
                drive.search_drive(
                    config, user_id, args["query"], args.get("max_results", 20)
                )
            )

        if name == "list_drive_folder":
            return json.dumps(
                drive.list_folder(
                    config,
                    user_id,
                    args.get("folder_id", "root"),
                    args.get("max_results", 30),
                )
            )

        if name == "get_drive_file":
            return json.dumps(drive.get_file(config, user_id, args["file_id"]))

        if name == "list_email_attachments":
            return json.dumps(
                gmail.list_email_attachments(config, user_id, args["message_id"])
            )

        if name == "list_task_lists":
            return json.dumps(gtasks.list_task_lists(config, user_id))

        if name == "list_tasks":
            return json.dumps(
                gtasks.list_tasks(
                    config,
                    user_id,
                    args.get("task_list_id", "@default"),
                    args.get("show_completed", False),
                    args.get("max_results", 50),
                )
            )

        if name == "create_task":
            return json.dumps(
                gtasks.create_task(
                    config,
                    user_id,
                    title=args["title"],
                    task_list_id=args.get("task_list_id", "@default"),
                    notes=args.get("notes", ""),
                    due=args.get("due"),
                )
            )

        if name == "update_task":
            return json.dumps(
                gtasks.update_task(
                    config,
                    user_id,
                    task_id=args["task_id"],
                    task_list_id=args.get("task_list_id", "@default"),
                    title=args.get("title"),
                    notes=args.get("notes"),
                    due=args.get("due"),
                    completed=args.get("completed"),
                )
            )

        if name == "delete_task":
            return json.dumps(
                gtasks.delete_task(
                    config,
                    user_id,
                    task_id=args["task_id"],
                    task_list_id=args.get("task_list_id", "@default"),
                )
            )

        if name == "web_search":
            return json.dumps(
                web.web_search(args["query"], args.get("max_results", 5))
            )

        if name == "fetch_web_page":
            return json.dumps(web.fetch_url(args["url"]))

        if name == "vault_file_document":
            return json.dumps(
                vault_conn.file_document(
                    config,
                    inbox_path=args["inbox_path"],
                    category=args["category"],
                    title=args["title"],
                    summary=args.get("summary", ""),
                    tags=args.get("tags"),
                    date=args.get("date"),
                    fields=args.get("fields"),
                )
            )

        if name == "save_email_attachment_to_vault":
            inbox_path = gmail.download_attachment(
                config,
                user_id,
                message_id=args["message_id"],
                attachment_id=args["attachment_id"],
                filename=args["filename"],
            )
            return json.dumps(
                vault_conn.file_document(
                    config,
                    inbox_path=inbox_path,
                    category=args["category"],
                    title=args["title"],
                    summary=args.get("summary", ""),
                    tags=args.get("tags"),
                    date=args.get("date"),
                    fields=args.get("fields"),
                )
            )

        if name == "vault_save_note":
            return json.dumps(
                vault_conn.save_note(
                    config,
                    category=args["category"],
                    title=args["title"],
                    content=args["content"],
                    tags=args.get("tags"),
                    date=args.get("date"),
                )
            )

        if name == "vault_search":
            return json.dumps(
                vault_conn.search(config, args["query"], args.get("max_results", 20))
            )

        if name == "vault_read_note":
            return json.dumps(vault_conn.read_note(config, args["path"]))

        if name == "browse_web":
            from assistant.browsing import runtime as browse_runtime

            task = args["task"]
            site = args.get("site", "")
            if not browse_runtime.is_ready():
                return json.dumps(
                    {
                        "error": (
                            "Browsing runtime is not available (Telegram bot "
                            "not running). Try again shortly."
                        )
                    }
                )
            browse_runtime.schedule_browse(config, task, site, user_id)
            return json.dumps(
                {
                    "status": "started",
                    "note": (
                        "Browse running in the background. The result will be "
                        "sent to the user as a follow-up Telegram message. "
                        "Tell the user you're on it and that the answer is "
                        "coming shortly — do NOT invent a result."
                    ),
                }
            )

        if name == "list_web_skills":
            from assistant.browsing import skills as skills_mod

            return json.dumps(skills_mod.list_skills(config))

        if name == "vault_list":
            return json.dumps(vault_conn.list_vault(config, args.get("category")))

        return json.dumps({"error": f"Unknown tool: {name}"})
    except Exception as exc:  # surface errors back to the model gracefully
        return json.dumps({"error": format_google_api_error(exc)})
