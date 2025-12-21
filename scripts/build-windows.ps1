# Build script for Windows with NSIS installer
# Requires: Wails v2, Go, Node.js, and NSIS installed

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Time Tracker - Windows Build with NSIS" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Change to project root
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
Write-Host "Project root: $projectRoot" -ForegroundColor Gray
Set-Location $projectRoot

# Set environment variables for static build
$env:GOOS = "windows"
$env:GOARCH = "amd64"
$env:CGO_ENABLED = "0"

Write-Host ""
Write-Host "Environment Variables:" -ForegroundColor Yellow
Write-Host "  GOOS: $env:GOOS"
Write-Host "  GOARCH: $env:GOARCH"
Write-Host "  CGO_ENABLED: $env:CGO_ENABLED"
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Check Wails
Write-Host -NoNewline "  Checking Wails... "
try {
    $wailsVersion = wails version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK" -ForegroundColor Green
    } else {
        Write-Host "NOT FOUND" -ForegroundColor Red
        Write-Host ""
        Write-Host "ERROR: Wails is not installed or not in PATH" -ForegroundColor Red
        Write-Host "Install Wails: https://wails.io/docs/gettingstarted/installation" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "NOT FOUND" -ForegroundColor Red
    Write-Host ""
    Write-Host "ERROR: Wails is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Install Wails: https://wails.io/docs/gettingstarted/installation" -ForegroundColor Yellow
    exit 1
}

# Check Go
Write-Host -NoNewline "  Checking Go... "
try {
    $goVersion = go version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK" -ForegroundColor Green
    } else {
        Write-Host "NOT FOUND" -ForegroundColor Red
        Write-Host ""
        Write-Host "ERROR: Go is not installed or not in PATH" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "NOT FOUND" -ForegroundColor Red
    Write-Host ""
    Write-Host "ERROR: Go is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Check Node.js
Write-Host -NoNewline "  Checking Node.js... "
try {
    $nodeVersion = node --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK" -ForegroundColor Green
    } else {
        Write-Host "NOT FOUND" -ForegroundColor Red
        Write-Host ""
        Write-Host "ERROR: Node.js is not installed or not in PATH" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "NOT FOUND" -ForegroundColor Red
    Write-Host ""
    Write-Host "ERROR: Node.js is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Check NSIS (optional)
Write-Host -NoNewline "  Checking NSIS... "
$nsisPath = ""
$buildNSIS = $false

if (Test-Path "C:\Program Files (x86)\NSIS\makensis.exe") {
    $nsisPath = "C:\Program Files (x86)\NSIS\makensis.exe"
    $buildNSIS = $true
    Write-Host "OK" -ForegroundColor Green
} elseif (Test-Path "C:\Program Files\NSIS\makensis.exe") {
    $nsisPath = "C:\Program Files\NSIS\makensis.exe"
    $buildNSIS = $true
    Write-Host "OK" -ForegroundColor Green
} else {
    Write-Host "NOT FOUND (optional)" -ForegroundColor Yellow
    Write-Host "    WARNING: NSIS not installed. Binary-only build will proceed." -ForegroundColor Yellow
    Write-Host "    Install from: https://nsis.sourceforge.io/" -ForegroundColor Yellow
}

Write-Host ""

# Clean previous build
Write-Host "Cleaning previous build..." -ForegroundColor Yellow
if (Test-Path "build\bin") {
    Remove-Item -Recurse -Force "build\bin" -ErrorAction SilentlyContinue
    Write-Host "  Cleaned build\bin directory" -ForegroundColor Gray
}
Write-Host ""

# Build the application
Write-Host "Building application..." -ForegroundColor Yellow
Write-Host ""

if ($buildNSIS) {
    Write-Host "Building with NSIS installer..." -ForegroundColor Cyan
    wails build -clean -platform windows/amd64 -nsis -ldflags "-s -w"
} else {
    Write-Host "Building binary only (NSIS not available)..." -ForegroundColor Cyan
    wails build -clean -platform windows/amd64 -ldflags "-s -w"
}

$buildExitCode = $LASTEXITCODE

Write-Host ""

# Check build result
if ($buildExitCode -eq 0) {
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host "  BUILD SUCCESSFUL!" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host ""

    # Display binary info
    if (Test-Path "build\bin\time-tracker-desktop.exe") {
        $binaryPath = Resolve-Path "build\bin\time-tracker-desktop.exe"
        $fileSize = (Get-Item $binaryPath).Length / 1MB
        Write-Host "Binary created:" -ForegroundColor Green
        Write-Host "  Path: $binaryPath"
        Write-Host "  Size: $([math]::Round($fileSize, 2)) MB"
        Write-Host ""
    }

    # Display installer info
    if ($buildNSIS) {
        $installerPath = Get-ChildItem "build\bin\*-installer.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($installerPath) {
            $installerSize = $installerPath.Length / 1MB
            Write-Host "Installer created:" -ForegroundColor Green
            Write-Host "  Path: $($installerPath.FullName)"
            Write-Host "  Size: $([math]::Round($installerSize, 2)) MB"
            Write-Host ""
        }
    }

    Write-Host "Features included:" -ForegroundColor Yellow
    Write-Host "  - Pomodoro Timer (25/45/60 min)"
    Write-Host "  - Task Management"
    Write-Host "  - Session Reports"
    Write-Host "  - Water Reminders (custom intervals)"
    Write-Host "  - Multi-language (6 languages)"
    Write-Host "  - System Tray Integration"
    Write-Host "  - Session Persistence"
    Write-Host ""

    if ($buildNSIS) {
        Write-Host "Installer features:" -ForegroundColor Yellow
        Write-Host "  - Desktop & Start Menu shortcuts"
        Write-Host "  - Auto-install WebView2"
        Write-Host "  - Professional uninstaller"
        Write-Host "  - Preserves user data"
        Write-Host ""
    }

    Write-Host "Build complete! Ready for distribution." -ForegroundColor Green
    Write-Host ""

} else {
    Write-Host "============================================================" -ForegroundColor Red
    Write-Host "  BUILD FAILED!" -ForegroundColor Red
    Write-Host "============================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Build exited with code: $buildExitCode" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting steps:" -ForegroundColor Yellow
    Write-Host "  1. Run 'wails doctor' to check your environment"
    Write-Host "  2. Check the error messages above"
    Write-Host "  3. Try running 'npm install' in the frontend directory"
    Write-Host "  4. Try running 'go mod download' in the project root"
    Write-Host ""
    exit 1
}

