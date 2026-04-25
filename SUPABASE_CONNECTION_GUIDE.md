# Turbobujias — Supabase Connection Status & Setup Guide

## ❌ Current Status: NOT CONNECTED

### What's Missing

| Component | Status | Needed |
|-----------|--------|--------|
| SUPABASE_URL | ❌ Placeholder | Real Supabase project URL |
| SUPABASE_ANON_KEY | ❌ Placeholder | Valid anon key from Supabase |
| SUPABASE_SERVICE_ROLE_KEY | ❌ Placeholder | Valid service role key |
| SUPABASE_DB_URL | ❌ Placeholder | PostgreSQL connection string |
| SUPABASE_JWT_SECRET | ❌ Placeholder | JWT secret from Supabase |

---

## 🔧 How to Connect Supabase

### Step 1: Create Supabase Project (if not already done)

1. Go to **https://supabase.com**
2. Sign in / Create account
3. Click **New Project**
4. Fill in:
   - Project Name: `turbobujias` (or your choice)
   - Database Password: Generate strong password
   - Region: Select closest to you
5. Wait for project creation (~2 minutes)

### Step 2: Get Your Credentials

Once project is created, go to **Settings → API**:

```
Project Settings
  ├── API
  │   ├── Project URL ← Copy this (SUPABASE_URL)
  │   ├── anon public ← Copy this (SUPABASE_ANON_KEY)
  │   └── service_role secret ← Copy this (SUPABASE_SERVICE_ROLE_KEY)
  │
  └── Database
      ├── Connection string ← Copy this (SUPABASE_DB_URL)
      └── JWT Secret ← Copy this (SUPABASE_JWT_SECRET)
```

### Step 3: Update .env File

Edit `.env` and replace:

```env
# SUPABASE (Vector DB & Authentication)
SUPABASE_URL=https://your-real-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_DB_URL=postgresql://postgres:yourpassword@db.your-project-id.supabase.co:5432/postgres
SUPABASE_JWT_SECRET=your-jwt-secret-from-supabase
SUPABASE_JWKS_URL=https://your-project-id.supabase.co/auth/v1/jwks
```

### Step 4: Restart Services

```bash
# Stop all services
docker compose down

# Start with new credentials
docker compose up -d

# Check if services connect
docker logs turbobujias-backend
docker logs turbobujias-chatbot
```

### Step 5: Verify Connection

```bash
# Test backend can reach Supabase
docker exec turbobujias-backend npm test

# Or check logs for connection success
docker logs turbobujias-backend | findstr "Supabase\|connected\|database"
```

---

## 🗄️ Supabase Tables Setup (Optional - Phase 2)

### For Vector Memory & Learning (Future)

```sql
-- Create tables in Supabase
CREATE TABLE agent_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL,
  response text NOT NULL,
  embedding vector(1536),
  agent_type text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE chat_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  question text NOT NULL,
  answer text NOT NULL,
  chatbot_url text,
  created_at timestamp DEFAULT now()
);

CREATE TABLE inventory_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text UNIQUE NOT NULL,
  data jsonb,
  last_updated timestamp DEFAULT now()
);

-- Create vector index for similarity search
CREATE INDEX ON agent_memory USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

---

## 📊 Architecture: With vs Without Supabase

### ❌ WITHOUT Supabase (Current)
```
Frontend → Backend → Chatbot
                       ↓
                   [In-Memory]
                   (Lost on restart)
```
- No persistent memory
- No learning between sessions
- No user history
- No analytics

### ✅ WITH Supabase (Planned)
```
Frontend → Backend → Chatbot
                       ↓
                   [Supabase]
                       ↓
            Vector DB + PostgreSQL
                       ↓
        (Persistent learning & memory)
```
- Persistent chat history
- Vector embeddings for similarity search
- User profiles & authentication
- Query learning system
- Analytics & usage tracking

---

## 🧪 Testing Supabase Connection

### Test 1: Backend Can Connect
```bash
docker exec turbobujias-backend \
  node -e "
  const { createClient } = require('@supabase/supabase-js');
  const client = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  client.from('agent_memory').select('*').limit(1)
    .then(() => console.log('✓ Connected'))
    .catch(e => console.log('✗ Error:', e.message));
  "
```

### Test 2: Chatbot Can Access
```bash
docker exec turbobujias-chatbot \
  python -c "
  import os
  from supabase import create_client
  
  client = create_client(
    os.getenv('SUPABASE_URL'),
    os.getenv('SUPABASE_ANON_KEY')
  )
  print('✓ Supabase connected' if client else '✗ Failed')
  "
```

### Test 3: Full Integration
```bash
# Query chatbot via backend with Supabase logging
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test", "should_store": true}'

# Check Supabase for stored interaction
# Go to https://app.supabase.com → Table Editor → agent_memory
```

---

## 🚀 Deployment with Supabase

### HuggingFace Spaces Secrets

Add these to your HF Space **Settings → Secrets**:

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
SUPABASE_DB_URL=postgresql://...
SUPABASE_JWT_SECRET=...
```

Then when Space deploys, all services will automatically connect to Supabase.

---

## 📋 Supabase Connection Checklist

- [ ] Supabase project created
- [ ] API keys copied (URL, anon key, service role key)
- [ ] `.env` file updated with real credentials
- [ ] `.env` is still in `.gitignore` (not committed)
- [ ] Services restarted: `docker compose restart`
- [ ] Backend logs show successful connection
- [ ] Test query works (from Test 1 above)
- [ ] HF Spaces secrets configured (if deploying)

---

## ⚠️ Important Notes

### Security
- ✅ `.env` is local only, not committed to git
- ✅ Supabase keys protected in environment variables
- ✅ Service role key is secret (never share)
- ✅ anon key can be public (used by frontend)

### Best Practices
- ✅ Rotate keys every 90 days
- ✅ Use row-level security (RLS) in Supabase
- ✅ Enable API rate limiting in Supabase
- ✅ Monitor usage in Supabase dashboard

### What Supabase Provides (Free Tier)
- 500 MB database storage
- Up to 2 million vectors (with pgvector)
- Authentication
- Real-time subscriptions
- 50,000 function calls/month
- Perfect for this project ✅

---

## 🔗 Quick Links

- **Supabase Console:** https://app.supabase.com
- **API Documentation:** https://supabase.com/docs/reference/api
- **pgvector (Embeddings):** https://supabase.com/docs/guides/ai/vector-columns
- **Python Client:** https://github.com/supabase/supabase-py
- **Node.js Client:** https://github.com/supabase/supabase-js

---

## 📝 Next Steps

### Option 1: Setup Supabase Now
1. ✅ Create Supabase project
2. ✅ Get credentials
3. ✅ Update `.env`
4. ✅ Restart services
5. ✅ Test connection

### Option 2: Continue Without (For Now)
- ✅ System works without Supabase
- ✅ No persistent memory (resets on restart)
- ✅ Add Supabase later (Phase 2)

### Option 3: Skip & Deploy to HF Spaces
- ✅ Works on HF Spaces without Supabase
- ✅ Add Supabase when needed

---

## 🎯 Current Setup Status

| Component | Status | Priority |
|-----------|--------|----------|
| Frontend | ✅ Working | High |
| Backend | ✅ Working | High |
| Chatbot | ⏳ Building | High |
| Supabase | ❌ Not Configured | Medium |
| Memory/Learning | ❌ Not Available | Medium (Phase 2) |

---

**Supabase Status: ❌ NOT CONNECTED (Optional for now, required for learning phase)**

When ready, follow the steps above to connect! For now, the system works fine without it.
