# Test all 5 Supabase Edge Functions

## 1. Upload to Bucket (Public - No Auth)

```bash
SUPABASE_URL="https://auzubegrcawdobkfttpj.supabase.co"

# Generate base64 from test image
b64=$(base64 -w 0 ./test.png)

# Test upload
curl -X POST "$SUPABASE_URL/functions/v1/upload-to-bucket?bucket=turbobujias-fullstack" \
  -H "Content-Type: application/json" \
  -d "{
    \"path\": \"uploads/test-$(date +%s).png\",
    \"contentBase64\": \"$b64\",
    \"contentType\": \"image/png\"
  }"
```

**Expected:**
```json
{
  "bucket": "turbobujias-fullstack",
  "path": "uploads/test-1234567890.png",
  "publicUrl": "https://auzubegrcawdobkfttpj.supabase.co/storage/v1/object/public/turbobujias-fullstack/uploads/test-1234567890.png",
  "data": {...}
}
```

---

## 2. Import Inventory (Auth Required)

**Prerequisites:**
- Get user JWT from Supabase auth
- Or create test JWT via Supabase dashboard

```bash
USER_JWT="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X POST "$SUPABASE_URL/functions/v1/import-inventory" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "sku": "TEST-SKU-001",
        "upc": "123456789012",
        "ean": "9876543210123",
        "title": "Test Spark Plug",
        "condition": "new",
        "stock": 100,
        "price": "25.99"
      }
    ]
  }'
```

**Expected:**
```json
{
  "ok": true,
  "inserted": 1,
  "updated": 0,
  "errors": []
}
```

---

## 3. Inventory Mediator - Scan

```bash
curl -X POST "$SUPABASE_URL/functions/v1/inventory-mediator" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "scan",
    "code": "123456789012",
    "want_image": true
  }'
```

**Expected:**
```json
{
  "ok": true,
  "item": {
    "id": "uuid",
    "sku": "TEST-SKU-001",
    "upc": "123456789012",
    "title": "Test Spark Plug",
    "quantity": 100,
    "price_usd": 25.99,
    "image_urls": [...]
  }
}
```

---

## 4. Inventory Mediator - Sell Confirmed

```bash
DEVICE_ID="mobile-$(uuidgen)"

curl -X POST "$SUPABASE_URL/functions/v1/inventory-mediator" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d "{
    \"action\": \"sell_confirmed\",
    \"code\": \"123456789012\",
    \"device_fingerprint\": \"$DEVICE_ID\",
    \"qty\": 1,
    \"source\": \"payment-confirmed\"
  }"
```

**Expected:**
```json
{
  "ok": true,
  "decremented": true,
  "item": {
    "sku": "TEST-SKU-001",
    "quantity": 99
  }
}
```

---

## 5. Summarize Thread (if implemented)

```bash
curl -X POST "$SUPABASE_URL/functions/v1/summarize-thread" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "thread_id": "conv-12345"
  }'
```

---

## Via Backend Routes (after integration)

```bash
# Upload (no auth)
curl -X POST http://localhost:3001/api/functions/upload \
  -H "Content-Type: application/json" \
  -d '{
    "bucket": "turbobujias-fullstack",
    "path": "qr-scans/test.png",
    "fileBase64": "iVBORw0KG..."
  }'

# Scan (with auth)
curl -X POST http://localhost:3001/api/functions/inventory/scan \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"code": "123456789012"}'

# Sell confirmed (with auth)
curl -X POST http://localhost:3001/api/functions/inventory/sell-confirmed \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "123456789012",
    "qty": 1
  }'
```

---

## Troubleshooting

### 401 Unauthorized
- Missing or invalid JWT
- Function has `verify_jwt = true`
- Get JWT: `curl -X POST $SUPABASE_URL/auth/v1/token?grant_type=password -d '{"email":"...", "password":"..."}'`

### 404 Not Found
- Function not deployed yet
- Wrong function name
- Check: `supabase functions list --project-id auzubegrcawdobkfttpj`

### 400 Invalid Payload
- Wrong JSON format
- Missing required fields
- Check error message in response

### RPC errors (import-inventory, inventory-mediator)
- RPC function not defined in database
- RLS policies blocking access
- Check Supabase dashboard → SQL editor
