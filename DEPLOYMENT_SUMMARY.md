# Supabase Edge Functions - Deployment Summary

## ✅ What's Ready to Deploy

Your project now has **4 out of 5** Edge Functions ready:

### 1. **upload-to-bucket** ✅
- **Location:** `supabase/functions/upload-to-bucket/index.ts`
- **Status:** Ready to deploy
- **Auth:** Public (no JWT)
- **Purpose:** Store files (base64 or multipart) to Supabase Storage
- **Deploy:** `supabase functions deploy upload-to-bucket`

### 2. **import-inventory** ✅
- **Location:** `supabase/functions/import-inventory/index.ts`
- **Status:** Ready to deploy
- **Auth:** Required (user JWT)
- **Purpose:** Bulk upsert inventory items from external sources
- **RPC:** Calls `upsert_inventory_item` function
- **Deploy:** `supabase functions deploy import-inventory`

### 3. **inventory-mediator** ✅
- **Location:** `supabase/functions/inventory-mediator/index.ts`
- **Status:** Ready to deploy
- **Auth:** Required (user JWT)
- **Purpose:** QR scan + pos sales (scan action + sell_confirmed action)
- **RPC:** Calls `sell_decrement` function
- **Deploy:** `supabase functions deploy inventory-mediator`

### 4. **summarize-thread** 📦
- **Location:** `local/summarize-thread.zip` (needs extraction)
- **Status:** Archived, needs extraction first
- **Extract:** `unzip local/summarize-thread.zip -d supabase/functions/summarize-thread/`
- **Deploy:** `supabase functions deploy summarize-thread`

### 5. **rapid-function** ❓
- **Location:** NOT FOUND in repo
- **Status:** Missing
- **Action:** Check Supabase Dashboard or define new function

---

## 🚀 Deployment Instructions

### Step 1: Extract Archived Function
```bash
cd C:\Users\ASUS\tb\Turbobujias-pro
unzip local/summarize-thread.zip -d supabase/functions/summarize-thread/
```

### Step 2: Check Deployment Prerequisites
```bash
# Install CLI
npm install -g supabase

# Login
supabase login

# Verify you're in the right project folder
cd C:\Users\ASUS\tb\Turbobujias-pro
```

### Step 3: Deploy All 4 Functions
```bash
supabase functions deploy upload-to-bucket --project-id auzubegrcawdobkfttpj
supabase functions deploy import-inventory --project-id auzubegrcawdobkfttpj
supabase functions deploy inventory-mediator --project-id auzubegrcawdobkfttpj
supabase functions deploy summarize-thread --project-id auzubegrcawdobkfttpj
```

Or run the automated script:
```bash
bash deploy-all-functions.sh
```

### Step 4: Verify Deployment
```bash
supabase functions list --project-id auzubegrcawdobkfttpj
```

You should see all 4 functions listed with status ✅.

---

## 📝 Configuration

Your `supabase/config.toml` is already set up:

```toml
# Public function (no auth)
[functions.upload-to-bucket]
verify_jwt = false

# Protected functions (user must be logged in)
[functions.import-inventory]
verify_jwt = true

[functions.inventory-mediator]
verify_jwt = true

[functions.summarize-thread]
verify_jwt = true
```

---

## 🔌 Backend Integration

### Option A: Call Directly from Express

```javascript
import { importInventoryBulk, scanProduct, confirmSale } from './helpers/supabase-functions.js';

// In your route handler:
const result = await scanProduct(code, userJWT);
```

### Option B: Use Provided Routes

Add to `backend/server.js`:
```javascript
import supabaseFunctionsRoutes from './routes/supabase-functions.js';
app.use('/api/functions', supabaseFunctionsRoutes);
```

Then call:
```bash
POST /api/functions/inventory/scan
POST /api/functions/inventory/sell-confirmed
POST /api/functions/inventory/import
POST /api/functions/upload
POST /api/functions/summarize-thread
```

---

## 🧪 Quick Test

