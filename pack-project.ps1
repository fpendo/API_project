# pack-project.ps1
# Creates a portable ZIP archive of the offsetX project
# Excludes node_modules, .git, databases, and other generated files

param(
    [string]$ProjectName = "offsetX",
    [string]$OutputName = "offsetX_portable"
)

$ErrorActionPreference = "Stop"

# Paths
$source = "C:\Users\fpend\OneDrive\Desktop\projects\$ProjectName"
$staging = "C:\Users\fpend\OneDrive\Desktop\${OutputName}_staging"
$destination = "C:\Users\fpend\OneDrive\Desktop\${OutputName}.zip"

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  PACKING PROJECT: $ProjectName" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check source exists
if (-not (Test-Path $source)) {
    Write-Host "ERROR: Source folder not found: $source" -ForegroundColor Red
    exit 1
}

# Step 1: Clean up any existing staging folder
if (Test-Path $staging) {
    Write-Host "[1/4] Cleaning up previous staging folder..." -ForegroundColor Yellow
    Remove-Item -Path $staging -Recurse -Force
}

# Step 2: Copy to staging (excluding unwanted folders)
Write-Host "[2/4] Copying files to staging folder..." -ForegroundColor Yellow
Write-Host "      Excluding: node_modules, .git, cache, artifacts, typechain-types, __pycache__, .venv, *.db" -ForegroundColor Gray

# Use robocopy with exclusions
# /E = copy subdirectories including empty ones
# /XD = exclude directories
# /XF = exclude files
# /NFL /NDL = no file/directory listing (quieter output)
# /NJH /NJS = no job header/summary
$robocopyArgs = @(
    $source,
    $staging,
    "/E",
    "/XD", "node_modules", ".git", "cache", "artifacts", "typechain-types", "__pycache__", ".venv", ".cursor",
    "/XF", "*.db", "*.pyc", "*.pyo",
    "/NFL", "/NDL", "/NJH", "/NJS", "/NC", "/NS", "/NP"
)

$robocopyResult = & robocopy @robocopyArgs

# Robocopy exit codes: 0-7 are success, 8+ are errors
if ($LASTEXITCODE -ge 8) {
    Write-Host "ERROR: Robocopy failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit 1
}

Write-Host "      Files copied successfully" -ForegroundColor Green

# Step 3: Create zip
Write-Host "[3/4] Creating ZIP archive..." -ForegroundColor Yellow

if (Test-Path $destination) {
    Write-Host "      Removing existing archive..." -ForegroundColor Gray
    Remove-Item $destination -Force
}

try {
    Compress-Archive -Path "$staging\*" -DestinationPath $destination -CompressionLevel Optimal
    Write-Host "      Archive created successfully" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to create ZIP archive: $_" -ForegroundColor Red
    exit 1
}

# Step 4: Clean up staging
Write-Host "[4/4] Cleaning up staging folder..." -ForegroundColor Yellow
Remove-Item -Path $staging -Recurse -Force
Write-Host "      Cleanup complete" -ForegroundColor Green

# Report
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  SUCCESS!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

$fileInfo = Get-Item $destination
$sizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
$sizeKB = [math]::Round($fileInfo.Length / 1KB, 0)

Write-Host "Archive created:" -ForegroundColor White
Write-Host "  Path: $destination" -ForegroundColor Cyan
Write-Host "  Size: $sizeMB MB ($sizeKB KB)" -ForegroundColor Cyan
Write-Host ""
Write-Host "To unpack later:" -ForegroundColor White
Write-Host "  1. Create destination folder:" -ForegroundColor Gray
Write-Host "     New-Item -ItemType Directory -Path 'C:\path\to\nemx'" -ForegroundColor Yellow
Write-Host ""
Write-Host "  2. Extract archive:" -ForegroundColor Gray
Write-Host "     Expand-Archive -Path '$destination' -DestinationPath 'C:\path\to\nemx'" -ForegroundColor Yellow
Write-Host ""
Write-Host "  3. Follow UNPACK_INSTRUCTIONS.md in the extracted folder" -ForegroundColor Gray
Write-Host ""
Write-Host "================================================" -ForegroundColor Green

