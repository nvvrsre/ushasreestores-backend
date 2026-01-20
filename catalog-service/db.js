// db.js (Catalog)
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
    console.log('✅ Catalog DB connected');
  } catch (err) {
    isReady = false;
    console.error('❌ Catalog DB connect failed:', err.message);
  }
}

// keep retrying until DB becomes reachable
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
