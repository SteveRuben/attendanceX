# Script PowerShell pour envoyer une invitation de test
# Usage: .\send-test-invitation.ps1

$API_URL = "http://127.0.0.1:5001/attendance-management-syst/europe-west1/api/v1/user-invitations/invite"
$TARGET_EMAIL = "steveruben2015@hotmail.com"

# Remplacer par vos vraies valeurs
$AUTH_TOKEN = "YOUR_AUTH_TOKEN_HERE"
$TENANT_ID = "YOUR_TENANT_ID_HERE"

Write-Host "🚀 Sending invitation to: $TARGET_EMAIL" -ForegroundColor Green
Write-Host "📍 API URL: $API_URL" -ForegroundColor Cyan
Write-Host ""

# Vérifier les tokens
if ($AUTH_TOKEN -eq "YOUR_AUTH_TOKEN_HERE" -or $TENANT_ID -eq "YOUR_TENANT_ID_HERE") {
    Write-Host "❌ Please update the AUTH_TOKEN and TENANT_ID in the script" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 To get these values:" -ForegroundColor Yellow
    Write-Host "1. Start the frontend: npm run dev:frontend"
    Write-Host "2. Login to your app"
    Write-Host "3. Open browser DevTools > Application > Local Storage"
    Write-Host "4. Find the auth token and tenant ID"
    Write-Host "5. Update this script with the real values"
    exit
}

# Données de l'invitation
$invitationData = @{
    email = $TARGET_EMAIL
    firstName = "Steve"
    lastName = "Ruben"
    tenantRole = "member"
    department = "Test Department"
    message = "Welcome! This is a test invitation from the PowerShell performance testing script."
} | ConvertTo-Json

Write-Host "📤 Invitation data:" -ForegroundColor Cyan
Write-Host $invitationData
Write-Host ""

# Headers
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $AUTH_TOKEN"
    "X-Tenant-ID" = $TENANT_ID
}

$startTime = Get-Date

try {
    Write-Host "⏱️  Starting request..." -ForegroundColor Yellow
    
    $response = Invoke-RestMethod -Uri $API_URL -Method POST -Headers $headers -Body $invitationData -TimeoutSec 30
    
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalMilliseconds
    
    Write-Host "⏱️  Request completed in $([math]::Round($duration))ms" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "📥 Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10 | Write-Host
    Write-Host ""
    
    Write-Host "✅ Invitation sent successfully!" -ForegroundColor Green
    Write-Host "📧 Email sent to: $TARGET_EMAIL" -ForegroundColor Green
    
    # Analyser la performance
    if ($duration -lt 2000) {
        Write-Host "🚀 Excellent performance: $([math]::Round($duration))ms" -ForegroundColor Green
    } elseif ($duration -lt 5000) {
        Write-Host "⚡ Good performance: $([math]::Round($duration))ms" -ForegroundColor Yellow
    } elseif ($duration -lt 10000) {
        Write-Host "⚠️  Slow performance: $([math]::Round($duration))ms" -ForegroundColor Yellow
    } else {
        Write-Host "🐌 Very slow performance: $([math]::Round($duration))ms" -ForegroundColor Red
        Write-Host "   This explains why the frontend is timing out!" -ForegroundColor Red
    }
    
} catch {
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalMilliseconds
    
    Write-Host "❌ Request failed after $([math]::Round($duration))ms" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Message -like "*timeout*" -or $_.Exception.Message -like "*timed out*") {
        Write-Host ""
        Write-Host "⏰ Request timed out - this confirms the performance issue!" -ForegroundColor Red
        Write-Host "   The API is taking more than 30 seconds to respond" -ForegroundColor Red
    } elseif ($_.Exception.Message -like "*connection*") {
        Write-Host ""
        Write-Host "🔧 Connection issue - make sure:" -ForegroundColor Yellow
        Write-Host "1. Firebase emulators are running: cd backend && npm run emulators:start"
        Write-Host "2. The API is accessible at: $API_URL"
    }
    
    # Afficher plus de détails sur l'erreur
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "HTTP Status Code: $statusCode" -ForegroundColor Red
        
        switch ($statusCode) {
            401 { Write-Host "🔐 Authentication failed - check your AUTH_TOKEN" -ForegroundColor Red }
            403 { Write-Host "🚫 Authorization failed - check your permissions and TENANT_ID" -ForegroundColor Red }
            400 { Write-Host "📝 Validation error - check the request data format" -ForegroundColor Red }
            409 { Write-Host "👥 User already exists or has pending invitation" -ForegroundColor Yellow }
        }
    }
}

Write-Host ""
Write-Host "🔧 Next steps:" -ForegroundColor Yellow
Write-Host "1. If successful, check $TARGET_EMAIL for the invitation email"
Write-Host "2. If slow, we've identified the performance bottleneck"
Write-Host "3. Check Firebase emulator logs for more details"