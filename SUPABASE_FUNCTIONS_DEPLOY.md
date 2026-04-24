# Supabase Edge Functions deployment

## Project structure

```
supabase/
├── config.toml          # Function configuration (JWT disabled)
└── functions/
    └── upload-to-bucket/
        └── index.ts     # Edge Function handler
```

## Deploy the function

```bash
# Install Supabase CLI if not already done
npm install -g supabase

# Login to Supabase
supabase login

# Deploy the function
supabase functions deploy upload-to-bucket --project-id auzubegrcawdobkfttpj
```

## Test the function

Set environment variables:
```bash
export SUPABASE_URL="https://auzubegrcawdobkfttpj.supabase.co"
export SUPABASE_ANON_KEY="21d74b1156a71b838b73cbd29784d96621353d75e6002855cd8df10eda7b0dce"
```

Generate base64 from a test image:
```bash
# On Linux/macOS:
b64=$(base64 -w 0 ./test.png)

# On Windows (PowerShell):
$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes("./test.png"))
```

Call the function (JWT verification disabled):
```bash
curl -X POST \
  "$SUPABASE_URL/functions/v1/upload-to-bucket?bucket=turbobujias-fullstack" \
  -H "Content-Type: application/json" \
  -d "{\"path\":\"uploads/test.png\",\"contentBase64\":\"$b64\",\"contentType\":\"image/png\"}"
```

Expected response:
```json
{
  "success": true,
  "path": "uploads/test.png",
  "bucket": "turbobujias-fullstack",
  "message": "File uploaded successfully"
}
```

## Key changes from your original function

1. **`verify_jwt = false`** in `config.toml` → allows public access without JWT
2. **`Deno.env.get()` instead of `process.env`** → correct for Edge Functions runtime
3. **CORS headers set to `"*"`** → allows requests from any origin
4. **Service role key used internally** → function doesn't require user JWT, handles auth server-side
5. **Error handling improved** → clear messages for debugging
