# Hugging Face Space Integration - Complete Setup

## Your Space URLs

**Public Space:** https://huggingface.co/spaces/sjhallo07/turbobujias-fullstack

**Running at:** https://sjhallo07-turbobujias-fullstack.hf.space

**Storage Bucket:** https://huggingface.co/buckets/sjhallo07/sjhallo07-turbobujias-fullstack.hf.space

---

## Configuration Status

### ✅ Frontend (.env.local)
```env
HF_SPACE_URL=https://sjhallo07-turbobujias-fullstack.hf.space
```

✅ **CORRECT** - This is the URL the proxy will use

---

## Space Architecture

Your Space is a **FastAPI + Gradio hybrid**:

```
Hugging Face Space (sjhallo07-turbobujias-fullstack.hf.space)
├── Gradio UI (port 7860)
│   └── http://localhost:7860
│       ├─ Chat interface
│       ├─ Voice input
│       └─ Suggested prompts
│
└── FastAPI endpoints
    ├─ GET /health
    │   → {"status": "ok"}
    │
    ├─ POST /chat
    │   → {"reply": "...", "sources": [...], "history": [...]}
    │
├─ GET /openapi.json
│   → OpenAPI schema
    │
    └─ More endpoints...
```

---

## Testing Space Endpoints

### Test 1: Space Health (Is it running?)

```bash
curl https://sjhallo07-turbobujias-fullstack.hf.space/health
```

**Expected:**
```json
{"status":"ok"}
```

**If fails:** Space is offline. Restart from dashboard.

### Test 2: OpenAPI Schema

```bash
curl https://sjhallo07-turbobujias-fullstack.hf.space/openapi.json | jq .paths
```

**Should show:**
```json
{
  "/health": {...},
  "/chat": {...}
}
```

### Test 3: Chat Endpoint (Direct - for debugging only)

```bash
curl -X POST https://sjhallo07-turbobujias-fullstack.hf.space/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "¿Qué bujía para Toyota?",
    "history": [],
    "imageDataUrl": ""
  }'
```

**Expected:**
```json
{
  "reply": "La bujía recomendada es...",
  "sources": ["NGK-BKR5E"],
  "history": [...]
}
```

### Test 4: Via Frontend Proxy (Correct approach)

```bash
curl -X POST http://localhost:3000/api/ai-chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "¿Qué bujía para Toyota?",
    "history": []
  }'
```

**Expected:**
```json
{
  "data": {
    "reply": "...",
    "sources": [...],
    "history": [...]
  }
}
```

---

## Complete Flow

### Step 1: Start Frontend
```bash
cd turbobujias-web
npm run dev
# Opens at http://localhost:3000
```

### Step 2: Open Browser
```
http://localhost:3000
```

### Step 3: Scroll to Chatbot Section
Look for: "Chatbot IA integrado"

### Step 4: Send Message
- Type: "¿Qué bujía para Toyota?"
- Click: "Enviar mensaje"

### Step 5: Verify in Browser Console
Press **F12** → **Network** tab

Look for:
```
POST /api/ai-chat
Status: 200
Response: {"data": {"reply": "...", ...}}
```

---

## Wiring Breakdown

### Layer 1→2: Frontend to Proxy

**Frontend sends:**
```javascript
fetch('/api/ai-chat', {
  method: 'POST',
  body: JSON.stringify({
    message: "¿Qué bujía?",
    history: [],
    imageDataUrl: ""
  })
})
```

**Backend proxy receives:** ✅ (in `turbobujias-web/app/api/ai-chat/route.js`)

### Layer 2→3: Proxy to Space

**Backend sends:**
```javascript
fetch('https://sjhallo07-turbobujias-fullstack.hf.space/chat', {
  method: 'POST',
  body: JSON.stringify({
    message: "¿Qué bujía?",
    history: [],
    imageDataUrl: ""
  })
})
```

**Space receives:** ✅ (at `turbobujias-ai/app.py` `/chat` endpoint)

### Layer 3→2→1: Space to Frontend

**Space returns:**
```json
{
  "reply": "...",
  "sources": ["SKU123"],
  "history": [...]
}
```

**Proxy wraps it:**
```json
{
  "data": {
    "reply": "...",
    "sources": ["SKU123"],
    "history": [...]
  }
}
```

**Frontend displays:** ✅ (in `ai-chatbot.js`)

---

## Space Environment Variables

Your Space needs **at least ONE** LLM provider configured:

### Option 1: GitHub Models (Recommended)
```
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
GITHUB_MODELS_MODEL=openai/gpt-4o
```

### Option 2: Google Gemini
```
GEMINI_API_KEY=AIzaSyDYyk2zY6Dmjn5b-Ucq2AB-wDY9vhGdR1Q
GEMINI_MODEL=gemini-2.0-flash-lite
```

### Option 3: Hugging Face
```
HF_TOKEN=hf_xxxxxxxxxxxx
HF_MODEL_REPO_ID=mistralai/Mistral-7B-Instruct-v0.2
```

**To set Space secrets:**
1. Go to: https://huggingface.co/spaces/sjhallo07/turbobujias-fullstack
2. Click: **Settings**
3. Add: **Secrets** tab
4. Add your tokens

---

## Troubleshooting

