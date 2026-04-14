# Backend Integration

## Base URLs

- Local backend base: `http://localhost:3001`
- API base: `http://localhost:3001/api`
- Public backend base comes from `BACKEND_PUBLIC_URL`
- Frontend runtime config endpoint: `GET /api/config/public`

## Core API endpoints

### Health

- `GET /api/health`
  - Smoke check for frontend/backend connectivity.
  - Returns `{ status, timestamp }`.

### Public configuration

- `GET /api/config/public`
  - Returns public backend, frontend, chatbot, payment, pricing, and contact links.
  - Frontend uses this for WhatsApp, Instagram, payment URLs, chatbot URL, and callback metadata.

### Inventory

- `GET /api/inventory`
  - Returns full catalog with `items`, `exchange_rates`, `rate_source`, and `rates_last_updated`.
- `GET /api/inventory/rates`
  - Returns current BCV/fallback currency rates.
- `GET /api/inventory/search?q=<term>`
  - Search by SKU, UPC, brand, model, title, or application.
- `GET /api/inventory/:sku`
  - Returns a single catalog item enriched with USD/EUR/VES pricing.

## Payment endpoints and callbacks

### Payment metadata

- `GET /api/payments/config`
  - Returns PayPal and Pago Móvil enablement plus frontend redirect URLs.

### PayPal IPN callback

- `POST /api/payments/paypal`
  - Content type: `application/x-www-form-urlencoded`
  - Verifies the notification against `https://ipnpb.paypal.com/cgi-bin/webscr`
  - Rejects invalid payloads and optional receiver-email mismatches.
  - Production callback URL is exposed as:
    - `GET /api/config/public` → `payments.paypal.ipnCallbackUrl`
    - `GET /api/payments/config` → `paypal.ipnCallbackUrl`

### PayPal frontend redirects

- `GET /api/payments/paypal/success`
- `GET /api/payments/paypal/cancel`
  - Redirect to frontend paths derived from `PAYPAL_SUCCESS_PATH` and `PAYPAL_CANCEL_PATH`.
  - If `FRONTEND_PUBLIC_URL` is not configured, they return JSON instead of redirecting.

### Pago Móvil callback

- `POST /api/payments/pagomovil`
  - Content type: `application/json`
  - Required fields:
    - `reference`
    - `phone`
    - `bank`
    - `amount_ves`
    - `order_id`
  - Returns `pending_verification`, the callback URL, and an optional frontend redirect URL.
  - Production callback URL is exposed as:
    - `GET /api/config/public` → `payments.pagomovil.callbackUrl`
    - `GET /api/payments/config` → `pagomovil.callbackUrl`

## Frontend wiring notes

- `turbobujias-web/components/storefront.js` reads `GET /api/config/public` on load.
- Cart checkout, contact, and cotización flows reuse the public `whatsappUrl` and payment links from that endpoint.
- The frontend auth modal currently persists users locally in Redux/localStorage; no backend auth routes exist yet.
- For production auth, add dedicated endpoints such as `/api/auth/register`, `/api/auth/login`, and `/api/auth/me`, then replace the local-only flow.

## Environment variables

From `backend/.env.example`:

### Server and CORS

- `PORT`
- `BACKEND_PUBLIC_URL`
- `FRONTEND_PUBLIC_URL`
- `CORS_ALLOWED_ORIGINS`

### Chatbot and public links

- `CHATBOT_PUBLIC_URL`
- `WHATSAPP_URL`
- `INSTAGRAM_URL`
- `MERCADOLIBRE_URL`
- `BINANCE_PAY_URL`

### Payments

- `MERCADOPAGO_ACCESS_TOKEN`
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_RECEIVER_EMAIL`
- `PAYPAL_URL`
- `PAYPAL_SUCCESS_PATH`
- `PAYPAL_CANCEL_PATH`
- `PAGOMOVIL_PENDING_PATH`

### Pricing / BCV

- `BCV_API_URL`
- `BCV_ALLOW_INSECURE_TLS`
- `FALLBACK_EXCHANGE_RATE`
- `FALLBACK_EUR_EXCHANGE_RATE`
- `EXCHANGE_RATE_CACHE_TTL_HOURS`

## Recommended integration sequence

1. Set `BACKEND_PUBLIC_URL` and `FRONTEND_PUBLIC_URL`.
2. Confirm `GET /api/health` and `GET /api/config/public` respond correctly.
3. Wire frontend catalog to `GET /api/inventory`.
4. Wire checkout links and callbacks from the public config response.
5. Validate PayPal IPN and Pago Móvil callback URLs in a staging environment before production launch.
