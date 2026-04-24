/**
 * Google Gemini AI Routes
 * POST /api/ai/*
 */

import express from 'express';
import {
  generateContent,
  summarizeText,
  translateText,
  generateProductDescription,
  answerProductQuestion,
  countTokens,
} from '../helpers/gemini.js';

const router = express.Router();

/**
 * POST /api/ai/generate
 * Generate content with Gemini
 *
 * Body:
 * {
 *   "prompt": "Explain AI in simple terms",
 *   "systemPrompt": "You are a helpful assistant",
 *   "model": "gemini-flash-latest"
 * }
 */
router.post('/generate', async (req, res) => {
  try {
    const { prompt, systemPrompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    const result = await generateContent(prompt, systemPrompt);

    res.json({
      success: true,
      prompt,
      response: result,
    });
  } catch (error: any) {
    console.error('Generate error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/summarize
 * Summarize text
 *
 * Body: { "text": "Long text to summarize..." }
 */
router.post('/summarize', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Missing text' });
    }

    const summary = await summarizeText(text);

    res.json({
      success: true,
      original_length: text.length,
      summary,
      summary_length: summary.length,
    });
  } catch (error: any) {
    console.error('Summarize error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/translate
 * Translate text
 *
 * Body:
 * {
 *   "text": "Hello world",
 *   "targetLanguage": "Spanish"
 * }
 */
router.post('/translate', async (req, res) => {
  try {
    const { text, targetLanguage = 'Spanish' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Missing text' });
    }

    const translated = await translateText(text, targetLanguage);

    res.json({
      success: true,
      original: text,
      targetLanguage,
      translated,
    });
  } catch (error: any) {
    console.error('Translate error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/product-description
 * Generate product description
 *
 * Body:
 * {
 *   "keywords": ["spark plug", "NGK", "performance"]
 * }
 */
router.post('/product-description', async (req, res) => {
  try {
    const { keywords } = req.body;

    if (!Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({ error: 'Missing keywords array' });
    }

    const description = await generateProductDescription(keywords);

    res.json({
      success: true,
      keywords,
      description,
    });
  } catch (error: any) {
    console.error('Product description error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/product-question
 * Answer product-related question
 *
 * Body:
 * {
 *   "question": "What spark plug fits a 2018 Toyota?",
 *   "context": "Available products: NGK BKR5E, Denso K20PR-U"
 * }
 */
router.post('/product-question', async (req, res) => {
  try {
    const { question, context } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Missing question' });
    }

    const answer = await answerProductQuestion(question, context);

    res.json({
      success: true,
      question,
      answer,
      context: context || 'No context provided',
    });
  } catch (error: any) {
    console.error('Product question error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/count-tokens
 * Count tokens in text
 *
 * Body: { "text": "Some text to count" }
 */
router.post('/count-tokens', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Missing text' });
    }

    const tokenCount = await countTokens(text);

    res.json({
      success: true,
      text_length: text.length,
      token_count: tokenCount,
      estimated_cost: (tokenCount * 0.075 / 1000000).toFixed(8), // Rough estimate
    });
  } catch (error: any) {
    console.error('Token count error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/chat
 * Chat-like interaction with memory
 *
 * Body:
 * {
 *   "message": "Hi, I need help with spark plugs",
 *   "history": []
 * }
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Missing message' });
    }

    // Build conversation context
    let context = 'You are a helpful auto parts customer service assistant for Turbobujias.\n\n';
    context += 'Conversation history:\n';

    for (const msg of history.slice(-10)) {
      // Last 10 messages for context
      context += `${msg.role}: ${msg.content}\n`;
    }

    const response = await generateContent(message, context);

    res.json({
      success: true,
      message,
      response,
      token_estimate: Math.ceil((message.length + response.length) / 4),
    });
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
