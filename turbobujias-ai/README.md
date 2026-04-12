---
title: Turbobujias AI Assistant
emoji: 🔧
colorFrom: blue
colorTo: indigo
sdk: gradio
sdk_version: "4.44.1"
app_file: app.py
python_version: "3.10"
suggested_hardware: cpu-basic
short_description: RAG chatbot for diesel and spark plug compatibility queries.
---

## Turbobujias AI Assistant

Gradio chatbot for diesel and spark plug compatibility questions in **Spanish and English**.

## Model provider configuration

The chatbot now supports two model providers:

### Option A: GitHub Models

Recommended for the first option when you want a simple GitHub-hosted model setup and a good default for free-tier experimentation.

Recommended environment variables:

- `LLM_PROVIDER=github`
- `GITHUB_TOKEN` — GitHub token used by the OpenAI-compatible client
- `GITHUB_MODELS_TOKEN` — optional backwards-compatible alias for `GITHUB_TOKEN`
- `GITHUB_MODELS_MODEL` — defaults to `openai/gpt-4o`
- `GITHUB_MODELS_ORG` — optional organization login for org-attributed usage

If `GITHUB_MODELS_ORG` is set, requests use:

- `https://models.github.ai/orgs/{ORG}/inference`

Otherwise they use:

- `https://models.github.ai/inference`

The app uses the OpenAI Python SDK against the GitHub Models inference endpoint, with `GITHUB_TOKEN` read from the environment.

### Option B: Hugging Face Inference

- `LLM_PROVIDER=huggingface`
- `HF_TOKEN` — Hugging Face token with inference permissions
- `HF_MODEL_REPO_ID` — defaults to `mistralai/Mistral-7B-Instruct-v0.2`

### Common variable

- `PORT` — defaults to `7860`

## Deploy to Hugging Face Spaces

1. Create a new **Gradio Space**.
2. Upload the contents of `turbobujias-ai/` as the Space repository root.
3. In **Settings → Variables and secrets**, add the secrets required by your chosen provider.
4. Wait for the build to finish and open the Space URL.

### Recommended secret set for this project

If you want to use **GitHub Models** from inside the Space:

- `LLM_PROVIDER=github`
- `GITHUB_TOKEN=...`
- `GITHUB_MODELS_TOKEN=...` (optional alias)
- `GITHUB_MODELS_MODEL=openai/gpt-4o`
- `GITHUB_MODELS_ORG=` (optional)

If you want to use **Hugging Face Inference** instead:

- `LLM_PROVIDER=huggingface`
- `HF_TOKEN=...`
- `HF_MODEL_REPO_ID=mistralai/Mistral-7B-Instruct-v0.2`

The Space already includes the files Hugging Face expects:

- `README.md` with Space metadata
- `app.py` as the Gradio entrypoint
- `requirements.txt` for Python packages
- `packages.txt` for system packages (`ffmpeg`)
- `inventory.json` for the retrieval knowledge base

## Included deployment files

- `app.py` — Gradio entrypoint
- `mcp_http_client.py` — lightweight CLI client for remote MCP servers such as the Gradio Docs MCP Space
- `requirements.txt` — Python dependencies
- `packages.txt` — system packages required by Whisper
- `inventory.json` — retrieval data source for product answers

## Local run

1. Create `.env` from `.env.example`
2. Install dependencies with `pip install -r requirements.txt`
3. Start the app with `python app.py`

The app will bind to `0.0.0.0` and use `PORT` when provided by the platform.

### Recommended Python environment for this repository

Use a **dedicated Python virtual environment only for `turbobujias-ai/`**.

Why:

- `backend/` is a **Node.js + Express** service
- `turbobujias-web/` is a **Next.js** service
- only `turbobujias-ai/` needs Python, Torch, Whisper, FAISS, and LangChain

That means you should **not** create one shared Python environment for the whole project.
Keep Python isolated to the chatbot service and keep Node dependencies isolated to each Node app.

### Recommended Python version

For local development on Windows, prefer **Python 3.13** for the chatbot.

- Python 3.14 may require more package compilation work depending on wheels available for your machine.
- A dedicated Python 3.13 virtual environment is the safest option for `gradio`, `whisper`, and related ML packages in this repo.

Example setup:

```powershell
cd turbobujias-ai
py -3.13 -m venv .venv313
.\.venv313\Scripts\python.exe -m pip install --upgrade pip setuptools wheel
.\.venv313\Scripts\python.exe -m pip install -r requirements.txt
.\.venv313\Scripts\python.exe app.py
```

### How the full project is split locally

Run the services independently:

#### Backend API

```powershell
cd backend
npm install
node server.js
```

Default URL:

- `http://127.0.0.1:3001/api/health`

#### Frontend

```powershell
cd turbobujias-web
npm install
npm run build
npm run start
```

Default URL:

- `http://127.0.0.1:3000`

#### Chatbot

```powershell
cd turbobujias-ai
.\.venv313\Scripts\python.exe app.py
```

