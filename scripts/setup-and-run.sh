#!/bin/bash
# Turbobujias — Complete Local Setup & Run

set -e

echo "════════════════════════════════════════════════════════"
echo "🔐 Turbobujias Local Development Setup"
echo "════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check Docker
echo -e "${YELLOW}[1/5] Checking Docker installation...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found. Install from: https://www.docker.com/products/docker-desktop${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker found${NC}"
echo ""

# Step 2: Setup .env
echo -e "${YELLOW}[2/5] Setting up .env file...${NC}"
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Created .env from .env.example${NC}"
        echo ""
        echo -e "${YELLOW}⚠️  IMPORTANT: Edit .env with your credentials:${NC}"
        echo "  Required (choose ONE LLM provider):"
        echo "    • GITHUB_TOKEN=your_github_pat"
        echo "    • GEMINI_API_KEY=your_gemini_key"
        echo "    • HF_TOKEN=your_huggingface_token"
        echo ""
        echo "  Optional but recommended:"
        echo "    • SUPABASE_URL=your_supabase_url"
        echo "    • SUPABASE_ANON_KEY=your_key"
        echo ""
        echo -e "${YELLOW}Edit with: nano .env (or your editor)${NC}"
        echo ""
        
        # Prompt to edit
        read -p "Open .env now? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            ${EDITOR:-nano} .env
        fi
    else
        echo -e "${RED}❌ .env.example not found${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ .env already exists${NC}"
fi
echo ""

# Step 3: Verify .env is ignored
echo -e "${YELLOW}[3/5] Verifying .env is git-ignored...${NC}"
if grep -q "^.env$" .gitignore 2>/dev/null; then
    echo -e "${GREEN}✅ .env is in .gitignore${NC}"
else
    echo -e "${YELLOW}⚠️  .env not in .gitignore, adding...${NC}"
    echo ".env" >> .gitignore
    echo -e "${GREEN}✅ Added .env to .gitignore${NC}"
fi
echo ""

# Step 4: Check .env has credentials
echo -e "${YELLOW}[4/5] Checking .env has LLM credentials...${NC}"
if grep -E "GITHUB_TOKEN|GEMINI_API_KEY|HF_TOKEN" .env | grep -v "^#" | grep -q "."; then
    echo -e "${GREEN}✅ LLM credentials found in .env${NC}"
else
    echo -e "${RED}❌ No LLM credentials found in .env${NC}"
    echo "   Edit .env and add at least one of:"
    echo "   • GITHUB_TOKEN=..."
    echo "   • GEMINI_API_KEY=..."
    echo "   • HF_TOKEN=..."
    exit 1
fi
echo ""

# Step 5: Choose build type
echo -e "${YELLOW}[5/5] Building Docker image...${NC}"
echo ""
echo "Build options:"
echo "  1) Simple (faster, for development) — ~5 min"
echo "  2) Optimized (slower, for production) — ~10+ min"
echo "  3) Skip build (use existing image)"
echo ""
read -p "Choose [1-3]: " build_choice

case $build_choice in
    1)
        DOCKERFILE="Dockerfile.simple"
        CONTEXT="turbobujias-ai"
        echo -e "${YELLOW}Building with $DOCKERFILE...${NC}"
        docker build -t turbobujias-ai:dev -f "$CONTEXT/$DOCKERFILE" "$CONTEXT"
        IMAGE="turbobujias-ai:dev"
        ;;
    2)
        DOCKERFILE="Dockerfile"
        CONTEXT="turbobujias-ai"
        echo -e "${YELLOW}Building with $DOCKERFILE (this takes 10+ minutes)...${NC}"
        docker build -t turbobujias-ai:latest -f "$CONTEXT/$DOCKERFILE" "$CONTEXT"
        IMAGE="turbobujias-ai:latest"
        ;;
    3)
        IMAGE="turbobujias-ai:latest"
        echo -e "${YELLOW}Skipping build, using existing image${NC}"
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""

# Step 6: Run
echo "════════════════════════════════════════════════════════"
echo -e "${GREEN}🚀 Starting Turbobujias Chatbot${NC}"
echo "════════════════════════════════════════════════════════"
echo ""
echo "🌐 URL: http://localhost:7860"
echo ""
echo "💡 Tips:"
echo "   • Edit app.py → Refresh browser for live changes"
echo "   • Press Ctrl+C to stop"
echo "   • Check logs in another terminal:"
echo "     docker compose -f docker-compose.local.yml logs -f chatbot"
echo ""

# Run with docker-compose
docker compose -f docker-compose.local.yml up

echo ""
echo -e "${GREEN}🛑 Container stopped${NC}"
