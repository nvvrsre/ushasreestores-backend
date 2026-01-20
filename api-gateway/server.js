const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

/**
 * ❗ IMPORTANT
 * DO NOT use express.json() before proxies
 */

// ======================
// AUTH (FIXED)
// ======================
app.use('/api/auth',
  createProxyMiddleware({
    target: 'http://auth-service:3001',
    changeOrigin: true,
    pathRewrite: { '^/api/auth': '/api' } // ✅ CRITICAL FIX
  })
);

// ======================
// PRODUCTS
// ======================
app.use('/api/products',
  createProxyMiddleware({
    target: 'http://product-service:3002',
    changeOrigin: true,
    pathRewrite: { '^/api/products': '/products' }
  })
);

// ======================
// CART
// ======================
app.use('/api/cart',
  createProxyMiddleware({
    target: 'http://cart-service:3003',
    changeOrigin: true,
    pathRewrite: { '^/api/cart': '/cart' }
  })
);

// ======================
// ORDERS
// ======================
app.use('/api/orders',
  createProxyMiddleware({
    target: 'http://order-service:3004',
    changeOrigin: true,
    pathRewrite: { '^/api/orders': '/orders' }
  })
);

// ======================
// PAYMENT
// ======================
app.use('/api/payment',
  createProxyMiddleware({
    target: 'http://payment-service:3005',
    changeOrigin: true,
    pathRewrite: { '^/api/payment': '/payment' }
  })
);

// ======================
// PROMOTIONS
// ======================
app.use('/api/promotions',
  createProxyMiddleware({
    target: 'http://promo-service:3006',
    changeOrigin: true,
    pathRewrite: { '^/api/promotions': '/promotions' }
  })
);

// ======================
// CATEGORIES
// ======================
app.use('/api/categories',
  createProxyMiddleware({
    target: 'http://catalog-service:3008',
    changeOrigin: true,
    pathRewrite: { '^/api/categories': '/categories' }
  })
);

// ======================
// HEALTH
// ======================
app.get('/health', (_, res) => res.status(200).send('OK'));

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
});
