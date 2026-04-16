FROM python:3.10-slim

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production \
    FRONTEND_PORT=3000 \
    BACKEND_PORT=3001 \
    CHATBOT_PORT=7861 \
    NEXT_PUBLIC_API_URL=/api \
    NEXT_PUBLIC_HF_SPACE_URL=/chatbot \
    HF_SPACE_URL=http://127.0.0.1:7861 \
    HF_CHAT_API_NAME=/chat \
    CHATBOT_PUBLIC_URL=/chatbot \
    GRADIO_MOUNT_PATH=/chatbot \
    GRADIO_SERVER_NAME=0.0.0.0

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ffmpeg \
    git \
    git-lfs \
    libgl1 \
    libsm6 \
    libxext6 \
    nginx \
    supervisor \
    ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && git lfs install

COPY backend/package*.json ./backend/
COPY turbobujias-web/package*.json ./turbobujias-web/
COPY turbobujias-ai/requirements.txt ./turbobujias-ai/requirements.txt

RUN npm --prefix backend ci \
    && npm --prefix turbobujias-web ci \
    && pip install --upgrade pip \
    && pip install -r turbobujias-ai/requirements.txt

COPY backend ./backend
COPY turbobujias-web ./turbobujias-web
COPY turbobujias-ai ./turbobujias-ai
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/entrypoint.sh /app/docker/entrypoint.sh

RUN chmod +x /app/docker/entrypoint.sh \
    && npm --prefix turbobujias-web run build

EXPOSE 7860

CMD ["/app/docker/entrypoint.sh"]
