# Chatbot Callbacks

## Hugging Face Space configuration

The storefront expects a public Hugging Face Space that exposes a structured chat endpoint.

### Required frontend/server variables

From `turbobujias-web/.env.example` and the Next.js API route:

- `HF_SPACE_URL`
  - Server-side Space base URL used by `/api/ai-chat`
- `HF_CHAT_API_NAME`
  - Defaults to `/chat`
- `HF_TOKEN`
  - Optional bearer token for protected Spaces
- `NEXT_PUBLIC_HF_SPACE_URL`
  - Browser-visible fallback when `HF_SPACE_URL` is not present
- `NEXT_PUBLIC_HF_CHAT_API_NAME`
  - Browser-visible fallback for the chat path

### Space-side variables

From `turbobujias-ai/.env.example`:

- `LLM_PROVIDER`
- `GITHUB_TOKEN`
- `GITHUB_MODELS_TOKEN`
- `GITHUB_MODELS_MODEL`
- `GITHUB_MODELS_ORG`
- `GEMINI_FALLBACK_ENABLED`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `HF_TOKEN`
- `HF_MODEL_REPO_ID`
- `PORT`

## Runtime endpoints

### Storefront proxy endpoints

- `GET /api/ai-chat`
  - Returns current endpoint metadata and the upstream OpenAPI payload.
- `POST /api/ai-chat`
  - Forwards `{ message, history }` to the Space chat endpoint.
- `GET /api/ai-chat/openapi`
  - Returns the Space OpenAPI JSON.

### Upstream Space endpoints

- `POST <HF_SPACE_URL>/chat`
  - Expected request body:
    ```json
    {
      "message": "¿Qué bujía sirve para un Corolla 2014 1.8?",
      "history": []
    }
    ```
  - Expected response body:
    ```json
    {
      "reply": "...",
      "sources": ["NGK-BKR5E"],
      "history": [{ "user": "...", "assistant": "..." }]
    }
    ```
- `GET <HF_SPACE_URL>/openapi.json`
  - Used by the proxy for metadata inspection.

## Callback wiring inside the storefront

### Catalog → chatbot callback

`Storefront` emits browser events to prefill the chat box:

- Event name: `tb-ai-prefill`
- Payload shape:
  ```json
  {
    "prompt": "Necesito confirmar compatibilidad para NGK BKR5E..."
  }
  ```

### Chatbot listener

`components/ai-chatbot.js` listens for `tb-ai-prefill` and writes the incoming prompt into the textarea before sending.

### Request lifecycle

1. User clicks “Consultar con IA” from a product or search context.
2. `Storefront` dispatches `window.dispatchEvent(new CustomEvent("tb-ai-prefill", ...))`.
3. `AiChatbot` receives the prompt and updates the input state.
4. User sends the message.
5. `POST /api/ai-chat` proxies the request to `<HF_SPACE_URL>/chat`.
6. The proxy normalizes the upstream response and returns `{ data: { reply, sources, history } }`.
7. `AiChatbot` renders the answer and source SKUs.

## Public config wiring

The backend also exposes the chatbot base URL through:

- `GET /api/config/public` → `chatbot.publicUrl`
- `GET /api/config/public` → `chatbot.requestUrl`
- `GET /api/config/public` → `chatbot.metadataUrl`

This lets the storefront display the active chatbot target without hardcoding deployment-specific values.

## Failure handling

The Next.js proxy sanitizes upstream errors before returning them to the browser.

- Rate-limit and policy text is replaced by a safe retry message.
- Raw upstream provider text is only logged server-side.
- The UI shows a friendly fallback assistant response if the proxy call fails.

## Deployment checklist

1. Deploy the Hugging Face Space and confirm `/chat` responds.
2. Set `HF_SPACE_URL` in the Next.js runtime.
3. Optionally set `HF_TOKEN` if the Space is private.
4. Verify `GET /api/ai-chat` and `GET /api/ai-chat/openapi` succeed.
5. Trigger `Consultar con IA` from the catalog and confirm the `tb-ai-prefill` callback reaches the chatbot input.
