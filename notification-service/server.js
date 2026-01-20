'use strict';

const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const axios = require('axios');
require('dotenv').config();

const { initDB, dbReady, getDB } = require('./db');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(cors());

const USE_REAL_DB = process.env.USE_REAL_DB === 'true';
const USE_REAL_AUTH = process.env.USE_REAL_AUTH === 'true';

let notifyRequests = [];
let notifyId = 1;

initDB();

const hasSMTP = !!(process.env.SMTP_USER && process.env.SMTP_PASS);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

async function sendEmail(to, subject, message, customerName = '') {
  if (!hasSMTP) {
    console.warn('⚠️ SMTP creds missing; skipping email send');
    return;
  }

  const mailOptions = {
    from: `"UshaSree Stores" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text: message,
    html: `<div style="font-family:sans-serif;max-width:500px">
      <h2 style="color:#0e67ae;margin-bottom:6px;">${subject}</h2>
      <p>Hi${customerName ? ' ' + customerName : ''},</p>
      <div style="background:#f6f8fa;padding:16px;border-radius:8px;margin:18px 0 12px 0;">
        <pre style="font-family:inherit;white-space:pre-line;margin:0">${message}</pre>
      </div>
      <div style="font-size:14px;color:#444;">-- Team UshaSree<br/><span style="color:#bbb;">Automated message.</span></div>
    </div>`
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${to} | ${info.response}`);
  } catch (e) {
    console.error('❌ Email send failed:', e.message);
  }
}

function sendSMS(phone, message) {
  console.log(`📱 SMS to ${phone} | Message: ${message}`);
}

app.get('/health', (_, res) => res.status(200).send('OK'));
app.get('/ready', (_, res) => {
  if (USE_REAL_DB && !dbReady()) return res.status(503).send('DB_NOT_READY');
  res.status(200).send('READY');
});

const api = express.Router();

api.post('/notify', async (req, res) => {
  const { email, phone, subject, message, name, user_id } = req.body;

  if (!email && !phone && !user_id) return res.status(400).json({ message: 'Email, phone, or user_id required' });
  if (!message) return res.status(400).json({ message: 'Message required' });

  let userEmail = email;

  if (!userEmail && user_id) {
    if (USE_REAL_AUTH) {
      try {
        const response = await axios.get('http://auth-service:3001/users', { timeout: 2000 });
        const users = response.data.users || [];
        const user = users.find(u => String(u.id) === String(user_id));
        if (!user) return res.status(404).json({ message: 'User not found' });
        userEmail = user.email;
      } catch (e) {
        return res.status(500).json({ message: 'Could not fetch user email' });
      }
    } else {
      userEmail = `user${user_id}@example.com`;
    }
  }

  const realSubject = subject || 'UshaSree Stores Notification';

  if (userEmail) await sendEmail(userEmail, realSubject, message, name || '');
  if (phone) sendSMS(phone, message);

  res.json({ message: 'Notification processed' });
});

api.post('/notify-me', async (req, res) => {
  const { email, term } = req.body;
  if (!email || !term) return res.status(400).json({ message: 'Email and search term required' });

  if (USE_REAL_DB) {
    if (!dbReady()) return res.status(503).json({ message: 'DB not ready' });
    try {
      const db = getDB();
      await db.query('INSERT INTO notify_requests (email, search_term) VALUES (?, ?)', [email, term]);
      return res.json({ message: 'Request saved! You’ll be notified when available.' });
    } catch {
      return res.status(500).json({ message: 'Error saving request' });
    }
  }

  const reqObj = { id: notifyId++, email, search_term: term, notified: 0, created_at: new Date().toISOString() };
  notifyRequests.push(reqObj);
  res.json({ message: 'Request saved! (dev mode, no DB)', request: reqObj });
});

api.get('/notify-me/all', (req, res) => {
  if (USE_REAL_DB) return res.status(400).json({ message: 'Not available with real DB' });
  res.json({ count: notifyRequests.length, requests: notifyRequests });
});

api.delete('/notify-me/all', (req, res) => {
  if (USE_REAL_DB) return res.status(400).json({ message: 'Not available with real DB' });
  notifyRequests = [];
  notifyId = 1;
  res.json({ message: 'All notify-me requests cleared.' });
});

app.use('/api', api);
app.use('/', api);

app.listen(process.env.PORT || 3007, () => {
  console.log(`🚀 Notification service running on port ${process.env.PORT || 3007} [DB:${USE_REAL_DB ? 'REAL' : 'MEM'}]`);
});
