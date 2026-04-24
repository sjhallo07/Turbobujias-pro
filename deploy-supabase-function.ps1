# Supabase Edge Function deployment script (PowerShell)
# Deploy upload-to-bucket function

$PROJECT_ID = "auzubegrcawdobkfttpj"
$FUNCTION_NAME = "upload-to-bucket"

Write-Host "🚀 Deploying Supabase Edge Function: $FUNCTION_NAME" -ForegroundColor Green
Write-Host ""

# Check if Supabase CLI is installed
$supabase = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabase) {
    Write-Host "❌ Supabase CLI not found. Install it:" -ForegroundColor Red
    Write-Host "   npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

Write-Host "📦 Deploying function: $FUNCTION_NAME"
Write-Host "🔧 Project ID: $PROJECT_ID"
Write-Host ""

# Deploy the function
supabase functions deploy $FUNCTION_NAME --project-id $PROJECT_ID

Write-Host ""
Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Test the function with:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  `$SUPABASE_URL = 'https://auzubegrcawdobkfttpj.supabase.co'"
Write-Host "  `$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes('./test.png'))"
Write-Host "  curl -X POST \`"
Write-Host "    \`"`$SUPABASE_URL/functions/v1/$FUNCTION_NAME?bucket=turbobujias-fullstack\`" \`"
Write-Host "    -H 'Content-Type: application/json' \`"
Write-Host "    -d \`"{\\`"path\\`":\\`"uploads/test.png\\`",\\`"contentBase64\\`":\\`"\$b64\\`",\\`"contentType\\`":\\`"image/png\\`"}\`""
Write-Host ""
