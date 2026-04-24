#!/bin/bash
# Deploy all 5 Supabase Edge Functions

PROJECT_ID="auzubegrcawdobkfttpj"

echo "🚀 Deploying Supabase Edge Functions"
echo "Project: $PROJECT_ID"
echo ""

functions=(
  "upload-to-bucket"
  "import-inventory"
  "inventory-mediator"
  "summarize-thread"
  "rapid-function"
)

for func in "${functions[@]}"; do
  echo "📦 Deploying: $func"
  supabase functions deploy "$func" --project-id "$PROJECT_ID"
  if [ $? -eq 0 ]; then
    echo "✅ $func deployed successfully"
  else
    echo "⚠️  $func deployment failed"
  fi
  echo ""
done

echo "📋 Listing deployed functions:"
supabase functions list --project-id "$PROJECT_ID"

echo ""
echo "✨ All functions deployed!"
