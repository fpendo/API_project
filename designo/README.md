# Designo — Motion Website Generator

A portal app (`https://nemx.co.uk/designo/`) that turns a questionnaire and tagged photos
into a scroll-driven cinematic website, in the style of Higgsfield's Motion Website
Generator — but generation is done by Claude with a code-driven motion recipe
(GSAP + ScrollTrigger + Lenis, film grain, particles, vignette, glass cards,
colour tints, scroll pacing), plus an optional paid AI hero video via fal.ai.

## Flow

1. **Landing** → "Create Website"
2. **Questionnaire wizard** (5 steps): business, voice & look, structure & content, contact, style & motion
3. **Photo studio**: drag-drop upload, per-photo tag (hero/product/team/gallery/background/texture/logo) + caption
4. **Generate**: Claude builds a self-contained single-file site; live iframe preview; iterate by chatting ("make the hero darker"); download as zip
5. Optional: animate a photo into a hero video clip (fal.ai), then regenerate to feature it

## Layout

- `backend/` — FastAPI + SQLite on `127.0.0.1:8620` (systemd `designo-backend`)
  - `app/skill.py` — the "motion website" system prompt (the quality lever)
  - `app/generator.py` — Claude streaming pipeline (background thread, status polling)
  - `app/video.py` — fal.ai queue API (hidden until `FAL_KEY` set)
  - `app/storage.py` — ringfenced per-project storage with path-traversal guards
- `frontend/` — React + TS + Vite + Tailwind + Framer Motion, `base: '/designo/'`
- `storage/projects/<id>/{photos,videos,site}` — ringfenced per-project files + `storage/designo.db`

## Setup

```bash
cd backend
python3 -m venv venv && ./venv/bin/pip install -r requirements.txt
cp env.template .env   # set ANTHROPIC_API_KEY (required), FAL_KEY (optional)

cd ../frontend
npm install && npm run build
sudo cp -r dist/* /var/www/designo/ && sudo chown -R www-data:www-data /var/www/designo
```

Dev: `uvicorn app.main:app --port 8620 --reload` + `npm run dev` (port 3020, proxies `/designo/api`).

## AI video pricing (fal.ai, July 2026)

- **draft** — Hailuo 02 Standard, ~$0.045/sec → 6s clip ≈ $0.27
- **final** — Kling standard (audio off), ~$0.07–0.08/sec → 6s clip ≈ $0.50

Model IDs are overridable via `DESIGNO_VIDEO_MODEL_DRAFT` / `DESIGNO_VIDEO_MODEL_FINAL`
in `.env` — verify against fal.ai's current catalogue on first use.
