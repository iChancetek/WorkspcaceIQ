# upload-secrets.ps1
# Script to upload keys from .env.local and firebase-service-account.json to Google Secret Manager

$project = "chancescribe"
$envFile = Join-Path $PSScriptRoot ".env.local"
$saFile = Join-Path $PSScriptRoot "firebase-service-account.json"

if (-not (Test-Path $envFile)) {
    Write-Error ".env.local not found in project root!"
    exit 1
}

Write-Host "Reading .env.local..." -ForegroundColor Cyan
$lines = Get-Content $envFile

# Sensitive keys we want to store in Secret Manager
$secretKeys = @("OPENAI_API_KEY", "PINECONE_API_KEY", "PINECONE_INDEX_HOST", "LANGSMITH_API_KEY")

foreach ($line in $lines) {
    if ($line -match '^\s*([^#=\s]+)\s*=\s*(.*)\s*$') {
        $key = $Matches[1].Trim()
        $val = $Matches[2].Trim()
        
        # Strip optional quotes
        if ($val -match '^"(.*)"$') { $val = $Matches[1] }
        if ($val -match "^'(.*)'$") { $val = $Matches[1] }
        
        if ($secretKeys -contains $key) {
            Write-Host "Uploading $key to Google Secret Manager..." -ForegroundColor Yellow
            
            # Check if secret exists
            $exists = $true
            $null = gcloud secrets describe $key --project=$project --quiet 2>&1
            if ($LastExitCode -ne 0) {
                $exists = $false
            }
            
            if (-not $exists) {
                Write-Host "Creating secret $key..." -ForegroundColor Cyan
                gcloud secrets create $key --project=$project --replication-policy="automatic" --quiet
            }
            
            # Add version
            Write-Host "Adding new secret version for $key..." -ForegroundColor Gray
            $val | gcloud secrets versions add $key --project=$project --data-file=- --quiet
            Write-Host "✓ $key uploaded successfully!" -ForegroundColor Green
        }
    }
}

if (Test-Path $saFile) {
    Write-Host "`nFound firebase-service-account.json. Uploading as FIREBASE_SERVICE_ACCOUNT_KEY..." -ForegroundColor Yellow
    $saContent = Get-Content $saFile -Raw
    
    $key = "FIREBASE_SERVICE_ACCOUNT_KEY"
    $exists = $true
    $null = gcloud secrets describe $key --project=$project --quiet 2>&1
    if ($LastExitCode -ne 0) {
        $exists = $false
    }
    
    if (-not $exists) {
        Write-Host "Creating secret $key..." -ForegroundColor Cyan
        gcloud secrets create $key --project=$project --replication-policy="automatic" --quiet
    }
    
    $saContent | gcloud secrets versions add $key --project=$project --data-file=- --quiet
    Write-Host "✓ FIREBASE_SERVICE_ACCOUNT_KEY uploaded successfully!" -ForegroundColor Green
}

Write-Host "`nDone! All keys uploaded to Google Secret Manager successfully." -ForegroundColor Green
