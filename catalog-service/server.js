// server.js (Catalog)
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const { initDB, getDB, dbReady } = require('./db');

const app = express();
app.use(bodyParser.json());
app.use(cors());

initDB();

// ✅ Health
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// ✅ Readiness
app.get('/ready', (req, res) => {
  if (!dbReady()) return res.status(503).send('DB not ready');
  res.status(200).send('READY');
});

// List categories
app.get('/categories', async (req, res) => {
  try {
    const db = getDB();
    const [rows] = await db.query('SELECT * FROM categories');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single category
app.get('/categories/:id', async (req, res) => {
  try {
    const db = getDB();
    const [rows] = await db.query('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create category
app.post('/categories', async (req, res) => {
  try {
    const { name, description, image_url } = req.body;
    const db = getDB();
    const [result] = await db.query(
      'INSERT INTO categories (name, description, image_url) VALUES (?, ?, ?)',
      [name, description, image_url]
    );
    res.json({ id: result.insertId, name, description, image_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update category
app.put('/categories/:id', async (req, res) => {
  try {
    const { name, description, image_url } = req.body;
    const db = getDB();
    await db.query(
      'UPDATE categories SET name=?, description=?, image_url=? WHERE id=?',
      [name, description, image_url, req.params.id]
    );
    res.json({ id: Number(req.params.id), name, description, image_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete category
app.delete('/categories/:id', async (req, res) => {
  try {
    const db = getDB();
    await db.query('DELETE FROM categories WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3008; // <-- pick ONE port and standardize
app.listen(PORT, () => console.log(`🚀 Catalog service running on port ${PORT}`));
