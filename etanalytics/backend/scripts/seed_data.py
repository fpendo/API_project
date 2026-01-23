#!/usr/bin/env python3
"""
Seed initial data for ETAnalytics
"""
import asyncio
import sys
sys.path.insert(0, '/opt/app/etanalytics/backend')

from sqlalchemy import select
from app.database import async_session_maker, init_db
from app.models import User, UserRole, Entity, ETFProduct
from app.services.auth_service import hash_password


async def seed_users():
    """Create default users"""
    async with async_session_maker() as db:
        # Check if admin exists
        result = await db.execute(select(User).where(User.email == "admin@etanalytics.co.uk"))
        if result.scalar_one_or_none():
            print("Users already seeded")
            return
        
        users = [
            User(
                email="admin@etanalytics.co.uk",
                password_hash=hash_password("Admin2024!"),
                name="Admin User",
                role=UserRole.ADMIN.value,
                is_active=True,
                is_verified=True
            ),
            User(
                email="analyst@etanalytics.co.uk",
                password_hash=hash_password("Analyst2024!"),
                name="Analyst User",
                role=UserRole.ANALYST.value,
                is_active=True,
                is_verified=True
            ),
            User(
                email="issuer@etanalytics.co.uk",
                password_hash=hash_password("Issuer123!"),
                name="Demo Issuer",
                role=UserRole.ISSUER.value,
                is_active=True,
                is_verified=True
            ),
            User(
                email="clientservices@etanalytics.co.uk",
                password_hash=hash_password("ClientServices2024!"),
                name="Client Services",
                role=UserRole.CLIENT_SERVICES.value,
                is_active=True,
                is_verified=True
            )
        ]
        
        db.add_all(users)
        await db.commit()
        print(f"Created {len(users)} users")


async def seed_entities():
    """Create known entities for matching"""
    async with async_session_maker() as db:
        # Check if entities exist
        result = await db.execute(select(Entity).limit(1))
        if result.scalar_one_or_none():
            print("Entities already seeded")
            return
        
        entities = [
            # CSDs (Central Securities Depositories)
            Entity(pattern="EUROCLEAR", name="Euroclear", entity_type="csd", requires_disclosure=True, confidence=100, country="Belgium"),
            Entity(pattern="CLEARSTREAM", name="Clearstream", entity_type="csd", requires_disclosure=True, confidence=100, country="Luxembourg"),
            Entity(pattern="CREST", name="CREST (Euroclear UK)", entity_type="csd", requires_disclosure=True, confidence=100, country="UK"),
            
            # Global Custodians
            Entity(pattern="STATE STREET", name="State Street", entity_type="global_custodian", requires_disclosure=True, confidence=100, country="USA"),
            Entity(pattern="BNY MELLON", name="BNY Mellon", entity_type="global_custodian", requires_disclosure=True, confidence=100, country="USA"),
            Entity(pattern="JPMORGAN", name="JP Morgan", entity_type="global_custodian", requires_disclosure=True, confidence=100, country="USA"),
            Entity(pattern="NORTHERN TRUST", name="Northern Trust", entity_type="global_custodian", requires_disclosure=True, confidence=100, country="USA"),
            Entity(pattern="CITI", name="Citibank", entity_type="global_custodian", requires_disclosure=True, confidence=100, country="USA"),
            Entity(pattern="HSBC", name="HSBC", entity_type="global_custodian", requires_disclosure=True, confidence=100, country="UK"),
            
            # Nominees
            Entity(pattern="NOMS", name="Nominee Account", entity_type="pooled_nominee", requires_disclosure=True, confidence=80),
            Entity(pattern="NOMINEE", name="Nominee Account", entity_type="pooled_nominee", requires_disclosure=True, confidence=80),
            Entity(pattern="CLIENTS", name="Client Omnibus", entity_type="pooled_nominee", requires_disclosure=True, confidence=70),
            
            # Investment Decision Makers
            Entity(pattern="BLACKROCK", name="BlackRock", entity_type="asset_manager", requires_disclosure=False, confidence=100, country="USA"),
            Entity(pattern="VANGUARD", name="Vanguard", entity_type="asset_manager", requires_disclosure=False, confidence=100, country="USA"),
            Entity(pattern="FIDELITY", name="Fidelity", entity_type="asset_manager", requires_disclosure=False, confidence=100, country="USA"),
            Entity(pattern="PENSION FUND", name="Pension Fund", entity_type="pension_fund", requires_disclosure=False, confidence=80),
            Entity(pattern="PENSIOENFONDS", name="Pension Fund (NL)", entity_type="pension_fund", requires_disclosure=False, confidence=80, country="Netherlands"),
            Entity(pattern="WEALTH MANAGEMENT", name="Wealth Manager", entity_type="wealth_manager", requires_disclosure=False, confidence=70),
            
            # Platforms
            Entity(pattern="HARGREAVES LANSDOWN", name="Hargreaves Lansdown", entity_type="platform", requires_disclosure=False, confidence=100, country="UK"),
            Entity(pattern="INTERACTIVE INVESTOR", name="Interactive Investor", entity_type="platform", requires_disclosure=False, confidence=100, country="UK"),
            Entity(pattern="AJ BELL", name="AJ Bell", entity_type="platform", requires_disclosure=False, confidence=100, country="UK"),
            
            # Market Makers
            Entity(pattern="JANE STREET", name="Jane Street", entity_type="market_maker", requires_disclosure=False, confidence=100, country="USA"),
            Entity(pattern="FLOW TRADERS", name="Flow Traders", entity_type="market_maker", requires_disclosure=False, confidence=100, country="Netherlands"),
        ]
        
        db.add_all(entities)
        await db.commit()
        print(f"Created {len(entities)} entities")


