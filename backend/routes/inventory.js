const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const INVENTORY_PATH = path.join(__dirname, '../data/inventory.json');

function loadInventory() {
  const raw = fs.readFileSync(INVENTORY_PATH, 'utf8');
  return JSON.parse(raw).items;
}

// Fetch USD→VES rate from BCV (falls back to env variable).
// NOTE: The regex below targets a known layout; if the BCV site changes this
// pattern will not match and the code will gracefully fall back to
// FALLBACK_EXCHANGE_RATE. Monitor logs for "BCV scrape failed" warnings.
async function getExchangeRate() {
  try {
    const response = await axios.get(process.env.BCV_API_URL, { timeout: 5000 });
    // Pattern looks for the USD row followed by the formatted rate, e.g. "36,40"
    // or "1.234,56" (comma decimal, optional dot thousands separators).
    const match = response.data.match(/USD.*?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/);
    if (match) {
      const normalizedRate = match[1].replace(/\./g, '').replace(',', '.');
      return parseFloat(normalizedRate);
    }
    console.warn('BCV scrape failed: rate pattern not found in response');
  } catch (err) {
    console.warn('BCV scrape failed:', err.message);
  }
  return parseFloat(process.env.FALLBACK_EXCHANGE_RATE || '36.40');
}

// GET /api/inventory  — list all items with dual-currency prices
router.get('/', async (req, res) => {
  try {
    const items = loadInventory();
    const rate = await getExchangeRate();
    const result = items.map((item) => ({
      ...item,
      price_ves: parseFloat((item.price_usd * rate).toFixed(2)),
      exchange_rate: rate,
      rate_source: 'BCV',
    }));
    res.json({ count: result.length, exchange_rate: rate, items: result });
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
    const rate = await getExchangeRate();

    const matches = items.filter(
      (item) =>
        item.sku.toUpperCase().includes(query) ||
        (item.upc && item.upc.includes(query))
    );

    if (matches.length === 0) {
      return res.status(404).json({ error: 'No items found for the given UPC/SKU' });
    }

    const result = matches.map((item) => ({
      ...item,
      price_ves: parseFloat((item.price_usd * rate).toFixed(2)),
      exchange_rate: rate,
      rate_source: 'BCV',
    }));

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
    const rate = await getExchangeRate();
    const item = items.find((i) => i.sku.toUpperCase() === sku);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json({
      ...item,
      price_ves: parseFloat((item.price_usd * rate).toFixed(2)),
      exchange_rate: rate,
      rate_source: 'BCV',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
