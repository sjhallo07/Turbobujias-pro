# Quick Start: Turbobujias Local Development

Complete step-by-step guide to run everything locally.

## Prerequisites

- Docker Desktop installed: https://www.docker.com/products/docker-desktop
- Git installed
- ~10 GB free disk space (PyTorch is large)
- One LLM API key (GitHub, Gemini, or HuggingFace)

## Quick Start (5 minutes)

### 1️⃣ Clone & Setup

```bash
# Clone repo (if you haven't)
git clone https://github.com/sjhallo07/turbobujias.git
cd turbobujias

# Create .env from template
cp .env.example .env
```

### 2️⃣ Add Your Credentials

Edit `.env` with your API keys:

```bash
nano .env  # or vi .env, or open in IDE
```

**Minimum required** (choose ONE):

```env
# Option A: GitHub Models (Free tier, recommended)
LLM_PROVIDER=github
GITHUB_TOKEN=your_github_pat_here

# Option B: Google Gemini (Free tier available)
GEMINI_API_KEY=your_gemini_key_here

# Option C: Hugging Face (Free tier available)
HF_TOKEN=your_huggingface_token_here
```

Also add (optional but recommended):

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_key_here
```

Save file (Ctrl+S).

### 3️⃣ Verify .env is Not Tracked

```bash
git status
```

Should show:
```
On branch main
nothing to commit, working tree clean
```

If `.env` appears, it's OK — `.gitignore` prevents commits.

### 4️⃣ Build & Run

**Option A: Using docker-compose (Recommended)**

```bash
docker compose -f docker-compose.local.yml up
```

Wait 2-3 minutes for first build (PyTorch download + install).

**Option B: Direct Docker run**

```bash
docker run --rm \
  --env-file .env \
  -p 7860:7860 \
  turbobujias-ai:latest
```

### 5️⃣ Open Browser

Visit: **http://localhost:7860**

You should see the Gradio chatbot UI. Ask a question!

```
Q: "¿Qué bujía tiene la Toyota Hilux 2018 diesel?"
A: [Should return SKU + details from inventory]
```

---

## Troubleshooting

### ❌ "ERROR: No LLM credentials configured"

**Fix:** Check `.env` has at least one of:
- `GITHUB_TOKEN`
- `GEMINI_API_KEY`
- `HF_TOKEN`

```bash
grep -E "GITHUB_TOKEN|GEMINI_API_KEY|HF_TOKEN" .env
```

### ❌ "Docker: command not found"

**Fix:** Install Docker Desktop: https://www.docker.com/products/docker-desktop

### ❌ "Port 7860 already in use"

**Fix:** Use different port:
```bash
docker run --rm \
  --env-file .env \
  -p 8000:7860 \
  turbobujias-ai:latest

# Then visit http://localhost:8000
```

### ❌ "Out of disk space"

**Fix:** PyTorch images are ~3 GB. Free up space or prune Docker:
```bash
docker system prune -a  # Remove unused images
docker system df        # Check space
```

### ❌ "ModuleNotFoundError: openai_whisper"

**Fix:** Rebuild without cache:
```bash
docker compose -f docker-compose.local.yml up --build --no-cache
```

---

## Development Tips

### Live Code Editing

Edit `turbobujias-ai/app.py` and refresh browser (docker-compose mounts code as volume):

```yaml
volumes:
  - ./turbobujias-ai/app.py:/app/app.py  # Live sync
```

Changes apply on page refresh (no rebuild needed).

### View Logs

```bash
# If using docker-compose
docker compose -f docker-compose.local.yml logs -f chatbot

# If using docker run
docker logs -f <container_id>
```

### Stop Container

```bash
# Ctrl+C in terminal

# Or if detached:
docker stop turbobujias-chatbot
```

### Test With Different LLM Providers

Edit `.env` and restart:

```bash
# Switch to Gemini
sed -i 's/LLM_PROVIDER=.*/LLM_PROVIDER=gemini/' .env
docker compose -f docker-compose.local.yml restart chatbot
```

---

## Multi-Service Stack (Optional)

Run Backend + Frontend + Chatbot together:

```bash
# Start all services
docker compose -f docker-compose.local.yml up

# In another terminal, check status
docker compose -f docker-compose.local.yml ps
```

Services:
- **Chatbot:** http://localhost:7860
- **Backend API:** http://localhost:3001/api
- **Frontend:** http://localhost:3000

---

## Cleanup

### Stop All Containers

```bash
docker compose -f docker-compose.local.yml down
```

### Remove Images

```bash
docker rmi turbobujias-ai:latest turbobujias-ai:dev
```

### Full Reset

```bash
docker compose -f docker-compose.local.yml down -v
docker system prune -a
```

---

## Next Steps

- ✅ Run chatbot locally
- ✅ Ask questions in Spanish/English
- 📝 Edit `app.py` to customize prompts
- 🚀 Deploy to HuggingFace Spaces (see `docs/HUGGINGFACE_SPACES_SECRETS.md`)
- 🔌 Add Supabase for vector memory (Phase 2)

---

## Support

**Need help?**
- Check `docs/` folder
- Review Docker errors: `docker logs <container>`
- Verify `.env` values: `grep -v '^#' .env`

**Common Commands:**

```bash
# See running containers
docker ps

# See all images
docker images | grep turbobujias

# Check Docker stats
docker stats turbobujias-chatbot

# Execute command in running container
docker exec -it turbobujias-chatbot bash
python -c "import gradio; print(gradio.__version__)"  # Verify install

# Remove dangling images
docker image prune
```

Enjoy! 🚀
