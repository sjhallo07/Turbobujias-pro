# Supabase Configuration - Quick Reference

## Your Project

```
Project ID:  auzubegrcawdobkfttpj
Project URL: https://auzubegrcawdobkfttpj.supabase.co
Region:      Not specified (check Supabase dashboard)
```

---

## API Keys

### Public Key (Anon Key)
```
21d74b1156a71b838b73cbd29784d96621353d75e6002855
```
**Where to use:** Frontend, public operations, limited by RLS

### Admin Key (Service Role)
```
4b5a6a6d3ff68a8ac05ae7238ce9d57901f8e2b3598d14b8
```
**Where to use:** Backend only, bypasses RLS, full access

### JWT Secret
```
b3d1c1ec39744bfca432624739019c6297fbc01ec84d8a1fb6d213cdffbaceb5
```
**Used for:** Signing user tokens

### JWKS URL
```
https://auzubegrcawdobkfttpj.supabase.co/auth/v1/jwks
```
**Used for:** Verifying JWT tokens

---

## Environment Files

### Backend (`backend/.env`)
```env
SUPABASE_URL=https://auzubegrcawdobkfttpj.supabase.co
SUPABASE_ANON_KEY=21d74b1156a71b838b73cbd29784d96621353d75e6002855
SUPABASE_SERVICE_ROLE_KEY=4b5a6a6d3ff68a8ac05ae7238ce9d57901f8e2b3598d14b8
SUPABASE_JWT_SECRET=b3d1c1ec39744bfca432624739019c6297fbc01ec84d8a1fb6d213cdffbaceb5
SUPABASE_JWKS_URL=https://auzubegrcawdobkfttpj.supabase.co/auth/v1/jwks
PORT=3001
```

### Frontend (`turbobujias-web/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_SUPABASE_URL=https://auzubegrcawdobkfttpj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=21d74b1156a71b838b73cbd29784d96621353d75e6002855
```

---

## Connection String

```
postgresql://postgres:password@db.auzubegrcawdobkfttpj.supabase.co:5432/postgres
```

---

## Useful Links

- **Dashboard:** https://app.supabase.com/projects/auzubegrcawdobkfttpj
- **Auth:** https://auzubegrcawdobkfttpj.supabase.co/auth/v1
- **API:** https://auzubegrcawdobkfttpj.supabase.co/rest/v1
- **Storage:** https://auzubegrcawdobkfttpj.supabase.co/storage/v1
- **Gemini API:** https://ai.google.dev
- **Gemini Key:** AIzaSyDYyk2zY6Dmjn5b-Ucq2AB-wDY9vhGdR1Q

---

## Quick Commands

### Test Backend Connection
```bash
curl http://localhost:3001/api/health
```

### Test Supabase Connection
```bash
curl https://auzubegrcawdobkfttpj.supabase.co/auth/v1/health
```

### Check Frontend is Running
```bash
curl http://localhost:3000
```

### View Backend Logs
```bash
cd backend && npm start 2>&1 | tee logs.txt
```

### View Edge Function Logs
```bash
supabase functions list --project-id auzubegrcawdobkfttpj
supabase functions get <function_name> --project-id auzubegrcawdobkfttpj
```

---

## Credential Security

⚠️ **KEEP THESE SECRET:**
- `SUPABASE_SERVICE_ROLE_KEY` - Admin access
- `SUPABASE_JWT_SECRET` - Token signing
- Database passwords
- OAuth credentials (if using Google/GitHub auth)

✅ **SAFE TO EXPOSE:**
- `SUPABASE_URL` - Public project URL
- `SUPABASE_ANON_KEY` - Limited by RLS policies
- `NEXT_PUBLIC_*` vars - Intentionally public

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `Cannot find module 'dotenv'` | `cd backend && npm install` |
| `SUPABASE_URL is undefined` | Check `backend/.env` path and restart |
| `CORS error` | Check `CORS_ALLOWED_ORIGINS` in `.env` |
| `401 Unauthorized` | Missing or invalid JWT |
| `Connection refused` | Supabase service down or firewall issue |

---

## Common Endpoints

```
# Auth
POST   /auth/v1/signup
POST   /auth/v1/token
POST   /auth/v1/logout
POST   /auth/v1/refresh

# Database (REST)
GET    /rest/v1/inventory_items
POST   /rest/v1/inventory_items
PATCH  /rest/v1/inventory_items
DELETE /rest/v1/inventory_items

# Storage
POST   /storage/v1/object/upload/bucket-name
GET    /storage/v1/object/public/bucket-name/path

# Edge Functions
POST   /functions/v1/upload-to-bucket
POST   /functions/v1/import-inventory
POST   /functions/v1/inventory-mediator
POST   /functions/v1/summarize-thread
```

All endpoints require appropriate headers:
```
Authorization: Bearer $JWT_TOKEN
Content-Type: application/json
```

---

## Production Checklist

- [ ] Change `AUTH_SESSION_SECRET` to random 32+ char string
- [ ] Rotate keys regularly (Supabase dashboard)
- [ ] Enable RLS on all tables
- [ ] Set up database backups
- [ ] Configure SSL/TLS certificates
- [ ] Set up monitoring & alerting
- [ ] Enable audit logging
- [ ] Review RLS policies
- [ ] Test disaster recovery
- [ ] Document runbooks

---

For detailed setup guide, see: `ENVIRONMENT_SETUP.md`
For troubleshooting, see: `SUPABASE_FUNCTIONS_ANALYSIS.md`
