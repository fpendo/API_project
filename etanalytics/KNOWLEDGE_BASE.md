# ETAnalytics Knowledge Base

**Last Updated:** 2026-01-18

## Project Overview

ETAnalytics is an ETF ownership analytics platform that helps ETF issuers understand who owns their products. The platform provides:

- **Share register analysis** - Upload and analyze share registers to identify beneficial owners
- **Entity matching** - Automatically match account names to known entities
- **Disclosure workflows** - Request disclosure from custodians to trace ownership chains
- **Reporting** - Generate comprehensive reports on ownership structure

## Architecture

### Backend (FastAPI + PostgreSQL)

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app entry
│   ├── config.py            # Environment config
│   ├── database.py          # DB connection
│   ├── models/
│   │   ├── user.py          # User, Session models
│   │   ├── application.py   # Application, Document models
│   │   ├── register.py      # Register, Entry, Holdings models
│   │   └── entity.py        # Entity, ETFProduct, NAVHistory models
│   ├── routers/
│   │   ├── auth.py          # Authentication endpoints
│   │   └── applications.py  # Application CRUD endpoints
│   ├── services/
│   │   └── auth_service.py  # Auth logic, JWT, password hashing
│   └── utils/
│       └── security.py      # Security utilities
├── alembic/                  # Database migrations
├── tests/                    # Pytest tests
└── requirements.txt
```

### Frontend (React + TypeScript)

```
src/
├── components/
│   ├── shared/
│   │   ├── DataTable.tsx    # Reusable table with sorting/filtering
│   │   ├── StatCard.tsx     # Metric card component
│   │   └── Modal.tsx        # Reusable modal component
│   ├── MobileNav.tsx        # Mobile navigation
│   └── OwnershipTree/       # Ownership chain visualization
├── pages/
│   ├── analysis/
│   │   ├── AnalysisQueue.tsx
│   │   └── AnalystSettings.tsx
│   ├── issuer/
│   │   └── IssuerSettings.tsx
│   ├── AnalysisDashboard.tsx
│   ├── IssuerDashboard.tsx
│   ├── LandingPage.tsx
│   ├── Login.tsx
│   ├── Signup.tsx
│   └── ClientServices.tsx
├── store/
│   ├── RegisterContext.tsx
│   ├── WorkflowContext.tsx
│   └── data.ts
├── types/
│   └── analysis.ts          # TypeScript types
└── __tests__/               # Vitest tests
```

## Database Schema

### Core Tables

- **users** - User accounts with roles (admin, analyst, issuer, client_services)
- **sessions** - JWT session management
- **applications** - Issuer onboarding applications
- **documents** - Uploaded documents for applications

### Analytics Tables

- **registers** - Uploaded share registers
- **register_entries** - Account entries in registers
- **register_holdings** - Per-ETF holdings for each entry
- **entities** - Known entity database for matching
- **etf_products** - ETF product metadata
- **nav_history** - Historical NAV data

## Key Flows

### 1. User Authentication

1. User submits email/password to `/auth/login`
2. Server validates credentials, creates JWT tokens
3. Access token stored in localStorage, refresh token for renewal
4. Protected routes check token via `Authorization: Bearer <token>` header

### 2. Application Onboarding

1. Issuer submits application via `/api/applications` POST
2. Application created with status "new" and access token
3. Admin can update status: new → contract_sent → contract_signed → docs_pending → payment_pending → active
4. Applicant can upload documents via access token
5. Once active, issuer account created

### 3. Register Analysis

1. Issuer uploads CSV share register via Issuer Portal
2. System parses entries and extracts account names
3. Entity matching runs against known entities database
4. Unmatched entries flagged for disclosure workflow
5. Analyst builds custody chain through disclosure requests
6. Report generated once analysis complete

## Entity Types

### Terminal Types (Investment Decision Makers)
- `wealth_manager` - Wealth management firms
- `platform` - Investment platforms (e.g., Hargreaves Lansdown)
- `private_bank` - Private banking institutions
- `asset_manager` - Asset management companies
- `pension_fund` - Pension funds
- `insurance` - Insurance companies
- `fund_of_funds` - Funds that invest in other funds

### Intermediary Types (Require Disclosure)
- `csd` - Central Securities Depositories (Euroclear, Clearstream)
- `global_custodian` - Global custodian banks
- `local_custodian` - Local/sub custodians
- `dedicated_nominee` - Dedicated nominee accounts
- `pooled_nominee` - Pooled/omnibus nominee accounts
- `market_maker` - Market makers

## API Endpoints

### Authentication (`/auth`)
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login, get tokens
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout, invalidate session
- `GET /auth/me` - Get current user info
- `GET /auth/verify` - Verify token validity

### Applications (`/api/applications`)
- `POST /api/applications` - Submit new application
- `GET /api/applications` - List applications (admin only)
- `GET /api/applications/pipeline/stats` - Get pipeline statistics
- `GET /api/applications/status/{token}` - Get application by access token
- `GET /api/applications/{id}` - Get application details
- `PATCH /api/applications/{id}` - Update application status
- `POST /api/applications/{id}/documents` - Upload document
- `GET /api/applications/{id}/documents` - List documents

## Configuration

### Environment Variables

```env
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/etanalytics
JWT_SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
```

### Running Locally

```bash
# Backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8001

# Frontend
cd ..
npm run dev
```

## Testing

### Backend Tests (pytest)
```bash
cd backend
PYTHONPATH=. pytest tests/ -v
```

### Frontend Tests (Vitest)
```bash
npm run test:run
```

## Common Issues

### Issue: Database connection errors
**Solution:** Ensure PostgreSQL is running and DATABASE_URL is correct.

### Issue: JWT token invalid
**Solution:** Check JWT_SECRET_KEY matches, token not expired.

### Issue: CORS errors
**Solution:** Add frontend URL to `cors_origins` in config.

### Issue: TypeScript errors on build
**Solution:** Run `npm run build` - warnings won't block dev server.

## Metrics & Terminology

- **Identified %** - Percentage of shares where investment decision maker is known (confidence=100)
- **Discovered %** - Percentage of shares where entity type is known (not 'unknown')
- **Terminal Entity** - End point of ownership chain, the investment decision maker
- **Nominee** - Account that holds shares on behalf of others, requires disclosure

## Recent Changes

### 2026-01-18 - Production Overhaul
- PostgreSQL database with SQLAlchemy ORM
- JWT authentication with bcrypt password hashing
- Modular backend structure (routers, models, services)
- Alembic database migrations
- Backend unit tests with pytest
- Frontend component tests with Vitest
- Shared UI components (DataTable, StatCard, Modal)
- Mobile polish (table overflow, modal sizing)



