---
title: Generation Pipeline
type: architecture
project: Designo
updated: 2026-07-06
---

# Generation Pipeline

Part of [[Home]]. See [[Overview]], [[Backend]], [[Known Bugs & Fixes]].

## Two-stage Fable pipeline

Model: `claude-fable-5` (env `DESIGNO_LLM_MODEL`). Orchestrated by `generator.py`, prompts in `skill.py`.

1. **Stage 1 — Creative Director** (`_develop_concept`): reads the brief + photo manifest, returns JSON: a named creative concept, section-by-section treatment, motion language, palette, typography, and (when there are no client photos) **6–10 AI artwork commissions** with detailed prompts. `max_tokens=16000` — see [[Known Bugs & Fixes]] for why.
2. **Stage 2 — Motion Website Builder**: takes the concept + assets and writes the single-file `index.html`. Fixed recipe: GSAP + ScrollTrigger + Lenis via CDN, six signature effects (film grain, particles, vignette, glass cards, colour tints, scroll pacing), Ken Burns on tagged photos, reduced-motion fallback.

Iterations (`_run_iteration`) feed the current HTML back with the change request — used for chat-driven tweaks and the "Add to website" video button.

## Supporting subsystems

- **AI artwork** (`artwork.py`): commissions rendered via Pollinations.ai, up to 10 per project. Zero-photo projects get one artwork tagged `hero` — this is how lead mockups and the dogfooded landing page work with no client photos at all.
- **Hero video** (`video.py`): optional paid fal.ai generation (Hailuo 02 draft ≈$0.27/6s, Kling final ≈$0.50/6s). Source images centre-cropped/downscaled to 2048px to satisfy aspect-ratio limits.
- **Photo retouch/splice** (`retouch.py`): Claude vision writes edit instructions → `fal-ai/nano-banana/edit` executes. Concurrency-limited semaphore + retries on 403/429/5xx.
- **Shadow site** (`shadow.py`): Fable generates `llms.txt`, `agent.json`, `agent.html` and Schema.org JSON-LD per site; `inject()` puts JSON-LD + `<link rel=alternate>` into the `<head>`. This is the ASO layer — see [[SEO + ASO Report]] and [[Agent Economy Positioning]].
- **JSON robustness** (`generator.call_claude_json`): 3 attempts, repair pass (unescaped newlines/tabs, trailing commas), failed raw output dumped to `/tmp/designo_bad_json_*.txt`.

## Output contract

Everything lands in `storage/projects/<id>/site/`: `index.html` (self-contained), optimised copies of photos, videos, plus the four shadow files. `write_site` optimises images (downscale + recompress) on the way in.
