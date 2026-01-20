'use strict';

const mysql = require('mysql2/promise');

function must(name) {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing env var: ${name}`);
  }
  return v;
}

const pool = mysql.createPool({
  host: must('DB_HOST'),
  port: Number(process.env.DB_PORT || 3306),
  user: must('DB_USER'),
  password: must('DB_PASSWORD'),
  database: must('DB_NAME'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
