'use strict';

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

/**
 * LIVENESS PROBE
 * - Process only
 * - NO DB
 * - MUST ALWAYS return 200 if Node is alive
 */
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

/**
 * READINESS PROBE
 * - DB must be reachable
 * - Fail => pod NOT ready
 */
app.get('/ready', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.status(200).json({ status: 'READY' });
  } catch (err) {
    console.error('Readiness DB check failed:', err.message);
    res.status(503).json({ status: 'DB_NOT_READY' });
  }
});

/* =========================
   API ROUTER
   ========================= */
const api = express.Router();

/**
 * Get all products
 */
api.get('/products', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, title, description, price, image, category FROM products ORDER BY id'
    );
    res.json(rows);
  } catch (err) {
    console.error('DB error GET /products:', err);
    res.status(500).json({ message: 'Database error' });
  }
});

/**
 * Get product by ID
 */
api.get('/products/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, title, description, price, image, category FROM products WHERE id = ?',
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('DB error GET /products/:id:', err);
    res.status(500).json({ message: 'Database error' });
  }
});

/**
 * Mutations disabled
 */
api.post('/products', (_, res) => res.status(405).json({ message: 'Not allowed' }));
api.put('/products/:id', (_, res) => res.status(405).json({ message: 'Not allowed' }));
api.delete('/products/:id', (_, res) => res.status(405).json({ message: 'Not allowed' }));

/* =========================
   ROUTE MOUNTING
   ========================= */

// Public API (what frontend + ingress use)
app.use('/api', api);

// Backward compatibility (optional, but safe)
app.use('/', api);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Product service running on port ${PORT}`);
  });
}

module.exports = app;
