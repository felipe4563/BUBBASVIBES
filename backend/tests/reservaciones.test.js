const request = require('supertest');
const app = require('../src/app');

describe('Reservaciones API', () => {
  it('GET /api/v1/reservaciones sin token → 401', async () => {
    const res = await request(app).get('/api/v1/reservaciones');
    expect(res.status).toBe(401);
  });
});
