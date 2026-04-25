# Turbobujias — Local Testing Guide
# Test on Localhost & Local Network IP

## Your Machine Info

- **Local IP Address:** 192.168.0.7
- **Localhost:** 127.0.0.1 (same machine only)

---

## Services & URLs

### Chatbot (Gradio + RAG)
- **Localhost:** http://localhost:7860
- **Local IP:** http://192.168.0.7:7860
- **Port:** 7860

### Frontend (Next.js)
- **Localhost:** http://localhost:3000
- **Local IP:** http://192.168.0.7:3000
- **Port:** 3000

### Backend API (Optional)
- **Localhost:** http://localhost:3001/api
- **Local IP:** http://192.168.0.7:3001/api
- **Port:** 3001

---

## Prerequisites

1. **Docker Desktop running** and configured for local network access
2. **`.env` file** created with LLM credentials:
   ```
   LLM_PROVIDER=github
   GITHUB_TOKEN=your_token_here
   ```
3. **Ports available:** 3000, 7860 (and 3001 if using backend)

---

## Step 1: Configure Docker Desktop for Local IP

### Windows (Docker Desktop):

1. Open **Docker Desktop Settings**
2. Go to **Resources → Network**
3. Ensure default settings (usually works automatically)
4. Click **Apply & Restart**

OR use WSL2 bridge (recommended):

```powershell
# In PowerShell (Admin):
# This ensures Docker containers accessible from other machines
docker network inspect bridge
```

---

## Step 2: Start Full Stack

### Terminal 1 - Run Services:

```bash
# From project root
docker compose -f docker-compose.full-stack.yml up
```

Wait for output like:
```
turbobujias-chatbot    | Running on http://0.0.0.0:7860
turbobujias-frontend   | ▲ Next.js 15.5.15
turbobujias-frontend   | - Local:        http://localhost:3000
```

### Terminal 2 - Monitor Logs:

```bash
docker compose -f docker-compose.full-stack.yml logs -f
```

---

## Step 3: Test on Localhost

### Test Chatbot:
```
URL: http://localhost:7860
Ask: "¿Qué bujía tiene la Toyota Hilux 2018 diesel?"
Expected: [Returns SKU + details from inventory]
```

### Test Frontend:
```
URL: http://localhost:3000
Should load Next.js app
[Verify any links to chatbot work]
```

### Test API (optional):
```bash
curl http://localhost:3001/api/health
```

---

## Step 4: Test on Local IP (Same Network)

From **another device on same WiFi** (e.g., phone, tablet, different computer):

### Test Chatbot on Local IP:
```
URL: http://192.168.0.7:7860
Ask: Same question above
Expected: [Same response]
```

### Test Frontend on Local IP:
```
URL: http://192.168.0.7:3000
Should load Next.js app
[Same as localhost]
```

---

## Step 5: Verify Service Communication

### Check if frontend can reach chatbot:

1. Open Frontend: http://localhost:3000
2. Open Browser DevTools (F12)
3. Check **Console** for errors
4. Check **Network** tab for requests to `http://localhost:7860`

### If Frontend Errors:

Check logs:
```bash
docker compose -f docker-compose.full-stack.yml logs chatbot
docker compose -f docker-compose.full-stack.yml logs frontend
```

Common issues:
- Port 7860 blocked by firewall → Add exception
- .env missing credentials → Add GITHUB_TOKEN, etc.
- WSL2 network issues → Restart Docker Desktop

---

## Step 6: Test on Docker Network (Container-to-Container)

Inside containers, use service names:

```bash
# Frontend container can reach chatbot via:
# http://chatbot:7860  (internal Docker DNS)

# Test from frontend container:
docker exec -it turbobujias-frontend \
  curl http://chatbot:7860/health
```

---

## Troubleshooting

### ❌ Can't access on local IP (192.168.0.7)

**Symptom:** Works on localhost, fails on 192.168.0.7

**Fix:**
```bash
# 1. Verify services are listening on 0.0.0.0
docker compose -f docker-compose.full-stack.yml logs | grep "0.0.0.0"

# 2. Check if Windows Firewall blocking
# Settings → Firewall → Allow app through firewall
# → Allow "Docker Desktop" (both Private & Public)

# 3. Restart Docker Desktop
# Right-click Docker icon → Restart
```

### ❌ Port already in use

**Symptom:** Error "port 3000 already in use"

**Fix:**
```bash
# Find what's using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID)
taskkill /PID 12345 /F

# Or use different ports in docker-compose
# Change: "0.0.0.0:3001:3000" (host:container)
```

### ❌ Frontend can't reach chatbot

**Symptom:** Frontend shows error "Can't connect to chatbot"

**Fix 1 - Check environment vars:**
```bash
# In Dockerfile.frontend, chatbot URL should be:
# NEXT_PUBLIC_CHATBOT_URL=http://localhost:7860  (from frontend machine)
```

**Fix 2 - Check Docker network:**
```bash
docker network inspect turbobujias
# Should show both chatbot and frontend connected
```

**Fix 3 - Test connectivity:**
```bash
docker exec turbobujias-frontend \
  curl -I http://chatbot:7860/health
# Should return HTTP 200
```

### ❌ Slow or hanging builds

**Symptom:** Build takes 10+ minutes, seems frozen

**Fix:**
```bash
# 1. Clean Docker cache
docker system prune -a

# 2. Rebuild without cache
docker compose -f docker-compose.full-stack.yml up --build --no-cache

# 3. Or use simple (faster) build
docker compose -f docker-compose.chatbot.yml up
```

---

## Performance Testing

### Test Chatbot Response Time:

```bash
# Measure request duration
Measure-Command {
  curl -s http://192.168.0.7:7860/api/chat `
    -H "Content-Type: application/json" `
    -d '{"message":"test"}'
}
```

### Monitor Resource Usage:

```bash
# Watch CPU/Memory
docker stats turbobujias-chatbot turbobujias-frontend
```

---

## Ready for HuggingFace Spaces?

If all tests pass:

1. ✅ Chatbot responds on http://localhost:7860
2. ✅ Chatbot responds on http://192.168.0.7:7860
3. ✅ Frontend loads on http://localhost:3000
4. ✅ Frontend loads on http://192.168.0.7:3000
5. ✅ Services communicate without errors

Then proceed to deployment:
- Push code to HF Spaces repo (WITHOUT `.env`)
- Add secrets via Space Settings UI
- Space auto-deploys

---

## Quick Commands

```bash
# Start full stack
docker compose -f docker-compose.full-stack.yml up

# Start in background
docker compose -f docker-compose.full-stack.yml up -d

# View logs
docker compose -f docker-compose.full-stack.yml logs -f

# Stop services
docker compose -f docker-compose.full-stack.yml down

# Rebuild services
docker compose -f docker-compose.full-stack.yml up --build

# Remove containers & volumes
docker compose -f docker-compose.full-stack.yml down -v

# Check service status
docker ps

# Connect to running container
docker exec -it turbobujias-chatbot bash
docker exec -it turbobujias-frontend sh
```

---

## Your Setup Summary

| Component | Localhost | Local IP | Status |
|-----------|-----------|----------|--------|
| Chatbot | :7860 | 192.168.0.7:7860 | Ready |
| Frontend | :3000 | 192.168.0.7:3000 | Ready |
| Backend (optional) | :3001 | 192.168.0.7:3001 | Not running |
| Network | Docker bridge | All interfaces | Configured |

---

Next step: Run `docker compose -f docker-compose.full-stack.yml up` and test! 🚀
