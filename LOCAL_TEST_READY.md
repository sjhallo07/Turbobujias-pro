# Turbobujias — Ready to Test Locally (192.168.0.7)

## ✅ What's Ready

### Docker Images Built
- ✅ `turbobujias-frontend:latest` — 1.38 GB
- ✅ `turbobujias-pro-frontend:latest` — 1.38 GB
- ✅ `turbobujias-pro-backend:latest` — 204 MB
- ✅ Chatbot ready to build

### Configuration Files
- ✅ `docker-compose.full-stack.yml` — Frontend + Chatbot (all interfaces)
- ✅ `docker-compose.chatbot.yml` — Chatbot only
- ✅ `.env` file created (local, ignored by git)
- ✅ `.env.example` as public template
- ✅ `.gitignore` configured

### Documentation
- ✅ `docs/LOCAL_TESTING_GUIDE.md` — Complete local testing instructions
- ✅ `docs/DEPLOYMENT_CHECKLIST.md` — Pre-deployment checklist
- ✅ `docs/SECRETS_MANAGEMENT_SUMMARY.md` — Security overview
- ✅ `docs/QUICK_START_LOCAL.md` — Quick setup

### Scripts
- ✅ `scripts/local-test.ps1` — PowerShell testing utility
- ✅ `scripts/setup-and-run.ps1` — Auto-setup script

---

## Your Local Network Setup

| Component | Localhost | Local IP | Status |
|-----------|-----------|----------|--------|
| **IP Address** | 127.0.0.1 | 192.168.0.7 | ✅ |
| **Chatbot** | :7860 | 192.168.0.7:7860 | ✅ Ready |
| **Frontend** | :3000 | 192.168.0.7:3000 | ✅ Ready |
| **Backend** | :3001 | 192.168.0.7:3001 | Optional |

---

## 🚀 To Start Local Testing Now

### Option 1: PowerShell Script (Recommended)

```powershell
# Run full stack with one command
powershell scripts/local-test.ps1 up
```

Then open:
- **Chatbot:** http://localhost:7860
- **Frontend:** http://localhost:3000

### Option 2: Manual Docker Compose

```bash
# Terminal 1 - Start services
docker compose -f docker-compose.full-stack.yml up

# Terminal 2 - Monitor logs (keep running)
docker compose -f docker-compose.full-stack.yml logs -f
```

### Option 3: Test-Only Mode

```powershell
# Run tests without starting services
powershell scripts/local-test.ps1 test
```

---

## Testing Checklist (Quick Version)

### 1️⃣ Localhost Tests (This Machine)

```
http://localhost:7860        ← Chatbot (Gradio)
  Ask: "¿Qué bujía tiene la Toyota Hilux 2018 diesel?"
  Expected: Returns SKU + details

http://localhost:3000        ← Frontend (Next.js)
  Should load without errors
```

### 2️⃣ Local IP Tests (Same WiFi Network)

From **this machine**:
```
http://192.168.0.7:7860      ← Chatbot
http://192.168.0.7:3000      ← Frontend
```

From **another device** (phone, tablet, other computer on same WiFi):
```
http://192.168.0.7:7860      ← Should work
http://192.168.0.7:3000      ← Should work
```

### 3️⃣ Service Communication

```bash
# Frontend should reach Chatbot
docker exec turbobujias-frontend curl http://chatbot:7860/health
# Expected: HTTP 200 OK
```

---

## Environment Variables Setup

Your `.env` file should have (choose ONE LLM provider):

```env
# Option A: GitHub Models (Free tier, recommended)
LLM_PROVIDER=github
GITHUB_TOKEN=your_github_pat_token

# Option B: Google Gemini (Free tier available)
# LLM_PROVIDER=gemini
# GEMINI_API_KEY=your_gemini_api_key

# Option C: Hugging Face
# LLM_PROVIDER=huggingface
# HF_TOKEN=your_huggingface_token
```

**Never commit `.env`** — it's auto-ignored by `.gitignore`

---

## Troubleshooting Quick Fix

### ❌ Can't access on 192.168.0.7?

```powershell
# 1. Check if services running
docker ps

# 2. Check Windows Firewall
# Settings → Firewall → Allow app through firewall
# → Find "Docker Desktop" → Allow both Private & Public

# 3. Restart Docker Desktop
# Right-click Docker icon → Restart

# 4. Check service logs
docker logs turbobujias-chatbot
docker logs turbobujias-frontend
```

### ❌ Port already in use?

```powershell
# Find what's using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with actual number)
taskkill /PID 12345 /F
```

### ❌ Services won't start?

```bash
# Full reset
docker compose -f docker-compose.full-stack.yml down -v
docker system prune -a
docker compose -f docker-compose.full-stack.yml up --build
```

---

## Next Steps

1. **Start local services:**
   ```powershell
   powershell scripts/local-test.ps1 up
   ```

2. **Test on localhost & local IP** (see checklist above)

3. **Verify all tests pass** (see `docs/DEPLOYMENT_CHECKLIST.md`)

4. **When ready to deploy:**
   ```bash
   git add .
   git commit -m "Local testing complete, ready for HuggingFace Spaces"
   git push origin main
   ```

5. **Go to HuggingFace Space Settings:**
   - Add secrets (GITHUB_TOKEN, GEMINI_API_KEY, or HF_TOKEN)
   - Space auto-deploys

---

## File Structure

```
turbobujias/
├── .env                           ← Your credentials (local only, ignored)
├── .env.example                   ← Public template
├── .gitignore                     ← Includes .env
├── docker-compose.full-stack.yml  ← Chatbot + Frontend (listen on all interfaces)
├── docker-compose.chatbot.yml     ← Chatbot only
├── Dockerfile.frontend            ← Next.js frontend
├── Dockerfile.simple              ← Chatbot (fast build)
│
├── scripts/
│   ├── local-test.ps1            ← PowerShell test utility
│   └── setup-and-run.ps1         ← Auto-setup script
│
├── docs/
│   ├── LOCAL_TESTING_GUIDE.md     ← Detailed testing instructions
│   ├── DEPLOYMENT_CHECKLIST.md    ← Pre-deployment checklist
│   ├── SECRETS_MANAGEMENT_SUMMARY.md
│   └── QUICK_START_LOCAL.md
│
├── turbobujias-ai/               ← Chatbot (Gradio + RAG)
│   ├── app.py
│   ├── inventory.json
│   ├── Dockerfile.simple
│   └── requirements.txt
│
└── turbobujias-web/              ← Frontend (Next.js)
    ├── package.json
    ├── next.config.js
    └── pages/
```

---

## Support

**Problem?** Check these in order:

1. `docs/LOCAL_TESTING_GUIDE.md` — Detailed troubleshooting
2. `docs/DEPLOYMENT_CHECKLIST.md` — Pre-deployment verification
3. Docker logs:
   ```bash
   docker logs turbobujias-chatbot
   docker logs turbobujias-frontend
   docker compose logs -f
   ```

---

## Ready? Let's Go! 🚀

```powershell
powershell scripts/local-test.ps1 up
```

Then visit:
- **Chatbot:** http://localhost:7860 or http://192.168.0.7:7860
- **Frontend:** http://localhost:3000 or http://192.168.0.7:3000

Test it, verify it works, then deploy to HuggingFace Spaces!
