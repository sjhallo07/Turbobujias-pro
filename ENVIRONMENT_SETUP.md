# Environment Configuration Guide

## Overview

Your Turbobujias project uses Supabase for backend services. All credentials are now configured.

⚠️ **IMPORTANT:** Never commit `.env` files to git. They contain sensitive keys.

---

## Environment Files

### Backend (`backend/.env`)

**Location:** `backend/.env`

**Contains:**
- Supabase URL and keys
- Database connection
- Backend API config
- Auth settings
- Exchange rates
- Payment processor keys (optional)

**Usage:**
```bash
cd backend
npm start
# Reads from backend/.env automatically (dotenv package)
```

**Sample (with secrets redacted):**
```
SUPABASE_URL=https://auzubegrcawdobkfttpj.supabase.co
SUPABASE_ANON_KEY=21d74b1156a71b838b73cbd29784d96621353d75e6002855
SUPABASE_SERVICE_ROLE_KEY=4b5a6a6d3ff68a8ac05ae7238ce9d57901f8e2b3598d14b8
PORT=3001
BACKEND_PUBLIC_URL=http://localhost:3001
FRONTEND_PUBLIC_URL=http://localhost:3000
```

### Frontend (`turbobujias-web/.env.local`)

**Location:** `turbobujias-web/.env.local`

**Contains:**
- Public Supabase credentials (safe to expose to browser)
- API endpoints
- Social URLs
- Server-only keys (hidden from browser)

**Usage:**
```bash
cd turbobujias-web
npm run dev
# Next.js automatically loads .env.local
```

**Sample:**
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_SUPABASE_URL=https://auzubegrcawdobkfttpj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=21d74b1156a71b838b73cbd29784d96621353d75e6002855
```

---

## Variable Reference

### Supabase Core

| Variable | Backend | Frontend | Purpose |
|----------|---------|----------|---------|
| `SUPABASE_URL` | ✅ | ✅ (NEXT_PUBLIC_) | Project URL |
| `SUPABASE_ANON_KEY` | ✅ | ✅ (NEXT_PUBLIC_) | Public key for client operations |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | ❌ | Admin key (server-only) |
| `SUPABASE_JWT_SECRET` | ✅ | ❌ | JWT signing secret |
| `SUPABASE_JWKS_URL` | ✅ | ❌ | JWKS endpoint for JWT verification |

### Backend

| Variable | Purpose | Example |
|----------|---------|---------|
| `PORT` | Backend server port | `3001` |
| `BACKEND_PUBLIC_URL` | Public backend URL | `http://localhost:3001` |
| `FRONTEND_PUBLIC_URL` | Frontend URL for CORS | `http://localhost:3000` |
| `CORS_ALLOWED_ORIGINS` | Allowed origins | `http://localhost:3000,http://127.0.0.1:3000` |
| `AUTH_SESSION_SECRET` | Session encryption | Random 32+ chars |
| `AUTH_SUPERADMIN_PASSWORD` | Initial admin password | `TurboAdmin2026!` |

### Frontend

| Variable | Public | Purpose |
|----------|--------|---------|
| `NEXT_PUBLIC_API_URL` | ✅ | Backend API base URL |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase URL (exposed to browser) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Anon key (limited access) |
| `HF_SPACE_URL` | ❌ | Hugging Face chatbot URL (server-only) |

---

## Credential Breakdown

### Your Credentials (Current)

```
SUPABASE_URL=https://auzubegrcawdobkfttpj.supabase.co

SUPABASE_ANON_KEY=
21d74b1156a71b838b73cbd29784d96621353d75e6002855

SUPABASE_SERVICE_ROLE_KEY=
4b5a6a6d3ff68a8ac05ae7238ce9d57901f8e2b3598d14b8

SUPABASE_JWT_SECRET=
b3d1c1ec39744bfca432624739019c6297fbc01ec84d8a1fb6d213cdffbaceb5

SUPABASE_JWKS_URL=
8ddaf31381fb1fd2565f849a0e3d4132dd79e19729fe1c19
```

**What each key does:**

| Key | Use Case | Access Level | Visible to |
|-----|----------|--------------|-----------|
| **ANON_KEY** | Public queries, client-side operations | Limited by RLS | Browser + Backend |
| **SERVICE_ROLE_KEY** | Admin operations, bypass RLS | Full access | Backend only |
| **JWT_SECRET** | Signing user tokens | Auth system | Backend + Supabase |
| **JWKS_URL** | Verifying tokens | Token validation | Backend only |

---

## How to Use in Code

### Backend (Node.js/Express)

