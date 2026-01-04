from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from pathlib import Path
from .routes import auth, submissions, regulator, landowner, accounts, exchange, operator, developer, planning, broker

# Load environment variables from .env file
# Load from backend/.env explicitly to ensure it's found regardless of working directory
# __file__ is backend/app/main.py, so parent.parent is backend/
env_path = Path(__file__).parent.parent / '.env'
# Convert to absolute path to ensure it's found
env_path = env_path.resolve()
# Debug: print the path being used (can remove later)
print(f"Loading .env from: {env_path}")
print(f".env file exists: {env_path.exists()}")

# Try loading with explicit path and override=True to ensure it loads
# First, check for and remove BOM if present
if env_path.exists():
    with open(env_path, 'rb') as f:
        content = f.read()
    # Check for UTF-8 BOM
    if content.startswith(b'\xef\xbb\xbf'):
        print("WARNING: .env file has UTF-8 BOM. Removing it...")
        # Remove BOM and rewrite file
        with open(env_path, 'wb') as f:
            f.write(content[3:])
        print("BOM removed. Please restart the backend.")

result = load_dotenv(dotenv_path=env_path, override=True)
print(f"load_dotenv() returned: {result}")

# Also try loading from current directory as fallback
if not result:
    print("Trying to load from current directory as fallback...")
    load_dotenv(override=True)

# Verify and print all important environment variables
print("\n" + "="*60)
print("ENVIRONMENT VARIABLES STATUS")
print("="*60)

env_vars = {
    "SCHEME_NFT_CONTRACT_ADDRESS": os.getenv("SCHEME_NFT_CONTRACT_ADDRESS"),
    "SCHEME_CREDITS_CONTRACT_ADDRESS": os.getenv("SCHEME_CREDITS_CONTRACT_ADDRESS"),
    "PLANNING_LOCK_CONTRACT_ADDRESS": os.getenv("PLANNING_LOCK_CONTRACT_ADDRESS"),
    "RPC_URL": os.getenv("RPC_URL", "http://127.0.0.1:8545"),
    "REGULATOR_PRIVATE_KEY": os.getenv("REGULATOR_PRIVATE_KEY"),
    "LANDOWNER_PRIVATE_KEY": os.getenv("LANDOWNER_PRIVATE_KEY"),
    "DEVELOPER_PRIVATE_KEY": os.getenv("DEVELOPER_PRIVATE_KEY"),
    "TRADING_ACCOUNT_ADDRESS": os.getenv("TRADING_ACCOUNT_ADDRESS", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"),
    "TRADING_ACCOUNT_PRIVATE_KEY": os.getenv("TRADING_ACCOUNT_PRIVATE_KEY")
}

required_vars = [
    "SCHEME_NFT_CONTRACT_ADDRESS",
    "SCHEME_CREDITS_CONTRACT_ADDRESS",
    "PLANNING_LOCK_CONTRACT_ADDRESS",
    "RPC_URL",
    "REGULATOR_PRIVATE_KEY"
]

all_loaded = True
for var_name, var_value in env_vars.items():
    if var_name in required_vars:
        if var_value:
            print(f"[OK] {var_name}: {var_value}")
        else:
            print(f"[X] {var_name}: NOT SET (REQUIRED)")
            all_loaded = False
    else:
        if var_value:
            print(f"[OK] {var_name}: {var_value}")
        else:
            print(f"[-] {var_name}: Not set (using default or optional)")

print("="*60)
if all_loaded:
    print("[OK] All required environment variables are loaded")
else:
    print("[X] WARNING: Some required environment variables are missing!")
    if env_path.exists():
        print(f"\nReading .env file directly from: {env_path}")
        with open(env_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            print(f"File has {len(lines)} lines:")
            for i, line in enumerate(lines, 1):
                # Mask private keys for security
                if 'PRIVATE_KEY' in line and '=' in line:
                    key_name = line.split('=')[0].strip()
                    print(f"  Line {i}: {key_name}=***MASKED***")
                else:
                    print(f"  Line {i}: {line.rstrip()}")
print("="*60 + "\n")

app = FastAPI()

# Configure CORS for frontend integration
# IMPORTANT: CORS middleware must be added BEFORE routers to handle preflight requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],  # Explicitly allow frontend
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(submissions.router, prefix="/submissions", tags=["submissions"])
app.include_router(regulator.router, prefix="/regulator", tags=["regulator"])
app.include_router(landowner.router, prefix="/landowner", tags=["landowner"])
app.include_router(accounts.router, prefix="/accounts", tags=["accounts"])
app.include_router(exchange.router, prefix="/exchange", tags=["exchange"])
app.include_router(operator.router, prefix="/operator", tags=["operator"])
app.include_router(developer.router, prefix="/developer", tags=["developer"])
app.include_router(planning.router, prefix="/planning", tags=["planning"])
app.include_router(broker.router, prefix="/broker", tags=["broker"])

@app.get("/health")
def health():
    return {"status": "ok"}


# Start bot worker on startup (optional - comment out if you want manual control)
@app.on_event("startup")
def start_bot_worker():
    """Start the bot worker to automatically execute market making bots."""
    try:
        from .services.bot_worker import start_bot_worker
        # Start worker with 60 second interval (adjust as needed)
        start_bot_worker(interval_seconds=60)
        print("[INFO] Bot worker started (60 second interval)")
    except Exception as e:
        print(f"[WARNING] Failed to start bot worker: {str(e)}")
        print("[INFO] You can still manually trigger bot orders via the API")


@app.on_event("shutdown")
def stop_bot_worker():
    """Stop the bot worker on shutdown."""
    try:
        from .services.bot_worker import stop_bot_worker
        stop_bot_worker()
        print("[INFO] Bot worker stopped")
    except Exception as e:
        print(f"[WARNING] Error stopping bot worker: {str(e)}")