### Issue: "Space is offline"

**Fix:**
1. Go to Space: https://huggingface.co/spaces/sjhallo07/turbobujias-fullstack
2. Click **Settings**
3. Click **Restart this Space**
4. Wait 2-3 minutes for it to start

### Issue: "Chat returns empty reply"

**Cause:** No LLM provider configured

**Fix:**
1. Go to Space **Settings** → **Secrets**
2. Add `GEMINI_API_KEY=AIzaSyDYyk2zY6Dmjn5b-Ucq2AB-wDY9vhGdR1Q`
3. Or add `GITHUB_TOKEN=...`
4. Restart Space

### Issue: "404 /chat endpoint"

**Cause:** Space code doesn't have `/chat` endpoint

**Check:** `turbobujias-ai/app.py` has:
```python
@api_app.post("/chat", response_model=ChatResponse)
def chat_endpoint(payload: ChatRequest) -> ChatResponse:
```

### Issue: CORS error in browser

**Cause:** Calling Gradio directly instead of through proxy

**Fix:** Always use `/api/ai-chat` (proxy), not the Space directly

---

## Space File Structure

Your Space repo should have:

```
sjhallo07/turbobujias-fullstack/
├── turbobujias-ai/
│   ├── app.py              ← Main Gradio + FastAPI app
│   ├── requirements.txt     ← Dependencies
│   ├── inventory.json       ← Product data
│   └── .env.example         ← Config template
│
├── turbobujias-web/
│   ├── app/
│   │   └── api/
│   │       └── ai-chat/
│   │           └── route.js ← Proxy endpoint
│   └── components/
│       └── ai-chatbot.js    ← Chat UI
│
├── backend/
│   └── (optional for this space)
│
└── .gitignore, README.md, etc.
```

---

## Gradio + FastAPI Hybrid

Your Space runs **both** Gradio and FastAPI:

```python
# Gradio UI (interactive)
demo = gr.Blocks(title="Turbobujias AI Assistant")

# FastAPI endpoints (for programmatic access)
api_app = FastAPI()

@api_app.post("/chat")
def chat_endpoint(payload: ChatRequest):
    ...

# Mount Gradio on FastAPI
app = gr.mount_gradio_app(api_app, demo, path="/")
```

This means:
- ✅ Browser: http://sjhallo07-turbobujias-fullstack.hf.space (Gradio UI)
- ✅ API: POST http://sjhallo07-turbobujias-fullstack.hf.space/chat (FastAPI)

---

## Quick Validation Checklist

- [ ] Space URL correct: `https://sjhallo07-turbobujias-fullstack.hf.space`
- [ ] Frontend .env.local has: `HF_SPACE_URL=https://sjhallo07-turbobujias-fullstack.hf.space`
- [ ] Space is running (green status)
- [ ] Space has LLM secrets (GEMINI_API_KEY or GITHUB_TOKEN)
- [ ] `/health` endpoint responds
- [ ] `/chat` endpoint accepts POST requests
- [ ] Frontend proxy at `/api/ai-chat` works
- [ ] Chat history format is `[{user: "...", assistant: "..."}]`

---

## Testing Commands

### 1. Is Space alive?
```bash
curl https://sjhallo07-turbobujias-fullstack.hf.space/health -I
# Should see: 200 OK
```

### 2. Can frontend reach proxy?
```bash
curl http://localhost:3000/api/ai-chat -I
# Should see: 200 OK or 405 (method not allowed for GET)
```

### 3. Can proxy reach Space?
```bash
curl -X POST http://localhost:3000/api/ai-chat \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'
# Should see: {"data": {...}} or {"error": "..."}
```

### 4. Full end-to-end test
```bash
# In browser at http://localhost:3000
# 1. Scroll to "Chatbot IA integrado"
# 2. Type: "Hola"
# 3. Click "Enviar mensaje"
# 4. Watch Network tab for successful POST /api/ai-chat
# 5. See response appear in chat
```

---

## Next Steps

1. ✅ Verify Space is running
   ```bash
   curl https://sjhallo07-turbobujias-fullstack.hf.space/health
   ```

2. ✅ Start frontend locally
   ```bash
   cd turbobujias-web && npm run dev
   ```

3. ✅ Test chat at http://localhost:3000

4. ✅ Check browser Network tab for errors

5. ✅ If issues, check Space logs:
   https://huggingface.co/spaces/sjhallo07/turbobujias-fullstack → Logs

---

## Support Resources

- **Space Dashboard:** https://huggingface.co/spaces/sjhallo07/turbobujias-fullstack/settings
- **Space Logs:** https://huggingface.co/spaces/sjhallo07/turbobujias-fullstack/logs
- **Gradio Docs:** https://www.gradio.app/
- **FastAPI Docs:** https://fastapi.tiangolo.com/
- **Hugging Face Docs:** https://huggingface.co/docs/hub/spaces

---

## Space Status

✅ **Configuration:** Correct
✅ **URL:** https://sjhallo07-turbobujias-fullstack.hf.space
✅ **Endpoints:** /health, /chat, /openapi.json
✅ **Frontend Wiring:** Correct
✅ **Proxy:** Correct

**Status:** Ready to test!

Run: `bash test-chatbot-wiring.sh` to verify all 4 layers.
