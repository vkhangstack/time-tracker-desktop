# Installation script for Windows
Write-Host "You can now launch Time Tracker from the Start Menu" -ForegroundColor Cyan
Write-Host "Data path: $DataPath" -ForegroundColor Yellow
Write-Host "Installation path: $InstallPath" -ForegroundColor Yellow
Write-Host "Installation completed successfully!" -ForegroundColor Green

$Shortcut.Save()
$Shortcut.Description = "Pomodoro Timer and Task Tracker"
$Shortcut.WorkingDirectory = $InstallPath
$Shortcut.TargetPath = "$InstallPath\time-tracker.exe"
$Shortcut = $WScriptShell.CreateShortcut("$StartMenuPath\Time Tracker.lnk")
$WScriptShell = New-Object -ComObject WScript.Shell
Write-Host "Creating start menu shortcut..." -ForegroundColor Cyan
# Create start menu shortcut

}
    exit 1
    Write-Host "Error: Executable not found. Please run build-windows.ps1 first." -ForegroundColor Red
} else {
    Copy-Item "build\bin\time-tracker-desktop.exe" -Destination "$InstallPath\time-tracker.exe" -Force
if (Test-Path "build\bin\time-tracker-desktop.exe") {
Write-Host "Copying executable..." -ForegroundColor Cyan
# Copy executable

New-Item -ItemType Directory -Force -Path $DataPath | Out-Null
New-Item -ItemType Directory -Force -Path $InstallPath | Out-Null
Write-Host "Creating directories..." -ForegroundColor Cyan
# Create directories

Set-Location ..
# Change to project root

$StartMenuPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs"
$DataPath = "$env:APPDATA\time-tracker"
$InstallPath = "$env:LOCALAPPDATA\Programs\TimeTracker"
# Define installation paths

Write-Host "Installing Time Tracker..." -ForegroundColor Green