### Test Upload (No Auth)
```bash
export SUPABASE_URL="https://auzubegrcawdobkfttpj.supabase.co"
b64=$(base64 -w 0 test.png)

curl -X POST "$SUPABASE_URL/functions/v1/upload-to-bucket" \
  -H "Content-Type: application/json" \
  -d "{\"path\":\"uploads/test.png\",\"contentBase64\":\"$b64\",\"contentType\":\"image/png\"}"
```

### Test Inventory (With Auth)
```bash
export USER_JWT="your-jwt-token-here"

curl -X POST "$SUPABASE_URL/functions/v1/import-inventory" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"sku":"TEST","stock":100,"price":"19.99"}]}'
```

---

## 📊 Database Requirements

Make sure these exist in your Supabase database:

### Tables
- `inventory_items` (columns: id, sku, upc, ean, oem_code, title, quantity, price_usd, image_urls, ...)
- `inventory_device_scan_logs` (columns: id, device_fingerprint, code_used, code_type, qty, source, created_at)

### RPC Functions
- `upsert_inventory_item(p_sku, p_upc, p_ean, p_oem_code, p_title, p_quantity, p_price, ...)`
- `sell_decrement(p_code, p_qty, p_source)`

If these don't exist, create them in Supabase SQL editor:
```sql
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE NOT NULL,
  upc TEXT,
  ean TEXT,
  quantity INT DEFAULT 0,
  price_usd DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE inventory_device_scan_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_fingerprint TEXT NOT NULL,
  code_used TEXT NOT NULL,
  qty INT DEFAULT 1,
  source TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- RPC stub (replace with actual logic)
CREATE OR REPLACE FUNCTION upsert_inventory_item(
  p_sku TEXT,
  p_upc TEXT DEFAULT NULL,
  p_ean TEXT DEFAULT NULL,
  p_oem_code TEXT DEFAULT NULL,
  p_title TEXT DEFAULT NULL,
  p_quantity INT DEFAULT 0,
  p_price DECIMAL DEFAULT 0,
  p_image_urls TEXT[] DEFAULT NULL
) RETURNS JSON AS $$
BEGIN
  -- Implementation here
  RETURN JSON_BUILD_OBJECT('action', 'inserted');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sell_decrement(
  p_code TEXT,
  p_qty INT DEFAULT 1,
  p_source TEXT DEFAULT 'unknown'
) RETURNS JSON AS $$
BEGIN
  -- Implementation here
  RETURN JSON_BUILD_OBJECT('action', 'decremented');
END;
$$ LANGUAGE plpgsql;
```

---

## 📚 Files Created/Modified

✅ **Created:**
- `supabase/config.toml` - Function configuration
- `supabase/functions/upload-to-bucket/index.ts` - Upload function
- `supabase/functions/import-inventory/index.ts` - Import function
- `supabase/functions/inventory-mediator/index.ts` - Mediator function
- `backend/helpers/supabase-functions.ts` - Helper module
- `backend/routes/supabase-functions.ts` - Express routes
- `SUPABASE_FUNCTIONS_ANALYSIS.md` - Detailed analysis
- `TEST_ALL_FUNCTIONS.md` - Test examples
- `deploy-all-functions.sh` - Deployment script

---

## 🎯 Next Steps

1. ✅ Extract `summarize-thread.zip`
2. ✅ Run `supabase functions deploy` for all 4 functions
3. ✅ Test each function with curl (see TEST_ALL_FUNCTIONS.md)
4. ✅ Create RPC functions in Supabase if missing
5. ✅ Add `backend/routes/supabase-functions.ts` to Express server
6. ✅ Test via backend API endpoints

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Function not found" | Run `supabase functions deploy` for that function |
| "Invalid JWT" | Get user JWT from auth system, add to Authorization header |
| "RPC not found" | Create RPC function in Supabase SQL editor |
| "Table not found" | Create tables in Supabase (see schema above) |
| "CORS error" | All functions have `Access-Control-Allow-Origin: *` |

See SUPABASE_FUNCTIONS_ANALYSIS.md for detailed troubleshooting.

---

## 📞 Support

- Supabase Docs: https://supabase.com/docs/guides/functions
- Edge Function Examples: https://github.com/supabase/supabase/tree/master/examples/edge-functions
- Issues with your project: Check Supabase Dashboard → Edge Functions logs
