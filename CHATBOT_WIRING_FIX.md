# Chatbot Wiring Issues - Diagnosis & Fix

## Architecture Overview

Your chatbot has **3 layers** that must communicate:

```
Frontend (React/Next.js)
    ↓
Backend Proxy (Next.js API route)
    ↓
Hugging Face Space (Gradio app)
```

---

## Current Wiring

### Layer 1: Frontend (`turbobujias-web/components/ai-chatbot.js`)
- ✅ Sends to `/api/ai-chat` (internal proxy)
- ✅ Handles image uploads (base64)
- ✅ Manages chat history locally

### Layer 2: Backend Proxy (`turbobujias-web/app/api/ai-chat/route.js`)
- ✅ Receives POST from frontend
- ✅ Forwards to `HF_SPACE_URL` (Hugging Face)
- ✅ Sanitizes errors

### Layer 3: AI Chatbot (`turbobujias-ai/app.py`)
- ✅ Gradio interface
- ✅ FastAPI endpoint at `/chat`
- ✅ Multiple LLM providers (GitHub, Gemini, HuggingFace)

---

## Common Wiring Issues & Fixes

### Issue 1: `HF_SPACE_URL` Not Set

**Symptom:** Error "Space URL not configured" or connection refused

**Root Cause:** Missing environment variable

**Fix:**

```bash
# turbobujias-web/.env.local
HF_SPACE_URL=https://sjhallo07-turbobujias-fullstack.hf.space
NEXT_PUBLIC_HF_SPACE_URL=https://sjhallo07-turbobujias-fullstack.hf.space
```

### Issue 2: Space Not Deployed or Offline

**Symptom:** 502/503 errors, timeouts

**Check:**
```bash
# Test if Space is up
curl https://sjhallo07-turbobujias-fullstack.hf.space/health
# Should return: {"status":"ok"}
```

**Fix:**
- Redeploy Space from Hugging Face dashboard
- Check Space secrets are configured (HF_TOKEN, GEMINI_API_KEY, etc.)

### Issue 3: CORS Blocking (Gradio Space)

**Symptom:** Browser console shows CORS error

**Root Cause:** Gradio doesn't support cross-origin calls from browsers by default

**Fix:** This is why you MUST use the proxy `/api/ai-chat`, NOT call Gradio directly

### Issue 4: Chat Endpoint Path Wrong

**Symptom:** 404 errors from backend proxy

**Check:** Space has endpoint at `/chat`

**In your Space (app.py):**
```python
@api_app.post("/chat", response_model=ChatResponse)
def chat_endpoint(payload: ChatRequest) -> ChatResponse:
    ...
```

**Frontend calls:** `/api/ai-chat` → **proxies to** → `HF_SPACE_URL/chat`

### Issue 5: History Not Passing Correctly

**Symptom:** Chatbot forgets context, doesn't build on previous messages

**Root Cause:** History format mismatch

**Format (correct):**
```json
{
  "message": "new message",
  "history": [
    { "user": "previous question", "assistant": "previous answer" }
  ]
}
```

**Fix:** Frontend already does this in `ai-chatbot.js:sendMessage()`

---

## Diagnostic Tests

### Test 1: Is Proxy Working?

```bash
# Call local proxy (no auth needed)
curl -X POST http://localhost:3000/api/ai-chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hola"}'
```

**Expected response:**
```json
{
  "data": {
    "reply": "...",
    "sources": [...],
    "history": [...]
  }
}
```

**If fails:** Backend proxy issue (Layer 2)

### Test 2: Is Space Up?

```bash
curl https://sjhallo07-turbobujias-fullstack.hf.space/health
```

**Expected:** `{"status":"ok"}`

**If fails:** Space offline (Layer 3)

### Test 3: Direct Space Call (Debugging Only)

```bash
# This tests the Space directly, but will fail with CORS from browser
# Use this from backend/curl only

curl -X POST https://sjhallo07-turbobujias-fullstack.hf.space/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "¿Qué bujía para Toyota?",
    "history": [],
    "imageDataUrl": ""
  }'
```

**Expected:** Chat response

---

## Complete Debugging Workflow

### Step 1: Check Environment