async def seed_etf_products():
    """Create demo ETF products"""
    async with async_session_maker() as db:
        # Check if products exist
        result = await db.execute(select(ETFProduct).limit(1))
        if result.scalar_one_or_none():
            print("ETF products already seeded")
            return
        
        products = [
            # Amundi
            ETFProduct(isin="LU1681045370", ticker="CACC", name="Amundi MSCI World Climate Action", issuer_id="amundi", currency="EUR", current_aum=1200000000),
            ETFProduct(isin="LU1681043599", ticker="CW8", name="Amundi MSCI World UCITS ETF", issuer_id="amundi", currency="EUR", current_aum=2500000000),
            ETFProduct(isin="LU1681048804", ticker="PAEEM", name="Amundi MSCI Emerging Markets", issuer_id="amundi", currency="EUR", current_aum=800000000),
            ETFProduct(isin="LU1681049018", ticker="PANX", name="Amundi Nasdaq-100 UCITS ETF", issuer_id="amundi", currency="EUR", current_aum=1500000000),
            
            # BlackRock (iShares)
            ETFProduct(isin="IE00B4L5Y983", ticker="IWDA", name="iShares Core MSCI World UCITS ETF", issuer_id="blackrock", currency="USD", current_aum=50000000000),
            ETFProduct(isin="IE00B5BMR087", ticker="CSPX", name="iShares Core S&P 500 UCITS ETF", issuer_id="blackrock", currency="USD", current_aum=65000000000),
            ETFProduct(isin="IE00B4L5YC18", ticker="IEMA", name="iShares Core MSCI EM IMI UCITS ETF", issuer_id="blackrock", currency="USD", current_aum=15000000000),
            ETFProduct(isin="IE00BKM4GZ66", ticker="EIMI", name="iShares Core MSCI EM IMI UCITS ETF", issuer_id="blackrock", currency="USD", current_aum=8000000000),
            
            # Vanguard
            ETFProduct(isin="IE00B3RBWM25", ticker="VWRL", name="Vanguard FTSE All-World UCITS ETF", issuer_id="vanguard", currency="USD", current_aum=12000000000),
            ETFProduct(isin="IE00B3XXRP09", ticker="VUSA", name="Vanguard S&P 500 UCITS ETF", issuer_id="vanguard", currency="USD", current_aum=35000000000),
            ETFProduct(isin="IE00BK5BQT80", ticker="VWRA", name="Vanguard FTSE All-World UCITS ETF Acc", issuer_id="vanguard", currency="USD", current_aum=15000000000),
            ETFProduct(isin="IE00B4X9L533", ticker="VMID", name="Vanguard FTSE 250 UCITS ETF", issuer_id="vanguard", currency="GBP", current_aum=2500000000),
        ]
        
        db.add_all(products)
        await db.commit()
        print(f"Created {len(products)} ETF products")


async def main():
    print("Seeding ETAnalytics database...")
    
    await seed_users()
    await seed_entities()
    await seed_etf_products()
    
    print("\n✅ Seed complete!")


if __name__ == "__main__":
    asyncio.run(main())



