---
title: Turbobujias AI Assistant
emoji: 🔧
colorFrom: blue
colorTo: indigo
sdk: gradio
app_file: app.py
python_version: "3.10"
short_description: RAG chatbot for diesel and spark plug compatibility queries.
---

# Turbobujias AI Assistant

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
