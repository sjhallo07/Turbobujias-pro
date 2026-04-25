# Turbobujias — HuggingFace Spaces Secrets Management
# Complete guide for deploying with secure credentials

## Overview

HuggingFace Spaces provides a **Secrets** feature to store sensitive values securely without committing them to git.

---

## Step 1: Create/Access Your Space

1. Go to your Space: https://huggingface.co/spaces/sjhallo07/turbobujias-fullstack
2. Click **Settings** (⚙️ icon top-right)
3. Look for **Secrets** section

---

## Step 2: Add Secrets to HuggingFace Spaces

Add these secrets **one by one** via the UI:

### Required (choose ONE LLM provider)

**Option A: GitHub Models (Recommended)**
```
Name: GITHUB_TOKEN
Value: your_github_pat_token
```

**Option B: Google Gemini**
```
Name: GEMINI_API_KEY
Value: your_gemini_api_key
```

**Option C: Hugging Face Inference**
```
Name: HF_TOKEN
Value: your_huggingface_token
```

### Supabase (for vector memory — Phase 2)
```
Name: SUPABASE_URL
Value: https://your-project.supabase.co

Name: SUPABASE_ANON_KEY
Value: your_anon_key

Name: SUPABASE_SERVICE_ROLE_KEY
Value: your_service_role_key
```

### LLM Configuration
```
Name: LLM_PROVIDER
Value: github  # or gemini, huggingface

Name: GEMINI_FALLBACK_ENABLED
Value: true
```

---

## Step 3: Reference Secrets in Dockerfile

In your `Dockerfile`:

```dockerfile
# ❌ WRONG - exposes secret in image
ARG GITHUB_TOKEN=12345...
RUN export GITHUB_TOKEN=12345...

# ✅ RIGHT - loads from HuggingFace at runtime
# (No need to pass in Dockerfile at all)
```

In your `app.py`:

```python
import os

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "").strip()
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()

if not GITHUB_TOKEN and not GEMINI_API_KEY:
    raise ValueError("No LLM credentials configured")
```

---

## Step 4: Deploy to Spaces

1. Push your Dockerfile & app.py to your Space repo:
   ```bash
   git push origin main
   ```

2. HuggingFace automatically builds & deploys

3. Check **App logs** in Space settings if it fails

---

## Step 5: Verify Secrets Are Loaded

In your app logs, you should see:
```
✅ GITHUB_TOKEN configured
✅ LLM_PROVIDER: github
✅ Loading Whisper model...
✅ Building FAISS index...
```

**NOT:**
```
❌ ERROR: No LLM credentials configured
```

---

## Security Best Practices

| ❌ DON'T | ✅ DO |
|---------|-------|
| Commit `.env` to git | Use `.env.example` (no real values) |
| Hardcode secrets in code | Use `os.environ.get()` |
| Share tokens in chat/issues | Rotate tokens regularly |
| Use one token forever | Set expiration dates |
| Give token full permissions | Use minimal scopes (read-only) |

---

## Rotating Secrets (When Compromised)

If a token leaks:

1. **Immediately revoke it:**
   - GitHub: https://github.com/settings/tokens → Delete
   - Google: https://myaccount.google.com/apppasswords
   - HuggingFace: https://huggingface.co/settings/tokens

2. **Generate new token** with:
   - Expiration (e.g., 90 days)
   - Minimal scopes
   - Different name (e.g., `turbobujias-spaces-2024-12`)

3. **Update HuggingFace Spaces:**
   - Settings → Secrets → Edit & paste new value
   - Space auto-restarts with new secret

---

## Environment-Specific Secrets

| Environment | Storage | How |
|-------------|---------|-----|
| **Local Dev** | `.env` file (not committed) | `docker run --env-file .env` |
| **HuggingFace Spaces** | Space Secrets UI | Automatic env var injection |
| **GitHub Actions** | Repository Secrets | `secrets.GITHUB_TOKEN` |
| **Docker Registry** | Build secrets | `docker build --secret id=name` |

---

## Example: GitHub Actions CI/CD with Secrets

```yaml
# .github/workflows/deploy.yml
name: Deploy to HuggingFace Spaces

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: huggingface/spaces-github-action@main
        with:
          repo_id: sjhallo07/turbobujias-fullstack
          repo_type: space
          private: false
          token: ${{ secrets.HF_TOKEN }}
```

Then in GitHub:
- Settings → Secrets → `HF_TOKEN` (with value)
- Actions → Runs → Logs (check deployment)

---

## Troubleshooting

**Q: App says "No LLM credentials configured"**
- Check Space Settings → Secrets
- Ensure at least one LLM provider is set
- Wait 30s for Space to restart

**Q: 401 Unauthorized errors**
- Token may be expired or revoked
- Regenerate & update Secrets

**Q: Can't see logs**
- Check Space Settings → App logs
- Or: `docker logs <container_id>`

---

## Next Steps

1. Add all secrets to your Space
2. Test locally: `docker run --env-file .env ...`
3. Push to Space repo
4. Monitor Space logs after deployment
