require('dotenv').config();
const express = require('express');
const cors = require('cors');

const inventoryRoutes = require('./routes/inventory');
const paymentsRoutes = require('./routes/payments');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
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
