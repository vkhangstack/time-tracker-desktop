# Convert PNG to ICO using .NET
# This creates a simple ICO file from a PNG image

# Change to project root
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
Set-Location $projectRoot

$pngPath = "build\appicon.png"
$icoPath = "build\windows\icon.ico"

Write-Host "Converting PNG to ICO..." -ForegroundColor Yellow

try {
    # Load the PNG image
    Add-Type -AssemblyName System.Drawing
    $png = [System.Drawing.Image]::FromFile((Resolve-Path $pngPath))

    # Create icon from bitmap
    $bitmap = New-Object System.Drawing.Bitmap $png
    $icon = [System.Drawing.Icon]::FromHandle($bitmap.GetHicon())

    # Save as ICO
    $fs = New-Object System.IO.FileStream($icoPath, [System.IO.FileMode]::Create)
    $icon.Save($fs)
    $fs.Close()

    # Cleanup
    $icon.Dispose()
    $bitmap.Dispose()
    $png.Dispose()

    Write-Host "✅ Successfully created icon.ico" -ForegroundColor Green
    $size = (Get-Item $icoPath).Length
    Write-Host "   Size: $([math]::Round($size/1KB, 2)) KB" -ForegroundColor Gray

} catch {
    Write-Host "❌ Failed to convert: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative solutions:" -ForegroundColor Yellow
    Write-Host "  1. Install ImageMagick: choco install imagemagick" -ForegroundColor Cyan
    Write-Host "  2. Convert online: https://convertio.co/png-ico/" -ForegroundColor Cyan
    Write-Host "  3. Use a proper ICO file" -ForegroundColor Cyan
    exit 1
}

