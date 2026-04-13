require('dotenv').config();
const express = require('express');
const cors = require('cors');

const configRoutes = require('./routes/config');
const inventoryRoutes = require('./routes/inventory');
const paymentsRoutes = require('./routes/payments');

const app = express();

function normalizeOrigin(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function buildAllowedOrigins() {
  const origins = new Set();
  const configuredOrigins = String(process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

  configuredOrigins.forEach((origin) => origins.add(origin));

  const frontendPublicUrl = normalizeOrigin(process.env.FRONTEND_PUBLIC_URL);
  if (frontendPublicUrl) {
    origins.add(frontendPublicUrl);
  }

  return origins;
}

const allowedOrigins = buildAllowedOrigins();

app.set('trust proxy', true);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.size === 0 || allowedOrigins.has(normalizeOrigin(origin))) {
        return callback(null, true);
      }

      return callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    },
  })
);
app.use(express.json());

// Routes
app.use('/api/config', configRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/payments', paymentsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Turbobujias API running on port ${PORT}`);
});

module.exports = app;
