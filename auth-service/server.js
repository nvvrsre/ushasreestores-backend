'use strict';

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const axios = require('axios');
require('dotenv').config();

const { client, httpRequestDuration, dbQueryDuration } = require('./metrics');

const app = express();
app.set('trust proxy', true);
app.use(express.json({ limit: '1mb' }));
app.use(cors());

let db;

// ======================
// PROMETHEUS HTTP METRICS
// ======================
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer({
    method: req.method,
    route: req.path
  });

  res.on('finish', () => {
    end({ status_code: res.statusCode });
  });

  next();
});

// ======================
// DB INIT
// ======================
async function initDB() {
  db = await mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    ssl: { rejectUnauthorized: false }
  });

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✅ Auth DB ready');
}

initDB().catch(err => {
  console.error('❌ DB init failed:', err);
  process.exit(1);
});

// ======================
// HEALTH & READINESS
// ======================
app.get('/health', (_, res) => res.status(200).send('OK'));

app.get('/ready', async (_, res) => {
  try {
    const end = dbQueryDuration.startTimer({ operation: 'readiness_check' });
    await db.query('SELECT 1');
    end();
    res.status(200).send('READY');
  } catch {
    res.status(503).send('DB_NOT_READY');
  }
});

// ======================
// METRICS ENDPOINT
// ======================
app.get('/metrics', async (_, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// ======================
// API ROUTES
// ======================
const api = express.Router();

function makeDummyToken(user) {
  return Buffer.from(`${user.id}:${user.email}`).toString('base64');
}

async function notify(email, subject, message, name) {
  await axios.post(
    'http://notification-service:3007/notify',
    { email, subject, message, name },
    { timeout: 2000 }
  );
}

// ======================
// SIGNUP
// ======================
api.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!String(name || '').trim() || !String(email || '').trim() || !String(password || '').trim()) {
      return res.status(400).json({ message: 'All fields required' });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    const endDb = dbQueryDuration.startTimer({ operation: 'insert_user' });
    const [result] = await db.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [cleanName, cleanEmail, password]
    );
    endDb();

    const user = { id: result.insertId, name: cleanName, email: cleanEmail };
    const token = makeDummyToken(user);

    notify(
      user.email,
      'Welcome to UshaSree Stores',
      `Hi ${user.name},\nYour account was created successfully.`,
      user.name
    ).catch(() => {});

    return res.json({ message: 'Signup successful', token, user });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Email already exists' });
    }
    console.error('Signup error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ======================
// LOGIN
// ======================
api.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!String(email || '').trim() || !String(password || '').trim()) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    const endDb = dbQueryDuration.startTimer({ operation: 'select_user' });
    const [rows] = await db.query(
      'SELECT id, name, email, password FROM users WHERE email=? LIMIT 1',
      [cleanEmail]
    );
    endDb();

    if (!rows.length || rows[0].password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = { id: rows[0].id, name: rows[0].name, email: rows[0].email };
    const token = makeDummyToken(user);

    notify(
      user.email,
      'Login Alert - UshaSree Stores',
      `Hi ${user.name},\nA login was detected on your account.`,
      user.name
    ).catch(() => {});

    return res.json({ token, user });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

api.get('/users', async (_, res) => {
  const endDb = dbQueryDuration.startTimer({ operation: 'list_users' });
  const [rows] = await db.query('SELECT id, email, name FROM users');
  endDb();
  res.json({ users: rows });
});

app.use('/api', api);

// ======================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Auth service listening on ${PORT}`));
