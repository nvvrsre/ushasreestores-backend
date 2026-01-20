'use strict';

const mysql = require('mysql2/promise');

let pool;

async function initDB() {
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  // quick sanity check
  await pool.query('SELECT 1');
  console.log('✅ Order DB connected');
}

function getDB() {
  if (!pool) throw new Error('DB not initialized');
  return pool;
}

module.exports = { initDB, getDB };
