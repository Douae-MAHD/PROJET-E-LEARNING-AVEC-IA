# ============================================
# E-Learning Platform - Archive Cleanup Script
# Safe migration from legacy to new architecture
# ============================================

$ErrorActionPreference = "Stop"

# Get backend directory
$backendDir = Split-Path -Parent $PSScriptRoot
$archiveDir = Join-Path $backendDir ".archive"

Write-Host "Starting cleanup process..." -ForegroundColor Cyan
Write-Host "Backend directory: $backendDir" -ForegroundColor Cyan
Write-Host "Archive directory: $archiveDir" -ForegroundColor Cyan

# Create archive directory
if (-not (Test-Path $archiveDir)) {
    Write-Host "Creating .archive directory..." -ForegroundColor Cyan
    New-Item -ItemType Directory -Path $archiveDir -Force | Out-Null
    Write-Host "Archive directory created" -ForegroundColor Green
} else {
    Write-Host "Archive directory already exists" -ForegroundColor Yellow
}

# PHASE 1: Archive Test Files
Write-Host "`n=== PHASE 1: Archiving Test/Debug Files ===" -ForegroundColor Yellow

$testItems = @(
    "Test",
    "TEST_GEMINI_MODELS.js",
    "VERIFIER_GEMINI.js",
    "scripts/test-exercise-flow.js"
)

foreach ($item in $testItems) {
    $sourcePath = Join-Path $backendDir $item
    $destPath = Join-Path $archiveDir ([System.IO.Path]::GetFileName($item))
    
    if (Test-Path $sourcePath) {
        Write-Host "Moving $item..." -ForegroundColor Cyan
        Move-Item -Path $sourcePath -Destination $destPath -Force
        Write-Host "Moved: $item" -ForegroundColor Green
    } else {
        Write-Host "Not found: $item" -ForegroundColor Yellow
    }
}

# PHASE 2: Archive Legacy Routes
Write-Host "`n=== PHASE 2: Archiving Legacy Routes ===" -ForegroundColor Yellow

if (Test-Path (Join-Path $backendDir "routes")) {
    Write-Host "Moving legacy routes..." -ForegroundColor Cyan
    Move-Item -Path (Join-Path $backendDir "routes") -Destination (Join-Path $archiveDir "routes") -Force
    Write-Host "Moved: routes/" -ForegroundColor Green
} else {
    Write-Host "Not found: routes/" -ForegroundColor Yellow
}

# PHASE 3: Archive Legacy Middleware
Write-Host "`n=== PHASE 3: Archiving Legacy Middleware ===" -ForegroundColor Yellow

if (Test-Path (Join-Path $backendDir "middleware")) {
    Write-Host "Moving legacy middleware..." -ForegroundColor Cyan
    Move-Item -Path (Join-Path $backendDir "middleware") -Destination (Join-Path $archiveDir "middleware") -Force
    Write-Host "Moved: middleware/" -ForegroundColor Green
} else {
    Write-Host "Not found: middleware/" -ForegroundColor Yellow
}

# PHASE 4: Archive Legacy Services
Write-Host "`n=== PHASE 4: Archiving Legacy Services ===" -ForegroundColor Yellow

if (Test-Path (Join-Path $backendDir "services")) {
    Write-Host "Moving legacy services..." -ForegroundColor Cyan
    Move-Item -Path (Join-Path $backendDir "services") -Destination (Join-Path $archiveDir "services") -Force
    Write-Host "Moved: services/" -ForegroundColor Green
} else {
    Write-Host "Not found: services/" -ForegroundColor Yellow
}

# Summary
Write-Host "`n=== CLEANUP COMPLETE ===" -ForegroundColor Yellow
Write-Host "All legacy files archived to: .archive/" -ForegroundColor Green
Write-Host "Project is now ready for verification" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Run: npm start" -ForegroundColor Cyan
Write-Host "2. Test all API endpoints" -ForegroundColor Cyan
Write-Host "3. Check console for errors" -ForegroundColor Cyan
Write-Host "4. Verify all features working" -ForegroundColor Cyan
