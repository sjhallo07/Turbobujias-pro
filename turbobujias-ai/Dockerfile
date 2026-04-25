# Multi-stage build for Turbobujias AI Chatbot
# Optimized for HuggingFace Spaces and minimal image size

# ─────────────────────────────────────────────
# Stage 1: Builder (dependency installation)
# ─────────────────────────────────────────────
FROM python:3.10-slim as builder

WORKDIR /tmp

# Install system dependencies for build
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Pre-download PyTorch CPU to avoid network layer caching issues
RUN pip install --no-cache-dir --no-deps \
    torch==2.2.2 \
    torchvision==0.17.2 \
    torchaudio==2.2.2 \
    -i https://download.pytorch.org/whl/cpu

# Create a wheels directory for all dependencies
RUN pip wheel --no-cache-dir --wheel-dir /tmp/wheels \
    gradio==6.13.0 \
    transformers>=5.6.2 \
    sentence-transformers>=5.4.1 \
    faiss-cpu>=1.7.4 \
    langchain>=1.2.0,<2.0.0 \
    langchain-community>=0.4.0,<0.5.0 \
    langchain-text-splitters>=1.0.0,<2.0.0 \
    huggingface-hub>=0.22.2,<1.0 \
    openai>=1.75.0 \
    openai-whisper>=20230314 \
    accelerate>=1.13.0 \
    python-dotenv>=1.0.1 \
    requests>=2.32.0 \
    uvicorn>=0.28.0 \
    pydantic>=2.0.0

# ─────────────────────────────────────────────
# Stage 2: Runtime (final minimal image)
# ─────────────────────────────────────────────
FROM python:3.10-slim

# Install runtime dependencies only (no build tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy PyTorch wheels from builder
COPY --from=builder /tmp/wheels /tmp/wheels

# Install PyTorch CPU (pre-downloaded in builder)
RUN pip install --no-cache-dir --no-index --find-links /tmp/wheels \
    torch==2.2.2 \
    torchvision==0.17.2 \
    torchaudio==2.2.2

# Install all other wheels from builder
RUN pip install --no-cache-dir --no-index --find-links /tmp/wheels \
    gradio==6.13.0 \
    transformers \
    sentence-transformers \
    faiss-cpu \
    langchain \
    langchain-community \
    langchain-text-splitters \
    huggingface-hub \
    openai \
    openai-whisper \
    accelerate \
    python-dotenv \
    requests \
    uvicorn \
    pydantic && \
    rm -rf /tmp/wheels

# Copy application files
COPY inventory.json .
COPY app.py .
COPY .env.example .env

# Set Gradio environment variables for containerized deployment
ENV GRADIO_SERVER_NAME="0.0.0.0"
ENV GRADIO_SERVER_PORT="7860"
ENV PYTHONUNBUFFERED="1"
ENV PYTHONDONTWRITEBYTECODE="1"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:7860/health', timeout=5)" || exit 1

EXPOSE 7860

CMD ["python", "app.py"]
