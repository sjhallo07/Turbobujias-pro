# Supabase Edge Functions - Comprehensive Analysis & Deployment

## Overview: 5 Functions

| Function | Status | Purpose | Auth | Bucket | RPC |
|----------|--------|---------|------|--------|-----|
| `upload-to-bucket` | ✅ Created | Store files to Supabase Storage | Service Role | `turbobujias-fullstack` | No |
| `import-inventory` | 📋 Ready | Bulk upsert inventory items | User JWT | N/A | `upsert_inventory_item` |
| `inventory-mediator` | 📋 Ready | Scan QR + sell-confirmed actions | User JWT | N/A | `sell_decrement` |
| `rapid-function` | ❓ Missing | *(Not found in repo)* | ? | ? | ? |
| `summarize-thread` | 📦 Archived | *(Zipped, needs extraction)* | ? | ? | ? |

---

## 1. upload-to-bucket ✅

**Status:** Created locally, needs deployment

**Purpose:** Upload files (base64 or multipart) to Supabase Storage

**Key Features:**
- Supports JSON body with base64 OR multipart form data
- Returns public URL after upload
- Upsert mode (overwrite existing files)
- CORS enabled for public access

**Config:**
```toml
[functions.upload-to-bucket]
verify_jwt = false
```

**Deploy:**
```bash
supabase functions deploy upload-to-bucket --project-id auzubegrcawdobkfttpj
```

**Test - JSON (base64):**
```bash
curl -X POST \
  "https://auzubegrcawdobkfttpj.supabase.co/functions/v1/upload-to-bucket?bucket=turbobujias-fullstack" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "uploads/test.png",
    "contentBase64": "iVBORw0KGgoAAAANS...",
    "contentType": "image/png"
  }'
```

**Test - Multipart:**
```bash
curl -X POST \
  "https://auzubegrcawdobkfttpj.supabase.co/functions/v1/upload-to-bucket?bucket=turbobujias-fullstack" \
  -F "file=@./test.png" \
  -F "path=uploads/test.png"
```

**Expected Response:**
```json
{
  "bucket": "turbobujias-fullstack",
  "path": "uploads/test.png",
  "publicUrl": "https://auzubegrcawdobkfttpj.supabase.co/storage/v1/object/public/turbobujias-fullstack/uploads/test.png",
  "data": { "id": "...", "path": "uploads/test.png", "fullPath": "..." }
}
```

---

## 2. import-inventory 📋

**Status:** Code ready, needs deployment

**Purpose:** Bulk upsert inventory items from external sources (Excel, API)

**Key Features:**
- Batch import with SKU/UPC/EAN/OEM codes
- Validates numeric fields (price, quantity)
- Forwards user JWT to RPC for RLS
- Returns insert/update counts + errors

**Auth:** Requires user JWT (Authorization: Bearer <token>)

**RPC Called:** `upsert_inventory_item`

**Request Body:**
```json
{
  "items": [
    {
      "sku": "NGK-BKR5E",
      "upc": "4954487922100",
      "ean": "4954487922100",
      "oem_code": "BKR5E",
      "title": "NGK Spark Plug BKR5E",
      "condition": "new",
      "description": "Premium spark plug for petrol engines",
      "image_urls": ["https://example.com/img.png"],
      "stock": 150,
      "price": "3.50"
    }
  ]
}
```

**Deploy:**
```bash
supabase functions deploy import-inventory --project-id auzubegrcawdobkfttpj
```

**Config (add to supabase/config.toml):**
```toml
[functions.import-inventory]
verify_jwt = true
```

**Test with User JWT:**
```bash
# First: Get a valid user JWT from your auth system
export USER_JWT="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X POST \
  "https://auzubegrcawdobkfttpj.supabase.co/functions/v1/import-inventory" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "sku": "TEST-001",
        "upc": "123456789012",
        "title": "Test Item",
        "stock": 100,
        "price": "19.99"
      }
    ]
  }'
```

**Expected Response:**
```json
{
  "ok": true,
  "inserted": 1,
  "updated": 0,
  "errors": []
}
```

---

## 3. inventory-mediator 📋

**Status:** Code ready, needs deployment

**Purpose:** Handle POS/Mobile operations: **scan** item lookup + **sell_confirmed** decrement

