const request = require('supertest');
const app = require('../src/app');

describe('POST /api/v1/auth/login', () => {
  it('retorna token con credenciales válidas', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@restaurante.com', contrasena: 'admin123' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.datos.token).toBeDefined();
    expect(res.body.datos.usuario.rol).toBe('Administrador');
  });

  it('rechaza credenciales inválidas', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@restaurante.com', contrasena: 'incorrecta' });

    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });

  it('rechaza sin body', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/auth/yo', () => {
  it('rechaza sin token', async () => {
    const res = await request(app).get('/api/v1/auth/yo');
    expect(res.status).toBe(401);
  });

  it('retorna usuario con token válido', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@restaurante.com', contrasena: 'admin123' });

    const token = loginRes.body.datos.token;
    const res = await request(app)
      .get('/api/v1/auth/yo')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.datos.email).toBe('admin@restaurante.com');
    expect(Array.isArray(res.body.datos.permisos)).toBe(true);
  });
});
