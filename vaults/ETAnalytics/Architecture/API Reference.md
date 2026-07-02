---
title: API Reference
type: architecture
project: ETAnalytics
updated: 2026-07-02
---

# API Reference

Part of [[Home]]. See [[Tech Stack & Dual Backend]].

## Legacy `server.py` — primary analysis API

- **Storage:** in-memory dicts (`registers`, `analyses`, `applications`, `documents`)
- **Auth:** session cookies (`eta_session`), hardcoded `AUTH_USERS`
- **Port:** 8001 (prod), 8000 (dev proxy target)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/auth/login` | Session login |
| GET | `/auth/verify` | Session check |
| POST | `/auth/logout` | Clear session |
| GET | `/auth/users` | Demo credentials list |
| POST | `/api/registers/upload` | Upload matrix CSV |
| GET | `/api/registers` | List registers |
| GET | `/api/registers/{id}` | Register detail |
| GET | `/api/registers/{id}/etf/{isin}` | Per-ETF entries |
| POST | `/api/registers/{id}/analyze` | Run entity matching analysis |
| POST | `/api/registers/{id}/disclosure/{entry_id}` | Mark disclosure sent |
| GET/POST | `/api/entities` | Entity database CRUD |
| GET/POST | `/api/nav/*` | NAV mappings, current, history, bulk, search |
| POST/GET/PATCH | `/api/applications/*` | Onboarding pipeline |
| POST/GET | `/api/applications/{id}/documents` | Document upload |
| GET | `/api/templates/permission-letter` | Disclosure letter template |

### Share register CSV format

```csv
Account Name, Account Number, IE00B4L5Y983, IE00B5BMR087, ...
EUROCLEAR BANK, EU001, 45000000, 28000000, ...
```

### Analysis percentage logic (correct in backend)

```python
identified_percentage = shares where confidence == 100 / total_shares * 100
discovered_percentage = shares where entity_type != 'unknown' / total_shares * 100
```

See [[Percentage Bug]] for how the frontend diverges from this.

## New modular `app/` — PostgreSQL API

- **Framework:** FastAPI, async SQLAlchemy, Alembic, slowapi rate limiting
- **Auth:** JWT (access + refresh), bcrypt
- **Port:** 8001 via `uvicorn app.main:app`

**Endpoints (currently limited):**
- `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me`, `/auth/verify`
- `/api/applications` — full onboarding CRUD + documents + pipeline stats
- `/`, `/health`

**Models:** `users`, `sessions`, `applications`, `documents`, `registers`, `register_entries`, `register_holdings`, `entities`, `etf_products`, `nav_history`
**Services:** `auth_service.py`, `email_service.py` (Mailgun/SMTP), `contract_generator.py`
**Seed:** `backend/scripts/seed_data.py`
