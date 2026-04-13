# Turbobujias Pro 🔧

Full-stack e-commerce & AI platform for **Diesel and Spark Plug** auto parts (Venezuela market).

---

## 🗂️ Project Structure

```text
Turbobujias-pro/
├── backend/              # Node.js + Express API
│   ├── data/
│   │   └── inventory.json
│   ├── routes/
│   ├── server.js
│   └── package.json
├── turbobujias-ai/       # Python + Gradio AI Chatbot (Hugging Face Spaces)
│   ├── app.py
│   └── requirements.txt
└── turbobujias-web/      # React + Next.js Frontend
    └── package.json
```

---

## 🔍 Search by UPC / SKU

The platform supports product lookup by:

- **UPC** (Universal Product Code) – scan or enter the barcode printed on the box.
- **SKU** (Stock Keeping Unit) – internal reference from the Turbobujias3646 Mercado Libre store.

The backend exposes a `/api/inventory/search?q=<UPC_or_SKU>` endpoint that queries
`data/inventory.json` and returns brand, thread size, application, and price in both currencies.

### Getting started with a barcode lookup API

If you want to enrich the catalog with external barcode metadata, you can connect the project to a
barcode lookup service that supports **EAN**, **GTIN**, and **UPC** queries.

Typical use cases include:

- looking up a single **13-digit EAN / GTIN**
- looking up a **12-digit UPC**
- searching products by **keyword or product name**
- searching by **EAN prefix** to discover related products

Replace the placeholder token in the examples below with your own API token before using them.

#### Lookup an EAN barcode

Use the barcode lookup operation and send the barcode in the `ean` parameter. For UPC codes, use
`upc` instead.

```bash
curl "https://api.ean-search.org/api?token=YOUR_TOKEN&op=barcode-lookup&format=json&ean=5099750442227"
```

Example response:

```json
[
  {
    "ean": "5099750442227",
    "name": "Michael Jackson, Thriller",
    "categoryId": "15",
    "categoryName": "Music",
    "googleCategoryId": "855",
    "issuingCountry": "UK"
  }
]
```

#### Search by product name

Use a product search operation when you only know part of the item name. URL-encode spaces and
special characters in the search text.

```bash
curl "https://api.ean-search.org/api?token=YOUR_TOKEN&op=product-search&format=json&name=Bananaboat"
```

Example response:

```json
{
  "page": 0,
  "moreproducts": false,
  "totalproducts": 2,
  "productlist": [
    {
      "ean": "0042286275123",
      "name": "Stephan Remmler, Bananaboat",
      "categoryId": "15",
      "categoryName": "Music",
      "issuingCountry": "US"
    },
    {
      "ean": "4011222328366",
      "name": "Harry Belafonte: Bananaboat",
      "categoryId": "15",
      "categoryName": "Music",
      "issuingCountry": "DE"
    }
  ]
}
```

#### Search by EAN prefix

Prefix search is useful when a supplier or product family shares the same opening digits.

```bash
curl "https://api.ean-search.org/api?token=YOUR_TOKEN&op=barcode-prefix-search&format=json&prefix=0885909"
```

Example response:

```json
{
  "page": 0,
  "moreproducts": true,
  "productlist": [
    {
      "ean": "0885909000173",
      "name": "Apple iPhone 4 8GB Svart Telenor",
      "categoryId": "25",
      "categoryName": "Electronics",
      "issuingCountry": "US"
    },
    {
      "ean": "0885909000180",
      "name": "Apple iPhone 4 8GB Vit Telenor",
      "categoryId": "25",
      "categoryName": "Electronics",
      "issuingCountry": "US"
    }
  ]
}
```

This external lookup flow can complement the local `/api/inventory/search` endpoint when the
project needs broader barcode coverage beyond the catalog stored in `inventory.json`.

---

## 🔒 Operational best practices

### Secrets and tokens

- **Never commit real tokens** to the repository. All example files use placeholder
  strings such as `your_github_token_here`.
- Store production secrets as environment variables or CI/CD secrets (for example
  Vercel environment variables, Hugging Face Space secrets, or GitHub Actions secrets).
- Rotate any token that was ever copied into a file, issue comment, or PR body.

### Backend startup

```bash
cd backend
cp .env.example .env   # fill in real values; never commit the filled-in .env
npm install
npm start              # listens on PORT (default 3001)
```

The backend exposes `/api/health` as a smoke-check endpoint.

### AI Chatbot startup

```bash
cd turbobujias-ai
cp .env.example .env   # add GITHUB_TOKEN or HF_TOKEN; never commit this file
pip install -r requirements.txt
python app.py          # binds to 0.0.0.0:PORT (default 7860)
```

When `GITHUB_TOKEN` is set `LLM_PROVIDER` defaults to `github` automatically.
Rate-limit errors from GitHub Models are retried internally (up to 3 attempts)
and are **never** shown as raw error text in the chat UI.

