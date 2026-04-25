#!/bin/bash
# Turbobujias AI Chatbot — Quick Docker Test
# Tests the containerized chatbot locally before deployment to HuggingFace Spaces

set -e

echo "🔨 Building Turbobujias AI Docker image…"
docker build -t turbobujias-ai:latest \
    --progress=plain \
    --build-arg BUILDKIT_INLINE_CACHE=1 \
    -f Dockerfile .

echo ""
echo "✅ Build complete. Container size:"
docker images turbobujias-ai:latest --format "{{.Repository}}:{{.Tag}} → {{.Size}}"

echo ""
echo "🚀 Launching container on localhost:7860…"
echo "   URL: http://localhost:7860"
echo "   Press Ctrl+C to stop"
echo ""

docker run --rm \
    -e GRADIO_SERVER_NAME="0.0.0.0" \
    -e GRADIO_SERVER_PORT=7860 \
    -e LLM_PROVIDER="gemini" \
    -e GEMINI_API_KEY="${GEMINI_API_KEY:-set-your-key-here}" \
    -p 7860:7860 \
    turbobujias-ai:latest
