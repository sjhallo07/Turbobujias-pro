# Turbobujias Pro 🔧

Full-stack e-commerce & AI platform for **Diesel and Spark Plug** auto parts (Venezuela market).

---

## 🗂️ Project Structure

```
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

---

## 🤖 Smart AI Chatbot (Diesel / Spark Plugs)

Powered by [Hugging Face Spaces](https://huggingface.co/spaces) using:

| Component | Technology |
|---|---|
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
|---|---|
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