**Key Features:**
- `action: "scan"` → lookup product by UPC/EAN/SKU
- `action: "sell_confirmed"` → decrement quantity (one-time per device)
- Device fingerprint prevents duplicate sales
- Optional image return to reduce payload
- Logs device usage for audit trail

**Auth:** Requires user JWT

**RPC Called:** `sell_decrement`

**Tables Used:**
- `inventory_items` (select)
- `inventory_device_scan_logs` (insert logs, prevent dupes)

**Deploy:**
```bash
supabase functions deploy inventory-mediator --project-id auzubegrcawdobkfttpj
```

**Config (add to supabase/config.toml):**
```toml
[functions.inventory-mediator]
verify_jwt = true
```

**Test 1: Scan (lookup)**
```bash
curl -X POST \
  "https://auzubegrcawdobkfttpj.supabase.co/functions/v1/inventory-mediator" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "scan",
    "code": "4954487922100",
    "want_image": true
  }'
```

**Response (scan):**
```json
{
  "ok": true,
  "item": {
    "id": "...",
    "sku": "NGK-BKR5E",
    "upc": "4954487922100",
    "ean": "4954487922100",
    "brand": "NGK",
    "model": "BKR5E",
    "type": "Spark Plug",
    "price_usd": 3.50,
    "quantity": 150,
    "image_urls": ["https://..."]
  }
}
```

**Test 2: Sell Confirmed (decrement)**
```bash
curl -X POST \
  "https://auzubegrcawdobkfttpj.supabase.co/functions/v1/inventory-mediator" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "sell_confirmed",
    "code": "4954487922100",
    "device_fingerprint": "mobile-uuid-12345",
    "qty": 1,
    "source": "payment-confirmed"
  }'
```

**Response (sell_confirmed):**
```json
{
  "ok": true,
  "decremented": true,
  "item": {
    "id": "...",
    "sku": "NGK-BKR5E",
    "quantity": 149
  }
}
```

---

## 4. rapid-function ❓

**Status:** MISSING - Not found in repo

**Next Steps:**
- Search Supabase Dashboard for function code
- OR extract from `summarize-thread.zip` if related
- OR define new function purpose

---

## 5. summarize-thread 📦

**Status:** ARCHIVED - Zipped file

**Next Steps:**
1. Extract the zip:
   ```bash
   unzip C:\Users\ASUS\tb\Turbobujias-pro\local\summarize-thread.zip -d C:\Users\ASUS\tb\Turbobujias-pro\supabase\functions\summarize-thread\
   ```

2. Check extracted files:
   ```bash
   ls C:\Users\ASUS\tb\Turbobujias-pro\supabase\functions\summarize-thread/
   ```

3. Deploy if ready:
   ```bash
   supabase functions deploy summarize-thread --project-id auzubegrcawdobkfttpj
   ```

---

## Full Deployment Steps

### 1. Initialize Supabase CLI (if not done)
```bash
npm install -g supabase
supabase login
```

### 2. Copy function code to supabase/functions/
```bash
# Already done: upload-to-bucket
cp C:\Users\ASUS\tb\Turbobujias-pro\local\import-inventory.ts \
   C:\Users\ASUS\tb\Turbobujias-pro\supabase\functions\import-inventory\index.ts

cp C:\Users\ASUS\tb\Turbobujias-pro\local\inventory_mediator.ts \
   C:\Users\ASUS\tb\Turbobujias-pro\supabase\functions\inventory-mediator\index.ts
```

### 3. Update supabase/config.toml
```toml
[functions.upload-to-bucket]
verify_jwt = false

[functions.import-inventory]
verify_jwt = true

[functions.inventory-mediator]
verify_jwt = true

[functions.summarize-thread]
verify_jwt = true
```

### 4. Deploy all functions
```bash
cd C:\Users\ASUS\tb\Turbobujias-pro

supabase functions deploy upload-to-bucket --project-id auzubegrcawdobkfttpj
supabase functions deploy import-inventory --project-id auzubegrcawdobkfttpj
supabase functions deploy inventory-mediator --project-id auzubegrcawdobkfttpj
supabase functions deploy summarize-thread --project-id auzubegrcawdobkfttpj
```

### 5. Verify deployment
```bash
supabase functions list --project-id auzubegrcawdobkfttpj
```

---

## Integration: Backend Routes

