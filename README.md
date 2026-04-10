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

---

## 🚀 Deployment

| Service | Platform |
|---|---|
| Backend API | Render / Railway (via GitHub Actions) |
| AI Chatbot | Hugging Face Spaces |
| Frontend | Vercel |

GitHub Actions workflow (`.github/workflows/deploy-backend.yml`) auto-deploys
the backend on every push to `main`.

---

## 📦 Payments

- **PayPal IPN** – webhook at `POST /api/payments/paypal`
- **Pago Móvil** – receipt image upload + validation at `POST /api/payments/pagomovil`

---

## 📄 License

MIT
