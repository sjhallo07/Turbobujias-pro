const express = require('express');
const axios = require('axios');
const { pipeline } = require('node:stream/promises');

const router = express.Router();

const DEFAULT_DATASET_VIEWER_BASE_URL = 'https://datasets-server.huggingface.co';
const DEFAULT_TIMEOUT_MS = 15000;
const ALLOWED_ENDPOINTS = new Set([
  'healthcheck',
  'metrics',
  'croissant-crumbs',
  'is-valid',
  'splits',
  'first-rows',
  'parquet',
  'opt-in-out-urls',
  'statistics',
  'info',
  'size',
  'compatible-libraries',
  'hub-cache',
  'presidio-entities',
]);
const FORWARDED_HEADERS = [
  'cache-control',
  'content-length',
  'content-type',
  'etag',
  'last-modified',
];

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function resolveDatasetViewerBaseUrl() {
  return normalizeBaseUrl(process.env.DATASET_VIEWER_BASE_URL) || DEFAULT_DATASET_VIEWER_BASE_URL;
}

function resolveTimeoutMs() {
  const rawValue = Number.parseInt(String(process.env.DATASET_VIEWER_TIMEOUT_MS || ''), 10);
  return Number.isFinite(rawValue) && rawValue > 0 ? rawValue : DEFAULT_TIMEOUT_MS;
}

function buildUpstreamUrl(endpoint, query) {
  if (!ALLOWED_ENDPOINTS.has(endpoint)) {
    return null;
  }

  const pathname = `/${endpoint}`;
  const upstreamUrl = new URL(pathname, `${resolveDatasetViewerBaseUrl()}/`);

  for (const [key, value] of Object.entries(query || {})) {
    if (Array.isArray(value)) {
      value.forEach((item) => upstreamUrl.searchParams.append(key, String(item)));
      continue;
    }

    if (value !== undefined) {
      upstreamUrl.searchParams.append(key, String(value));
    }
  }

  return upstreamUrl;
}

async function proxyRequest(req, res) {
  const { endpoint } = req.params;
  const upstreamUrl = buildUpstreamUrl(endpoint, req.query);

  if (!upstreamUrl) {
    res.status(404).json({
      error: 'dataset_viewer_endpoint_not_supported',
      message: `Unsupported dataset viewer endpoint: ${endpoint}.`,
    });
    return;
  }

  try {
    const response = await axios.get(upstreamUrl.toString(), {
      headers: {
        accept: req.get('accept') || '*/*',
      },
      responseType: 'stream',
      timeout: resolveTimeoutMs(),
      validateStatus: () => true,
    });

    FORWARDED_HEADERS.forEach((headerName) => {
      if (response.headers[headerName]) {
        res.setHeader(headerName, response.headers[headerName]);
      }
    });

    res.status(response.status);
    await pipeline(response.data, res);
  } catch (error) {
    const status = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' ? 504 : 502;
    res.status(status).json({
      error: 'dataset_viewer_unavailable',
      message: 'The dataset viewer upstream is unavailable.',
      upstreamBaseUrl: resolveDatasetViewerBaseUrl(),
    });
  }
}

router.get('/', (req, res) => {
  res.json({
    publicUrl: `${req.protocol}://${req.get('host')}${req.baseUrl}`,
    supportedEndpoints: Array.from(ALLOWED_ENDPOINTS).sort(),
    upstreamBaseUrl: resolveDatasetViewerBaseUrl(),
  });
});
router.get('/:endpoint', proxyRequest);

module.exports = router;
