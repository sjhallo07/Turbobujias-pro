#!/bin/bash
# Test Gemini AI Integration

API_URL="http://localhost:3001/api/ai"

echo "🤖 Gemini AI Endpoint Tests"
echo "============================"
echo ""

# Test 1: Generate
echo "1️⃣  Test: Generate Content"
echo "---"
curl -X POST "$API_URL/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain how spark plugs work in one sentence",
    "systemPrompt": "You are an auto parts expert"
  }' | jq .
echo ""
echo ""

# Test 2: Summarize
echo "2️⃣  Test: Summarize Text"
echo "---"
curl -X POST "$API_URL/summarize" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "A spark plug is an electrical device that fits into the cylinder head of an internal combustion engine. Its purpose is to produce an electric spark in the combustion chamber. The spark ignites the mixture of gasoline and air, which provides the power stroke that drives the engine. Without spark plugs, a gasoline engine cannot operate."
  }' | jq .
echo ""
echo ""

# Test 3: Translate
echo "3️⃣  Test: Translate to Spanish"
echo "---"
curl -X POST "$API_URL/translate" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "What spark plug do you recommend for my car?",
    "targetLanguage": "Spanish"
  }' | jq .
echo ""
echo ""

# Test 4: Product Description
echo "4️⃣  Test: Generate Product Description"
echo "---"
curl -X POST "$API_URL/product-description" \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": ["NGK", "spark plug", "BKR5E", "high performance", "durability"]
  }' | jq .
echo ""
echo ""

# Test 5: Product Question
echo "5️⃣  Test: Answer Product Question"
echo "---"
curl -X POST "$API_URL/product-question" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Which spark plug fits a 2020 Honda Civic?",
    "context": "Available: NGK BKR5E, Denso K20PR-U, Champion RC7YC, Autolite AP45"
  }' | jq .
echo ""
echo ""

# Test 6: Count Tokens
echo "6️⃣  Test: Count Tokens"
echo "---"
curl -X POST "$API_URL/count-tokens" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Spark plugs are essential components of gasoline-powered internal combustion engines that create the electric spark needed to ignite the air-fuel mixture in the engine cylinders."
  }' | jq .
echo ""
echo ""

# Test 7: Chat
echo "7️⃣  Test: Chat Interaction"
echo "---"
curl -X POST "$API_URL/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I need a spark plug for daily driving. What do you recommend?",
    "history": [
      {
        "role": "user",
        "content": "Hi, I need help with spark plugs"
      },
      {
        "role": "assistant",
        "content": "Hello! I would be happy to help you find the right spark plug for your vehicle. What model car do you have?"
      }
    ]
  }' | jq .
echo ""
echo ""

echo "✅ All tests complete!"
echo ""
echo "💡 Tip: Use 'jq' for pretty JSON output, or remove '| jq .' for raw output"
echo "📖 See GEMINI_API_GUIDE.md for detailed endpoint documentation"
