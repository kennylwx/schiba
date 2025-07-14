$ErrorActionPreference = 'Stop'

$packageName = 'schiba'
$toolsDir = "$(Split-Path -parent $MyInvocation.MyCommand.Definition)"

# Install via npm
Write-Host "Installing $packageName via npm..." -ForegroundColor Green
npm install -g schiba

# Verify installation
if (Get-Command schiba -ErrorAction SilentlyContinue) {
    Write-Host "Schiba installed successfully" -ForegroundColor Green
    Write-Host "Run 'schiba --help' to get started" -ForegroundColor Yellow
} else {
    throw "Schiba installation failed"
}