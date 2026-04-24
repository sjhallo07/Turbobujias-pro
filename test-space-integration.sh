#!/bin/bash
# HuggingFace Space Integration Test

SPACE_URL="https://sjhallo07-turbobujias-fullstack.hf.space"
FRONTEND="http://localhost:3000"
PROXY="$FRONTEND/api/ai-chat"

echo "🤖 HuggingFace Space Integration Test"
echo "======================================"
echo ""
echo "Space URL: $SPACE_URL"
echo ""

# Test 1: Space Health
echo "[1/5] Testing Space Health..."
HEALTH=$(curl -s -m 5 "$SPACE_URL/health" 2>/dev/null)
if echo "$HEALTH" | grep -q "ok"; then
  echo "✅ Space is UP and responding"
else
  echo "❌ Space is DOWN"
  echo "   Response: $(echo $HEALTH | head -c 100)"
fi
echo ""

# Test 2: OpenAPI Schema
echo "[2/5] Testing OpenAPI Schema..."
OPENAPI=$(curl -s -m 5 "$SPACE_URL/openapi.json" 2>/dev/null | jq -r '.info.title' 2>/dev/null)
if [ "$OPENAPI" != "null" ] && [ -n "$OPENAPI" ]; then
  echo "✅ OpenAPI schema available"
else
  echo "⚠️  Could not read OpenAPI schema"
fi
echo ""

# Test 3: Chat Endpoint (Direct - debugging only)
echo "[3/5] Testing Space /chat endpoint..."
CHAT_DIRECT=$(curl -s -m 10 -X POST "$SPACE_URL/chat" \
  -H "Content-Type: application/json" \
  -d '{"message":"test","history":[],"imageDataUrl":""}' 2>/dev/null)

if echo "$CHAT_DIRECT" | grep -q "reply"; then
  REPLY=$(echo "$CHAT_DIRECT" | jq -r '.reply' 2>/dev/null | head -c 50)
  echo "✅ Chat endpoint responding"
  echo "   Reply preview: $REPLY..."
elif echo "$CHAT_DIRECT" | grep -q "error"; then
  ERROR=$(echo "$CHAT_DIRECT" | jq -r '.error' 2>/dev/null)
  echo "⚠️  Chat error (check Space logs):"
  echo "   $ERROR"
else
  echo "❌ Chat endpoint not responding"
  echo "   Response: $(echo $CHAT_DIRECT | head -c 100)"
fi
echo ""

# Test 4: Frontend Proxy
echo "[4/5] Testing Frontend Proxy (/api/ai-chat)..."
if curl -s -m 2 "$FRONTEND" > /dev/null 2>&1; then
  PROXY_TEST=$(curl -s -m 10 -X POST "$PROXY" \
    -H "Content-Type: application/json" \
    -d '{"message":"test"}' 2>/dev/null)
  
  if echo "$PROXY_TEST" | grep -q "data"; then
    echo "✅ Proxy is working"
  elif echo "$PROXY_TEST" | grep -q "error"; then
    echo "⚠️  Proxy returned error"
    echo "   Check Space is running and configured"
  else
    echo "❌ Proxy not responding correctly"
  fi
else
  echo "❌ Frontend not running"
  echo "   Start with: cd turbobujias-web && npm run dev"
fi
echo ""

# Test 5: Full Integration
echo "[5/5] Testing Full Integration..."
echo "To test end-to-end:"
echo "  1. Go to http://localhost:3000"
echo "  2. Scroll to 'Chatbot IA integrado'"
echo "  3. Type a message"
echo "  4. Open DevTools (F12) → Network tab"
echo "  5. Look for POST /api/ai-chat with 200 status"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ All 4 tests pass?"
echo "   → Your chatbot is working!"
echo ""
echo "⚠️  Some tests warn or fail?"
echo "   → See detailed guides:"
echo "      - HUGGINGFACE_SPACE_SETUP.md"
echo "      - CHATBOT_WIRING_FIX.md"
echo ""
echo "🔗 Space URL: $SPACE_URL"
echo "🔗 Frontend: http://localhost:3000"
echo ""
