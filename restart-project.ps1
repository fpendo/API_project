# offsetX Project Restart Script
# This script helps restart all project services

Write-Host "=== offsetX Project Restart ===" -ForegroundColor Cyan
Write-Host ""

# Function to check if port is in use
function Test-Port {
    param([int]$Port)
    $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    return $null -ne $connection
}

# Function to kill process on port
function Stop-Port {
    param([int]$Port, [string]$ServiceName)
    if (Test-Port -Port $Port) {
        Write-Host "Stopping $ServiceName on port $Port..." -ForegroundColor Yellow
        Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | 
            ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
        Start-Sleep -Seconds 1
        Write-Host "$ServiceName stopped." -ForegroundColor Green
    } else {
        Write-Host "$ServiceName is not running on port $Port." -ForegroundColor Gray
    }
}

# Stop existing services
Write-Host "Stopping existing services..." -ForegroundColor Yellow
Stop-Port -Port 8545 -ServiceName "Hardhat Node"
Stop-Port -Port 8000 -ServiceName "Backend API"
Stop-Port -Port 5173 -ServiceName "Frontend"
Write-Host ""

# Check if we're in the project root
if (-not (Test-Path "package.json") -or -not (Test-Path "backend")) {
    Write-Host "Error: Please run this script from the project root directory." -ForegroundColor Red
    exit 1
}

# Ask user what they want to do
Write-Host "What would you like to do?" -ForegroundColor Cyan
Write-Host "1. Start all services (Hardhat + Backend + Frontend)"
Write-Host "2. Start Backend only"
Write-Host "3. Start Frontend only"
Write-Host "4. Start Hardhat node only"
Write-Host "5. Reset database and start all services"
Write-Host "6. Exit"
Write-Host ""
$choice = Read-Host "Enter your choice (1-6)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "Starting all services..." -ForegroundColor Cyan
        Write-Host ""
        Write-Host "You'll need to run each service in a separate terminal window." -ForegroundColor Yellow
        Write-Host ""
        
        # Start Hardhat node
        Write-Host "=== Terminal 1: Hardhat Node ===" -ForegroundColor Green
        Write-Host "Run: npx hardhat node" -ForegroundColor White
        Write-Host ""
        
        # Check database
        if (-not (Test-Path "backend\offsetx.db")) {
            Write-Host "Database not found. Initializing..." -ForegroundColor Yellow
            if (Test-Path "backend\venv\Scripts\activate.ps1") {
                & "backend\venv\Scripts\activate.ps1"
                Set-Location backend
                python seed.py
                Set-Location ..
            } else {
                Write-Host "Warning: Virtual environment not found. Please run 'python -m venv venv' in backend directory first." -ForegroundColor Yellow
            }
        }
        
        # Start Backend
        Write-Host "=== Terminal 2: Backend API ===" -ForegroundColor Green
        Write-Host "Run:" -ForegroundColor White
        Write-Host "  cd backend" -ForegroundColor White
        Write-Host "  .\venv\Scripts\activate" -ForegroundColor White
        Write-Host "  uvicorn app.main:app --reload --port 8000" -ForegroundColor White
        Write-Host ""
        
        # Start Frontend
        Write-Host "=== Terminal 3: Frontend ===" -ForegroundColor Green
        Write-Host "Run:" -ForegroundColor White
        Write-Host "  cd backend\frontend" -ForegroundColor White
        Write-Host "  npm run dev" -ForegroundColor White
        Write-Host ""
        
        Write-Host "All services will be available at:" -ForegroundColor Cyan
        Write-Host "  - Hardhat: http://localhost:8545" -ForegroundColor White
        Write-Host "  - Backend: http://localhost:8000" -ForegroundColor White
        Write-Host "  - Frontend: http://localhost:5173" -ForegroundColor White
    }
    
    "2" {
        Write-Host ""
        Write-Host "Starting Backend..." -ForegroundColor Cyan
        
        if (-not (Test-Path "backend\venv\Scripts\activate.ps1")) {
            Write-Host "Error: Virtual environment not found. Please create it first:" -ForegroundColor Red
            Write-Host "  cd backend" -ForegroundColor White
            Write-Host "  python -m venv venv" -ForegroundColor White
            exit 1
        }
        
        if (-not (Test-Path "backend\offsetx.db")) {
            Write-Host "Database not found. Initializing..." -ForegroundColor Yellow
            Set-Location backend
            & "venv\Scripts\activate.ps1"
            python seed.py
            Set-Location ..
        }
        
        Write-Host "Run in a new terminal:" -ForegroundColor Yellow
        Write-Host "  cd backend" -ForegroundColor White
        Write-Host "  .\venv\Scripts\activate" -ForegroundColor White
        Write-Host "  uvicorn app.main:app --reload --port 8000" -ForegroundColor White
    }
    
    "3" {
        Write-Host ""
        Write-Host "Starting Frontend..." -ForegroundColor Cyan
        Write-Host "Run in a new terminal:" -ForegroundColor Yellow
        Write-Host "  cd backend\frontend" -ForegroundColor White
        Write-Host "  npm run dev" -ForegroundColor White
    }
    
    "4" {
        Write-Host ""
        Write-Host "Starting Hardhat Node..." -ForegroundColor Cyan
        Write-Host "Run in a new terminal:" -ForegroundColor Yellow
        Write-Host "  npx hardhat node" -ForegroundColor White
    }
    
    "5" {
        Write-Host ""
        Write-Host "Resetting database and starting all services..." -ForegroundColor Cyan
        
        if (-not (Test-Path "backend\venv\Scripts\activate.ps1")) {
            Write-Host "Error: Virtual environment not found." -ForegroundColor Red
            exit 1
        }
        
        # Remove database
        if (Test-Path "backend\offsetx.db") {
            Write-Host "Removing existing database..." -ForegroundColor Yellow
            Remove-Item "backend\offsetx.db" -Force
        }
        
        # Recreate database
        Write-Host "Creating new database..." -ForegroundColor Yellow
        Set-Location backend
        & "venv\Scripts\activate.ps1"
        python seed.py
        Set-Location ..
        
        Write-Host "Database reset complete!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Now start services manually (see option 1 for commands)." -ForegroundColor Yellow
    }
    
    "6" {
        Write-Host "Exiting..." -ForegroundColor Gray
        exit 0
    }
    
    default {
        Write-Host "Invalid choice. Exiting..." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green