### Frontend startup

```bash
cd turbobujias-web
cp .env.local.example .env.local   # or create it manually from the template below
npm install
npm run dev            # development server on port 3000
```

Minimal `.env.local` for local development:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api
HF_SPACE_URL=https://sjhallo07-turbobujias-ai.hf.space
```

`HF_SPACE_URL` (server-only) controls the chatbot endpoint used by the Next.js
API route. `NEXT_PUBLIC_API_URL` must point to the running backend.

### Chatbot endpoint targeting

The Next.js proxy route (`/api/ai-chat`) reads the Space URL in this priority order:

1. `HF_SPACE_URL` (server-only, recommended for production)
2. `NEXT_PUBLIC_HF_SPACE_URL` (also visible to the browser)
3. Hard-coded fallback: `https://sjhallo07-turbobujias-ai.hf.space`

Always set `HF_SPACE_URL` in production so the frontend never falls back to a
stale or incorrect Space URL.

### MCP configuration (.vscode/mcp.json)

The repository's `.vscode/mcp.json` uses `${input:token}` and `${input:hfToken}`
prompts so tokens are **never stored in the file**. When VS Code reads this file
it asks you for the values at runtime and keeps them only in memory.

- Do **not** replace the `${input:…}` placeholders with real token values.
- Do **not** add hardcoded URLs pointing to internal or private services.

---



Powered by [Hugging Face Spaces](https://huggingface.co/spaces) using:

| Component | Technology |
| --- | --- |
| Embedding model | `sentence-transformers/all-MiniLM-L6-v2` |
| LLM | `mistralai/Mistral-7B-Instruct-v0.2` (via HuggingFaceHub) |
| Vector store | `faiss-cpu` |
| UI | `Gradio` |
| Voice input | `openai-whisper` |

The chatbot answers compatibility questions like:
> *"Which spark plug fits a 2018 Toyota Corolla 1.8L?"*
> *"¿Cuál bujía es compatible con un Hilux 2.7 gasolina?"*

The React frontend calls the Space via the `/run/predict` endpoint or the
official `@gradio/client` npm package.

---

## 💱 Dual Currency System (VES / USD)

All prices are stored in **USD** in `inventory.json`.  
The backend fetches the official BCV exchange rate and returns both:

```json
{
  "sku": "NGK-BKR5E",
  "price_usd": 3.50,
  "price_ves": 127.40,
  "exchange_rate": 36.40,
  "rate_source": "BCV"
}
```

The frontend displays prices in both currencies and lets the user toggle the preferred display.

---

## ⚙️ Setup

### Backend (Node.js)

```bash
cd backend
npm install
cp .env.example .env   # fill in secrets
npm start
```

### AI Chatbot (Python)

```bash
cd turbobujias-ai
pip install -r requirements.txt
python app.py
```

### Frontend (Next.js)

```bash
cd turbobujias-web
npm install
npm run dev
```

### Frontend environment variables

Use `.env.local` inside `turbobujias-web/` to switch between localhost, local network, and public production URLs:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_HF_SPACE_URL=https://sjhallo07-turbobujias-ai.hf.space
NEXT_PUBLIC_WHATSAPP_URL=https://api.whatsapp.com/send
NEXT_PUBLIC_INSTAGRAM_URL=https://www.instagram.com/turbobujiaspro/
NEXT_PUBLIC_MERCADOLIBRE_URL=https://www.mercadolibre.com.ve/
NEXT_PUBLIC_PAYPAL_URL=https://www.paypal.com/
NEXT_PUBLIC_BINANCE_PAY_URL=https://pay.binance.com/
```

- **Local backend on same machine:** `NEXT_PUBLIC_API_URL=http://localhost:3001/api`
- **Android/iOS testing on the same Wi-Fi:** use the LAN IP of the backend host, for example `http://192.168.1.25:3001/api`
- **Production:** replace `NEXT_PUBLIC_API_URL` with the public backend URL and point the contact/payment URLs to live business accounts

---

## 🚀 Deployment

| Service | Platform |
| --- | --- |
| Backend API | Render / Railway (via GitHub Actions) |
| AI Chatbot | Hugging Face Spaces |
| Frontend | Vercel |

GitHub Actions workflow (`.github/workflows/deploy-backend.yml`) auto-deploys
the backend on every push to `main`.

For mobile use, the storefront is a responsive web app that works in Android and iOS browsers once the backend URL is reachable from the device.

The chatbot can stay on Hugging Face Spaces and be opened from the storefront in a separate browser tab/window.

---

## 📦 Payments

- **PayPal IPN** – webhook at `POST /api/payments/paypal`
- **Pago Móvil** – receipt image upload + validation at `POST /api/payments/pagomovil`

---

## 📄 License

MIT
