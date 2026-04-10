# 📦 Repository Setup: Turbobujias Full-Stack & AI
Follow these instructions to initialize the ecosystem for Turbobujias, integrating React, Node.js, and the Hugging Face Gradio Chatbot.
## 1. Project Structure
Create a monorepo or two separate repositories:
 * turbobujias-platform: React + Node.js (Web & Admin).
 * turbobujias-ai: Python + Gradio (Deployment in Hugging Face).
## 2. Phase 1: Backend & Data (Node.js)
 1. **Initialize:** npm init -y
 2. **Install:** npm install express cors dotenv mercadopago axios
 3. **Database:** Create data/inventory.json with technical specs (UPC, Brand, Thread, Application).
 4. **Git Lift:** Use GitHub Actions for auto-deploying the backend to a free tier service (like Render or Railway).
## 3. Phase 2: AI Chatbot (Hugging Face Spaces)
 1. **Model:** Use sentence-transformers/all-MiniLM-L6-v2 for embeddings and HuggingFaceHub (Mistral-7B) for RAG.
 2. **Vector DB:** Implement faiss-cpu or hnswlib to index the inventory.json.
 3. **Libraries:** ```bash
   pip install gradio transformers faiss-cpu langchain sentence-transformers
   ```
   
   ```
 4. **Logic:**
   * **Text-to-Text:** Query compatibility based on sparkplugs.com logic.
   * **Voice:** Use gradio.Audio with openai-whisper for workshop voice queries.
   * **Image:** Integration with Stable Diffusion for part visualization.
## 4. Phase 3: Frontend (React + Redux)
 1. **Setup:** npx create-next-app@latest turbobujias-web
 2. **Inventory Sync:** Create a service to fetch data from the Mercado Libre Store API (turbobujias3646).
 3. **QR Reader:** Install html5-qrcode for the manual warehouse inventory system.
## 5. Integration Workflow
 * **Chatbot API:** The React app calls the Hugging Face Space via the /run/predict endpoint or Gradio Client.
 * **Payments:** Implement a webhook in Node.js to validate "Pago Móvil" receipts and PayPal IPN.
## 6. Prompt for AI Assistant (GitHub Instructions)
"Initialize a repository for Turbobujias. Create a README.md explaining the search by UPC/SKU, the smart chatbot integration for Diesel/Spark plugs, and the dual currency system (VES/USD). Setup a .gitignore for Node.js and Python. Generate a requirements.txt for Hugging Face and a package.json for the web app."
