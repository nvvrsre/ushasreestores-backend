const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const { initDB, getDB, dbReady } = require('./db');

const app = express();
app.use(bodyParser.json());
app.use(cors());

initDB();

/**
 * HEALTH — process alive
 */
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

/**
 * READY — dependencies ready
 */
app.get('/ready', (req, res) => {
  if (!dbReady()) {
    return res.status(503).send('DB not ready');
  }
  res.status(200).send('READY');
});

/**
 * GET cart
 */
app.get('/cart/:userId', async (req, res) => {
  try {
    const db = getDB();
    const [rows] = await db.query(
      'SELECT * FROM carts WHERE user_id = ?',
      [req.params.userId]
    );

    let product_count = rows.length;
    let cart_total = 0;

    let promotions = [];
    try {
      const promoRes = await axios.get(
        `http://api-gateway:3000/promotions/available`,
        { params: { user_id: req.params.userId, cart_total, product_count } }
      );
      promotions = promoRes.data;
    } catch (_) {}

    res.json({ cart: rows, promotions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * ADD product
 */
app.post('/cart/add', async (req, res) => {
  try {
    const { user_id, product_id, quantity = 1 } = req.body;
    const db = getDB();

    await db.query(
      'INSERT INTO carts (user_id, product_id, quantity) VALUES (?, ?, ?)',
      [user_id, product_id, quantity]
    );

    res.json({ message: 'Product added to cart' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * REMOVE product
 */
app.post('/cart/remove', async (req, res) => {
  try {
    const { user_id, product_id } = req.body;
    const db = getDB();

    await db.query(
      'DELETE FROM carts WHERE user_id = ? AND product_id = ?',
      [user_id, product_id]
    );

    res.json({ message: 'Product removed from cart' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * CLEAR cart
 */
app.post('/cart/clear', async (req, res) => {
  try {
    const { user_id } = req.body;
    const db = getDB();

    await db.query(
      'DELETE FROM carts WHERE user_id = ?',
      [user_id]
    );

    res.json({ message: 'Cart cleared' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`🚀 Cart service running on port ${PORT}`);
});