**Frontend** (`turbobujias-web/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
HF_SPACE_URL=https://sjhallo07-turbobujias-fullstack.hf.space
NEXT_PUBLIC_HF_SPACE_URL=https://sjhallo07-turbobujias-fullstack.hf.space
```

### Step 2: Verify Connectivity

```bash
# Test 1: Is frontend running?
curl http://localhost:3000 -I

# Test 2: Is proxy running?
curl http://localhost:3000/api/ai-chat/openapi

# Test 3: Is Space up?
curl https://sjhallo07-turbobujias-fullstack.hf.space/health
```

### Step 3: Test Message Flow

```bash
# Terminal 1: Watch frontend logs
cd turbobujias-web
npm run dev
# (Check browser console)

# Terminal 2: Watch backend logs (if running locally)
# (Not needed if using Space)

# Browser: Open http://localhost:3000
# Send a test message: "Hola"
# Check browser console for: 
# - POST /api/ai-chat (status 200)
# - Payload sent
# - Response received
```

### Step 4: Check Gradio Space Logs

In Hugging Face Spaces dashboard:
- Go to your Space: `sjhallo07-turbobujias-fullstack`
- Click "Logs" tab
- Look for errors from `turbobujias-ai/app.py`

---

## Quick Fixes Checklist

- [ ] `HF_SPACE_URL` is set in `.env.local`
- [ ] Space is deployed and running (test `/health`)
- [ ] Using proxy `/api/ai-chat`, NOT direct Gradio calls
- [ ] Chat history format is correct (array of `{user, assistant}` objects)
- [ ] No CORS errors in browser console
- [ ] Network tab shows 200 responses
- [ ] Space has correct LLM provider configured (GitHub/Gemini/HuggingFace)
- [ ] Space secrets set correctly (tokens, API keys)
- [ ] Message text is not empty AND imageDataUrl is optional

---

## Real-time Debugging Script

Create `test-chatbot.sh`:

```bash
#!/bin/bash

FRONTEND_URL="http://localhost:3000"
PROXY_ENDPOINT="$FRONTEND_URL/api/ai-chat"
SPACE_URL="https://sjhallo07-turbobujias-fullstack.hf.space"

echo "🔍 Chatbot Debugging Test"
echo "========================="
echo ""

# Test 1: Frontend
echo "1️⃣  Testing Frontend..."
if curl -s -I $FRONTEND_URL | grep -q "200"; then
  echo "✅ Frontend is up"
else
  echo "❌ Frontend is DOWN"
fi
echo ""

# Test 2: Proxy
echo "2️⃣  Testing Backend Proxy..."
PROXY_RESPONSE=$(curl -s -X POST $PROXY_ENDPOINT \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}')
if echo "$PROXY_RESPONSE" | grep -q "reply"; then
  echo "✅ Proxy is working"
  echo "Response: $(echo $PROXY_RESPONSE | jq .data.reply)"
else
  echo "❌ Proxy failed"
  echo "Response: $PROXY_RESPONSE"
fi
echo ""

# Test 3: Space Health
echo "3️⃣  Testing Space Health..."
if curl -s "$SPACE_URL/health" | grep -q "ok"; then
  echo "✅ Space is up"
else
  echo "❌ Space is DOWN"
fi
echo ""

echo "📊 Summary:"
echo "If all 3 tests pass → chatbot should work"
echo "If proxy fails → check backend logs"
echo "If space fails → redeploy or restart Space"
```

Run it:
```bash
bash test-chatbot.sh
```

---

## Common Errors & Solutions

| Error | Cause | Fix |
|-------|-------|-----|
| `ERR_CONNECTION_REFUSED` | Space offline | Redeploy Space |
| `CORS error in console` | Direct call to Gradio | Use proxy `/api/ai-chat` |
| `{error: "undefined endpoint"}` | Wrong path to `/chat` | Check Space has `/chat` endpoint |
| `No response from assistant` | Empty message + no image | Require one of them |
| `Timeout after 30s` | Space slow/overloaded | Wait or upgrade Space resources |
| `400 Bad Request` | Wrong JSON format | Check history structure |
| `404 /openapi` | OpenAPI endpoint missing | Space must expose `/openapi.json` |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────┐
│  Browser (Frontend)                          │
│  ├─ ai-chatbot.js (React component)         │
│  └─ POST /api/ai-chat                       │
│     └─ { message, history, imageDataUrl }   │
└──────────────┬──────────────────────────────┘
               │
               ↓
┌──────────────────────────────────────────────┐
│  Next.js Backend (Proxy)                     │
│  ├─ /app/api/ai-chat/route.js               │
│  └─ Forwards to HF_SPACE_URL/chat           │
└──────────────┬──────────────────────────────┘
               │
               ↓
┌──────────────────────────────────────────────┐
│  Hugging Face Space (Gradio)                 │
│  ├─ turbobujias-ai/app.py                   │
│  ├─ FastAPI endpoint: POST /chat            │
│  ├─ LLM Provider (GitHub/Gemini/HF)         │
│  └─ Returns { reply, sources, history }     │
└──────────────────────────────────────────────┘
```

---

## Wiring Checklist

### Frontend Wiring ✅
- [ ] `ai-chatbot.js` creates fetch to `/api/ai-chat`
- [ ] History format: `[{user: "...", assistant: "..."}]`
- [ ] Image as base64 data URL
- [ ] Handles response: `result.data.reply`, `result.data.sources`

### Backend Proxy Wiring ✅
- [ ] `route.js` reads from request body
- [ ] Gets `HF_SPACE_URL` from env
- [ ] Sends to `${HF_SPACE_URL}/chat`
- [ ] Returns `{ data: payload }`

### Space Wiring ✅
- [ ] `app.py` has `@api_app.post("/chat", ...)`
- [ ] Takes `message`, `history`, `imageDataUrl`
- [ ] Returns `ChatResponse` with `reply`, `sources`, `history`
- [ ] LLM provider configured correctly
- [ ] All secrets set (HF_TOKEN, GEMINI_API_KEY, etc.)

---

## Final Test

**Start everything:**
```bash
# Terminal 1: Frontend
cd turbobujias-web && npm run dev

# Terminal 2: Check Space is up
curl https://sjhallo07-turbobujias-fullstack.hf.space/health
```

**In browser at http://localhost:3000:**
1. Scroll to "Chatbot IA integrado" section
2. Type: "Hola"
3. Click "Enviar mensaje"
4. Check browser console (F12)
   - Look for `POST /api/ai-chat` with status 200
   - Response should have `data.reply`

**If success:** ✅ Wiring is correct

**If fails:** Check logs from `test-chatbot.sh`

---

See `CHATBOT_DEBUGGING.md` for more advanced debugging techniques.
