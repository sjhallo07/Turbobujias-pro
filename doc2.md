# 🛠️ Master Prompt V2: Ecosistema E-commerce & IA Turbobujias
Actúa como un **Ingeniero de IA y Desarrollador Senior Full-Stack**. Tu misión es construir el ecosistema de **Turbobujias** integrando un catálogo robusto, un sistema de inventario con Node.js y un Chatbot avanzado desplegado en Hugging Face.
## 1. 🗄️ Arquitectura del Backend & Data (Node.js)
 * **Base de Datos:** Inicia con un archivo inventory.json (Free Tier Friendly) para desarrollo, escalable a MongoDB Atlas (Free Tier).
 * **Estructura del JSON:** Debe incluir campos para: SKU, UPC, Brand, Part_Number, Thread_Size, Reach, Hex_Size, Gap, Applications (Car/Year/Model), Image_URL, Price_USD, Stock_ML.
 * **Integración Mercado Libre:** Módulo para leer el inventario desde https://www.mercadolibre.com.ve/pagina/turbobujias3646.
## 2. 🤖 Chatbot de IA Especializado (Hugging Face + Gradio)
 * **Despliegue:** Crear un app.py para **Hugging Face Spaces** usando **Gradio** como interfaz.
 * **Motor de Inteligencia:**
   * **Modelo:** Utilizar modelos de transformers (ej. Mistral o Llama-3 via GitHub Models/Hugging Face Inference API con token gratuito).
   * **RAG (Retrieval Augmented Generation):** Implementar **FAISS** o **HNSW** para búsqueda vectorial.
   * **Conocimiento Base:** Scraping/Referencia técnica de sparkplugs.com para especificaciones exactas (medidas, hilos, tipos de electrodo).
 * **Capacidades Multimodales:**
   * **Text-to-Text:** Consultas técnicas sobre compatibilidad de bujías y precalentadores.
   * **Text-to-Image:** Generar diagramas o visualizaciones de tipos de bujías (utilizando modelos tipo Stable Diffusion XL Turbo).
   * **Voice-to-Voice:** Integrar gTTS (Google Text-to-Speech) y Whisper para consultas por voz desde talleres mecánicos.
## 3. 🔍 Búsqueda Inteligente & Engagement
 * **Búsqueda Vectorial:** El chatbot debe permitir buscar por descripción ("Necesito una bujía de iridium para un motor 1.8") y devolver el producto exacto del JSON usando embeddings.
 * **Engagement para Talleres:** Opciones de "Cuenta para Aliados/Talleres" con precios al mayor y recordatorios de mantenimiento de flotas diésel.
## 📱 Funcionalidades de la App React (Frontend)
 * **Scanner QR Integrado:** Uso de html5-qrcode para lectura manual en almacén.
 * **Conversor de Moneda:** Integración con API de tipos de cambio para precios en Bolívares (Bancos de Venezuela) y USD (PayPal/Zelle).
 * **Deployment:** Git-flow estándar. El frontend se comunica con el backend Node.js y el Chatbot en Hugging Face vía API REST.
### 🚀 Tarea Inmediata (Fase 1):
Genera los siguientes archivos de arranque:
 1. **inventory.json**: Un ejemplo con 5 productos reales (NGK, Denso, Bosch) incluyendo UPC y medidas.
 2. **server.js (Node.js)**: API básica para leer el JSON y gestionar el carrito.
 3. **app.py (Hugging Face)**: Estructura de Gradio que conecte con una biblioteca de Transformers para responder dudas sobre "bujías y calentadores".
**¿Listo para empezar la construcción del sistema de Turbobujias?**
