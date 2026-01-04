# PowerShell script to deploy contracts and update .env file
# Usage: .\deploy-and-update-env.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deploying Contracts and Updating .env" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Hardhat node is running
Write-Host "Checking if Hardhat node is running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:8545" -Method Post -Body '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' -ContentType "application/json" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "[OK] Hardhat node is running" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Hardhat node is not running!" -ForegroundColor Red
    Write-Host "Please start Hardhat node first:" -ForegroundColor Yellow
    Write-Host "  npx hardhat node" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "Deploying contracts..." -ForegroundColor Yellow

# Change to project root
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

# Run deployment script
$deployOutput = npx hardhat run scripts/deploy-and-update-env.ts --network localhost 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[SUCCESS] Contracts deployed and .env updated!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Contract addresses:" -ForegroundColor Cyan
    $deployOutput | Select-String -Pattern "deployed to:" | ForEach-Object {
        Write-Host "  $_" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "Setting up trading account approvals..." -ForegroundColor Yellow
    
    # Change to backend directory for approval script
    Set-Location (Join-Path $projectRoot "backend")
    
    # Set up trading account approvals
    $approvalOutput = python setup_trading_account_approvals.py 2>&1
    $approvalExitCode = $LASTEXITCODE
    
    # Go back to project root
    Set-Location $projectRoot
    
    if ($approvalExitCode -eq 0) {
        Write-Host "[SUCCESS] Trading account approvals set up!" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] Approval setup may have failed. Check output:" -ForegroundColor Yellow
        Write-Host $approvalOutput
    }
    
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Restart your backend server to load new addresses" -ForegroundColor White
    Write-Host "2. The .env file has been automatically updated" -ForegroundColor White
    Write-Host "3. Trading account approvals are set up" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "[ERROR] Deployment failed!" -ForegroundColor Red
    Write-Host $deployOutput
    exit 1
}

