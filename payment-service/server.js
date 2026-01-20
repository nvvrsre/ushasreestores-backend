'use strict';

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.set('trust proxy', true);
app.use(express.json({ limit: '1mb' }));
app.use(cors());

// DEMO in-memory store (no card data ever stored)
let payments = [];
let paymentId = 1;

/* =========================
   HEALTH
========================= */
app.get('/health', (_, res) => res.status(200).send('OK'));
app.get('/ready', (_, res) => res.status(200).send('READY'));

const api = express.Router();

/* =========================
   STRICT CARD VALIDATION
========================= */
function validateCard(card) {
  if (!card) return 'Card details required';

  const number = String(card.number || '').trim();
  const cvv = String(card.cvv || '').trim();
  const month = String(card.month || '').trim();
  const year = String(card.year || '').trim();

  // Strict digit-only checks (NO sanitizing)
  if (!/^\d+$/.test(number)) return 'Card number must contain digits only';
  if (!/^\d+$/.test(cvv)) return 'CVV must contain digits only';
  if (!/^\d+$/.test(month)) return 'Month must contain digits only';
  if (!/^\d+$/.test(year)) return 'Year must contain digits only';

  // Length checks
  if (number.length !== 16) return 'Card number must be exactly 16 digits';
  if (cvv.length !== 3) return 'CVV must be exactly 3 digits';
  if (month.length !== 2) return 'Month must be 2 digits (MM)';
  if (year.length !== 2) return 'Year must be 2 digits (YY)';

  const mm = Number(month);
  const yy = Number(year);

  if (mm < 1 || mm > 12) return 'Invalid expiry month';

  // Expiry validation
  const now = new Date();
  const currentYY = now.getFullYear() % 100;
  const currentMM = now.getMonth() + 1;

  if (yy < currentYY || (yy === currentYY && mm < currentMM)) {
    return 'Card is expired';
  }

  return null; // VALID
}

/* =========================
   PAYMENT API
========================= */
/**
 * POST /payment
 * Gateway rewrites /api/payment -> /payment
 */
api.post('/payment', (req, res) => {
  try {
    const { user_id, order_id, amount, method, address, card } = req.body;

    const uid = Number(user_id);
    const amt = Number(amount);
    const m = String(method || '').trim().toLowerCase();

    if (!Number.isFinite(uid) || uid <= 0) {
      return res.status(400).json({ status: 'failure', message: 'Invalid user_id' });
    }

    if (!Number.isFinite(amt) || amt <= 0) {
      return res.status(400).json({ status: 'failure', message: 'Invalid amount' });
    }

    if (!m) {
      return res.status(400).json({ status: 'failure', message: 'Payment method required' });
    }

    if (m === 'card') {
      const err = validateCard(card);
      if (err) {
        return res.status(400).json({ status: 'failure', message: err });
      }
    }

    // NEVER store card details
    const payment = {
      id: paymentId++,
      user_id: uid,
      order_id: Number(order_id || 0),
      amount: amt,
      method: m,
      address: String(address || ''),
      status: 'SUCCESS',
      created_at: new Date().toISOString()
    };

    payments.push(payment);

    return res.json({
      status: 'success',
      message: 'Payment successful',
      payment_id: payment.id
    });

  } catch (err) {
    console.error('[payment-service] error:', err.message);
    return res.status(500).json({
      status: 'failure',
      message: 'Payment server error'
    });
  }
});

/* =========================
   READ API (DEMO)
========================= */
api.get('/payment/:userId', (req, res) => {
  const uid = Number(req.params.userId);
  if (!Number.isFinite(uid)) return res.json({ payments: [] });

  res.json({
    payments: payments.filter(p => p.user_id === uid)
  });
});

app.use('/api', api);
app.use('/', api);

const PORT = process.env.PORT || 3005;
app.listen(PORT, () =>
  console.log(`🚀 Payment service running on port ${PORT} (STRICT validation enabled)`)
);

module.exports = app;
