const request = require('supertest');
const app = require('../src/app');

describe('Configuración API', () => {
  it('GET /api/v1/configuracion sin token → 401', async () => {
    const res = await request(app).get('/api/v1/configuracion');
    expect(res.status).toBe(401);
  });
});
