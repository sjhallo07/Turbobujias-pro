const express = require('express');
const axios = require('axios');
const fs = require('fs');
const https = require('https');
const path = require('path');

const router = express.Router();
const INVENTORY_PATH = path.join(__dirname, '../data/inventory.json');
const EXCHANGE_RATE_CACHE_TTL_MS =
  Math.max(1, Number(process.env.EXCHANGE_RATE_CACHE_TTL_HOURS || 24)) * 60 * 60 * 1000;

// Cache inventory in memory so the file is read only once at startup
// instead of on every request (avoids blocking the event loop per call).
let inventoryCache = null;
let exchangeRatesCache = null;

function loadInventory() {
  if (!inventoryCache) {
    const raw = fs.readFileSync(INVENTORY_PATH, 'utf8');
    inventoryCache = JSON.parse(raw).items;
  }
  return inventoryCache;
}

function normalizeBcvNumber(value) {
  return parseFloat(String(value).replace(/\./g, '').replace(',', '.'));
}

function getFallbackExchangeRates() {
  const usdToVes = parseFloat(process.env.FALLBACK_EXCHANGE_RATE || '36.50');
  const eurToVes = parseFloat(process.env.FALLBACK_EUR_EXCHANGE_RATE || '39.50');
  const safeUsdToVes = Number.isFinite(usdToVes) && usdToVes > 0 ? usdToVes : 36.5;
  const safeEurToVes = Number.isFinite(eurToVes) && eurToVes > 0 ? eurToVes : safeUsdToVes * 1.08;

  return {
    usd_ves: safeUsdToVes,
    eur_ves: safeEurToVes,
    usd_eur: parseFloat((safeUsdToVes / safeEurToVes).toFixed(6)),
    source: 'FALLBACK',
    fetched_at: new Date().toISOString(),
  };
}

function extractCurrencyRate(html, currencyCode) {
  const patterns = [
    new RegExp(`${currencyCode}[\\s\\S]{0,160}?(\\d{1,3}(?:\\.\\d{3})*,\\d{2,8}|\\d+,\\d{2,8})`, 'i'),
    new RegExp(`${currencyCode}[^\\d]{0,80}(\\d{1,3}(?:\\.\\d{3})*,\\d{2,8}|\\d+,\\d{2,8})`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const rate = normalizeBcvNumber(match[1]);
      if (Number.isFinite(rate) && rate > 0) {
        return rate;
      }
    }
  }

  return null;
}

async function getExchangeRates() {
  if (
    exchangeRatesCache &&
    Date.now() - exchangeRatesCache.cachedAt < EXCHANGE_RATE_CACHE_TTL_MS
  ) {
    return exchangeRatesCache.payload;
  }

  const fallbackRates = getFallbackExchangeRates();

  if (!process.env.BCV_API_URL) {
    exchangeRatesCache = { cachedAt: Date.now(), payload: fallbackRates };
    return fallbackRates;
  }

  try {
    const allowInsecureTls = String(process.env.BCV_ALLOW_INSECURE_TLS || 'false') === 'true';
    const response = await axios.get(process.env.BCV_API_URL, {
      timeout: 7000,
      headers: {
        'User-Agent': 'Mozilla/5.0 TurbobujiasPro/1.0',
      },
      httpsAgent: allowInsecureTls
        ? new https.Agent({ rejectUnauthorized: false })
        : undefined,
    });
    const html = String(response.data || '');
    const usdToVes = extractCurrencyRate(html, 'USD');
    const eurToVes = extractCurrencyRate(html, 'EUR');

    if (usdToVes && eurToVes) {
      const payload = {
        usd_ves: usdToVes,
        eur_ves: eurToVes,
        usd_eur: parseFloat((usdToVes / eurToVes).toFixed(6)),
        source: 'BCV',
        fetched_at: new Date().toISOString(),
      };
      exchangeRatesCache = { cachedAt: Date.now(), payload };
      return payload;
    }

    console.warn('BCV scrape failed: USD/EUR rate pattern not found in response');
  } catch (err) {
    console.warn('BCV scrape failed:', err.message);
  }

  exchangeRatesCache = { cachedAt: Date.now(), payload: fallbackRates };
  return fallbackRates;
}

function addPricing(item, rates) {
  const priceVes = item.price_usd * rates.usd_ves;
  const priceEur = item.price_usd * rates.usd_eur;

  return {
    ...item,
    price_usd: parseFloat(Number(item.price_usd || 0).toFixed(2)),
    price_eur: parseFloat(priceEur.toFixed(2)),
    price_ves: parseFloat(priceVes.toFixed(2)),
    exchange_rates: {
      usd_ves: rates.usd_ves,
      eur_ves: rates.eur_ves,
      usd_eur: rates.usd_eur,
    },
    rate_source: rates.source,
    rates_last_updated: rates.fetched_at,
  };
}

// GET /api/inventory/rates — BCV/fallback exchange rates for USD and EUR
router.get('/rates', async (_req, res) => {
  try {
    const rates = await getExchangeRates();
    res.json(rates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory — list all items with USD/EUR/VES prices
router.get('/', async (req, res) => {
  try {
    const items = loadInventory();
    const rates = await getExchangeRates();
    const result = items.map((item) => addPricing(item, rates));
    res.json({
      count: result.length,
      exchange_rates: {
        usd_ves: rates.usd_ves,
        eur_ves: rates.eur_ves,
        usd_eur: rates.usd_eur,
      },
      rate_source: rates.source,
      rates_last_updated: rates.fetched_at,
      items: result,
    });
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
    const rates = await getExchangeRates();

    const matches = items.filter(
      (item) =>
        item.sku.toUpperCase().includes(query) ||
        (item.upc && item.upc.includes(query)) ||
        item.brand.toUpperCase().includes(query) ||
        item.model.toUpperCase().includes(query) ||
        (item.title && item.title.toUpperCase().includes(query)) ||
        item.application.join(' ').toUpperCase().includes(query)
    );

    if (matches.length === 0) {
      return res.status(404).json({ error: 'No items found for the given UPC/SKU' });
    }

    const result = matches.map((item) => addPricing(item, rates));
    res.json({
      count: result.length,
      query,
      exchange_rates: {
        usd_ves: rates.usd_ves,
        eur_ves: rates.eur_ves,
        usd_eur: rates.usd_eur,
      },
      rate_source: rates.source,
      rates_last_updated: rates.fetched_at,
      items: result,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/:sku
router.get('/:sku', async (req, res) => {
  const sku = req.params.sku.toUpperCase();
  try {
    const items = loadInventory();
    const rates = await getExchangeRates();
    const item = items.find((i) => i.sku.toUpperCase() === sku);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(addPricing(item, rates));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
