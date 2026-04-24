# Google Gemini AI Integration

## Configuration

### Environment Variables

**Backend (`backend/.env`):**
```env
GEMINI_API_KEY=AIzaSyDYyk2zY6Dmjn5b-Ucq2AB-wDY9vhGdR1Q
GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta/models
GEMINI_MODEL=gemini-flash-latest
```

### Enable in Backend

Uncomment in `backend/server.js`:
```javascript
import aiRoutes from './routes/ai.js';
app.use('/api/ai', aiRoutes);
```

---

## API Endpoints

### Base URL
```
http://localhost:3001/api/ai
```

All requests use `POST` and return JSON.

---

## 1. Generate Content

**Endpoint:** `POST /generate`

**Purpose:** Generate content with custom prompt and system instructions

**Request:**
```json
{
  "prompt": "Explain how spark plugs work",
  "systemPrompt": "You are an auto parts expert"
}
```

**Response:**
```json
{
  "success": true,
  "prompt": "Explain how spark plugs work",
  "response": "Spark plugs create an electrical spark that ignites fuel..."
}
```

**cURL:**
```bash
curl -X POST http://localhost:3001/api/ai/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain how spark plugs work",
    "systemPrompt": "You are an auto parts expert"
  }'
```

---

## 2. Summarize Text

**Endpoint:** `POST /summarize`

**Purpose:** Summarize long text into concise format

**Request:**
```json
{
  "text": "Long product description or article text..."
}
```

**Response:**
```json
{
  "success": true,
  "original_length": 500,
  "summary": "Concise summary in 2-3 sentences",
  "summary_length": 150
}
```

**cURL:**
```bash
curl -X POST http://localhost:3001/api/ai/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Long text to summarize..."
  }'
```

---

## 3. Translate Text

**Endpoint:** `POST /translate`

**Purpose:** Translate text to target language

**Request:**
```json
{
  "text": "Hello, how can we help you?",
  "targetLanguage": "Spanish"
}
```

**Response:**
```json
{
  "success": true,
  "original": "Hello, how can we help you?",
  "targetLanguage": "Spanish",
  "translated": "¡Hola, cómo podemos ayudarte?"
}
```

**cURL:**
```bash
curl -X POST http://localhost:3001/api/ai/translate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, how can we help you?",
    "targetLanguage": "Spanish"
  }'
```

**Supported Languages:**
- Spanish (Español)
- Portuguese (Português)
- French (Français)
- English
- German (Deutsch)
- Italian (Italiano)
- Chinese (中文)
- Japanese (日本語)

---

## 4. Generate Product Description

**Endpoint:** `POST /product-description`

**Purpose:** Generate marketing copy for products

**Request:**
```json
{
  "keywords": ["spark plug", "NGK", "high performance", "long life"]
}
```

**Response:**
```json
{
  "success": true,
  "keywords": ["spark plug", "NGK", "high performance", "long life"],
  "description": "Premium NGK spark plugs deliver exceptional performance and longevity. Engineered for superior ignition and fuel efficiency, perfect for high-performance engines."
}
```

**cURL:**
```bash
curl -X POST http://localhost:3001/api/ai/product-description \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": ["spark plug", "NGK", "high performance"]
  }'
```

---

## 5. Answer Product Question

**Endpoint:** `POST /product-question`

**Purpose:** Answer customer questions about auto parts

**Request:**
```json
{
  "question": "Which spark plug fits a 2018 Toyota Corolla?",
  "context": "Available products: NGK BKR5E, Denso K20PR-U, Champion RC7YC"
}
```

**Response:**
```json
{
  "success": true,
  "question": "Which spark plug fits a 2018 Toyota Corolla?",
  "answer": "For a 2018 Toyota Corolla, the NGK BKR5E is the recommended spark plug. It provides excellent reliability and performance for the 1.8L engine.",
  "context": "Available products: NGK BKR5E, Denso K20PR-U, Champion RC7YC"
}
```

**cURL:**
```bash
curl -X POST http://localhost:3001/api/ai/product-question \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Which spark plug fits a 2018 Toyota Corolla?",
    "context": "Available: NGK BKR5E, Denso K20PR-U"
  }'
```

---

## 6. Count Tokens

**Endpoint:** `POST /count-tokens`

**Purpose:** Count tokens in text (for cost estimation)

**Request:**
```json
{
  "text": "Sample text to count tokens"
}
```

**Response:**
```json
{
  "success": true,
  "text_length": 32,
  "token_count": 8,
  "estimated_cost": "0.00000060"
}
```

**cURL:**
```bash
curl -X POST http://localhost:3001/api/ai/count-tokens \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Sample text to count tokens"
  }'
```

---

## 7. Chat (Multi-turn Conversation)

**Endpoint:** `POST /chat`

**Purpose:** Chat-like interaction with conversation history

**Request:**
```json
{
  "message": "What's your best spark plug for daily driving?",
  "history": [
    {
      "role": "user",
      "content": "Hi, I need a spark plug recommendation"
    },
    {
      "role": "assistant",
      "content": "Hello! I'd be happy to help you find the right spark plug. What vehicle do you have?"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "What's your best spark plug for daily driving?",
  "response": "For daily driving, I'd recommend the NGK BKR5E. It offers excellent value, reliability, and fuel efficiency.",
  "token_estimate": 150
}
```

**cURL:**
```bash
curl -X POST http://localhost:3001/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What spark plug do you recommend?",
    "history": []
  }'
```

---

## Direct Gemini API (No Backend)

