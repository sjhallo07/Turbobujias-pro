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

Recommended environment variables:

- `LLM_PROVIDER=github`
- `GITHUB_MODELS_TOKEN` — GitHub PAT with `models:read`
- `GITHUB_MODELS_MODEL` — defaults to `openai/gpt-4.1`
- `GITHUB_MODELS_ORG` — optional organization login for org-attributed usage
- `GITHUB_MODELS_API_VERSION` — defaults to `2026-03-10`

If `GITHUB_MODELS_ORG` is set, requests use:

- `https://models.github.ai/orgs/{ORG}/inference/chat/completions`

Otherwise they use:

- `https://models.github.ai/inference/chat/completions`

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
- `GITHUB_MODELS_TOKEN=...`
- `GITHUB_MODELS_MODEL=openai/gpt-4.1`
- `GITHUB_MODELS_ORG=` (optional)
- `GITHUB_MODELS_API_VERSION=2026-03-10`

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
- `requirements.txt` — Python dependencies
- `packages.txt` — system packages required by Whisper
- `inventory.json` — retrieval data source for product answers

## Local run

1. Create `.env` from `.env.example`
2. Install dependencies with `pip install -r requirements.txt`
3. Start the app with `python app.py`

The app will bind to `0.0.0.0` and use `PORT` when provided by the platform.
