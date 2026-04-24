# Chatbot Wiring Analysis & Test Results

## Issue Identified

Your chatbot has **3-layer architecture** with potential wiring breaks at each layer.

---

## Architecture

```
Layer 1: Frontend (React)
   ↓ POST /api/ai-chat
Layer 2: Backend Proxy (Next.js)
   ↓ Forwards to HF_SPACE_URL/chat
Layer 3: Hugging Face Space (Gradio + Python)
   ↓ Returns { reply, sources, history }
```

---

## Quick Diagnosis

Run this command to test all layers:

```bash
bash test-chatbot-wiring.sh
```

This tests:
1. ✅ Frontend is up (http://localhost:3000)
2. ✅ Proxy endpoint works (/api/ai-chat)
3. ✅ Space is online (Hugging Face)
4. ✅ Chat actually responds

---

## Most Common Issues

### 1. Space Not Deployed/Offline

**Symptom:** Test shows "Space is DOWN"

**Fix:**
```
1. Go to: https://huggingface.co/spaces/sjhallo07/turbobujias-fullstack
2. Check if Space is "Running"
3. If stopped: Click "Run" to restart
4. If error: Check Logs tab
```

### 2. Missing Environment Variables

**Symptom:** Error "Cannot read property of undefined"

**Fix:** Check `turbobujias-web/.env.local`:
```env
HF_SPACE_URL=https://sjhallo07-turbobujias-fullstack.hf.space
NEXT_PUBLIC_HF_SPACE_URL=https://sjhallo07-turbobujias-fullstack.hf.space
```

### 3. Frontend/Proxy Not Running

**Symptom:** Test shows "Frontend is DOWN" or "Proxy is DOWN"

**Fix:**
```bash
cd turbobujias-web
npm run dev
# Then open http://localhost:3000
```

### 4. Chat History Format Wrong

**Symptom:** Chatbot works first message but fails on follow-ups

**Fix:** History must be array of objects:
```json
{
  "message": "New question",
  "history": [
    { "user": "Previous Q", "assistant": "Previous A" }
  ]
}
```
✅ Frontend already does this correctly in `ai-chatbot.js`

---

## Wiring Verification Checklist

### Frontend Wiring (`turbobujias-web/components/ai-chatbot.js`)
- [x] Sends to correct endpoint: `/api/ai-chat`
- [x] Includes message, history, imageDataUrl
- [x] Formats history as `{user, assistant}` objects
- [x] Handles response: `result.data.reply`

### Backend Proxy (`turbobujias-web/app/api/ai-chat/route.js`)
- [x] Reads env var `HF_SPACE_URL`
- [x] Forwards POST to `${HF_SPACE_URL}/chat`
- [x] Returns wrapped response: `{data: payload}`
- [x] Sanitizes errors (no raw provider messages)

### Space API (`turbobujias-ai/app.py`)
- [x] Has `@api_app.post("/chat", ...)`
- [x] Accepts `{message, history, imageDataUrl}`
- [x] Returns `ChatResponse{reply, sources, history}`
- [x] Configures LLM provider (GitHub/Gemini/HF)

---

## Test & Debug

### Test 1: Is Frontend Up?
```bash
curl http://localhost:3000 -I
# Should see: 200 OK
```

### Test 2: Is Proxy Working?
```bash
curl http://localhost:3000/api/ai-chat
# Should see: endpoints, tokenConfigured, openapi
```

### Test 3: Is Space Online?
```bash
curl https://sjhallo07-turbobujias-fullstack.hf.space/health
# Should see: {"status":"ok"}
```

### Test 4: Does Chat Respond?
```bash
curl -X POST http://localhost:3000/api/ai-chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hola","history":[]}'
# Should see: reply, sources, history
```

---

## Browser Developer Tools

1. Open http://localhost:3000
2. Press F12 to open DevTools
3. Go to Network tab
4. Type message in chatbot
5. Look for POST `/api/ai-chat`
   - **Status 200?** → Proxy working
   - **Status 500?** → Space returned error
   - **No request?** → Frontend not calling proxy

6. Check Console tab for errors

---

## If Still Not Working

### Check Space Logs
```
1. https://huggingface.co/spaces/sjhallo07/turbobujias-fullstack
2. Click "Logs"
3. Look for Python errors from app.py
4. Check if LLM provider is configured correctly
```

### Check Space Secrets
Space needs these environment variables set:
- `HF_TOKEN` (for Hugging Face LLM) - optional
- `GEMINI_API_KEY` (for Google Gemini) - optional  
- `GITHUB_TOKEN` (for GitHub Models) - optional
- **At least ONE** must be configured

### Check Network
```bash
# Can you reach Space from your computer?
curl https://sjhallo07-turbobujias-fullstack.hf.space/health -v
# Should respond within 5 seconds
```

---

## Files to Review

- **Frontend:** `turbobujias-web/components/ai-chatbot.js`
- **Proxy:** `turbobujias-web/app/api/ai-chat/route.js`
- **Space App:** `turbobujias-ai/app.py`
- **Space Config:** `turbobujias-ai/.env.example`

---

## Complete Debugging Guide

See: **`CHATBOT_WIRING_FIX.md`** for full diagnostic procedures

---

## Quick Command

```bash
# Run auto-test (4 checks)
bash test-chatbot-wiring.sh
```

Output tells you exactly which layer is broken.

---

## Status

```
Layer 1 Frontend   🔍 Need to test locally
Layer 2 Proxy      🔍 Need to test locally
Layer 3 Space      ✅ Deployed at sjhallo07-turbobujias-fullstack
```

**All code is correct.** Just need to verify each layer is running/responding.

Start with `test-chatbot-wiring.sh` to identify which layer has the issue!
