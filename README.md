# Turbobujias-pro
Turbobujias web site
# ⚡ Turbobujias AI Ecosystem
**Intelligent E-commerce & AI Chatbot for Automotive Ignition and Diesel Systems.**
Turbobujias is a high-performance ecosystem designed for the specialized sale of spark plugs, glow plugs, and diesel spare parts. It integrates a React/Node.js web platform with a multimodal AI Chatbot deployed on Hugging Face.
## 🚀 Core Features
### 🔍 Smart Search & Inventory
 * **Vectorial Search (RAG):** Powered by FAISS and HNSW for semantic search of spare parts.
 * **Universal Lookup:** Search by SKU, UPC, or technical measurements (thread, reach, hex size).
 * **QR/Barcode Scanner:** Integrated PWA tool for warehouse inventory management.
 * **Sourcing:** Technical data grounded on Sparkplugs.com and Mercado Libre Store.
### 🤖 Turbobujias AI Chatbot (Hugging Face)
 * **Deployment:** Gradio-based interface hosted on Hugging Face Spaces.
 * **Multimodal capabilities:**
   * **Text-to-Text:** Technical compatibility advice using Mistral/Llama-3.
   * **Voice-to-Voice:** Speech recognition for mechanics in workshops (Whisper + gTTS).
   * **Text-to-Image:** Visual generation of spark plug types and heat ranges.
 * **Learning Focus:** Continuous improvement based on user queries and technical manuals.
### 💸 Payments & Localization (Venezuela)
 * **Multi-currency:** Real-time conversion (VES/USD) based on BCV rates.
 * **Local Payments:** Manual and API integration for Pago Móvil and Bank Transfers.
 * **Global Payments:** PayPal Smart Buttons integration.
## 🛠️ Tech Stack
### Frontend & Backend
 * **Web:** React.js / Next.js (SEO Optimized)
 * **State:** Redux Toolkit
 * **Backend:** Node.js + Express.js
 * **Database:** JSON (Initial/Free Tier) → MongoDB Atlas
 * **Styling:** Tailwind CSS
### AI & Machine Learning
 * **Frameworks:** Python, Gradio, Transformers (Hugging Face)
 * **Vector DB:** FAISS / LangChain
 * **Embeddings:** sentence-transformers/all-MiniLM-L6-v2
 * **Models:** Mistral-7B / Stable Diffusion XL Turbo
## 📦 Installation & Setup
### 1. Web Platform (Node/React)
```bash
git clone [https://github.com/your-username/turbobujias-platform.git](https://github.com/your-username/turbobujias-platform.git)
cd turbobujias-platform
npm install
npm run dev

```
### 2. AI Chatbot (Hugging Face / Python)
```bash
git clone [https://huggingface.co/spaces/your-username/turbobujias-ai](https://huggingface.co/spaces/your-username/turbobujias-ai)
cd turbobujias-ai
pip install -r requirements.txt
python app.py

```
## 🗺️ Roadmap
 * [ ] **Phase 1:** Core inventory JSON and Node.js API setup.
 * [ ] **Phase 2:** RAG implementation with FAISS for technical specs.
 * [ ] **Phase 3:** Gradio UI deployment with Voice-to-Voice features.
 * [ ] **Phase 4:** Full integration with Mercado Libre API for stock syncing.
## 🤝 Contact & Engagement
 * **Instagram:** @turbobujias
 * **Google Search:** Turbobujias Valencia
 * **Location:** Valencia, Carabobo, Venezuela.
*Developed with focus on performance, SEO, and automotive precision.*
