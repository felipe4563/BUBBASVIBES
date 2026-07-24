const request = require('supertest');
const app = require('../src/app');

describe('Mesas API', () => {
  it('GET /api/v1/mesas sin token → 401', async () => {
    const res = await request(app).get('/api/v1/mesas');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/areas sin token → 401', async () => {
    const res = await request(app).get('/api/v1/areas');
    expect(res.status).toBe(401);
  });
});

const { Area, Sucursal } = require('../src/models');

describe('Mesas y áreas por sucursal', () => {
  let adminToken, sucursalOtra;

  beforeAll(async () => {
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@restaurante.com', contrasena: process.env.ADMIN_PASSWORD || 'admin123' });
    adminToken = login.body.datos.token;
    sucursalOtra = await Sucursal.create({ nombre: 'Sucursal Mesas Test' });
  });

  afterAll(async () => {
    await Area.destroy({ where: { sucursal_id: sucursalOtra.id } });
    await Sucursal.destroy({ where: { id: sucursalOtra.id } });
  });

  it('crea un área usando la sucursal del usuario autenticado, ignorando sucursal_id del body', async () => {
    const res = await request(app)
      .post('/api/v1/areas')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'Area Test Sucursal', sucursal_id: sucursalOtra.id });

    expect(res.status).toBe(201);
    expect(res.body.datos.sucursal_id).not.toBe(sucursalOtra.id);

    await Area.destroy({ where: { id: res.body.datos.id } });
  });

  it('lista solo las áreas de la sucursal activa del usuario', async () => {
    const area = await Area.create({ nombre: 'Area Otra Sucursal Test', sucursal_id: sucursalOtra.id });

    const res = await request(app)
      .get('/api/v1/areas')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.datos.find(a => a.id === area.id)).toBeUndefined();

    await area.destroy();
  });
});