```javascript
import { supabaseAdmin, createUserClient } from './helpers/supabase.js';

// Admin operation (bypass RLS)
const { data, error } = await supabaseAdmin
  .from('inventory_items')
  .select('*');

// User operation (RLS enforced with JWT)
const userClient = createUserClient(userJWT);
const { data, error } = await userClient
  .from('inventory_items')
  .select('*');
```

### Frontend (React/Next.js)

```javascript
import { supabase } from '@/lib/supabase';

// Client-side auth
const { data: { session } } = await supabase.auth.getSession();

// Query with RLS enforced
const { data, error } = await supabase
  .from('inventory_items')
  .select('*');
```

---

## Docker Compose & Environment

If running with Docker, env vars are passed in `docker-compose.yml`:

```yaml
services:
  backend:
    environment:
      SUPABASE_URL: https://auzubegrcawdobkfttpj.supabase.co
      SUPABASE_ANON_KEY: 21d74b1156a71b838b73cbd29784d96621353d75e6002855
      SUPABASE_SERVICE_ROLE_KEY: 4b5a6a6d3ff68a8ac05ae7238ce9d57901f8e2b3598d14b8
      PORT: 3001
```

**Or from .env file:**
```yaml
services:
  backend:
    env_file: backend/.env
```

---

## Verification

### Test Backend Connection

```bash
cd backend
npm start
# Check console for: "Turbobujias API running on port 3001"

# In another terminal:
curl http://localhost:3001/api/health
# Should return: {"status":"ok","timestamp":"..."}
```

### Test Frontend Connection

```bash
cd turbobujias-web
npm run dev
# Check console for "Ready in X.Xs"
# Visit http://localhost:3000
```

### Test Supabase Connection

```bash
# From backend:
node -e "
const { supabaseAdmin } = require('./helpers/supabase');
supabaseAdmin.from('inventory_items').select('count(*)').then(r => console.log(r));
"
```

---

## Security Best Practices

### ✅ DO

- ✅ Store `.env` in `~/.env` or password manager
- ✅ Use `.env.local` (git-ignored) for local development
- ✅ Rotate keys regularly (Supabase dashboard)
- ✅ Use SERVICE_ROLE_KEY only on backend
- ✅ Enable RLS (Row Level Security) on all tables
- ✅ Log sensitive operations for audit trails

### ❌ DON'T

- ❌ Commit `.env` files to git
- ❌ Share keys in Slack/email
- ❌ Expose SERVICE_ROLE_KEY to frontend
- ❌ Use default passwords in production
- ❌ Log passwords/keys to console
- ❌ Disable RLS to "make things work"

---

## Production Deployment

### GitHub Actions (CI/CD)

Store secrets in GitHub:
```
Settings → Secrets and variables → Actions
```

Add these secrets:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`

Use in workflow:
```yaml
env:
  SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

### Hugging Face Spaces

Set secrets in Space settings:
```
Settings → Secrets
```

Add the environment variables there.

### Railway / Render / Vercel

Set environment variables in dashboard:
```
Project Settings → Environment Variables
```

Add all vars from your `.env` file.

---

## Troubleshooting

### "Cannot find module 'dotenv'"
```bash
cd backend
npm install dotenv
```

### "SUPABASE_URL is undefined"
- Verify `backend/.env` exists
- Check file is in correct directory
- Restart backend after editing `.env`
- Verify vars are spelled correctly

### "Missing Authorization header"
- Frontend: Check `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`
- Backend: Check `SUPABASE_SERVICE_ROLE_KEY` in `.env`
- Edge Function: Check `verify_jwt` setting

### "CORS error from http://localhost:3000"
- Verify `CORS_ALLOWED_ORIGINS` includes `http://localhost:3000`
- Restart backend after changing `.env`
- Check `FRONTEND_PUBLIC_URL` matches your frontend URL

### "JWT verification failed"
- Ensure `SUPABASE_JWT_SECRET` is correct
- Check token hasn't expired
- Verify user is authenticated in Supabase

---

## Next Steps

1. ✅ Backend `.env` configured
2. ✅ Frontend `.env.local` configured
3. ✅ Supabase clients initialized
4. 🔄 Start backend: `cd backend && npm start`
5. 🔄 Start frontend: `cd turbobujias-web && npm run dev`
6. 🔄 Test API: `curl http://localhost:3001/api/health`
7. 🔄 Test auth: Login in frontend → Check Supabase dashboard

---

## Reference

- Supabase Docs: https://supabase.com/docs
- Environment Variables (Next.js): https://nextjs.org/docs/basic-features/environment-variables
- dotenv Package: https://github.com/motdotla/dotenv
