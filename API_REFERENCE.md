# Supabase Edge Functions - API Reference

## Base URL
```
https://auzubegrcawdobkfttpj.supabase.co/functions/v1
```

---

## 1. Upload to Bucket

**Endpoint:** `POST /upload-to-bucket`

**Auth:** None (Public)

**Query Parameters:**
- `bucket` (optional): Storage bucket name (default: `turbobujias-fullstack`)

**Request (JSON - base64):**
```json
{
  "path": "uploads/test.png",
  "contentBase64": "iVBORw0KGgoAAAANS...",
  "contentType": "image/png"
}
```

**Request (Multipart):**
```
POST /upload-to-bucket?bucket=turbobujias-fullstack
Content-Type: multipart/form-data

--boundary
Content-Disposition: form-data; name="file"; filename="test.png"
Content-Type: image/png

[binary data]
--boundary
Content-Disposition: form-data; name="path"

uploads/test.png
--boundary--
```

**Response:**
```json
{
  "bucket": "turbobujias-fullstack",
  "path": "uploads/test.png",
  "publicUrl": "https://auzubegrcawdobkfttpj.supabase.co/storage/v1/object/public/turbobujias-fullstack/uploads/test.png",
  "data": {
    "id": "uuid-string",
    "path": "uploads/test.png",
    "fullPath": "turbobujias-fullstack/uploads/test.png"
  }
}
```

**cURL:**
```bash
curl -X POST https://auzubegrcawdobkfttpj.supabase.co/functions/v1/upload-to-bucket \
  -H "Content-Type: application/json" \
  -d '{"path":"uploads/test.png","contentBase64":"...","contentType":"image/png"}'
```

---

## 2. Import Inventory

**Endpoint:** `POST /import-inventory`

**Auth:** Required (Bearer JWT)

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
      "description": "Premium spark plug",
      "image_urls": ["https://example.com/img.jpg"],
      "stock": 150,
      "price": "3.50"
    }
  ]
}
```

**Response:**
```json
{
  "ok": true,
  "inserted": 1,
  "updated": 0,
  "errors": []
}
```

**Error Response:**
```json
{
  "ok": false,
  "inserted": 0,
  "updated": 1,
  "errors": [
    {
      "sku": "BAD-SKU",
      "error": "Invalid price format"
    }
  ]
}
```

**cURL:**
```bash
curl -X POST https://auzubegrcawdobkfttpj.supabase.co/functions/v1/import-inventory \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"sku":"TEST","stock":100,"price":"19.99"}]}'
```

---

## 3. Inventory Mediator

**Endpoint:** `POST /inventory-mediator`

**Auth:** Required (Bearer JWT)

### Action: Scan (lookup product)

**Request:**
```json
{
  "action": "scan",
  "code": "4954487922100",
  "want_image": true
}
```

**Response:**
```json
{
  "ok": true,
  "item": {
    "id": "uuid",
    "sku": "NGK-BKR5E",
    "upc": "4954487922100",
    "ean": "4954487922100",
    "brand": "NGK",
    "model": "BKR5E",
    "type": "Spark Plug",
    "thread": "14",
    "gap_mm": "0.8",
    "electrode": "iridium",
    "price_usd": 3.50,
    "quantity": 150,
    "image_urls": ["https://..."]
  }
}
```

**cURL:**
```bash
curl -X POST https://auzubegrcawdobkfttpj.supabase.co/functions/v1/inventory-mediator \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"action":"scan","code":"4954487922100","want_image":true}'
```

### Action: Sell Confirmed (decrement inventory)

**Request:**
```json
{
  "action": "sell_confirmed",
  "code": "4954487922100",
  "device_fingerprint": "mobile-uuid-12345",
  "qty": 1,
  "source": "payment-confirmed"
}
```

**Response (first sale):**
```json
{
  "ok": true,
  "decremented": true,
  "item": {
    "id": "uuid",
    "sku": "NGK-BKR5E",
    "quantity": 149
  }
}
```

**Response (duplicate sale blocked):**
```json
{
  "ok": true,
  "decremented": false,
  "item": {
    "id": "uuid",
    "sku": "NGK-BKR5E",
    "quantity": 149
  }
}
```

**cURL:**
```bash
curl -X POST https://auzubegrcawdobkfttpj.supabase.co/functions/v1/inventory-mediator \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"action":"sell_confirmed","code":"4954487922100","device_fingerprint":"mobile-123","qty":1}'
```

---

## 4. Summarize Thread

**Endpoint:** `POST /summarize-thread`

**Auth:** Required (Bearer JWT)

**Request Body:**
```json
{
  "thread_id": "conv-12345"
}
```

**Response:** (Depends on implementation)
```json
{
  "ok": true,
  "summary": "..."
}
```

**cURL:**
```bash
curl -X POST https://auzubegrcawdobkfttpj.supabase.co/functions/v1/summarize-thread \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"thread_id":"conv-12345"}'
```

---

## 5. Rapid Function

**Endpoint:** `POST /rapid-function`

**Auth:** Required (Bearer JWT)

**Request Body:** (Custom - define as needed)

**Response:** (Custom - depends on implementation)

**Note:** Function code not found in repo. Define or extract as needed.

---

## Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 200 | Success | ✅ All good |
| 400 | Bad Request | Check JSON format + required fields |
| 401 | Unauthorized | Add valid JWT to Authorization header |
| 404 | Not Found | Product/thread not found in database |
| 405 | Method Not Allowed | Must use POST (GET/PUT not allowed) |
| 500 | Server Error | Check function logs in Supabase dashboard |

---

## Headers Required

### Public Functions (upload-to-bucket)
```
Content-Type: application/json
```

### Protected Functions (inventory-mediator, import-inventory, etc.)
```
Authorization: Bearer <USER_JWT>
Content-Type: application/json
```

---

## Example: Full Workflow

```bash
# 1. Login & get JWT
USER_JWT=$(curl -X POST https://auzubegrcawdobkfttpj.supabase.co/auth/v1/token?grant_type=password \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' \
  | jq -r '.access_token')

# 2. Scan product
curl -X POST https://auzubegrcawdobkfttpj.supabase.co/functions/v1/inventory-mediator \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"action":"scan","code":"4954487922100"}'

# 3. Confirm sale
curl -X POST https://auzubegrcawdobkfttpj.supabase.co/functions/v1/inventory-mediator \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"action":"sell_confirmed","code":"4954487922100","device_fingerprint":"device-123","qty":1}'

# 4. Upload receipt image
b64=$(base64 -w 0 receipt.png)
curl -X POST https://auzubegrcawdobkfttpj.supabase.co/functions/v1/upload-to-bucket \
  -H "Content-Type: application/json" \
  -d "{\"path\":\"receipts/receipt-$(date +%s).png\",\"contentBase64\":\"$b64\"}"
```

---

## Integration with Backend Routes

If you've enabled the Express routes, use these URLs:

```
POST http://localhost:3001/api/functions/upload
POST http://localhost:3001/api/functions/inventory/import
POST http://localhost:3001/api/functions/inventory/scan
POST http://localhost:3001/api/functions/inventory/sell-confirmed
POST http://localhost:3001/api/functions/summarize-thread
POST http://localhost:3001/api/functions/rapid-function
```

**Note:** Backend routes automatically add JWT from the request, so you don't need to pass the Authorization header.
