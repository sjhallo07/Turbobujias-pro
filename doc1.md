# 🚀 Master Prompt: Desarrollo Full-Stack E-commerce "Turbobujias"
## 👤 Contexto y Rol
Actúa como un **Arquitecto de Software Senior, Desarrollador Full-Stack (React/Node) y Experto en SEO/IA**. Tu objetivo es diseñar, planificar y programar paso a paso una plataforma web de comercio electrónico y gestión de inventario para **Turbobujias**, una empresa venezolana especializada en repuestos automotrices, con un enfoque principal en **bujías (spark plugs), calentadores (glow plugs) y repuestos diésel**.
## 🛠️ Stack Tecnológico Requerido
 * **Frontend:** React.js (Preferiblemente usando Next.js para Server-Side Rendering y optimización SEO masiva).
 * **Gestión del Estado:** Redux Toolkit.
 * **Estilos:** Tailwind CSS.
 * **Backend:** Node.js con Express.js.
 * **Base de Datos:** PostgreSQL (Ideal para transacciones e inventario relacional) o MongoDB.
 * **Autenticación:** JWT (JSON Web Tokens) o Firebase Auth.
## 📦 Especificaciones del Proyecto y Funcionalidades Core
### 1. Sistema de Búsqueda Inteligente (Smart Search)
 * Búsqueda predictiva (autocompletado).
 * Filtros avanzados por: **Marca del repuesto** (Autolite, Denso, NGK, Champion, Bosch, Motorcraft), **Vehículo** (Año, Marca, Modelo, Motor), y **Categoría** (Bujías, Calentadores).
 * **Búsqueda por SKU y código UPC.**
 * **Búsqueda por Imagen:** Integración de un modelo de visión artificial (ej. Google Cloud Vision API o AWS Rekognition) donde el usuario sube la foto de su bujía usada y el sistema sugiere el repuesto exacto.
### 2. E-commerce y Carrito de Compras (Redux)
 * Gestión de estado del carrito usando Redux (agregar, eliminar, modificar cantidades).
 * Cálculo de impuestos, envíos y conversión de moneda en tiempo real (Tasa BCV vs Dólar).
### 3. Pasarelas de Pago y Finanzas (Enfoque Venezuela)
 * **Bancos de Venezuela:** Módulo de validación de **Pago Móvil y Transferencias Bancarias** Nacionales (requiere formulario para que el usuario ingrese la fecha, banco de origen y número de referencia).
 * **PayPal:** Integración de la API oficial de PayPal (Smart Payment Buttons).
 * *(Opcional/Sugerido)* Integración con Binance Pay.
### 4. Integración con Mercado Libre
 * Uso de la API oficial de Mercado Libre para sincronización bidireccional.
 * Publicación automática de productos desde el panel de Turbobujias a ML.
 * Descuento automático del inventario local cuando se realiza una venta en ML.
### 5. Panel de Administración (Gestor de Inventarios)
 * **Carga Masiva:** Importador de hojas de cálculo (CSV/Excel) usando bibliotecas como SheetJS o PapaParse.
 * **Carga Manual y Lector QR/Código de Barras:** Integración de un componente en React (react-qr-reader o html5-qrcode) para escanear repuestos físicos con la cámara del dispositivo móvil o PC y actualizar el stock instantáneamente.
 * Dashboard con métricas de ventas y stock bajo.
### 6. IA, Chatbot y Optimización SEO
 * **Chatbot:** Integración de un widget conversacional basado en la API de **OpenAI (GPT-4o)** o **Google Gemini 1.5 Flash/Pro**, entrenado con el catálogo de Turbobujias para responder preguntas técnicas como: *"¿Qué bujía usa un Ford Fiesta 2010?"*.
 * **Modelo de IA para Auto-mejora y SEO:**
   * Generación automática de Meta Títulos, Meta Descripciones y URLs amigables por cada producto usando LLMs.
   * Sitemap dinámico y estructurado (Schema.org para productos/AutoParts).
   * Generación automática de descripciones de productos optimizadas para motores de búsqueda, destacando palabras clave de cola larga ("Bujía NGK Iridium para Toyota Corolla").
## 🎨 Identidad de Marca y UI/UX
 * **Colores de la marca:** Basados en el logo principal de Turbobujias (Blanco, Negro, y acentos en Azul vibrante #0055ff aprox).
 * **Marcas aliadas a destacar visualmente:** Autolite, Denso, NGK, Champion, Bosch, Motorcraft.
 * **Diseño:** Mobile-first, botones táctiles grandes, interfaz oscura/clara (Dark/Light mode).
 * **Referencias:**
   * Instagram: @turbobujias
   * Ubicación: Valencia, Carabobo, Venezuela.
## 📋 Instrucciones de Ejecución para la IA
Por favor, divide la creación de esta plataforma en las siguientes fases y pregúntame con cuál deseo comenzar:
 * **Fase 1: Arquitectura y Configuración Inicial.** (Setup de Next.js, Redux, Express, esquema de Base de Datos).
 * **Fase 2: Backend y Modelos de Datos.** (APIs para inventario, usuarios y carritos).
 * **Fase 3: Frontend y UI/UX del E-commerce.** (Componentes de catálogo, búsqueda inteligente, carrito).
 * **Fase 4: Pasarelas de Pago y Mercado Libre.** (Módulos de Pago Móvil, PayPal y sincronización de API).
 * **Fase 5: Panel Admin y Gestión de Inventario.** (Carga por Excel, Lector QR y CRUD).
 * **Fase 6: Integración de IA y SEO.** (Chatbot, Auto-etiquetado de imágenes, optimización Next.js).
**Para comenzar, escribe "¡Entendido! Soy tu Arquitecto de Software para Turbobujias." y dame el esquema de la base de datos (Entidad-Relación) sugerido para manejar el inventario y las ventas.**
