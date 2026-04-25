#!/bin/bash
# Turbobujias AI — Docker Deployment Guide

## Building the Container

### Option 1: Multi-stage optimized build (production)
```bash
docker build -t turbobujias-ai:latest -f Dockerfile .
```

### Option 2: Simple single-stage build (faster iteration)
```bash
docker build -t turbobujias-ai:latest -f Dockerfile.simple .
```

## Running Locally

```bash
docker run -it --rm \
  -e LLM_PROVIDER=gemini \
  -e GEMINI_API_KEY="AIzaSyDYyk2zY6Dmjn5b-Ucq2AB-wDY9vhGdR1Q" \
  -p 7860:7860 \
  turbobujias-ai:latest
```

Then open http://localhost:7860

## Environment Variables

Set these via `-e` flag or `.env` file:

| Variable | Default | Purpose |
|----------|---------|---------|
| `LLM_PROVIDER` | `huggingface` | Primary LLM: github, gemini, or huggingface |
| `GITHUB_TOKEN` | (unset) | GitHub Models API key |
| `GEMINI_API_KEY` | (unset) | Google Gemini API key |
| `HF_TOKEN` | (unset) | Hugging Face Inference API token |
| `GRADIO_SHARE` | `false` | Enable Gradio public link |
| `PORT` | `7860` | Server port |

## Deploying to HuggingFace Spaces

1. Create a new Space (Docker runtime)
2. Add secrets via Space settings:
   - `GITHUB_TOKEN` (or `GEMINI_API_KEY` or `HF_TOKEN`)
   - `LLM_PROVIDER` = github
3. Push this Dockerfile to your Space repo
4. HuggingFace builds & deploys automatically

## Image Size Optimization

- **Multi-stage build**: ~3.2 GB (PyTorch + dependencies)
- **Simple build**: ~3.1 GB (same, but clearer layer structure)
- Note: PyTorch CPU is large; consider:
  - Using `ONNX` models instead (Phase 2)
  - Caching layers in Docker Hub for faster rebuilds
  - Using `docker buildx` for parallel builds

## Troubleshooting

**Container won't start:**
```bash
docker run -it turbobujias-ai:latest /bin/bash
python app.py  # Run interactively to see errors
```

**Check logs:**
```bash
docker logs <container_id>
```

**Rebuild without cache:**
```bash
docker build --no-cache -t turbobujias-ai:latest -f Dockerfile .
```

## Next Steps

- Test the container locally before pushing to Spaces
- Set up CI/CD (GitHub Actions) to build on push
- Monitor container memory usage for HuggingFace quotas
- Add a .dockerignore to skip unnecessary files
