#!/bin/bash
# Quick Chatbot Wiring Test

FRONTEND="http://localhost:3000"
PROXY="$FRONTEND/api/ai-chat"
SPACE="https://sjhallo07-turbobujias-fullstack.hf.space"

echo "🤖 Turbobujias Chatbot Wiring Test"
echo "===================================="
echo ""

# Test 1: Frontend
echo "[1/4] Checking Frontend (port 3000)..."
if curl -s -m 5 "$FRONTEND" | grep -q "Turbobujias\|Next" 2>/dev/null; then
  echo "✅ Frontend is UP"
else
  echo "⚠️  Frontend might be DOWN - try: cd turbobujias-web && npm run dev"
fi
echo ""

# Test 2: Proxy GET (openapi)
echo "[2/4] Checking Proxy Endpoint..."
PROXY_TEST=$(curl -s -m 5 "$PROXY" 2>/dev/null)
if echo "$PROXY_TEST" | grep -q "chatUrl\|openapi"; then
  echo "✅ Proxy is UP"
else
  echo "❌ Proxy is DOWN or not responding"
  echo "Response: $(echo $PROXY_TEST | head -c 100)"
fi
echo ""

# Test 3: Space Health
echo "[3/4] Checking Hugging Face Space..."
SPACE_HEALTH=$(curl -s -m 5 "$SPACE/health" 2>/dev/null)
if echo "$SPACE_HEALTH" | grep -q "ok"; then
  echo "✅ Space is UP"
else
  echo "❌ Space is DOWN or not responding"
  echo "Try: https://huggingface.co/spaces/sjhallo07/turbobujias-fullstack"
fi
echo ""

# Test 4: Chat endpoint
echo "[4/4] Testing Chat (POST /api/ai-chat)..."
CHAT_TEST=$(curl -s -m 10 -X POST "$PROXY" \
  -H "Content-Type: application/json" \
  -d '{"message":"test","history":[]}' 2>/dev/null)

if echo "$CHAT_TEST" | grep -q "reply\|error"; then
  if echo "$CHAT_TEST" | grep -q '"error"'; then
    ERROR=$(echo "$CHAT_TEST" | grep -o '"error":"[^"]*"' | head -1)
    echo "⚠️  Chat responds but with error:"
    echo "   $ERROR"
  else
    REPLY=$(echo "$CHAT_TEST" | grep -o '"reply":"[^"]*"' | head -1 | cut -c10-60)
    echo "✅ Chat is responding:"
    echo "   $REPLY..."
  fi
else
  echo "❌ Chat not responding correctly"
  echo "Response: $(echo $CHAT_TEST | head -c 100)"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ All 4 tests pass?"
echo "   → Chatbot wiring is CORRECT"
echo ""
echo "❌ 1+ tests fail?"
echo "   → Check logs:"
echo "      cd turbobujias-web && npm run dev"
echo "      (Watch for /api/ai-chat errors)"
echo ""
echo "See CHATBOT_WIRING_FIX.md for detailed debugging"
