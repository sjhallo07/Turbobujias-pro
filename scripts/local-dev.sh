# Turbobujias — Local Development Setup
# Quick start script for developers

#!/bin/bash
set -e

echo "🔐 Turbobujias Local Development Setup"
echo "════════════════════════════════════════"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "📋 Creating .env from .env.example..."
    cp .env.example .env
    echo "✅ .env created. Edit it with your actual credentials:"
    echo "   vi .env"
    echo ""
    echo "ℹ️  Required values:"
    echo "   - GITHUB_TOKEN (or GEMINI_API_KEY)"
    echo "   - SUPABASE_URL & SUPABASE_ANON_KEY"
    echo "   - HF_TOKEN (for HF inference)"
    echo ""
    exit 1
fi

echo "✅ .env file found"
echo ""

# Load environment
export $(cat .env | grep -v '^#' | xargs)

# Validate required variables
REQUIRED_VARS=("SUPABASE_URL" "SUPABASE_ANON_KEY" "LLM_PROVIDER")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Missing required: $var"
        exit 1
    fi
done

echo "✅ Environment variables loaded"
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not installed. Install from: https://www.docker.com/products/docker-desktop"
    exit 1
fi
echo "✅ Docker available"
echo ""

# Build option
echo "🐳 Docker Build Options:"
echo "   1) Simple build (faster, for development)"
echo "   2) Multi-stage optimized (slower, for production)"
echo "   3) Skip build (use existing image)"
echo ""
read -p "Choose [1-3]: " build_choice

case $build_choice in
    1)
        echo "Building with Dockerfile.simple..."
        docker build -t turbobujias-ai:dev -f turbobujias-ai/Dockerfile.simple turbobujias-ai
        IMAGE="turbobujias-ai:dev"
        ;;
    2)
        echo "Building with optimized Dockerfile (this may take 5-10 mins)..."
        docker build -t turbobujias-ai:latest -f turbobujias-ai/Dockerfile turbobujias-ai
        IMAGE="turbobujias-ai:latest"
        ;;
    3)
        IMAGE="turbobujias-ai:latest"
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "✅ Build complete"
echo ""

# Start container
echo "🚀 Starting container..."
docker run -it --rm \
    --name turbobujias-chatbot \
    --env-file .env \
    -p 7860:7860 \
    -v "$(pwd)/turbobujias-ai:/app" \
    "$IMAGE"

echo ""
echo "🛑 Container stopped"
echo ""
echo "💡 Tips:"
echo "   - Open http://localhost:7860"
echo "   - Edit app.py and refresh browser for live changes (volume mount)"
echo "   - Check logs: docker logs turbobujias-chatbot"
