const DEFAULT_DATASET_VIEWER_BASE_URL = 'https://datasets-server.huggingface.co';
const DEFAULT_DATASET_VIEWER_TIMEOUT_MS = 15000;

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function resolveDatasetViewerBaseUrl() {
  return normalizeBaseUrl(process.env.DATASET_VIEWER_BASE_URL) || DEFAULT_DATASET_VIEWER_BASE_URL;
}

function resolveDatasetViewerTimeoutMs() {
  const rawValue = Number.parseInt(process.env.DATASET_VIEWER_TIMEOUT_MS || '', 10);
  return Number.isFinite(rawValue) && rawValue > 0 ? rawValue : DEFAULT_DATASET_VIEWER_TIMEOUT_MS;
}

module.exports = {
  DEFAULT_DATASET_VIEWER_BASE_URL,
  DEFAULT_DATASET_VIEWER_TIMEOUT_MS,
  resolveDatasetViewerBaseUrl,
  resolveDatasetViewerTimeoutMs,
};
