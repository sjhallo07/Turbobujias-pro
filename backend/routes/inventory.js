const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const INVENTORY_PATH = path.join(__dirname, '../data/inventory.json');

// Cache inventory in memory so the file is read only once at startup
// instead of on every request (avoids blocking the event loop per call).
let inventoryCache = null;

function loadInventory() {
  if (!inventoryCache) {
    const raw = fs.readFileSync(INVENTORY_PATH, 'utf8');
    inventoryCache = JSON.parse(raw).items;
  }
  return inventoryCache;
}

// Fetch USD→VES rate from BCV (falls back to env variable).
// Returns { rate: number, source: 'BCV' | 'FALLBACK' }.
// NOTE: The regex targets BCV's known number format (comma decimal, optional
// dot thousands separator, e.g. "36,40" or "1.234,56"). If the site layout
// changes the pattern won't match and the code falls back gracefully.
// Monitor logs for "BCV scrape failed" warnings.
async function getExchangeRate() {
  const fallbackRate = parseFloat(process.env.FALLBACK_EXCHANGE_RATE || '36.40');

  if (!process.env.BCV_API_URL) {
    return { rate: fallbackRate, source: 'FALLBACK' };
  }

  try {
    const response = await axios.get(process.env.BCV_API_URL, { timeout: 5000 });
    const match = response.data.match(/USD.*?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/);
    if (match) {
      const normalizedRate = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
      return { rate: normalizedRate, source: 'BCV' };
    }
    console.warn('BCV scrape failed: rate pattern not found in response');
  } catch (err) {
    console.warn('BCV scrape failed:', err.message);
  }

  return { rate: fallbackRate, source: 'FALLBACK' };
}

function addPricing(item, rate, source) {
  return {
    ...item,
    price_ves: parseFloat((item.price_usd * rate).toFixed(2)),
    exchange_rate: rate,
    rate_source: source,
  };
}

// GET /api/inventory  — list all items with dual-currency prices
router.get('/', async (req, res) => {
  try {
    const items = loadInventory();
    const { rate, source } = await getExchangeRate();
    const result = items.map((item) => addPricing(item, rate, source));
    res.json({ count: result.length, exchange_rate: rate, rate_source: source, items: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/search?q=<UPC or SKU>
router.get('/search', async (req, res) => {
  const query = (req.query.q || '').trim().toUpperCase();
  if (!query) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  try {
    const items = loadInventory();
    const { rate, source } = await getExchangeRate();

    const matches = items.filter(
      (item) =>
        item.sku.toUpperCase().includes(query) ||
        (item.upc && item.upc.includes(query))
    );

    if (matches.length === 0) {
      return res.status(404).json({ error: 'No items found for the given UPC/SKU' });
    }

    const result = matches.map((item) => addPricing(item, rate, source));
    res.json({ count: result.length, query, items: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/:sku
router.get('/:sku', async (req, res) => {
  const sku = req.params.sku.toUpperCase();
  try {
    const items = loadInventory();
    const { rate, source } = await getExchangeRate();
    const item = items.find((i) => i.sku.toUpperCase() === sku);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(addPricing(item, rate, source));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
