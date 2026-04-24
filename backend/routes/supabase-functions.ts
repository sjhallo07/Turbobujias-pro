/**
 * Supabase Edge Functions Integration Routes
 * POST /api/functions/*
 */

import express from 'express';
import {
  uploadToStorageBucket,
  importInventoryBulk,
  scanProduct,
  confirmSale,
  summarizeThread,
  callRapidFunction,
  bufferToBase64,
  generateDeviceFingerprint,
} from '../helpers/supabase-functions.js';

const router = express.Router();

// ========== STORAGE FUNCTIONS ==========

/**
 * POST /api/functions/upload
 * Upload file to Supabase Storage (base64)
 */
router.post('/upload', async (req, res) => {
  try {
    const { bucket = 'turbobujias-fullstack', path, fileBase64, contentType } = req.body;

    if (!path || !fileBase64) {
      return res.status(400).json({ error: 'Missing path or fileBase64' });
    }

    const result = await uploadToStorageBucket(
      bucket,
      path,
      fileBase64,
      contentType || 'application/octet-stream'
    );

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Upload error:', error.message);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// ========== INVENTORY FUNCTIONS (require auth) ==========

/**
 * POST /api/functions/inventory/import
 * Bulk import inventory items
 */
router.post('/inventory/import', async (req, res) => {
  try {
    const userJWT = req.headers.authorization?.split(' ')[1];
    if (!userJWT) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }

    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Expected items array' });
    }

    const result = await importInventoryBulk(items, userJWT);
    res.json(result);
  } catch (error: any) {
    console.error('Import error:', error.message);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

/**
 * POST /api/functions/inventory/scan
 * Scan product by UPC/EAN/SKU
 */
router.post('/inventory/scan', async (req, res) => {
  try {
    const userJWT = req.headers.authorization?.split(' ')[1];
    if (!userJWT) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }

    const { code, want_image } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Missing code' });
    }

    const result = await scanProduct(code, userJWT, want_image || false);
    res.json(result);
  } catch (error: any) {
    console.error('Scan error:', error.message);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

/**
 * POST /api/functions/inventory/sell-confirmed
 * Confirm sale and decrement inventory
 */
router.post('/inventory/sell-confirmed', async (req, res) => {
  try {
    const userJWT = req.headers.authorization?.split(' ')[1];
    if (!userJWT) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }

    const { code, device_fingerprint, qty = 1, source = 'payment-confirmed' } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Missing code' });
    }

    const fingerprint = device_fingerprint || generateDeviceFingerprint();

    const result = await confirmSale(code, fingerprint, userJWT, qty, source);
    res.json(result);
  } catch (error: any) {
    console.error('Sell confirmed error:', error.message);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// ========== OTHER FUNCTIONS ==========

/**
 * POST /api/functions/summarize-thread
 * Summarize conversation thread
 */
router.post('/summarize-thread', async (req, res) => {
  try {
    const userJWT = req.headers.authorization?.split(' ')[1];
    if (!userJWT) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }

    const { thread_id } = req.body;
    if (!thread_id) {
      return res.status(400).json({ error: 'Missing thread_id' });
    }

    const result = await summarizeThread(thread_id, userJWT);
    res.json(result);
  } catch (error: any) {
    console.error('Summarize error:', error.message);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

/**
 * POST /api/functions/rapid-function
 * Call rapid-function (generic endpoint)
 */
router.post('/rapid-function', async (req, res) => {
  try {
    const userJWT = req.headers.authorization?.split(' ')[1];
    if (!userJWT) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }

    const result = await callRapidFunction(req.body, userJWT);
    res.json(result);
  } catch (error: any) {
    console.error('Rapid function error:', error.message);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

export default router;
