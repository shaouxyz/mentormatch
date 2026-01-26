# PowerShell script to set Firebase environment variables as EAS secrets
# Reads from .env file and sets them as EAS secrets

Write-Host "=== Setting Firebase Environment Variables as EAS Secrets ===" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path .env)) {
    Write-Host "❌ Error: .env file not found!" -ForegroundColor Red
    Write-Host "Please create .env file first (copy from env.example)"
    exit 1
}

# Check if eas CLI is installed
$easInstalled = Get-Command eas -ErrorAction SilentlyContinue
if (-not $easInstalled) {
    Write-Host "❌ Error: EAS CLI not found!" -ForegroundColor Red
    Write-Host "Install it with: npm install -g eas-cli"
    exit 1
}

# Read .env file
$envContent = Get-Content .env

foreach ($line in $envContent) {
    # Skip comments and empty lines
    if ($line -match '^\s*#' -or $line -match '^\s*$') {
        continue
    }
    
    # Parse key=value
    if ($line -match '^([^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        
        # Remove quotes if present
        if ($value -match '^"(.*)"$' -or $value -match "^'(.*)'$") {
            $value = $value.Trim('"', "'")
        }
        
        # Only process Firebase variables
        if ($key -like "EXPO_PUBLIC_FIREBASE_*") {
            Write-Host "Setting $key..." -ForegroundColor Yellow
            
            $result = eas secret:create --scope project --name $key --value $value --force 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✓ $key set successfully" -ForegroundColor Green
            } else {
                Write-Host "✗ Failed to set $key" -ForegroundColor Red
                Write-Host $result
            }
            Write-Host ""
        }
    }
}

Write-Host "=== Done ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Verify secrets with: eas secret:list" -ForegroundColor Yellow
