---
title: Vault Filing
type: feature
project: Jarvis
updated: 2026-07-02
---

# Vault Filing

Part of [[Home]]. See [[Agent & Tools]].

## What it does

Send Jarvis a **photo of a document** (or dictate a fact) and it files it into the **personal** Obsidian vault at `/opt/app/Jarvis/vault/` — no manual foldering needed. Jarvis reads the document, picks a category, saves the image under that category's `attachments/`, and writes a linked Markdown note.

## Categories

Utility Bills, Certificates, Financial, Medical, Property & Home, Insurance, Vehicle, Education, Identity, Receipts, Inbox (or a sensible new one).

## Tools

- `vault_file_document(inbox_path, category, title, summary, date, tags, fields)` — files a photographed document (image already saved to the user's inbox)
- `save_email_attachment_to_vault(...)` — downloads a Gmail attachment and files it in one step
- `vault_save_note(category, title, content, ...)` — stores a dictated fact (no image)

## No framework needed

The user does **not** need to design a filing framework in advance. Jarvis decides the category from the document content at filing time, and the honesty guardrails prevent it from inventing document details it can't read.

## Note format

Each note uses YAML frontmatter (`title`, `type`, etc.) and `[[wikilinks]]`, matching Obsidian conventions. The vault has a `Home.md` index listing categories.
