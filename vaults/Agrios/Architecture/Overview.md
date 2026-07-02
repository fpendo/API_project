---
title: Overview
type: architecture
project: Agrios
updated: 2026-07-02
---

# Overview

Part of [[Home]].

## Vision

Turn an entire farm into **living intelligence**. Every signal — weather, soil, cattle, genetics, lab results, invoices, the farmer's own observations — flows into one Obsidian vault. An LLM overlay reasons across all of it. The goal is explicitly commercial: **improve profitability and reduce operating costs**.

Landing-page tagline: *"One vault, every signal — real intelligence."*

## The farm — Gupworthy Farm

- **Location:** Exmoor, UK
- **Size:** ~500 acres
- **Enterprise:** beef (South Devon herd, some Aberdeen Angus crosses)
- **Herd baseline for modelling:** 50 head (reduced from an initial 250 to keep costs realistic)
- Split into **4 quadrants (~125 acres each)**, each with **4 management cells** (~31 ac / 12.5 ha) = **16 cells** total — see [[Cattle & Fields]]

## The two data engines

1. **Research swarm** — builds the *general* knowledge base (the science of beef farming). See [[Knowledge Vault & Research Swarm]].
2. **Sensor mesh** — streams *this farm's* live data. See [[Connectivity & Sensors]].

Both write into the same Obsidian vault, which is the permanent base layer the LLM reasons from.

## Intelligence overlay

The farmer interacts by **voice via Telegram** (Whisper STT) — asking questions, logging observations, photographing invoices. The assistant answers from the vault with cited sources, creates calendar tasks, and can draft/send emails (e.g. to the vet). See [[Voice Interface]].
