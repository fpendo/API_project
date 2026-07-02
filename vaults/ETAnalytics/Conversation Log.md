---
title: Conversation Log
type: log
project: ETAnalytics
updated: 2026-07-02
---

# Conversation Log

Part of [[Home]]. Cleaned-up summary of chat activity relating to ETAnalytics.

> Spelling/grammar tidied from the original messages; intent preserved.

## From [Is this working health check](21df899e-79a1-43d8-9fa3-b298cb4aff12)

ETAnalytics was included in a whole-VPS health check:

- **ETAnalytics backend (`:8001`)** — 200 (healthy)
- **`https://www.etanalytics.co.uk/`** — 200 (live)
- Note: the ETAnalytics Vite dev server was bound to `[::1]:3000` only, not reachable on the usual dev ports (expected in production; static build is served by nginx). See [[Tech Stack & Dual Backend]].

## Note

The known percentage-metric and frontend/backend issues in this vault (see [[Percentage Bug]] and [[Frontend-Backend Disconnect]]) were captured from the reference docs at `/opt/app` (`ETANALYTICS_FRONTEND_ISSUE.md`, `PERCENTAGE_*`), not from a dedicated chat in the reviewed transcripts. Add future ETAnalytics chats here.
