const mysql = require('mysql2/promise');

let pool = null;
let ready = false;

async function initDB() {
  const useRealDB = process.env.USE_REAL_DB === 'true';
  if (!useRealDB) {
    ready = true; // in-memory mode is always "ready"
    return;
  }

  const {
    DB_HOST,
    DB_USER,
    DB_PASSWORD,
    DB_NAME,
    DB_PORT = 3306,
  } = process.env;

  const connect = async () => {
    try {
      pool = mysql.createPool({
        host: DB_HOST,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
        port: Number(DB_PORT),
        waitForConnections: true,
        connectionLimit: 10,
        ssl: { rejectUnauthorized: false },
      });

      await pool.query('SELECT 1');

      await pool.query(`
        CREATE TABLE IF NOT EXISTS notify_requests (
          id INT AUTO_INCREMENT PRIMARY KEY,
          email VARCHAR(100) NOT NULL,
          search_term VARCHAR(100) NOT NULL,
          notified TINYINT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      ready = true;
      console.log('✅ Notification DB ready');
    } catch (err) {
      ready = false;
      console.error('❌ Notification DB not ready:', err.message);
      setTimeout(connect, 5000);
    }
  };

  connect();
}

function dbReady() {
  return ready;
}

function getDB() {
  if (!pool) throw new Error('DB not initialized');
  return pool;
}

module.exports = { initDB, dbReady, getDB };
