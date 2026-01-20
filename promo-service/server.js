'use strict';

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initDB, getDB, dbReady } = require('./db');

const app = express();
app.use(express.json());
app.use(cors());

initDB();

/* =========================
   HEALTH
========================= */
app.get('/health', (_, res) => res.status(200).send('OK'));
app.get('/ready', (_, res) =>
  dbReady() ? res.status(200).send('READY') : res.status(503).send('DB_NOT_READY')
);

/* =========================
   UTILS
========================= */
function nowMysql() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

async function isNewUser(db, user_id) {
  const [[{ cnt }]] = await db.query(
    'SELECT COUNT(*) AS cnt FROM user_coupons WHERE user_id=?',
    [user_id]
  );
  return cnt === 0;
}

function validatePromo(p, cart_total, product_count, is_new, used) {
  if (!p.active) return 'INACTIVE';
  if (p.start_date && p.start_date > nowMysql()) return 'NOT_STARTED';
  if (p.end_date && p.end_date < nowMysql()) return 'EXPIRED';

  if (p.user_restriction === 'NEW_USER' && !is_new) return 'NEW_USER_ONLY';
  if (Number(p.min_cart_value) > 0 && cart_total < Number(p.min_cart_value)) return 'MIN_CART_NOT_MET';
  if (Number(p.min_product_count) > 0 && product_count < Number(p.min_product_count)) return 'MIN_PRODUCTS_NOT_MET';
  if (Number(used) >= Number(p.max_usage_per_user)) return 'MAX_USAGE_REACHED';

  return null;
}

function computeDiscount(p, cart_total) {
  let discount = 0;

  if (p.discount_type === 'PERCENT') {
    discount = Math.floor((cart_total * Number(p.discount_value)) / 100);
  } else {
    discount = Number(p.discount_value);
  }

  if (!Number.isFinite(discount) || discount < 0) discount = 0;
  if (discount > cart_total) discount = cart_total;

  return discount;
}

/* =========================
   ROUTER
========================= */
const api = express.Router();

/* ---------- APPLY PROMO (READ-ONLY, CALC ONLY) ---------- */
api.post('/promotions/apply', async (req, res) => {
  try {
    const user_id = Number(req.body.user_id);
    const cart_total = Number(req.body.cart_total);
    const product_count = Number(req.body.product_count || 0);
    const code = (req.body.code || '').trim().toUpperCase();

    if (!Number.isFinite(user_id) || !Number.isFinite(cart_total)) {
      return res.status(400).json({ message: 'Invalid user_id or cart_total' });
    }

    if (!code) {
      return res.json({
        total_discount: 0,
        final_amount: cart_total,
        applied_promos: []
      });
    }

    const db = getDB();
    const now = nowMysql();

    const [[promo]] = await db.query(
      `
      SELECT p.*, t.code
      FROM promotions p
      JOIN promotion_triggers t ON t.promotion_id = p.id
      WHERE t.code=? AND p.active=1 AND t.active=1
        AND (p.start_date IS NULL OR p.start_date <= ?)
        AND (p.end_date IS NULL OR p.end_date >= ?)
      `,
      [code, now, now]
    );

    if (!promo) {
      return res.status(400).json({ message: 'Invalid coupon' });
    }

    const is_new = await isNewUser(db, user_id);

    const [[{ cnt }]] = await db.query(
      'SELECT COUNT(*) AS cnt FROM user_coupons WHERE user_id=? AND promotion_id=?',
      [user_id, promo.id]
    );

    const reason = validatePromo(promo, cart_total, product_count, is_new, cnt);
    if (reason) {
      return res.status(400).json({ message: reason });
    }

    const discount = computeDiscount(promo, cart_total);

    res.json({
      total_discount: discount,
      final_amount: cart_total - discount,
      applied_promos: [{
        id: promo.id,
        code,
        description: promo.name,
        discount
      }]
    });
  } catch (err) {
    console.error('APPLY PROMO ERROR:', err.message);
    res.status(500).json({ message: 'Promo service error' });
  }
});

/* =========================
   MOUNT + START
========================= */
app.use('/api', api);
app.use('/', api);

const PORT = process.env.PORT || 3006;
app.listen(PORT, () => {
  console.log(`🚀 Promo service running on ${PORT} (READ-ONLY, Step1)`);
});
