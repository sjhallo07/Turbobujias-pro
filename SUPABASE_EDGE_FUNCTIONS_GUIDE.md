# Supabase Edge Functions - Complete Setup & Testing Guide

## Problem Analysis

Your original curl command had these issues:

```bash
# ❌ WRONG: Double URL + JWT (anon key ≠ JWT)
curl -X POST "$SUPABASE_URL/https://auzubegrcawdobkfttpj.supabase.co/functions/v1/upload-to-bucket"
  -H "Authorization: Bearer $21d74b1156a71b838b73cbd29784d96621353d75e6002855cd8df10eda7b0dce"
```

**Issues:**
1. `$SUPABASE_URL/https://...` → duplicated scheme/host
2. `Authorization: Bearer <ANON_KEY>` → anon key is not a JWT token
3. Function had `verify_jwt = true` by default → rejected the invalid JWT

## Solution

### Step 1: Deploy the Edge Function

#### Install Supabase CLI
```bash
npm install -g supabase
```

#### Login to Supabase
```bash
supabase login
# Browser opens → approve the token
```

#### Deploy the function
```bash
cd C:\Users\ASUS\tb\Turbobujias-pro
supabase functions deploy upload-to-bucket --project-id auzubegrcawdobkfttpj
```

The function will be deployed to:
```
https://auzubegrcawdobkfttpj.supabase.co/functions/v1/upload-to-bucket
```

### Step 2: Verify config.toml

Your `supabase/config.toml` has:
```toml
[functions.upload-to-bucket]
verify_jwt = false
```

This disables JWT verification → allows public access without Bearer token.

### Step 3: Test with curl (Windows/MINGW64)

#### Set environment variables
```bash
export SUPABASE_URL="https://auzubegrcawdobkfttpj.supabase.co"
export SUPABASE_ANON_KEY="21d74b1156a71b838b73cbd29784d96621353d75e6002855cd8df10eda7b0dce"
```

#### Generate base64 from test image
```bash
# Create a test image first or use existing one
# Generate base64 (wrap output in a variable)
b64=$(base64 -w 0 ./test.png)

# Verify it worked
echo "$b64" | head -c 50  # Should show base64 chars
```

#### Call the Edge Function (NO Authorization header needed)
```bash
curl -X POST \
  "$SUPABASE_URL/functions/v1/upload-to-bucket?bucket=turbobujias-fullstack" \
  -H "Content-Type: application/json" \
  -d "{\"path\":\"uploads/test.png\",\"contentBase64\":\"$b64\",\"contentType\":\"image/png\"}"
```

#### Expected response
```json
{
  "success": true,
  "path": "uploads/test.png",
  "bucket": "turbobujias-fullstack",
  "message": "File uploaded successfully"
}
```

### Step 4: Call from Node.js Backend

#### Option A: Direct axios call
```javascript
import axios from 'axios';

const SUPABASE_URL = "https://auzubegrcawdobkfttpj.supabase.co";

async function uploadFile(path, base64Data, contentType) {
  try {
    const response = await axios.post(
      `${SUPABASE_URL}/functions/v1/upload-to-bucket?bucket=turbobujias-fullstack`,
      {
        path,
        contentBase64: base64Data,
        contentType
      },
      {
        headers: { "Content-Type": "application/json" }
      }
    );
    return response.data;
  } catch (error) {
    console.error("Upload failed:", error.response?.data);
    throw error;
  }
}
```

#### Option B: Use helper in backend/helpers/supabase-upload.ts
```javascript
import { uploadViaEdgeFunction } from './helpers/supabase-upload.js';

const result = await uploadViaEdgeFunction(
  "turbobujias-fullstack",
  "uploads/test.png",
  base64String,
  "image/png"
);

console.log(result); // { success: true, path, bucket, message }
```

### Step 5: Test via Backend API (once storage.ts route is enabled)

```bash
# Upload file with base64 content
curl -X POST http://localhost:3001/api/storage/upload \
  -H "Content-Type: application/json" \
  -d '{
    "bucket": "turbobujias-fullstack",
    "path": "uploads/test.png",
    "contentType": "image/png",
    "fileBase64": "iVBORw0KGgoAAAANS..."
  }'
```

## Troubleshooting

### Error: "Invalid JWT"
**Cause:** Edge Function still has `verify_jwt = true`  
**Fix:** 
```bash
# Update config.toml with verify_jwt = false
# Redeploy:
supabase functions deploy upload-to-bucket
```

### Error: "Missing authorization header"
**Cause:** Function expects Bearer token but you didn't send one  
**Fix:** If you want public access, set `verify_jwt = false`. If you want auth, send a valid JWT:
```bash
# Get user session JWT from your auth system
export USER_JWT="eyJhbGciOi..."
curl -X POST ... -H "Authorization: Bearer $USER_JWT"
```

### Error: "ECONNREFUSED" or timeout
**Cause:** Function deployment failed or not live yet  
**Fix:**
```bash
# Check deployment status
supabase functions list --project-id auzubegrcawdobkfttpj

# Check function logs
supabase functions get upload-to-bucket --project-id auzubegrcawdobkfttpj
```

### Error: "Bucket not found"
**Cause:** Bucket name wrong or permissions issue  
**Fix:**
- Verify bucket exists in Supabase Storage dashboard
- Check bucket RLS policies allow storage operations
- Bucket name must be exact: `turbobujias-fullstack`

## Key Differences from Your Original Command

| Issue | Original | Fixed |
|-------|----------|-------|
| URL | `$SUPABASE_URL/https://...` (doubled) | `$SUPABASE_URL/functions/v1/upload-to-bucket` |
| Authorization | `Bearer $ANON_KEY` (invalid JWT) | None (verify_jwt = false) |
| Path handling | Not in request | In request body as `path` param |
| Base64 | Tried to cat /tmp (Windows ❌) | Use inline shell var `$b64` |
| Content-Type | Nested in -d | In body as `contentType` field |

## Files Created/Modified

- ✅ `supabase/functions/upload-to-bucket/index.ts` - Edge Function handler
- ✅ `supabase/config.toml` - Disables JWT verification
- ✅ `backend/helpers/supabase-upload.ts` - Helper functions
- ✅ `backend/routes/storage.ts` - Express routes (commented in server.js until enabled)
- ✅ `deploy-supabase-function.sh` - Bash deployment script
- ✅ `deploy-supabase-function.ps1` - PowerShell deployment script

## Next: Integrate QR Code Uploads

Once the base function works, you can add:

```javascript
// QR scan → base64 image → Supabase bucket
POST /api/storage/qr-scan-upload
Body: { qrCodeData: "<base64>", productSku: "NGK-BKR5E" }
```

Your QR code scanner can directly POST this to the backend, which will:
1. Convert base64 → call Edge Function
2. Store in `qr-scans/NGK-BKR5E/<timestamp>.jpg`
3. Return storage URL