Default URL:

- `http://127.0.0.1:7860`

### Database note

There is **no separate database server to start** for the current project layout.

- the backend uses `backend/data/inventory.json`
- the chatbot uses `turbobujias-ai/inventory.json`

So the local stack is currently:

- Node backend
- Next.js frontend
- Python chatbot
- JSON files as the catalog data source

### GitHub Models quick start

To use the first chatbot option with GitHub Models, export your token as `GITHUB_TOKEN`.

#### bash

```bash
export GITHUB_TOKEN="<your-github-token-goes-here>"
```

#### PowerShell

```powershell
$Env:GITHUB_TOKEN="<your-github-token-goes-here>"
```

#### Windows Command Prompt

```cmd
set GITHUB_TOKEN=<your-github-token-goes-here>
```

The GitHub-backed chatbot path uses:

- endpoint: `https://models.github.ai/inference`
- default model: `openai/gpt-4o`
- SDK: `openai`

Minimal equivalent sample:

```python
import os
from openai import OpenAI

client = OpenAI(
    base_url="https://models.github.ai/inference",
    api_key=os.environ["GITHUB_TOKEN"],
)

response = client.chat.completions.create(
    model="openai/gpt-4o",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "What is the capital of France?"},
    ],
)

print(response.choices[0].message.content)
```

## Chat API for the React storefront

The Space now exposes a structured API endpoint named `/chat` for frontend clients.

It accepts:

- `message` — user text
- `history` — previous conversation entries in the form:

```json
[
 {
  "user": "¿Qué bujía sirve para un Corolla 2014?",
  "assistant": "..."
 }
]
```

It returns a JSON payload with:

- `reply`
- `sources`
- `history`

This endpoint is designed for the embedded React chatbot in `turbobujias-web`.

## Spaces as API endpoints

Every public Gradio Space on Hugging Face can be consumed as an API. For this project, the deployed Space URL is expected to be:

- `https://sjhallo07-turbobujias-ai.hf.space`

Useful API URLs for this project:

- Space root: `https://sjhallo07-turbobujias-ai.hf.space`
- OpenAPI spec: `https://sjhallo07-turbobujias-ai.hf.space/gradio_api/openapi.json`
- Queue submit endpoint for `/chat`: `https://sjhallo07-turbobujias-ai.hf.space/gradio_api/call/chat`
- Queue result endpoint template: `https://sjhallo07-turbobujias-ai.hf.space/gradio_api/call/chat/{event_id}`
- Local metadata proxy from the Next.js app: `/api/ai-chat`
- Local OpenAPI proxy from the Next.js app: `/api/ai-chat/openapi`

### Inspect available endpoints

You can inspect the Space API in several ways:

- Click **Use via API** in the Space footer.
- Open the OpenAPI document directly.
- Query the local Next.js proxy route `GET /api/ai-chat`, which returns the current Space endpoint metadata and `view_api()` output.

### Python client example

```python
from gradio_client import Client

client = Client("sjhallo07/turbobujias-ai", token="hf_...")
result = client.predict(
        message="¿Qué bujía sirve para un Corolla 2014 1.8?",
        history=[],
        api_name="/chat",
)
print(result)
```

### JavaScript client example

```javascript
import { client } from "@gradio/client";

const app = await client("https://sjhallo07-turbobujias-ai.hf.space");
const result = await app.predict("/chat", {
    message: "Necesito un calentador para Hilux 2.5 diesel 2012.",
    history: []
});

console.log(result.data);
```

### REST queue example with curl

Submit a request:

```bash
curl -X POST "https://sjhallo07-turbobujias-ai.hf.space/gradio_api/call/chat" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $HF_TOKEN" \
    -d '{"data": [{"message": "Compare NGK y Bosch para un Civic 1.6 1998.", "history": []}]}'
```

Then read the result stream with the returned `event_id`:

```bash
curl -N "https://sjhallo07-turbobujias-ai.hf.space/gradio_api/call/chat/<event_id>" \
    -H "Authorization: Bearer $HF_TOKEN"
```

### Free tier and rate limits

- Public Spaces can be called without authentication, but a Hugging Face token typically gives better rate limits and is required for private Spaces.
- This project is configured for `cpu-basic`, not ZeroGPU.
- If you later migrate the Space to **ZeroGPU**, Hugging Face free/pro quotas apply to GPU usage. Those quotas are separate from the current CPU-based deployment described in this repository.

## MCP client for Gradio and Hugging Face development

Use `mcp_http_client.py` to connect to remote MCP servers over Streamable HTTP.

Examples:

- `python mcp_http_client.py --list-tools`
- `python mcp_http_client.py --search "gradio chatbot blocks state"`
- `python mcp_http_client.py --load-docs`
- `python mcp_http_client.py --call docs_mcp_search_gradio_docs --arguments '{"query":"hugging face spaces auth"}'`

By default it connects to the official Gradio Docs MCP server:

- `https://gradio-docs-mcp.hf.space/gradio_api/mcp/`
