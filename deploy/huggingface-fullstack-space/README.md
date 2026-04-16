---
title: Turbobujias Full Stack
emoji: 🔧
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
short_description: Full-stack Turbobujias storefront, backend API, and chatbot on one public URL.
---

$$
## Turbobujias Full Stack Docker Space

This Space runs the full Turbobujias stack behind a single public URL:

- Next.js storefront
- Express backend API
- Python + Gradio chatbot
- JSON catalog data bundled into the image

$$

## Public routes

Expected public base URL for the repository-managed Space:

- `https://sjhallo07-turbobujias-fullstack.hf.space`

- `/` — storefront
- `/api/*` — backend API
- `/api/ai-chat` — Next.js chatbot proxy
- `/chatbot/` — public Gradio chatbot UI
- `/chat` — chatbot REST endpoint
- `/openapi.json` — chatbot OpenAPI metadata

## Required secrets

Set these in the Hugging Face Space settings as needed:

- `GITHUB_TOKEN`
- `GITHUB_MODELS_TOKEN` (optional alias)
- `GEMINI_API_KEY` (optional fallback)
- `HF_TOKEN` (optional if using Hugging Face inference)
- `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` (optional)
- `MERCADOPAGO_ACCESS_TOKEN` (optional)

## Build notes

The Docker image builds the storefront, installs the backend and chatbot dependencies, and serves everything through Nginx on port `7860`.

## Deploy from this repository with GitHub Actions

This repository can publish the Docker Space bundle directly to Hugging Face using the workflow `deploy-hf-fullstack-space.yml`.

Required GitHub Actions secrets:

- `HF_TOKEN` — Hugging Face write token with access to `sjhallo07/turbobujias-fullstack`

The workflow prepares `dist/hf-fullstack-space/` and force-pushes that generated bundle to the exact Docker Space repository `sjhallo07/turbobujias-fullstack`.

After a successful workflow run, the expected public URL is:

- `https://sjhallo07-turbobujias-fullstack.hf.space`
