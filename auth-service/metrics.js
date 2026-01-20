'use strict';

const client = require('prom-client');

// Default Node.js & process metrics
client.collectDefaultMetrics();

const httpRequestDuration = new client.Histogram({
  name: 'auth_http_request_duration_seconds',
  help: 'Auth service HTTP request latency',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 1, 2, 5]
});

const dbQueryDuration = new client.Histogram({
  name: 'auth_db_query_duration_seconds',
  help: 'Auth service DB query latency',
  labelNames: ['operation'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2]
});

module.exports = {
  client,
  httpRequestDuration,
  dbQueryDuration
};
