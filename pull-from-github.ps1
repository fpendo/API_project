# Pull from GitHub Script
# This script finds Git and pulls the latest changes

Write-Host "=== Pulling from GitHub ===" -ForegroundColor Cyan
Write-Host ""

# Common Git installation paths
$gitPaths = @(
    "$env:LOCALAPPDATA\GitHubDesktop\bin\git.exe",  # GitHub Desktop's Git
    "C:\Program Files\Git\bin\git.exe",
    "C:\Program Files (x86)\Git\bin\git.exe",
    "$env:LOCALAPPDATA\Programs\Git\bin\git.exe",
    "$env:ProgramFiles\Git\bin\git.exe",
    "$env:ProgramFiles(x86)\Git\bin\git.exe"
)

$gitExe = $null
foreach ($path in $gitPaths) {
    if (Test-Path $path) {
        $gitExe = $path
        Write-Host "Found Git at: $path" -ForegroundColor Green
        break
    }
}

if (-not $gitExe) {
    Write-Host "❌ Git not found in common locations." -ForegroundColor Red
    Write-Host ""
    Write-Host "Please use one of these options:" -ForegroundColor Yellow
    Write-Host "1. Use GitHub Desktop:" -ForegroundColor White
    Write-Host "   - Open GitHub Desktop" -ForegroundColor Gray
    Write-Host "   - Select your repository" -ForegroundColor Gray
    Write-Host "   - Click 'Pull origin' button" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Install Git for Windows:" -ForegroundColor White
    Write-Host "   - Download from: https://git-scm.com/download/win" -ForegroundColor Gray
    Write-Host "   - During installation, select 'Add Git to PATH'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Add Git to PATH manually (see HOW_TO_PULL_FROM_GITHUB.md)" -ForegroundColor White
    exit 1
}

# Check if we're in a git repository
$gitDir = & $gitExe rev-parse --git-dir 2>$null
if (-not $gitDir) {
    Write-Host "❌ Not a Git repository. Make sure you're in the project root." -ForegroundColor Red
    exit 1
}

# Check current status
Write-Host "Checking repository status..." -ForegroundColor Yellow
$status = & $gitExe status --porcelain
if ($status) {
    Write-Host "⚠️  Warning: You have uncommitted changes:" -ForegroundColor Yellow
    Write-Host $status -ForegroundColor Gray
    Write-Host ""
    $response = Read-Host "Do you want to stash them before pulling? (y/n)"
    if ($response -eq 'y' -or $response -eq 'Y') {
        Write-Host "Stashing changes..." -ForegroundColor Yellow
        & $gitExe stash
        Write-Host "Changes stashed." -ForegroundColor Green
    } else {
        Write-Host "Continuing with uncommitted changes..." -ForegroundColor Yellow
    }
}

# Fetch latest changes
Write-Host ""
Write-Host "Fetching latest changes from GitHub..." -ForegroundColor Yellow
& $gitExe fetch origin

# Check if we're behind
$localCommit = & $gitExe rev-parse HEAD
$remoteCommit = & $gitExe rev-parse origin/main 2>$null

if ($localCommit -eq $remoteCommit) {
    Write-Host "✅ Your local branch is up to date with origin/main" -ForegroundColor Green
} else {
    Write-Host "Pulling latest changes..." -ForegroundColor Yellow
    $pullOutput = & $gitExe pull origin main 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Successfully pulled from GitHub!" -ForegroundColor Green
        Write-Host $pullOutput -ForegroundColor Gray
    } else {
        Write-Host "❌ Error pulling from GitHub:" -ForegroundColor Red
        Write-Host $pullOutput -ForegroundColor Red
        Write-Host ""
        Write-Host "You may have merge conflicts. Resolve them manually and try again." -ForegroundColor Yellow
        exit 1
    }
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green

