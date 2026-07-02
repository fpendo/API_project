---
title: Agent & Tools
type: architecture
project: Jarvis
updated: 2026-07-02
---

# Agent & Tools

Part of [[Home]]. Location: `assistant/agent/`, `assistant/connectors/`.

## LLM

- Provider-agnostic via **litellm** (`agent/llm.py`) — supports OpenAI, Anthropic, Gemini
- **Chat model:** Claude Haiku (fast, cheap) — `LLM_MODEL`
- **Browsing model:** Claude Sonnet — `LLM_BROWSE_MODEL` (see [[Self-Learning Web Browsing]])
- Reasoning loop in `agent/agent.py` with a system prompt containing strong **honesty guardrails** (never fabricate, hallucinate, or pretend; admit uncertainty; correct errors)

## Tools (`agent/tools.py`)

| Tool | Purpose |
|------|---------|
| `search_email` / `get_email` | Search Gmail, fetch full message |
| `list_email_attachments` / `save_email_attachment_to_vault` | Attachments → vault |
| `list_calendar_events` / `create_calendar_event` | Calendar read/create |
| `search_drive` / `list_drive_folder` / `get_drive_file` | Drive (read-only) |
| `list_task_lists` / `list_tasks` / `create_task` / `update_task` / `delete_task` | Google Tasks |
| `web_search` / `fetch_web_page` | DuckDuckGo search + page text |
| `vault_file_document` / `vault_save_note` | File a photo/note into the vault |
| `vault_search` / `vault_read_note` / `vault_list` | Search personal vault |
| `browse_web` / `list_web_skills` | Agentic browsing (background) — see [[Self-Learning Web Browsing]] |

## Connectors

- **Google** (`connectors/google_auth.py`) — OAuth per user; tokens in `data/<user_id>/`. Google Cloud project must be in **Production** status to avoid refresh-token expiry.
- **Vault** (`connectors/vault.py`) — keyword search returns full note content (capped ~2000 chars) so the LLM answers directly.
- **Web** (`connectors/web.py`) — DuckDuckGo + BeautifulSoup text extraction.
- **School portal** (`connectors/school_portal.py`) — hand-written Playwright scraper; superseded by learned browsing skills.
