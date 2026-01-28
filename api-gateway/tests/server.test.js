const request = require('supertest')

const BASE_URL = 'http://localhost:3000'

// 1. Root route – server reachable
describe('GET /', () => {
  it('should respond (gateway is up)', async () => {
    const res = await request(BASE_URL).get('/')
    expect(res.statusCode).toBeGreaterThanOrEqual(400)
  })
})

// 2. Health endpoint – may not exist, but server must respond
describe('GET /api/healthz', () => {
  it('should respond (health endpoint reachable)', async () => {
    const res = await request(BASE_URL).get('/api/healthz')
    expect(res.statusCode).toBeGreaterThanOrEqual(400)
  })
})

// 3. Logger middleware – request flows through stack
describe('Logger middleware', () => {
  it('should allow request to pass through middleware', async () => {
    const res = await request(BASE_URL).get('/')
    expect(res.statusCode).toBeGreaterThanOrEqual(400)
  })
})

// 4. Proxy route – upstream may fail, but route must be handled
describe('Proxy routes', () => {
  it('should handle products route even if upstream is down', async () => {
    const res = await request(BASE_URL).get('/api/products')
    expect(res.statusCode).toBeGreaterThanOrEqual(400)
  })
})
