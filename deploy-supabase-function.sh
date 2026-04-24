#!/bin/bash

# Supabase Edge Function deployment script
# Deploy upload-to-bucket function

set -e

echo "🚀 Deploying Supabase Edge Function: upload-to-bucket"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "❌ Supabase CLI not found. Install it:"
  echo "   npm install -g supabase"
  exit 1
fi

PROJECT_ID="auzubegrcawdobkfttpj"
FUNCTION_NAME="upload-to-bucket"

echo "📦 Deploying function: $FUNCTION_NAME"
echo "🔧 Project ID: $PROJECT_ID"
echo ""

# Deploy the function
supabase functions deploy "$FUNCTION_NAME" --project-id "$PROJECT_ID"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Test the function with:"
echo ""
echo "  curl -X POST \\"
echo "    'https://auzubegrcawdobkfttpj.supabase.co/functions/v1/$FUNCTION_NAME?bucket=turbobujias-fullstack' \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"path\":\"uploads/test.png\",\"contentBase64\":\"<base64_here>\",\"contentType\":\"image/png\"}'"
echo ""
