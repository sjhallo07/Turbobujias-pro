# Turbobujias — Secrets & Credentials Management
# Summary of All Security Setup

---

## Files Created

### 1. `.gitignore` (Root)
Prevents accidental commits of:
- `.env` files
- Node modules, Python cache
- IDE configs, OS files
- Docker/Supabase local files

✅ **Action:** Already in place, never modify
```bash
git add .gitignore
git commit -m "Add .gitignore"
```

### 2. `.env.example` (Root)
Safe template with NO real values.
- Organized by section (Supabase, LLM providers, Backend, etc.)
- Includes inline comments
- Safe to commit to git

✅ **Action:** 
```bash
cp .env.example .env
vi .env  # Add your real credentials here
# .env is auto-ignored by .gitignore
```

### 3. `docker-compose.local.yml` (Root)
Local development stack with:
- Chatbot (Gradio + RAG)
- Backend API (Node.js)
- Frontend (Next.js)
- All services connected via bridge network
- Secrets loaded from `.env` file

✅ **Action:**
```bash
docker compose -f docker-compose.local.yml up
```

### 4. `scripts/local-dev.sh`
Interactive setup script:
- Checks Docker installation
- Prompts for build type (simple vs optimized)
- Builds & runs container with volume mount for live editing

✅ **Action:**
```bash
bash scripts/local-dev.sh
```

### 5. `docs/HUGGINGFACE_SPACES_SECRETS.md`
Complete guide for HuggingFace Spaces deployment:
- How to add secrets via Space UI
- Never commit `.env` to Space repo
- Reference secrets in Dockerfile (automatic injection)
- Rotating compromised tokens
- GitHub Actions CI/CD example

✅ **Action:**
1. Push code to Space repo (without `.env`)
2. Go to Space Settings → Secrets
3. Add: GITHUB_TOKEN (or GEMINI_API_KEY)
4. Space auto-deploys with secrets injected

### 6. `docs/DOCKER_SECRETS_MANAGEMENT.md`
Deep dive into three approaches:
- **Approach 1:** `.env` files (local dev)
- **Approach 2:** Docker secrets (Swarm mode)
- **Approach 3:** HuggingFace Spaces (production)

Includes code examples, security levels, and rotation procedures.

### 7. `docs/QUICK_START_LOCAL.md`
5-minute setup guide:
- Prerequisites
- Step-by-step instructions
- Troubleshooting
- Development tips
- Cleanup commands

---

## Security Levels

| Component | Local Dev | HF Spaces | Production |
|-----------|-----------|-----------|-----------|
| `.env` file | ✅ Use (ignored) | ❌ Never commit | ❌ Never use |
| Secrets UI | N/A | ✅ Use | ✅ Use |
| Docker Secrets | ❌ Complex | N/A | ✅ Recommended |
| Env vars | ✅ Load from `.env` | ✅ Auto-injected | ✅ Auto-injected |

---

## Workflow Summary

### 👨‍💻 Developer (Local Machine)

```bash
# 1. Clone repo
git clone <repo>
cd turbobujias

# 2. Create local .env
cp .env.example .env

# 3. Add YOUR credentials (not shared with others)
vi .env
# GITHUB_TOKEN=your_token_here
# GEMINI_API_KEY=your_key_here

# 4. Verify .env is ignored
git status  # Should NOT show .env

# 5. Run locally
docker compose -f docker-compose.local.yml up

# 6. Develop & test
# Edit code → Browser refresh → See changes
```

**Key point:** Your `.env` file is LOCAL ONLY, never pushed to git.

### 🚀 Deploy to HuggingFace Spaces

```bash
# 1. Ensure .env is NOT in repo
rm .env  # Never commit this
git status  # Should be clean

# 2. Push code only
git push origin main

# 3. Go to Space Settings → Secrets
# Add:
#   GITHUB_TOKEN=your_token
#   GEMINI_API_KEY=your_key
#   (etc.)

# 4. Space auto-deploys
# Secrets automatically injected at runtime
```

**Key point:** Code is public (on HF), secrets are private (in HF UI).

