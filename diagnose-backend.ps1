# Backend Diagnostic Script
Write-Host "=== Backend Diagnostic ===" -ForegroundColor Cyan
Write-Host ""

# Check Python
Write-Host "1. Checking Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "   $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "   ERROR: Python not found!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Check if we're in backend directory
if (-not (Test-Path "app\main.py")) {
    Write-Host "2. Changing to backend directory..." -ForegroundColor Yellow
    Set-Location backend
}
Write-Host ""

# Check virtual environment
Write-Host "3. Checking virtual environment..." -ForegroundColor Yellow
if (Test-Path "venv\Scripts\activate.ps1") {
    Write-Host "   [OK] Virtual environment found" -ForegroundColor Green
    & "venv\Scripts\activate.ps1"
} else {
    Write-Host "   [WARNING] Virtual environment not found" -ForegroundColor Yellow
    Write-Host "   Run: python -m venv venv" -ForegroundColor White
}
Write-Host ""

# Check dependencies
Write-Host "4. Checking dependencies..." -ForegroundColor Yellow
$deps = @("fastapi", "uvicorn", "sqlalchemy", "pydantic", "dotenv", "web3")
foreach ($dep in $deps) {
    try {
        if ($dep -eq "dotenv") {
            python -c "from dotenv import load_dotenv; print('OK')" 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "   [OK] python-dotenv" -ForegroundColor Green
            } else {
                Write-Host "   [MISSING] python-dotenv" -ForegroundColor Red
            }
        } elseif ($dep -eq "web3") {
            python -c "from web3 import Web3; print('OK')" 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "   [OK] web3" -ForegroundColor Green
            } else {
                Write-Host "   [MISSING] web3" -ForegroundColor Red
            }
        } else {
            python -c "import $dep; print('OK')" 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "   [OK] $dep" -ForegroundColor Green
            } else {
                Write-Host "   [MISSING] $dep" -ForegroundColor Red
            }
        }
    } catch {
        Write-Host "   [ERROR] $dep" -ForegroundColor Red
    }
}
Write-Host ""

# Check key files
Write-Host "5. Checking key files..." -ForegroundColor Yellow
$keyFiles = @(
    "app\main.py",
    "app\models.py",
    "app\db.py",
    "app\services\credits_summary.py",
    "app\routes\submissions.py",
    "app\routes\exchange.py",
    "app\routes\accounts.py"
)
foreach ($file in $keyFiles) {
    if (Test-Path $file) {
        $size = (Get-Item $file).Length
        if ($size -eq 0) {
            Write-Host "   [EMPTY] $file" -ForegroundColor Red
        } else {
            Write-Host "   [OK] $file" -ForegroundColor Green
        }
    } else {
        Write-Host "   [MISSING] $file" -ForegroundColor Red
    }
}
Write-Host ""

# Check database
Write-Host "6. Checking database..." -ForegroundColor Yellow
if (Test-Path "offsetx.db") {
    Write-Host "   [OK] Database file exists" -ForegroundColor Green
} else {
    Write-Host "   [MISSING] Database file - run: python seed.py" -ForegroundColor Yellow
}
Write-Host ""

# Try to import main
Write-Host "7. Testing imports..." -ForegroundColor Yellow
try {
    python -c "from app.main import app; print('   [OK] Main app imports successfully')" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   [ERROR] Failed to import app.main" -ForegroundColor Red
        python -c "from app.main import app" 2>&1
    }
} catch {
    Write-Host "   [ERROR] Import failed" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== Diagnostic Complete ===" -ForegroundColor Cyan





