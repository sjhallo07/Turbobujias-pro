const express = require('express');
const axios = require('axios');

const router = express.Router();

const DEFAULT_DATASET_VIEWER_BASE_URL = 'https://datasets-server.huggingface.co';
const DEFAULT_TIMEOUT_MS = 15000;
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

function buildUpstreamUrl(pathname, query) {
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
  const upstreamPath = req.params[0] ? `/${req.params[0]}` : '/';

  try {
    const response = await axios.get(buildUpstreamUrl(upstreamPath, req.query).toString(), {
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
    response.data.pipe(res);
  } catch (error) {
    const status = error.code === 'ECONNABORTED' ? 504 : 502;
    res.status(status).json({
      error: 'dataset_viewer_unavailable',
      message: 'The dataset viewer upstream is unavailable.',
      upstreamBaseUrl: resolveDatasetViewerBaseUrl(),
    });
  }
}

router.get('/', proxyRequest);
router.get('/*', proxyRequest);

module.exports = router;