### 🔄 Token Rotation (Every 90 Days)

```bash
# 1. Revoke old token
# GitHub: https://github.com/settings/tokens
# Google: https://myaccount.google.com/apppasswords

# 2. Generate new token
# (with expiration date, minimal scopes)

# 3. Update LOCAL .env
vi .env
# GITHUB_TOKEN=new_token_here

# 4. Update HF Spaces
# Settings → Secrets → Edit GITHUB_TOKEN → new_token_here

# 5. Test
docker compose -f docker-compose.local.yml up
# Should work with new token
```

---

## Credential Checklist

Before deploying anywhere:

- [ ] `.env` file created from `.env.example`
- [ ] Real credentials added to `.env`
- [ ] `.env` is in `.gitignore` (prevent accidental commits)
- [ ] `.env.example` has NO real values
- [ ] `.env` file is LOCAL ONLY (never pushed to git)
- [ ] HF Spaces Secrets are configured (Settings → Secrets)
- [ ] All LLM provider tokens have expiration dates
- [ ] Tokens use minimal required scopes (not full access)
- [ ] Code is pushed to HF WITHOUT `.env`
- [ ] Space auto-deploys & injects secrets at runtime
- [ ] Tested locally: `docker compose up` works
- [ ] Tested on HF Spaces: chatbot responds correctly

---

## Environment Variables by Service

### Chatbot (Gradio)
```env
GRADIO_SERVER_NAME=0.0.0.0
GRADIO_SERVER_PORT=7860
LLM_PROVIDER=github  # or gemini, huggingface
GITHUB_TOKEN=...
GEMINI_API_KEY=...
HF_TOKEN=...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
```

### Backend (Node.js)
```env
PORT=3001
BACKEND_PUBLIC_URL=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
AUTH_SESSION_SECRET=...
AUTH_SUPERADMIN_BOOTSTRAP_PASSWORD=...
```

### Frontend (Next.js)
```env
NEXT_PUBLIC_API_URL=...
HF_SPACE_URL=...
```

---

## Red Flags & Fixes

| ❌ Problem | ✅ Solution |
|-----------|-----------|
| `.env` visible in `git status` | Run `git rm --cached .env` + check `.gitignore` |
| Token visible in Docker build logs | Use `--secret` flag or load from file |
| Same token used for 2+ years | Rotate every 90 days |
| Token has full admin permissions | Regenerate with minimal scopes |
| Token pasted in chat/issue | Immediately revoke & regenerate |
| `.env.example` has real values | Replace with placeholders |
| Hard-coded credentials in app.py | Use `os.environ.get()` instead |

---

## Quick Command Reference

```bash
# Setup
cp .env.example .env && vi .env

# Verify not tracked
git status

# Build & run (local)
docker compose -f docker-compose.local.yml up

# Build specific service
docker compose -f docker-compose.local.yml up chatbot --build

# View logs
docker compose -f docker-compose.local.yml logs -f chatbot

# Stop
docker compose -f docker-compose.local.yml down

# Cleanup
docker system prune -a

# Check token expiration
curl -H "Authorization: token YOUR_GITHUB_TOKEN" https://api.github.com/user/tokens
```

---

## Support Resources

- `.gitignore` details: https://git-scm.com/docs/gitignore
- Docker Secrets: https://docs.docker.com/engine/swarm/secrets/
- HF Spaces Docs: https://huggingface.co/docs/hub/spaces-overview
- 12-Factor App: https://12factor.net/config
- OWASP Secrets: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html

---

## Next Steps

1. ✅ Create `.env` file locally (cp .env.example .env)
2. ✅ Add your credentials to `.env`
3. ✅ Test locally: `docker compose -f docker-compose.local.yml up`
4. ✅ Verify chatbot works: http://localhost:7860
5. ✅ Push code to HF Spaces (WITHOUT `.env`)
6. ✅ Add secrets via HF Spaces UI
7. ✅ Verify Space chatbot works
8. ✅ Set up token rotation reminder (every 90 days)

You're now secure! 🔒
