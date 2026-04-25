/**
 * Semantic Search API Routes
 * POST /api/search/semantic - Semantic product search
 * POST /api/search/question - Answer inventory questions
 * GET /api/search/analytics - Learning analytics
 * POST /api/search/track-click - Track user interactions
 */

import express from "express";
import SemanticSearchEngine from "../lib/semantic-search.js";

const router = express.Router();
const searchEngine = new SemanticSearchEngine();
let isInitialized = false;

/**
 * Initialize search engine with inventory
 */
async function initializeSearchEngine(inventoryItems) {
  if (!isInitialized && inventoryItems && inventoryItems.length > 0) {
    try {
      await searchEngine.initialize();
      await searchEngine.indexProducts(inventoryItems);
      isInitialized = true;
      console.log("✓ Semantic search ready");
    } catch (error) {
      console.error("Failed to initialize search:", error);
    }
  }
}

/**
 * GET /search/health
 * Check if search engine is ready
 */
router.get("/health", (req, res) => {
  res.json({
    ready: isInitialized,
    embedded: searchEngine.productEmbeddings.size,
    cached: searchEngine.queryCache.size,
  });
});

/**
 * POST /search/semantic
 * Semantic similarity search for products
 *
 * Body:
 * {
 *   "query": "NGK spark plug for Toyota",
 *   "limit": 5,
 *   "threshold": 0.3
 * }
 */
router.post("/semantic", async (req, res) => {
  try {
    if (!isInitialized) {
      return res.status(503).json({ error: "Search engine not ready" });
    }

    const { query, limit = 5, threshold = 0.3 } = req.body;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return res.status(400).json({ error: "Query is required" });
    }

    const results = await searchEngine.search(query.trim(), limit, threshold);

    res.json({
      query: query.trim(),
      results: results.map((r) => ({
        sku: r.sku,
        brand: r.product.brand,
        model: r.product.model,
        relevance: r.relevance,
        price_usd: r.product.price_usd,
        stock: r.product.stock,
        applications: r.product.application,
      })),
      count: results.length,
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /search/question
 * Answer customer questions about inventory
 *
 * Body:
 * {
 *   "question": "¿Qué bujía sirve para un Toyota Corolla 2014?"
 * }
 */
router.post("/question", async (req, res) => {
  try {
    if (!isInitialized) {
      return res.status(503).json({ error: "Search engine not ready" });
    }

    const { question } = req.body;

    if (!question || typeof question !== "string") {
      return res.status(400).json({ error: "Question is required" });
    }

    const results = await searchEngine.findByQuestion(question);

    res.json({
      question: question.trim(),
      answers: results.slice(0, 3).map((r) => ({
        sku: r.sku,
        product: r.product.brand + " " + r.product.model,
        answer: r.answer,
        confidence: r.relevance,
        price: r.product.price_usd,
      })),
    });
  } catch (error) {
    console.error("Question error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /search/analytics
 * Get learning analytics and performance metrics
 */
router.get("/analytics", (req, res) => {
  try {
    const analytics = searchEngine.getAnalytics();

    res.json({
      searchMetrics: {
        totalSearches: analytics.totalSearches,
        totalClicks: analytics.totalClicks,
        clickThroughRate: analytics.clickThroughRate + "%",
      },
      topSearches: analytics.topQueries,
      topClicked: analytics.topClicked,
      system: {
        cacheSize: analytics.cacheSize,
        indexedProducts: analytics.indexSize,
        memoryUsage: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100 + " MB",
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /search/track-click
 * Track user clicks for learning
 *
 * Body:
 * {
 *   "query": "Toyota spark plug",
 *   "sku": "NGK-BKR5E",
 *   "relevance": 0.95
 * }
 */
router.post("/track-click", (req, res) => {
  try {
    const { query, sku, relevance = 0.5 } = req.body;

    if (!query || !sku) {
      return res.status(400).json({ error: "Query and SKU required" });
    }

    searchEngine.trackClick(query, sku, relevance);

    res.json({ tracked: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /search/export-learning
 * Export learning data for analysis or fine-tuning
 */
router.get("/export-learning", (req, res) => {
  try {
    const data = searchEngine.exportLearningData();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /search/finetuning-data
 * Get training pairs for model fine-tuning
 */
router.post("/finetuning-data", async (req, res) => {
  try {
    const pairs = await searchEngine.prepareFinetuningData();

    res.json({
      trainingPairs: pairs,
      totalPairs: pairs.length,
      readyForFinetuning: pairs.length > 10,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /search/initialize
 * Initialize search engine (called on startup)
 *
 * Body:
 * {
 *   "products": [...]
 * }
 */
router.post("/initialize", async (req, res) => {
  try {
    const { products } = req.body;

    if (!Array.isArray(products)) {
      return res.status(400).json({ error: "Products array required" });
    }

    await initializeSearchEngine(products);

    res.json({
      initialized: isInitialized,
      indexedProducts: searchEngine.productEmbeddings.size,
    });
  } catch (error) {
    console.error("Initialization error:", error);
    res.status(500).json({ error: error.message });
  }
});

export { searchEngine, initializeSearchEngine };
export default router;
