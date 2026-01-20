'use strict';

const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const { initDB, getDB } = require('./db');

const app = express();
app.use(express.json());
app.use(cors());

initDB();

/* =========================
   HEALTH
========================= */
app.get('/health', (_, res) => res.status(200).send('OK'));
app.get('/ready', (_, res) => res.status(200).send('READY'));

const api = express.Router();

function log(msg) {
  console.log(`[order-service] ${msg}`);
}

/* =========================
   CREATE ORDER (AUTHORITATIVE)
========================= */
api.post('/orders', async (req, res) => {
  const start = Date.now();
  const { user_id, items, address, coupon_code } = req.body;

  if (!user_id || !Array.isArray(items) || items.length === 0 || !address) {
    log(`invalid_payload user_id=${user_id}`);
    return res.status(400).json({ message: 'Invalid payload' });
  }

  const uid = Number(user_id);
  if (!Number.isFinite(uid) || uid <= 0) {
    log(`invalid_user user_id=${user_id}`);
    return res.status(400).json({ message: 'Invalid user_id' });
  }

  for (const it of items) {
    if (!it.product_id || !it.quantity) {
      log(`invalid_item user_id=${uid}`);
      return res.status(400).json({ message: 'Each item needs product_id and quantity' });
    }
    if (!Number.isFinite(Number(it.quantity)) || Number(it.quantity) <= 0) {
      log(`invalid_quantity user_id=${uid} product_id=${it.product_id}`);
      return res.status(400).json({ message: 'Invalid quantity' });
    }
  }

  const db = getDB();
  const conn = await db.getConnection();

  let total = 0;
  let discount = 0;
  let final_amount = 0;
  let applied_promos = [];
  let promoId = null;

  try {
    await conn.beginTransaction();

    /* ---------- USER ---------- */
    const [[user]] = await conn.query(
      `SELECT id, name, email FROM users WHERE id=?`,
      [uid]
    );

    if (!user) {
      throw new Error('User not found');
    }

    /* ---------- PRODUCTS ---------- */
    const productIds = items.map(i => Number(i.product_id));
    const [products] = await conn.query(
      `SELECT id, price FROM products WHERE id IN (${productIds.map(() => '?').join(',')})`,
      productIds
    );

    if (products.length !== productIds.length) {
      throw new Error('Product lookup mismatch');
    }

    const priceMap = new Map(products.map(p => [p.id, p.price]));

    for (const it of items) {
      total += priceMap.get(Number(it.product_id)) * Number(it.quantity);
    }

    /* ---------- PROMO (STRICT) ---------- */
    const code = (coupon_code || '').trim().toUpperCase();
    if (code) {
      let promoRes;
      try {
        promoRes = await axios.post(
          'http://promo-service:3006/api/promotions/apply',
          {
            user_id: uid,
            cart_total: total,
            product_count: items.length,
            code
          },
          { timeout: 500 }
        );
      } catch (e) {
        log(`promo_service_error user_id=${uid} code=${code}`);
        throw new Error('Promo validation failed');
      }

      discount = Number(promoRes.data.total_discount || 0);
      applied_promos = promoRes.data.applied_promos || [];

      if (applied_promos.length > 0) {
        promoId = applied_promos[0].id;
        await conn.query(
          `INSERT INTO user_coupons (user_id, promotion_id) VALUES (?, ?)`,
          [uid, promoId]
        );
      }
    }

    final_amount = total - discount;
    if (final_amount < 0) final_amount = 0;

    /* ---------- ORDER ---------- */
    const [orderResult] = await conn.query(
      `
      INSERT INTO orders (user_id, total, discount, final_amount, address, status)
      VALUES (?, ?, ?, ?, ?, 'PLACED')
      `,
      [uid, total, discount, final_amount, address]
    );

    const orderId = orderResult.insertId;

    for (const it of items) {
      await conn.query(
        `
        INSERT INTO order_items (order_id, product_id, quantity, price)
        VALUES (?, ?, ?, ?)
        `,
        [
          orderId,
          Number(it.product_id),
          Number(it.quantity),
          priceMap.get(Number(it.product_id))
        ]
      );
    }

    if (promoId) {
      await conn.query(
        `
        UPDATE user_coupons
        SET order_id=?
        WHERE user_id=? AND promotion_id=?
        `,
        [orderId, uid, promoId]
      );
    }

    await conn.commit();

    log(
      `order_created order_id=${orderId} user_id=${uid} total=${total} discount=${discount} time_ms=${Date.now() - start}`
    );

    return res.json({
      message: 'Order placed',
      order_id: orderId,
      total,
      discount,
      final_amount,
      applied_promos,
      user
    });

  } catch (err) {
    await conn.rollback();

    if (err.code === 'ER_DUP_ENTRY') {
      log(`promo_duplicate user_id=${uid}`);
      return res.status(400).json({ message: 'Promo already used' });
    }

    log(`order_failed user_id=${uid} error=${err.message}`);
    return res.status(400).json({ message: err.message });

  } finally {
    conn.release();
  }
});

/* =========================
   READ ORDERS
========================= */
api.get('/orders', async (req, res) => {
  const uid = Number(req.query.user_id);
  if (!Number.isFinite(uid)) {
    log(`invalid_orders_query user_id=${req.query.user_id}`);
    return res.status(400).json({ message: 'user_id required' });
  }

  const db = getDB();
  const [orders] = await db.query(
    'SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC',
    [uid]
  );

  res.json(orders);
});

app.use('/api', api);
app.use('/', api);

app.listen(process.env.PORT || 3004, () =>
  console.log(`🚀 Order service running on ${process.env.PORT || 3004} (FINAL FINAL)`)
);
