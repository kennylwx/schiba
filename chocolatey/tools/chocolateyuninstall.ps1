$ErrorActionPreference = 'Stop'

$packageName = 'schiba'

# Uninstall via npm
Write-Host "Uninstalling $packageName..." -ForegroundColor Yellow
npm uninstall -g schiba

Write-Host "Schiba uninstalled successfully" -ForegroundColor Green