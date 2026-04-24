#!/bin/bash
# Verify Supabase and environment configuration

echo "🔍 Environment Configuration Verification"
echo "=========================================="
echo ""

# Check if files exist
echo "📝 Checking .env files..."
if [ -f backend/.env ]; then
  echo "✅ backend/.env exists"
else
  echo "❌ backend/.env NOT FOUND"
fi

if [ -f turbobujias-web/.env.local ]; then
  echo "✅ turbobujias-web/.env.local exists"
else
  echo "❌ turbobujias-web/.env.local NOT FOUND"
fi

echo ""
echo "🔐 Checking environment variables..."

# Backend
if [ -f backend/.env ]; then
  echo ""
  echo "Backend (.env):"
  grep -E '^(SUPABASE_URL|SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY|PORT)=' backend/.env | \
    sed 's/=.*$/=***/' || echo "❌ Could not read backend/.env"
fi

# Frontend
if [ -f turbobujias-web/.env.local ]; then
  echo ""
  echo "Frontend (.env.local):"
  grep -E '^NEXT_PUBLIC_' turbobujias-web/.env.local | \
    sed 's/=.*$/=***/' || echo "❌ Could not read turbobujias-web/.env.local"
fi

echo ""
echo "🔗 Supabase Connectivity Check"
echo "==============================="
echo ""

if [ -f backend/.env ]; then
  SUPABASE_URL=$(grep '^SUPABASE_URL=' backend/.env | cut -d'=' -f2)
  
  echo "Testing connection to: $SUPABASE_URL"
  
  # Try to curl the health endpoint
  if curl -s -o /dev/null -w "%{http_code}" "$SUPABASE_URL/auth/v1/health" | grep -q "200"; then
    echo "✅ Supabase server is reachable"
  else
    echo "⚠️  Could not reach Supabase (might be network/firewall issue)"
  fi
fi

echo ""
echo "📦 Dependency Check"
echo "==================="
echo ""

# Check Node packages
echo "Checking backend dependencies..."
if [ -f backend/node_modules/.package-lock.json ] || [ -f backend/node_modules/package-lock.json ]; then
  echo "✅ Backend dependencies installed"
else
  echo "⚠️  Backend dependencies not installed (run: cd backend && npm install)"
fi

echo ""
echo "Checking frontend dependencies..."
if [ -f turbobujias-web/node_modules/.package-lock.json ] || [ -f turbobujias-web/node_modules/package-lock.json ]; then
  echo "✅ Frontend dependencies installed"
else
  echo "⚠️  Frontend dependencies not installed (run: cd turbobujias-web && npm install)"
fi

echo ""
echo "✨ Verification complete!"
echo ""
echo "Next steps:"
echo "1. Start backend:  cd backend && npm start"
echo "2. Start frontend: cd turbobujias-web && npm run dev"
echo "3. Visit: http://localhost:3000"
