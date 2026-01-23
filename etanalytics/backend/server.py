"""
Exchange Traded Analytics - Backend API Server
Handles matrix-format share registers (rows = nominees, columns = ETFs)
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, Response, Cookie, Request, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse, FileResponse
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import csv
import io
import uuid
import hashlib
import secrets
import os
import shutil
from pathlib import Path

# File upload directory
UPLOAD_DIR = Path("/opt/app/etanalytics/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Templates directory
TEMPLATES_DIR = Path("/opt/app/etanalytics/templates")
TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="Exchange Traded Analytics API",
    description="ETF Ownership Analytics Platform - Matrix Format",
    version="2.0.0"
)

# ========================================
# Authentication Configuration
# ========================================
AUTH_SECRET = secrets.token_hex(32)  # Session signing secret

# Portal users - email: {password, role, name}
AUTH_USERS = {
    # Issuer Portal users
    "issuer@etanalytics.co.uk": {"password": "Issuer123!", "role": "issuer", "name": "Issuer Admin"},
    "demo@issuer.com": {"password": "demo123", "role": "issuer", "name": "Demo Issuer"},
    # Analyst Portal users  
    "analyst@etanalytics.co.uk": {"password": "Analyst123!", "role": "analyst", "name": "Analyst Admin"},
    "demo@analyst.com": {"password": "demo123", "role": "analyst", "name": "Demo Analyst"},
    # Admin (both portals)
    "admin@etanalytics.co.uk": {"password": "Admin2024!", "role": "admin", "name": "System Admin"},
}

VALID_SESSIONS = {}  # session_token -> {username, role, expires}

def create_session(email: str, role: str) -> str:
    """Create a new session token"""
    token = secrets.token_urlsafe(32)
    VALID_SESSIONS[token] = {
        "email": email,
        "role": role,
        "expires": datetime.now() + timedelta(hours=24)
    }
    return token

def verify_session(token: str) -> Optional[dict]:
    """Verify session token and return user info if valid"""
    if not token or token not in VALID_SESSIONS:
        return None
    session = VALID_SESSIONS[token]
    if datetime.now() > session["expires"]:
        del VALID_SESSIONS[token]
        return None
    return session

class LoginRequest(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None  # Allow username as fallback
    password: str
    portal: Optional[str] = None  # 'issuer' or 'analyst'

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "https://www.etanalytics.co.uk"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for demo
registers = {}
analyses = {}
applications = {}  # Application storage
documents = {}  # Document storage

# ========================================
# Application & Onboarding Models
# ========================================

class ApplicationCreate(BaseModel):
    company_name: str
    registration_number: str
    contact_name: str
    contact_email: str
    contact_phone: str
    country: str
    selected_plan: str  # starter | professional | enterprise
    num_etfs: Optional[int] = None
    additional_notes: Optional[str] = None

class Application(BaseModel):
    id: str
    company_name: str
    registration_number: str
    contact_name: str
    contact_email: str
    contact_phone: str
    country: str
    selected_plan: str
    num_etfs: Optional[int] = None
    additional_notes: Optional[str] = None
    status: str = "new"  # new | contract_sent | contract_signed | docs_pending | payment_pending | active | rejected
    created_at: str
    updated_at: str
    access_token: Optional[str] = None  # For applicant to check status

class Document(BaseModel):
    id: str
    application_id: str
    doc_type: str  # articles_of_association | permission_letter | contract | other
    filename: str
    original_filename: str
    upload_date: str
    file_size: int
    
class ApplicationStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None

# Models
class ETFColumn(BaseModel):
    isin: str
    name: Optional[str] = None
    total_shares: int = 0

class ShareRegisterEntry(BaseModel):
    id: str
    account_name: str
    account_number: str
    holdings: Dict[str, int]  # ISIN -> shares
    total_shares: int
    entity_type: str = "unknown"
    confidence: int = 0
    resolved_entity: Optional[str] = None
    requires_disclosure: bool = True
    disclosure_status: str = "pending"

class ShareRegister(BaseModel):
    id: str
    issuer_id: str
    upload_date: str
    as_of_date: str
    status: str = "pending"
    total_holders: int
    etf_columns: List[ETFColumn]
    entries: List[ShareRegisterEntry]

class AnalysisResult(BaseModel):
    id: str
    register_id: str
    status: str
    progress: int
    current_layer: int
    total_layers: int
    identified_percentage: float
    etf_breakdown: Dict[str, dict]  # Per-ETF analysis
    entity_breakdown: Dict[str, dict]

# Known entities for matching
# IMPORTANT: Entity types must be synced with frontend/src/constants/entityTypes.ts
# 
# TERMINAL types (Investment Decision Makers) - confidence: 100, requires_disclosure: False
#   - wealth_manager, platform, private_bank, asset_manager, pension_fund, insurance, fund_of_funds
#
# INTERMEDIARY types (Need Disclosure) - confidence: 0, requires_disclosure: True
#   - csd, global_custodian, local_custodian, dedicated_nominee, pooled_nominee, market_maker
#
KNOWN_ENTITIES = {
    # CSDs - Central Securities Depositories (Level 1 intermediaries)
    "EUROCLEAR BANK": {"type": "csd", "name": "Euroclear Bank SA/NV", "requires_disclosure": True},
    "EUROCLEAR": {"type": "csd", "name": "Euroclear Bank SA/NV", "requires_disclosure": True},
    "CLEARSTREAM": {"type": "csd", "name": "Clearstream Banking S.A.", "requires_disclosure": True},
    "CREST NOMINEES": {"type": "csd", "name": "Euroclear UK", "requires_disclosure": True},
    "CREST": {"type": "csd", "name": "Euroclear UK", "requires_disclosure": True},
    
    # Global Custodians (intermediaries)
    "STATE STREET": {"type": "global_custodian", "name": "State Street", "requires_disclosure": True},
    "BNY MELLON": {"type": "global_custodian", "name": "BNY Mellon", "requires_disclosure": True},
    "NORTHERN TRUST": {"type": "global_custodian", "name": "Northern Trust", "requires_disclosure": True},
    "NORTRUST": {"type": "global_custodian", "name": "Northern Trust", "requires_disclosure": True},
    "CITIBANK": {"type": "global_custodian", "name": "Citibank N.A.", "requires_disclosure": True},
    "JPMORGAN": {"type": "global_custodian", "name": "JP Morgan", "requires_disclosure": True},
    "JP MORGAN": {"type": "global_custodian", "name": "JP Morgan", "requires_disclosure": True},
    "HSBC": {"type": "global_custodian", "name": "HSBC", "requires_disclosure": True},
    
    # Pooled Nominees (intermediaries)
    "PERSHING": {"type": "pooled_nominee", "name": "Pershing Securities", "requires_disclosure": True, "confidence": 0},
    "VIDACOS": {"type": "pooled_nominee", "name": "Vidacos Nominees", "requires_disclosure": True, "confidence": 0},
    
    # Wealth Managers (TERMINAL - Decision Makers)
    "BREWIN DOLPHIN": {"type": "wealth_manager", "name": "Brewin Dolphin", "requires_disclosure": False, "confidence": 100},
    "RATHBONE": {"type": "wealth_manager", "name": "Rathbones Group Plc", "requires_disclosure": False, "confidence": 100},
    "SJP": {"type": "wealth_manager", "name": "St. James's Place", "requires_disclosure": False, "confidence": 100},
    "ST JAMES": {"type": "wealth_manager", "name": "St. James's Place", "requires_disclosure": False, "confidence": 100},
    "EVELYN": {"type": "wealth_manager", "name": "Evelyn Partners", "requires_disclosure": False, "confidence": 100},
    "CHARLES STANLEY": {"type": "wealth_manager", "name": "Charles Stanley", "requires_disclosure": False, "confidence": 100},
    "TILNEY": {"type": "wealth_manager", "name": "Tilney", "requires_disclosure": False, "confidence": 100},
    "QUILTER": {"type": "wealth_manager", "name": "Quilter", "requires_disclosure": False, "confidence": 100},
    
    # Platforms (TERMINAL - Decision Makers)
    "HARGREAVES LANSDOWN": {"type": "platform", "name": "Hargreaves Lansdown", "requires_disclosure": False, "confidence": 100},
    "INTERACTIVE INVESTOR": {"type": "platform", "name": "Interactive Investor", "requires_disclosure": False, "confidence": 100},
    "AJ BELL": {"type": "platform", "name": "AJ Bell", "requires_disclosure": False, "confidence": 100},
    "FIDELITY": {"type": "platform", "name": "Fidelity International", "requires_disclosure": False, "confidence": 100},
    "VANGUARD INVESTOR": {"type": "platform", "name": "Vanguard Personal Investor", "requires_disclosure": False, "confidence": 100},
    
    # Private Banks (TERMINAL - Decision Makers)
    "COUTTS": {"type": "private_bank", "name": "Coutts & Co", "requires_disclosure": False, "confidence": 100},
    "JULIUS BAER": {"type": "private_bank", "name": "Julius Baer", "requires_disclosure": False, "confidence": 100},
    "LOMBARD ODIER": {"type": "private_bank", "name": "Lombard Odier", "requires_disclosure": False, "confidence": 100},
    "UBS": {"type": "private_bank", "name": "UBS", "requires_disclosure": False, "confidence": 100},
    "CREDIT SUISSE": {"type": "private_bank", "name": "Credit Suisse", "requires_disclosure": False, "confidence": 100},
    
    # Asset Managers (TERMINAL - Decision Makers)
    "SCHRODERS": {"type": "asset_manager", "name": "Schroders", "requires_disclosure": False, "confidence": 100},
    "LGIM": {"type": "asset_manager", "name": "Legal & General", "requires_disclosure": False, "confidence": 100},
    "LEGAL GENERAL": {"type": "asset_manager", "name": "Legal & General", "requires_disclosure": False, "confidence": 100},
    "BLACKROCK": {"type": "asset_manager", "name": "BlackRock", "requires_disclosure": False, "confidence": 100},
    "VANGUARD": {"type": "asset_manager", "name": "Vanguard", "requires_disclosure": False, "confidence": 100},
    "ABERDEEN": {"type": "asset_manager", "name": "abrdn", "requires_disclosure": False, "confidence": 100},
    "ABRDN": {"type": "asset_manager", "name": "abrdn", "requires_disclosure": False, "confidence": 100},
    "LIONTRUST": {"type": "asset_manager", "name": "Liontrust", "requires_disclosure": False, "confidence": 100},
    "NOMURA": {"type": "asset_manager", "name": "Nomura Asset Management", "requires_disclosure": False, "confidence": 100},
    
    # Pension Funds (TERMINAL - Decision Makers)
    "USS": {"type": "pension_fund", "name": "Universities Superannuation Scheme", "requires_disclosure": False, "confidence": 100},
    "NEST": {"type": "pension_fund", "name": "NEST Pensions", "requires_disclosure": False, "confidence": 100},
}

# ETF name lookup
ETF_NAMES = {
    "IE00B4L5Y983": "MSCI World UCITS ETF",
    "IE00B5BMR087": "S&P 500 UCITS ETF", 
    "IE00BK5BQT80": "FTSE All-World UCITS ETF",
    "IE00B4L5YC18": "Euro Stoxx 50 UCITS ETF",
    "IE00B3RBWM25": "Emerging Markets UCITS ETF",
}

def match_entity(account_name: str) -> dict:
    """Match account name against known entities"""
    account_upper = account_name.upper()
    
    for pattern, entity in KNOWN_ENTITIES.items():
        if pattern in account_upper:
            return {
                "entity_type": entity["type"],
                "resolved_entity": entity["name"],
                "requires_disclosure": entity.get("requires_disclosure", True),
                "confidence": entity.get("confidence", 0)
            }
    
    return {
        "entity_type": "unknown",
        "resolved_entity": None,
        "requires_disclosure": True,
        "confidence": 0
    }

def is_isin(value: str) -> bool:
    """Check if a string looks like an ISIN (12 characters, starts with 2 letters)"""
    return len(value) == 12 and value[:2].isalpha() and value[2:].isalnum()

@app.get("/")
async def root():
    return {"message": "Exchange Traded Analytics API v2.0", "status": "online", "format": "matrix"}

# ========================================
# Authentication Endpoints
# ========================================

@app.post("/auth/login")
async def login(request: LoginRequest, response: Response):
    """Login and get session cookie - works with email or username"""
    # Accept either email or username field
    email = request.email or request.username
    password = request.password
    portal = request.portal or "issuer"  # Default to issuer portal
    
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    
    # Normalize email to lowercase
    email = email.lower().strip()
    
    # Check if user exists and password matches
    if email not in AUTH_USERS:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user = AUTH_USERS[email]
    if user["password"] != password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Check if user has access to requested portal
    user_role = user["role"]
    if user_role != "admin" and user_role != portal:
        raise HTTPException(status_code=403, detail=f"You don't have access to the {portal} portal")
    
    # Create session with role
    token = create_session(email, user_role)
    response.set_cookie(
        key="eta_session",
        value=token,
        httponly=True,
        secure=True,
        samesite="lax",  # Changed to lax for better compatibility
        max_age=86400  # 24 hours
    )
    return {
        "success": True, 
        "message": "Login successful",
        "user": {
            "email": email,
            "name": user["name"],
            "role": user_role
        }
    }

@app.get("/auth/verify")
async def verify_auth(eta_session: Optional[str] = Cookie(None)):
    """Verify if current session is valid"""
    session = verify_session(eta_session)
    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {
        "authenticated": True, 
        "email": session["email"],
        "role": session["role"]
    }

@app.get("/auth/users")
async def list_demo_users():
    """List available demo users (for testing)"""
    return {
        "issuer_portal": {
            "email": "issuer@etanalytics.co.uk",
            "password": "Issuer123!"
        },
        "analyst_portal": {
            "email": "analyst@etanalytics.co.uk", 
            "password": "Analyst123!"
        },
        "admin": {
            "email": "admin@etanalytics.co.uk",
            "password": "Admin2024!",
            "note": "Has access to both portals"
        }
    }

@app.post("/auth/logout")
async def logout(response: Response, eta_session: Optional[str] = Cookie(None)):
    """Logout and clear session"""
    if eta_session and eta_session in VALID_SESSIONS:
        del VALID_SESSIONS[eta_session]
    response.delete_cookie("eta_session")
    return {"success": True, "message": "Logged out"}

@app.post("/api/registers/upload")
async def upload_register(
    file: UploadFile = File(...),
    issuer_id: str = "iss-001"
):
    """
    Upload and process a share register CSV file in matrix format.
    
    Expected format:
    Account Name, Account Number, ISIN1, ISIN2, ISIN3, ...
    EUROCLEAR BANK, EU001, 45000000, 28000000, 32000000, ...
    BREWIN DOLPHIN NOMINEES, BD002, 8200000, 5400000, 7200000, ...
    """
    try:
        content = await file.read()
        decoded = content.decode('utf-8')
        reader = csv.DictReader(io.StringIO(decoded))
        
        # Get headers and identify ETF columns (ISINs)
        headers = reader.fieldnames
        if not headers:
            raise HTTPException(status_code=400, detail="CSV file has no headers")
        
        # Find ISIN columns (columns that look like ISINs)
        isin_columns = []
        account_name_col = None
        account_number_col = None
        
        for header in headers:
            header_clean = header.strip()
            if is_isin(header_clean):
                isin_columns.append(header_clean)
            elif 'name' in header_clean.lower() or 'account' in header_clean.lower() and 'number' not in header_clean.lower():
                account_name_col = header
            elif 'number' in header_clean.lower() or header_clean.lower() == 'account':
                account_number_col = header
        
        # If no ISIN columns found, assume all numeric columns after first two are ETFs
        if not isin_columns:
            isin_columns = [h for h in headers[2:] if h.strip()]
        
        if not account_name_col:
            account_name_col = headers[0]
        if not account_number_col:
            account_number_col = headers[1] if len(headers) > 1 else headers[0]
        
        # Process entries
        entries = []
        etf_totals = {isin: 0 for isin in isin_columns}
        
        for row in reader:
            account_name = row.get(account_name_col, '').strip()
            account_number = row.get(account_number_col, '').strip()
            
            if not account_name:
                continue
            
            # Get holdings for each ETF
            holdings = {}
            total_shares = 0
            for isin in isin_columns:
                try:
                    shares = int(row.get(isin, 0) or 0)
                    holdings[isin] = shares
                    total_shares += shares
                    etf_totals[isin] += shares
                except (ValueError, TypeError):
                    holdings[isin] = 0
            
            # Match against known entities
            match = match_entity(account_name)
            
            entries.append(ShareRegisterEntry(
                id=str(uuid.uuid4()),
                account_name=account_name,
                account_number=account_number,
                holdings=holdings,
                total_shares=total_shares,
                entity_type=match["entity_type"],
                resolved_entity=match["resolved_entity"],
                requires_disclosure=match["requires_disclosure"],
                confidence=match["confidence"]
            ))
        
        # Build ETF columns metadata
        etf_columns = [
            ETFColumn(
                isin=isin,
                name=ETF_NAMES.get(isin, isin),
                total_shares=etf_totals[isin]
            )
            for isin in isin_columns
        ]
        
        # Create register
        register_id = str(uuid.uuid4())
        register = ShareRegister(
            id=register_id,
            issuer_id=issuer_id,
            upload_date=datetime.now().isoformat(),
            as_of_date=datetime.now().isoformat(),
            status="pending",
            total_holders=len(entries),
            etf_columns=etf_columns,
            entries=entries
        )
        
        registers[register_id] = register
        
        # Summary stats
        matched_entries = [e for e in entries if e.confidence == 100]
        csd_entries = [e for e in entries if e.entity_type == 'csd']
        
        return {
            "success": True,
            "register_id": register_id,
            "issuer_id": issuer_id,
            "total_holders": len(entries),
            "total_etfs": len(etf_columns),
            "etf_isins": [c.isin for c in etf_columns],
            "matched_entities": len(matched_entries),
            "csd_pending_disclosure": len(csd_entries),
            "unknown": len([e for e in entries if e.entity_type == 'unknown']),
            "summary": {
                "by_type": {
                    "csd": len([e for e in entries if e.entity_type == 'csd']),
                    "global_custodian": len([e for e in entries if e.entity_type == 'global_custodian']),
                    "wealth_manager": len([e for e in entries if e.entity_type == 'wealth_manager']),
                    "platform": len([e for e in entries if e.entity_type == 'platform']),
                    "private_bank": len([e for e in entries if e.entity_type == 'private_bank']),
                    "asset_manager": len([e for e in entries if e.entity_type == 'asset_manager']),
                    "pooled_nominee": len([e for e in entries if e.entity_type == 'pooled_nominee']),
                    "unknown": len([e for e in entries if e.entity_type == 'unknown']),
                }
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/registers")
async def list_registers():
    """List all uploaded registers"""
    result = []
    for reg in registers.values():
        result.append({
            "id": reg.id,
            "issuer_id": reg.issuer_id,
            "upload_date": reg.upload_date,
            "status": reg.status,
            "total_holders": reg.total_holders,
            "total_etfs": len(reg.etf_columns),
            "etf_isins": [c.isin for c in reg.etf_columns]
        })
    return {"registers": result}

@app.get("/api/registers/{register_id}")
async def get_register(register_id: str):
    """Get a specific register with full details"""
    if register_id not in registers:
        raise HTTPException(status_code=404, detail="Register not found")
    return registers[register_id]

@app.get("/api/registers/{register_id}/etf/{isin}")
async def get_register_by_etf(register_id: str, isin: str):
    """Get register entries filtered by a specific ETF"""
    if register_id not in registers:
        raise HTTPException(status_code=404, detail="Register not found")
    
    register = registers[register_id]
    
    # Filter and sort by holdings in this ETF
    entries = []
    total_shares = 0
    
    for entry in register.entries:
        shares = entry.holdings.get(isin, 0)
        if shares > 0:
            total_shares += shares
            entries.append({
                "id": entry.id,
                "account_name": entry.account_name,
                "account_number": entry.account_number,
                "shares": shares,
                "entity_type": entry.entity_type,
                "resolved_entity": entry.resolved_entity,
                "confidence": entry.confidence,
                "requires_disclosure": entry.requires_disclosure
            })
    
    # Sort by shares descending
    entries.sort(key=lambda x: x["shares"], reverse=True)
    
    # Add percentage
    for entry in entries:
        entry["percentage"] = round(entry["shares"] / total_shares * 100, 4) if total_shares > 0 else 0
    
    return {
        "isin": isin,
        "name": ETF_NAMES.get(isin, isin),
        "total_shares": total_shares,
        "total_holders": len(entries),
        "entries": entries
    }

@app.post("/api/registers/{register_id}/analyze")
async def run_analysis(register_id: str):
    """Run entity matching analysis on entire register (all ETFs)"""
    if register_id not in registers:
        raise HTTPException(status_code=404, detail="Register not found")
    
    register = registers[register_id]
    entries = register.entries
    
    # Calculate per-ETF breakdown
    etf_breakdown = {}
    for col in register.etf_columns:
        isin = col.isin
        etf_entries = [(e, e.holdings.get(isin, 0)) for e in entries if e.holdings.get(isin, 0) > 0]
        total = sum(shares for _, shares in etf_entries)
        
        # Count identified shares (confidence == 100 - fully identified, no disclosure needed)
        identified_shares = sum(shares for e, shares in etf_entries if e.confidence == 100)
        
        # Count matched shares (entity recognized, even if requires disclosure)
        matched_shares = sum(shares for e, shares in etf_entries if e.entity_type != 'unknown')
        
        # DEBUG: Log the calculation with percentages
        id_pct = round(identified_shares / total * 100, 2) if total > 0 else 0
        match_pct = round(matched_shares / total * 100, 2) if total > 0 else 0
        print(f"\n{'='*80}")
        print(f"ETF: {isin} ({col.name})")
        print(f"  Total shares: {total:,}")
        print(f"  Identified shares (confidence=100): {identified_shares:,} ({id_pct}%)")
        print(f"  Matched shares (not unknown): {matched_shares:,} ({match_pct}%)")
        print(f"  Total entries: {len(etf_entries)}")
        print(f"\n  Top 5 entries:")
        for e, shares in etf_entries[:5]:
            pct = round(shares/total*100, 2) if total > 0 else 0
            print(f"    • {e.account_name[:40]:40} | {shares:>12,} shares ({pct:>6.2f}%) | confidence={e.confidence} | type={e.entity_type}")
        print(f"{'='*80}\n")
        
        etf_breakdown[isin] = {
            "name": col.name,
            "total_shares": total,
            "total_holders": len(etf_entries),
            "identified_shares": identified_shares,  # Shares with confidence=100
            "matched_shares": matched_shares,  # Shares with entity recognized
            "identified_percentage": round(identified_shares / total * 100, 2) if total > 0 else 0,  # Decision makers found
            "discovered_percentage": round(matched_shares / total * 100, 2) if total > 0 else 0,  # Entities recognized (alias)
            "matched_percentage": round(matched_shares / total * 100, 2) if total > 0 else 0,  # Backwards compatibility
            "by_type": {}
        }
        
        # Group by entity type
        for e, shares in etf_entries:
            t = e.entity_type
            if t not in etf_breakdown[isin]["by_type"]:
                etf_breakdown[isin]["by_type"][t] = {"count": 0, "shares": 0, "percentage": 0}
            etf_breakdown[isin]["by_type"][t]["count"] += 1
            etf_breakdown[isin]["by_type"][t]["shares"] += shares
            etf_breakdown[isin]["by_type"][t]["percentage"] = round(
                etf_breakdown[isin]["by_type"][t]["shares"] / total * 100, 2
            ) if total > 0 else 0
    
    # Overall entity breakdown
    entity_breakdown = {}
    total_all = sum(e.total_shares for e in entries)
    for e in entries:
        t = e.entity_type
        if t not in entity_breakdown:
            entity_breakdown[t] = {"count": 0, "total_shares": 0, "percentage": 0}
        entity_breakdown[t]["count"] += 1
        entity_breakdown[t]["total_shares"] += e.total_shares
        entity_breakdown[t]["percentage"] = round(
            entity_breakdown[t]["total_shares"] / total_all * 100, 2
        ) if total_all > 0 else 0
    
    # Overall percentages
    identified_total = sum(e.total_shares for e in entries if e.confidence == 100)
    matched_total = sum(e.total_shares for e in entries if e.entity_type != 'unknown')
    
    identified_pct = round(identified_total / total_all * 100, 2) if total_all > 0 else 0
    matched_pct = round(matched_total / total_all * 100, 2) if total_all > 0 else 0
    
    # DEBUG: Log overall register percentages
    print(f"\n{'#'*80}")
    print(f"# OVERALL REGISTER ANALYSIS")
    print(f"{'#'*80}")
    print(f"Total shares across all ETFs: {total_all:,}")
    print(f"Identified shares (confidence=100): {identified_total:,} ({identified_pct}%)")
    print(f"Matched shares (not unknown): {matched_total:,} ({matched_pct}%)")
    print(f"Unknown shares: {total_all - matched_total:,} ({round(100-matched_pct, 2)}%)")
    print(f"\nEntity Breakdown:")
    for entity_type, breakdown in entity_breakdown.items():
        print(f"  • {entity_type:20} | {breakdown['count']:>3} entries | {breakdown['total_shares']:>12,} shares ({breakdown['percentage']:>6.2f}%)")
    print(f"{'#'*80}\n")
    
    analysis_id = str(uuid.uuid4())
    result = AnalysisResult(
        id=analysis_id,
        register_id=register_id,
        status="complete",
        progress=100,
        current_layer=1,
        total_layers=3,
        identified_percentage=identified_pct,
        etf_breakdown=etf_breakdown,
        entity_breakdown=entity_breakdown
    )
    
    # Add matched_percentage to response (not in model, so add as dict)
    result_dict = result.dict()
    
    # CLARIFY METRICS: Use consistent naming
    result_dict['discovered_percentage'] = matched_pct  # All recognized entities (alias for matched_percentage)
    result_dict['matched_percentage'] = matched_pct     # Keep for backwards compatibility
    result_dict['identified_percentage'] = identified_pct  # Decision makers only (this is what should be displayed!)
    result_dict['identified_shares'] = identified_total
    result_dict['matched_shares'] = matched_total
    result_dict['total_shares'] = total_all
    
    # Add explanation for frontend
    result_dict['percentage_definitions'] = {
        'discovered_percentage': 'Entities recognized (may include intermediaries requiring disclosure)',
        'identified_percentage': 'Investment decision makers identified (end of ownership chain)'
    }
    
    analyses[analysis_id] = result
    
    analyses[analysis_id] = result
    register.status = "analyzed"
    
    return result_dict

@app.get("/api/entities")
async def list_entities():
    """List known entities in the database"""
    return {
        "entities": [
            {"pattern": k, **v} for k, v in KNOWN_ENTITIES.items()
        ],
        "total": len(KNOWN_ENTITIES)
    }

@app.post("/api/entities")
async def add_entity(pattern: str, entity_type: str, name: str, requires_disclosure: bool = True):
    """Add a new entity to the database"""
    confidence = 0 if requires_disclosure else 100
    KNOWN_ENTITIES[pattern.upper()] = {
        "type": entity_type,
        "name": name,
        "requires_disclosure": requires_disclosure,
        "confidence": confidence
    }
    return {"success": True, "pattern": pattern.upper()}

@app.post("/api/registers/{register_id}/disclosure/{entry_id}")
async def send_disclosure(register_id: str, entry_id: str):
    """Mark a disclosure as sent for an entry"""
    if register_id not in registers:
        raise HTTPException(status_code=404, detail="Register not found")
    
    register = registers[register_id]
    for entry in register.entries:
        if entry.id == entry_id:
            entry.disclosure_status = "sent"
            return {"success": True, "entry_id": entry_id, "status": "sent"}
    
    raise HTTPException(status_code=404, detail="Entry not found")


# ========================================
# NAV Data Endpoints (Yahoo Finance)
# ========================================

# Lazy-load NAV service to avoid import errors if yfinance not installed
nav_service = None

def get_nav_service():
    global nav_service
    if nav_service is None:
        try:
            from services.nav_service import NAVDataService
            nav_service = NAVDataService()
        except ImportError as e:
            print(f"Warning: NAV service not available - {e}")
            print("Install with: pip install yfinance")
    return nav_service

@app.get("/api/nav/mappings")
async def get_nav_mappings():
    """Get all ISIN to Yahoo Finance symbol mappings"""
    service = get_nav_service()
    if not service:
        raise HTTPException(status_code=503, detail="NAV service not available. Install yfinance.")
    return {"mappings": service.get_all_mappings()}

@app.post("/api/nav/mappings")
async def add_nav_mapping(isin: str, yahoo_symbol: str):
    """Add a new ISIN to Yahoo symbol mapping"""
    service = get_nav_service()
    if not service:
        raise HTTPException(status_code=503, detail="NAV service not available. Install yfinance.")
    service.add_mapping(isin, yahoo_symbol)
    return {"success": True, "isin": isin, "yahoo_symbol": yahoo_symbol}

@app.get("/api/nav/{isin}/current")
async def get_current_nav(isin: str):
    """Get current NAV for a specific ISIN"""
    service = get_nav_service()
    if not service:
        raise HTTPException(status_code=503, detail="NAV service not available. Install yfinance.")
    
    data = service.get_current_nav(isin)
    if not data:
        raise HTTPException(
            status_code=404, 
            detail=f"NAV data not found for {isin}. Symbol mapping may be missing."
        )
    return data

@app.get("/api/nav/{isin}/history")
async def get_nav_history(
    isin: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    period: str = "1y"
):
    """
    Get historical NAV data for an ISIN
    
    Args:
        isin: The ISIN to look up
        start_date: Start date (YYYY-MM-DD)
        end_date: End date (YYYY-MM-DD)
        period: Period if no dates (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, ytd, max)
    """
    service = get_nav_service()
    if not service:
        raise HTTPException(status_code=503, detail="NAV service not available. Install yfinance.")
    
    data = service.get_nav_history(isin, start_date, end_date, period)
    if not data:
        raise HTTPException(
            status_code=404, 
            detail=f"History not found for {isin}. Symbol mapping may be missing."
        )
    
    return {
        "isin": isin,
        "yahoo_symbol": service.get_yahoo_symbol(isin),
        "period": period if not start_date else f"{start_date} to {end_date}",
        "count": len(data),
        "data": data
    }

@app.post("/api/nav/bulk")
async def get_bulk_navs(isins: List[str]):
    """Get current NAV for multiple ISINs at once"""
    service = get_nav_service()
    if not service:
        raise HTTPException(status_code=503, detail="NAV service not available. Install yfinance.")
    
    results = service.get_multiple_navs(isins)
    
    # Separate successful and failed
    success = {k: v for k, v in results.items() if 'error' not in v}
    failed = {k: v for k, v in results.items() if 'error' in v}
    
    return {
        "success_count": len(success),
        "failed_count": len(failed),
        "data": success,
        "errors": failed
    }

@app.get("/api/nav/search/{query}")
async def search_etf_symbol(query: str):
    """Search for ETF Yahoo Finance symbols across exchanges"""
    service = get_nav_service()
    if not service:
        raise HTTPException(status_code=503, detail="NAV service not available. Install yfinance.")
    
    results = service.search_etf(query)
    return {"query": query, "results": results}


# ========================================
# Application & Onboarding Endpoints
# ========================================

@app.post("/api/applications")
async def create_application(app_data: ApplicationCreate):
    """Submit a new live signup application"""
    app_id = str(uuid.uuid4())
    access_token = secrets.token_urlsafe(32)
    now = datetime.now().isoformat()
    
    application = Application(
        id=app_id,
        company_name=app_data.company_name,
        registration_number=app_data.registration_number,
        contact_name=app_data.contact_name,
        contact_email=app_data.contact_email,
        contact_phone=app_data.contact_phone,
        country=app_data.country,
        selected_plan=app_data.selected_plan,
        num_etfs=app_data.num_etfs,
        additional_notes=app_data.additional_notes,
        status="new",
        created_at=now,
        updated_at=now,
        access_token=access_token
    )
    
    applications[app_id] = application
    
    return {
        "success": True,
        "application_id": app_id,
        "access_token": access_token,
        "status": "new",
        "message": "Application submitted successfully. You will receive an email with next steps."
    }

@app.get("/api/applications")
async def list_applications(
    status: Optional[str] = None,
    eta_session: Optional[str] = Cookie(None)
):
    """List all applications (admin only)"""
    # Verify admin session
    session = verify_session(eta_session)
    if not session or session["role"] not in ["admin", "analyst"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = []
    for app in applications.values():
        if status and app.status != status:
            continue
        # Don't expose access tokens in list
        app_dict = app.dict()
        app_dict.pop("access_token", None)
        result.append(app_dict)
    
    # Sort by created_at descending
    result.sort(key=lambda x: x["created_at"], reverse=True)
    
    return {"applications": result, "total": len(result)}

@app.get("/api/applications/{app_id}")
async def get_application(
    app_id: str,
    token: Optional[str] = None,
    eta_session: Optional[str] = Cookie(None)
):
    """Get application details - either by admin session or access token"""
    if app_id not in applications:
        raise HTTPException(status_code=404, detail="Application not found")
    
    application = applications[app_id]
    
    # Check authorization
    session = verify_session(eta_session)
    is_admin = session and session["role"] in ["admin", "analyst"]
    is_owner = token and application.access_token == token
    
    if not is_admin and not is_owner:
        raise HTTPException(status_code=403, detail="Access denied")
    
    app_dict = application.dict()
    
    # Don't expose access token to admins viewing
    if is_admin and not is_owner:
        app_dict.pop("access_token", None)
    
    # Get associated documents
    app_docs = [doc.dict() for doc in documents.values() if doc.application_id == app_id]
    app_dict["documents"] = app_docs
    
    return app_dict

@app.patch("/api/applications/{app_id}")
async def update_application_status(
    app_id: str,
    update: ApplicationStatusUpdate,
    eta_session: Optional[str] = Cookie(None)
):
    """Update application status (admin only)"""
    session = verify_session(eta_session)
    if not session or session["role"] not in ["admin", "analyst"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if app_id not in applications:
        raise HTTPException(status_code=404, detail="Application not found")
    
    valid_statuses = ["new", "contract_sent", "contract_signed", "docs_pending", "payment_pending", "active", "rejected"]
    if update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    application = applications[app_id]
    application.status = update.status
    application.updated_at = datetime.now().isoformat()
    
    return {
        "success": True,
        "application_id": app_id,
        "status": update.status,
        "message": f"Status updated to {update.status}"
    }

@app.get("/api/applications/status/{token}")
async def get_application_by_token(token: str):
    """Get application status using access token (for applicants)"""
    for application in applications.values():
        if application.access_token == token:
            app_dict = application.dict()
            # Get associated documents
            app_docs = [doc.dict() for doc in documents.values() if doc.application_id == application.id]
            app_dict["documents"] = app_docs
            return app_dict
    
    raise HTTPException(status_code=404, detail="Application not found")

@app.get("/api/applications/pipeline/stats")
async def get_pipeline_stats(eta_session: Optional[str] = Cookie(None)):
    """Get application pipeline statistics (admin only)"""
    session = verify_session(eta_session)
    if not session or session["role"] not in ["admin", "analyst"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    stats = {
        "new": 0,
        "contract_sent": 0,
        "contract_signed": 0,
        "docs_pending": 0,
        "payment_pending": 0,
        "active": 0,
        "rejected": 0,
        "total": len(applications)
    }
    
    for app in applications.values():
        if app.status in stats:
            stats[app.status] += 1
    
    # Plan breakdown
    plan_stats = {"starter": 0, "professional": 0, "enterprise": 0}
    for app in applications.values():
        if app.selected_plan in plan_stats:
            plan_stats[app.selected_plan] += 1
    
    return {
        "by_status": stats,
        "by_plan": plan_stats
    }


# ========================================
# Document Upload/Download Endpoints
# ========================================

ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

@app.post("/api/applications/{app_id}/documents")
async def upload_document(
    app_id: str,
    file: UploadFile = File(...),
    doc_type: str = Form(...),
    token: Optional[str] = Form(None),
    eta_session: Optional[str] = Cookie(None)
):
    """Upload a document for an application"""
    if app_id not in applications:
        raise HTTPException(status_code=404, detail="Application not found")
    
    application = applications[app_id]
    
    # Check authorization
    session = verify_session(eta_session)
    is_admin = session and session["role"] in ["admin", "analyst"]
    is_owner = token and application.access_token == token
    
    if not is_admin and not is_owner:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Validate doc_type
    valid_types = ["articles_of_association", "permission_letter", "contract", "other"]
    if doc_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid doc_type. Must be one of: {valid_types}")
    
    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {ALLOWED_EXTENSIONS}")
    
    # Read file content
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Max size: {MAX_FILE_SIZE // 1024 // 1024}MB")
    
    # Create application directory
    app_dir = UPLOAD_DIR / app_id
    app_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    doc_id = str(uuid.uuid4())
    stored_filename = f"{doc_type}_{doc_id}{file_ext}"
    file_path = app_dir / stored_filename
    
    # Save file
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Create document record
    document = Document(
        id=doc_id,
        application_id=app_id,
        doc_type=doc_type,
        filename=stored_filename,
        original_filename=file.filename,
        upload_date=datetime.now().isoformat(),
        file_size=len(content)
    )
    
    documents[doc_id] = document
    
    return {
        "success": True,
        "document_id": doc_id,
        "filename": file.filename,
        "doc_type": doc_type,
        "size": len(content)
    }

@app.get("/api/applications/{app_id}/documents")
async def list_application_documents(
    app_id: str,
    token: Optional[str] = None,
    eta_session: Optional[str] = Cookie(None)
):
    """List documents for an application"""
    if app_id not in applications:
        raise HTTPException(status_code=404, detail="Application not found")
    
    application = applications[app_id]
    
    # Check authorization
    session = verify_session(eta_session)
    is_admin = session and session["role"] in ["admin", "analyst"]
    is_owner = token and application.access_token == token
    
    if not is_admin and not is_owner:
        raise HTTPException(status_code=403, detail="Access denied")
    
    app_docs = [doc.dict() for doc in documents.values() if doc.application_id == app_id]
    
    return {"documents": app_docs, "total": len(app_docs)}

@app.get("/api/documents/{doc_id}/download")
async def download_document(
    doc_id: str,
    token: Optional[str] = None,
    eta_session: Optional[str] = Cookie(None)
):
    """Download a document"""
    if doc_id not in documents:
        raise HTTPException(status_code=404, detail="Document not found")
    
    document = documents[doc_id]
    app_id = document.application_id
    
    if app_id not in applications:
        raise HTTPException(status_code=404, detail="Application not found")
    
    application = applications[app_id]
    
    # Check authorization
    session = verify_session(eta_session)
    is_admin = session and session["role"] in ["admin", "analyst"]
    is_owner = token and application.access_token == token
    
    if not is_admin and not is_owner:
        raise HTTPException(status_code=403, detail="Access denied")
    
    file_path = UPLOAD_DIR / app_id / document.filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    return FileResponse(
        path=file_path,
        filename=document.original_filename,
        media_type="application/octet-stream"
    )

@app.delete("/api/documents/{doc_id}")
async def delete_document(
    doc_id: str,
    eta_session: Optional[str] = Cookie(None)
):
    """Delete a document (admin only)"""
    session = verify_session(eta_session)
    if not session or session["role"] not in ["admin", "analyst"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if doc_id not in documents:
        raise HTTPException(status_code=404, detail="Document not found")
    
    document = documents[doc_id]
    file_path = UPLOAD_DIR / document.application_id / document.filename
    
    # Delete file from disk
    if file_path.exists():
        file_path.unlink()
    
    # Remove from storage
    del documents[doc_id]
    
    return {"success": True, "message": "Document deleted"}

@app.get("/api/templates/permission-letter")
async def get_permission_letter_template():
    """Get the permission letter template for download"""
    template_path = TEMPLATES_DIR / "permission_letter_template.pdf"
    
    # If template doesn't exist, return a placeholder message
    if not template_path.exists():
        return {
            "message": "Permission letter template",
            "instructions": [
                "This letter authorizes ET Analytics to make disclosure requests on your behalf under Section 1062 of the Irish Companies Act 2014.",
                "Please download, complete with your company details, sign, and upload.",
                "Required information:",
                "- Company name and registration number",
                "- Authorized signatory name and title",
                "- Contact details for custodian verification",
                "- Date and signature"
            ],
            "template_available": False
        }
    
    return FileResponse(
        path=template_path,
        filename="ET_Analytics_Permission_Letter_Template.pdf",
        media_type="application/pdf"
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
