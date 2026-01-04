# Script to compare local files with GitHub
# This helps identify what files exist locally vs what's committed

Write-Host "=== Comparing Local Files with Git Repository ===" -ForegroundColor Cyan
Write-Host ""

# Check if .git exists
if (-not (Test-Path ".git")) {
    Write-Host "Error: Not a git repository!" -ForegroundColor Red
    exit 1
}

# Get the current commit hash
$currentCommit = Get-Content ".git\refs\heads\main" -ErrorAction SilentlyContinue
$remoteCommit = Get-Content ".git\refs\remotes\origin\main" -ErrorAction SilentlyContinue

Write-Host "Local commit:  $currentCommit" -ForegroundColor Yellow
Write-Host "Remote commit: $remoteCommit" -ForegroundColor Yellow
Write-Host ""

if ($currentCommit -eq $remoteCommit) {
    Write-Host "[OK] Local and remote are at the same commit" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Local and remote are at different commits!" -ForegroundColor Red
    Write-Host "  You may need to pull or push changes" -ForegroundColor Yellow
}
Write-Host ""

# List all Python files in backend
Write-Host "=== Backend Python Files (Local) ===" -ForegroundColor Cyan
$backendFiles = Get-ChildItem -Path "backend" -Recurse -Filter "*.py" | Where-Object { $_.FullName -notmatch "__pycache__" -and $_.FullName -notmatch "venv" } | ForEach-Object { $_.FullName.Replace((Get-Location).Path + "\", "") }
$backendFiles | Sort-Object | ForEach-Object { Write-Host "  $_" -ForegroundColor White }

Write-Host ""
Write-Host "Total backend Python files: $($backendFiles.Count)" -ForegroundColor Yellow
Write-Host ""

# List all TypeScript/React files
Write-Host "=== Frontend TypeScript Files (Local) ===" -ForegroundColor Cyan
$frontendFiles = Get-ChildItem -Path "backend\frontend\src" -Recurse -Filter "*.ts*" -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName.Replace((Get-Location).Path + "\", "") }
if ($frontendFiles) {
    $frontendFiles | Sort-Object | ForEach-Object { Write-Host "  $_" -ForegroundColor White }
    Write-Host ""
    Write-Host "Total frontend TypeScript files: $($frontendFiles.Count)" -ForegroundColor Yellow
} else {
    Write-Host "  No TypeScript files found in backend\frontend\src" -ForegroundColor Gray
}
Write-Host ""

# List all Solidity files
Write-Host "=== Smart Contract Files (Local) ===" -ForegroundColor Cyan
$contractFiles = Get-ChildItem -Path "contracts" -Filter "*.sol" -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName.Replace((Get-Location).Path + "\", "") }
if ($contractFiles) {
    $contractFiles | Sort-Object | ForEach-Object { Write-Host "  $_" -ForegroundColor White }
    Write-Host ""
    Write-Host "Total contract files: $($contractFiles.Count)" -ForegroundColor Yellow
} else {
    Write-Host "  No Solidity files found" -ForegroundColor Gray
}
Write-Host ""

# Check for key files
Write-Host "=== Key Files Check ===" -ForegroundColor Cyan
$keyFiles = @(
    "backend\app\main.py",
    "backend\app\models.py",
    "backend\app\db.py",
    "backend\app\services\credits_summary.py",
    "backend\app\routes\operator.py",
    "backend\app\routes\exchange.py",
    "backend\requirements.txt",
    "package.json",
    "hardhat.config.ts",
    "contracts\PlanningLock.sol",
    "contracts\SchemeCredits.sol",
    "contracts\SchemeNFT.sol"
)

foreach ($file in $keyFiles) {
    if (Test-Path $file) {
        Write-Host "  [OK] $file" -ForegroundColor Green
    } else {
        Write-Host "  [MISSING] $file" -ForegroundColor Red
    }
}
Write-Host ""

# Check for empty files
Write-Host "=== Empty Files Check ===" -ForegroundColor Cyan
$emptyFiles = Get-ChildItem -Path "backend\app" -Recurse -Filter "*.py" | Where-Object { $_.Length -eq 0 -and $_.FullName -notmatch "__pycache__" }
if ($emptyFiles) {
    Write-Host "  Found empty files:" -ForegroundColor Yellow
    $emptyFiles | ForEach-Object { 
        $relativePath = $_.FullName.Replace((Get-Location).Path + "\", "")
        Write-Host "    [EMPTY] $relativePath" -ForegroundColor Red 
    }
} else {
    Write-Host "  [OK] No empty Python files found" -ForegroundColor Green
}
Write-Host ""

Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "To see what's different from GitHub:" -ForegroundColor Yellow
Write-Host "1. Open GitHub Desktop (if installed)" -ForegroundColor White
Write-Host "2. Or visit: https://github.com/fpendo/offsetX" -ForegroundColor White
Write-Host "3. Compare the file structure there with what's shown above" -ForegroundColor White
Write-Host ""