If you want to call Gemini directly without backend, use the original curl:

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent" \
  -H 'Content-Type: application/json' \
  -H 'X-goog-api-key: AIzaSyDYyk2zY6Dmjn5b-Ucq2AB-wDY9vhGdR1Q' \
  -X POST \
  -d '{
    "contents": [
      {
        "parts": [
          {
            "text": "Explain how AI works in a few words"
          }
        ]
      }
    ]
  }'
```

---

## Backend Usage

### Using Helper Functions

```javascript
import { generateContent, summarizeText } from './helpers/gemini.js';

// Simple generation
const result = await generateContent('What is AI?');

// With system prompt
const result = await generateContent(
  'Explain spark plugs',
  'You are an auto parts expert'
);

// Summarization
const summary = await summarizeText(longText);

// Translation
const spanish = await translateText('Hello', 'Spanish');

// Product description
const desc = await generateProductDescription(['NGK', 'spark plug', 'performance']);

// Product QA
const answer = await answerProductQuestion(
  'Which plug for 2018 Toyota?',
  'Available: NGK BKR5E, Denso K20PR-U'
);
```

### In Express Routes

```javascript
import aiRoutes from './routes/ai.js';
app.use('/api/ai', aiRoutes);

// Then access:
// POST /api/ai/generate
// POST /api/ai/summarize
// POST /api/ai/translate
// etc.
```

---

## Error Handling

All endpoints return errors in this format:

```json
{
  "error": "Error message description"
}
```

**Common Errors:**

| Error | Cause | Fix |
|-------|-------|-----|
| "Gemini API key not configured" | Missing GEMINI_API_KEY | Add to backend/.env |
| "No content in Gemini response" | Empty response | Rephrase prompt |
| "Invalid request" | Malformed JSON | Check JSON syntax |
| "Rate limited" | Too many requests | Wait and retry |
| "Model not found" | Wrong model name | Use valid model name |

---

## Configuration Details

### Available Models

```
gemini-flash-latest    ← Recommended (fast, cheap)
gemini-pro             (more powerful)
gemini-pro-vision      (with image understanding)
gemini-ultra           (most capable)
```

Set in `backend/.env`:
```env
GEMINI_MODEL=gemini-flash-latest
```

### Generation Config

Default settings in `helpers/gemini.ts`:
```javascript
{
  temperature: 0.7,           // Creativity (0-2)
  maxOutputTokens: 2048,      // Max response length
}
```

To customize, modify the helper or add config parameters.

---

## Pricing

**Gemini API Pricing (as of 2024):**

| Model | Input | Output |
|-------|-------|--------|
| Gemini 1.5 Flash | $0.075/M | $0.30/M |
| Gemini 1.5 Pro | $1.50/M | $6.00/M |

Estimates your `/count-tokens` endpoint in responses.

---

## Best Practices

### Do ✅
- Use specific, clear prompts
- Include context when available
- Cache frequently used results
- Monitor token usage
- Handle errors gracefully
- Rate limit requests

### Don't ❌
- Expose API key to frontend
- Make unbounded requests
- Store sensitive data in prompts
- Use for financial advice
- Bypass rate limits
- Share API key in code repos

---

## Integration Examples

### Product Search with AI

```javascript
// 1. Search database
const products = await searchDatabase(query);

// 2. Get AI recommendations
const recommendation = await generateContent(
  `${query} - Recommend from: ${products.map(p => p.name).join(', ')}`
);

// 3. Return combined result
res.json({ products, ai_recommendation: recommendation });
```

### Customer Support

```javascript
// Store conversation history
const conversation = [];

// Each message
const userMessage = req.body.message;
conversation.push({ role: 'user', content: userMessage });

// Get AI response
const response = await generateContent(userMessage, 'context');
conversation.push({ role: 'assistant', content: response });

// Save conversation (optional)
await db.conversation.create({ messages: conversation });

res.json({ response, conversation });
```

### Auto-generated Descriptions

```javascript
// For each product in catalog
for (const product of products) {
  const description = await generateProductDescription([
    product.brand,
    product.type,
    product.category,
  ]);
  
  await updateProduct(product.id, { ai_description: description });
}
```

---

## Testing

### Quick Test
```bash
curl -X POST http://localhost:3001/api/ai/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello"}'
```

### Full Test Suite
```bash
# Test generate
curl -X POST http://localhost:3001/api/ai/generate -d '{"prompt":"test"}'

# Test summarize
curl -X POST http://localhost:3001/api/ai/summarize -d '{"text":"long text"}'

# Test translate
curl -X POST http://localhost:3001/api/ai/translate -d '{"text":"hello","targetLanguage":"Spanish"}'

# Test token count
curl -X POST http://localhost:3001/api/ai/count-tokens -d '{"text":"test"}'
```

---

## Troubleshooting

### 401 Unauthorized
- Check API key is correct
- Verify GEMINI_API_KEY in backend/.env
- Restart backend after editing .env

### 500 Server Error
- Check backend logs: `docker logs turbobujias-backend`
- Verify internet connection
- Check Gemini API status page

### Timeout
- Reduce `maxOutputTokens`
- Use shorter prompts
- Check network latency

### "Model not found"
- Verify GEMINI_MODEL in backend/.env
- Use supported model names
- Check for typos

---

## Reference

- **API Docs:** https://ai.google.dev/tutorials/rest_quickstart
- **Models:** https://ai.google.dev/models
- **Pricing:** https://ai.google.dev/pricing
- **Status:** https://status.cloud.google.com/

---

## Next Steps

1. Enable routes in backend
2. Test each endpoint with curl
3. Integrate into frontend
4. Monitor usage and costs
5. Customize prompts for your use case
