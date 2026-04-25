# Turbobujias — Docker Secrets Management
# Production-grade credential handling for containers

## Overview

Three secure approaches for managing secrets in Docker:

1. **Environment files** (for local dev)
2. **Docker secrets** (for Swarm)
3. **HuggingFace Spaces** (for production)

---

## Approach 1: Environment Files (Local Dev)

### Setup

```bash
# Create .env from template
cp .env.example .env

# Edit with real credentials
vi .env

# Never commit
git add .gitignore  # Ensures .env is ignored
```

### Usage with Docker Run

```bash
docker run --rm \
  --env-file .env \
  -p 7860:7860 \
  turbobujias-ai:latest
```

### Usage with Docker Compose

```yaml
version: '3.8'
services:
  chatbot:
    image: turbobujias-ai:latest
    env_file:
      - .env
    ports:
      - "7860:7860"
```

Then run:
```bash
docker compose -f docker-compose.local.yml up
```

### Security Level
- ⚠️ Medium: `.env` is unencrypted on disk
- Solution: Use `.gitignore` to prevent accidental commits

---

## Approach 2: Docker Secrets (Swarm Mode)

### Setup

```bash
# Only works in Docker Swarm mode
docker swarm init

# Create secrets from files
docker secret create github_token - < <(echo "your_token_here")
docker secret create gemini_key - < <(echo "your_key_here")
docker secret create supabase_url - < <(echo "your_url")
```

Or from `.env`:
```bash
# Parse .env and create secrets
grep -v '^#' .env | while read -r line; do
  key="${line%%=*}"
  value="${line#*=}"
  echo "$value" | docker secret create "$key" - 2>/dev/null || true
done
```

### Usage in docker-compose.yml

```yaml
version: '3.8'

services:
  chatbot:
    image: turbobujias-ai:latest
    secrets:
      - github_token
      - gemini_key
      - supabase_url
    environment:
      GITHUB_TOKEN_FILE: /run/secrets/github_token
      GEMINI_API_KEY_FILE: /run/secrets/gemini_key
      SUPABASE_URL_FILE: /run/secrets/supabase_url
    ports:
      - "7860:7860"

secrets:
  github_token:
    external: true
  gemini_key:
    external: true
  supabase_url:
    external: true
```

### Update app.py to read secrets

```python
import os

def load_secret(key: str, file_key: str | None = None) -> str:
    """Load from env OR secret file"""
    # Try direct env var first
    value = os.environ.get(key, "").strip()
    if value:
        return value
    
    # Try secret file (Docker Swarm)
    if file_key:
        secret_path = os.environ.get(file_key)
        if secret_path and os.path.exists(secret_path):
            with open(secret_path) as f:
                return f.read().strip()
    
    return ""

GITHUB_TOKEN = load_secret("GITHUB_TOKEN", "GITHUB_TOKEN_FILE")
GEMINI_API_KEY = load_secret("GEMINI_API_KEY", "GEMINI_API_KEY_FILE")
```

### Security Level
- ✅ High: Secrets encrypted in Swarm, mounted read-only in containers
- Limitation: Only works in Docker Swarm (not Docker Desktop by default)

---

## Approach 3: HuggingFace Spaces (Production)

### Setup

1. Go to Space Settings → Secrets
2. Add each secret via UI (no files needed)
3. HuggingFace injects as environment variables at runtime

### docker-compose for Spaces

```yaml
services:
  chatbot:
    build:
      context: ./turbobujias-ai
      dockerfile: Dockerfile.simple
    environment:
      # Spaces automatically provides these:
      - GITHUB_TOKEN=${GITHUB_TOKEN}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - SUPABASE_URL=${SUPABASE_URL}
```

### Deploy

```bash
# Push to Space repo (with Dockerfile + app.py)
git push origin main

# HuggingFace auto-builds & injects secrets
# No .env file needed!
```

### Security Level
- ✅✅ Highest: Secrets never stored on disk, encrypted in transit

---

## Comparison Table

| Method | Local Dev | Security | Complexity | Production Ready |
|--------|-----------|----------|-----------|-----------------|
| **`.env` file** | ✅ Yes | Medium | Easy | ⚠️ Only with .gitignore |
| **Docker Secrets** | ❌ No | High | Moderate | ✅ Yes (Swarm) |
| **HF Spaces UI** | N/A | Highest | Easy | ✅ Yes (HF only) |

---

## Complete Workflow

### Local Development

```bash
# 1. Create .env from template
cp .env.example .env
vi .env  # Add real credentials

# 2. Verify it's ignored
cat .gitignore | grep "^.env$"  # Should match

# 3. Run with docker-compose
docker compose -f docker-compose.local.yml up

# 4. Never commit .env
git status  # Should NOT show .env
```

### Pushing to HuggingFace Spaces

```bash
# 1. Ensure .env is gitignored
echo ".env" >> .gitignore
git add .gitignore
git commit -m "Add .env to gitignore"

# 2. Push code (WITHOUT .env)
git push origin main

# 3. Add secrets via HF UI
# Settings → Secrets → Add GITHUB_TOKEN, GEMINI_API_KEY, etc.

# 4. Space auto-deploys with secrets injected
```

---

## Security Checklist

- [ ] `.gitignore` includes `.env`
- [ ] `.env.example` has NO real values
- [ ] Real `.env` file is local-only
- [ ] HF Spaces secrets are configured
- [ ] Tokens have expiration dates
- [ ] Tokens use minimal required scopes
- [ ] Rotate tokens every 90 days
- [ ] Never paste tokens in chat/code

---

## Emergency: Token Leaked

1. **Immediately revoke:**
   ```bash
   # GitHub
   curl -X DELETE https://api.github.com/user/tokens/TOKEN_ID \
     -H "Authorization: token $OLD_TOKEN"
   
   # Google: https://myaccount.google.com/apppasswords
   # HF: https://huggingface.co/settings/tokens
   ```

2. **Generate new token**

3. **Update everywhere:**
   ```bash
   # Local
   vi .env  # Paste new token
   
   # HF Spaces
   # Settings → Secrets → Edit GITHUB_TOKEN
   ```

4. **Test:**
   ```bash
   docker compose -f docker-compose.local.yml up
   # Should work with new token
   ```

---

## Additional Resources

- Docker Secrets: https://docs.docker.com/engine/swarm/secrets/
- HF Spaces Docs: https://huggingface.co/docs/hub/spaces-overview
- 12-Factor App (secrets): https://12factor.net/config
- OWASP Secrets Management: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
