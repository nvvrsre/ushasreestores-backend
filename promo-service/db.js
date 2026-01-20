// db.js (Promo)
const mysql = require('mysql2/promise');

let pool;
let isReady = false;

async function initDB() {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 5,
      ssl: { rejectUnauthorized: false }
    });

    await pool.query('SELECT 1');
    isReady = true;
    console.log('✅ Promo DB connected');
  } catch (err) {
    isReady = false;
    console.error('❌ Promo DB connect failed:', err.message);
  }
}

// retry until DB is ready
setInterval(() => {
  if (!isReady) initDB();
}, 5000);

function getDB() {
  if (!isReady) throw new Error('DB not ready');
  return pool;
}

function dbReady() {
  return isReady;
}

module.exports = { initDB, getDB, dbReady };
