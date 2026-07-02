---
title: Voice Interface
type: feature
project: Agrios
source: assets/js/data.js (chatData)
updated: 2026-07-02
---

# Voice Interface

Part of [[Home]]. The farmer's primary way to interact with the vault. Shares the [[Jarvis]] assistant stack (Telegram + Whisper + LLM + TTS).

## How the farmer uses it

All reporting happens through **Telegram voice notes** out in the field:

- **Ask questions** — *"What's the optimum soil pH for a South Devon herd on our wetter fields?"* → answered from the vault with cited sources ("3 vault sources"), referencing this farm's own data (e.g. "Quadrant C cells are currently pH 5.5 — a target lime payload is queued").
- **Log observations** — *"Seen cow 123, injury to rear-left leg. Contact the vet."* → logs a health note against tag 123, adds a calendar task, drafts an email to the vet, and (on confirmation) sends it and files it under Herd › Health › Tag 123.
- **Capture paperwork** — photograph invoices/lab letters in Telegram; content is parsed and stored in the vault.

## Example exchange (from the demo)

> 🎙️ *"Seen cow 123, injury to rear-left leg. Contact the vet."*
> 🤖 Logged a health note against tag 123 (lameness, rear-left). 📅 Task added for tomorrow AM. ✉️ Draft email to Exmoor Vets ready — send it?
> 🎙️ *"Send it."*
> 🤖 ✅ Sent to Exmoor Vets and saved to the vault under Herd › Health › Tag 123.

## AR glasses (future)

First-person AR overlay in the field: an arrow points to a specific animal with a prompt ("check cow X1Z"), surfacing that animal's vault record hands-free. See [[Connectivity & Sensors]].