### Option A: Call functions from Express backend

```javascript
// backend/routes/inventory.js
import axios from 'axios';

const SUPABASE_URL = 'https://auzubegrcawdobkfttpj.supabase.co';

export async function importInventoryBulk(items, userJWT) {
  const response = await axios.post(
    `${SUPABASE_URL}/functions/v1/import-inventory`,
    { items },
    { headers: { Authorization: `Bearer ${userJWT}` } }
  );
  return response.data;
}

export async function scanProduct(code, userJWT) {
  const response = await axios.post(
    `${SUPABASE_URL}/functions/v1/inventory-mediator`,
    {
      action: 'scan',
      code,
      want_image: true
    },
    { headers: { Authorization: `Bearer ${userJWT}` } }
  );
  return response.data;
}

export async function confirmSale(code, deviceId, qty, userJWT) {
  const response = await axios.post(
    `${SUPABASE_URL}/functions/v1/inventory-mediator`,
    {
      action: 'sell_confirmed',
      code,
      device_fingerprint: deviceId,
      qty,
      source: 'payment-confirmed'
    },
    { headers: { Authorization: `Bearer ${userJWT}` } }
  );
  return response.data;
}
```

### Option B: Create Express endpoints that wrap functions

```javascript
// backend/routes/inventory.js - POST /api/inventory/import
router.post('/import', requireAuth, async (req, res) => {
  try {
    const result = await importInventoryBulk(req.body.items, req.user.token);
    res.json(result);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// POST /api/inventory/scan
router.post('/scan', requireAuth, async (req, res) => {
  try {
    const result = await scanProduct(req.body.code, req.user.token);
    res.json(result);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// POST /api/sales/confirm
router.post('/sales/confirm', requireAuth, async (req, res) => {
  try {
    const result = await confirmSale(
      req.body.code,
      req.body.device_id,
      req.body.qty,
      req.user.token
    );
    res.json(result);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});
```

---

## Troubleshooting

### "Invalid JWT" / "Missing Authorization"
- Function has `verify_jwt = true`
- You must send valid user JWT: `-H "Authorization: Bearer $TOKEN"`
- Get JWT from Supabase auth or your login system

### "Method not allowed"
- Only POST is accepted (+ OPTIONS for CORS)
- Change `curl -X GET` → `curl -X POST`

### "Product not found"
- Code (UPC/EAN/SKU) doesn't exist in `inventory_items` table
- Check inventory table has data + correct column names

### "RPC sell_decrement failed"
- RPC function doesn't exist in your Supabase database
- Create it:
  ```sql
  CREATE OR REPLACE FUNCTION sell_decrement(
    p_code TEXT,
    p_qty INT,
    p_source TEXT DEFAULT 'unknown'
  )
  RETURNS TABLE(...) AS $$
    -- SQL implementation needed
  $$ LANGUAGE plpgsql;
  ```

### Function not live
```bash
supabase functions list --project-id auzubegrcawdobkfttpj
supabase functions get <function_name> --project-id auzubegrcawdobkfttpj
```

---

## Files to Create/Update

✅ Already created:
- `supabase/functions/upload-to-bucket/index.ts`
- `supabase/config.toml`

🔨 Need to create:
- `supabase/functions/import-inventory/index.ts` (copy from local/)
- `supabase/functions/inventory-mediator/index.ts` (copy from local/)
- Extract + update `supabase/functions/summarize-thread/index.ts`

📝 Backend integration (optional):
- `backend/helpers/supabase-functions.ts` (axios wrappers)
- Update `backend/routes/inventory.ts` (add endpoints)

---

## Next Actions (Priority Order)

1. ✅ Copy `import-inventory.ts` to `supabase/functions/import-inventory/index.ts`
2. ✅ Copy `inventory_mediator.ts` to `supabase/functions/inventory-mediator/index.ts`
3. ✅ Extract `summarize-thread.zip`
4. ✅ Update `supabase/config.toml` with all 4 functions
5. ✅ Run `supabase functions deploy upload-to-bucket`
6. ✅ Run `supabase functions deploy import-inventory`
7. ✅ Run `supabase functions deploy inventory-mediator`
8. ✅ Run `supabase functions deploy summarize-thread`
9. ✅ Test each function with curl
10. ✅ Add backend routes for frontend integration
