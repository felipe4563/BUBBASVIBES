const request = require('supertest');
const app = require('../src/app');

let adminToken;

beforeAll(async () => {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@restaurante.com', contrasena: 'admin123' });
  adminToken = res.body.datos.token;
});

describe('GET /api/v1/roles', () => {
  it('retorna lista de roles para admin', async () => {
    const res = await request(app)
      .get('/api/v1/roles')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.datos.length).toBeGreaterThanOrEqual(3);
  });

  it('rechaza sin token', async () => {
    const res = await request(app).get('/api/v1/roles');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/roles/permisos', () => {
  it('retorna permisos agrupados por módulo', async () => {
    const res = await request(app)
      .get('/api/v1/roles/permisos')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.datos).toHaveProperty('ventas');
    expect(res.body.datos).toHaveProperty('caja');
  });
});
