const request = require('supertest');
const app = require('../src/app');

describe('Clientes API', () => {
  it('GET /api/v1/clientes sin token → 401', async () => {
    const res = await request(app).get('/api/v1/clientes');
    expect(res.status).toBe(401);
  });
});
