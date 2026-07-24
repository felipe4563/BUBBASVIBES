const request = require('supertest');
const app = require('../src/app');

let adminToken;

beforeAll(async () => {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@restaurante.com', contrasena: process.env.ADMIN_PASSWORD || 'admin123' });
  adminToken = res.body.datos.token;
});

describe('Sucursales API', () => {
  it('rechaza sin token', async () => {
    const res = await request(app).get('/api/v1/sucursales');
    expect(res.status).toBe(401);
  });

  it('lista sucursales para admin (incluye la Sucursal Principal del seed)', async () => {
    const res = await request(app)
      .get('/api/v1/sucursales')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.datos.some(s => s.nombre === 'Sucursal Principal')).toBe(true);
  });

  it('crea, edita y elimina una sucursal', async () => {
    const crear = await request(app)
      .post('/api/v1/sucursales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'Sucursal CRUD Test', direccion: 'Av. Siempre Viva 123', telefono: '70000000' });
    expect(crear.status).toBe(201);
    expect(crear.body.datos.nombre).toBe('Sucursal CRUD Test');
    const id = crear.body.datos.id;

    const editar = await request(app)
      .put(`/api/v1/sucursales/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'Sucursal CRUD Test Editada' });
    expect(editar.status).toBe(200);
    expect(editar.body.datos.nombre).toBe('Sucursal CRUD Test Editada');

    const eliminar = await request(app)
      .delete(`/api/v1/sucursales/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(eliminar.status).toBe(200);
  });

  it('rechaza crear sin nombre', async () => {
    const res = await request(app)
      .post('/api/v1/sucursales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ direccion: 'Sin nombre' });
    expect(res.status).toBe(400);
  });

  it('GET /sucursales/publico no requiere token y devuelve solo id+nombre', async () => {
    const crear = await request(app)
      .post('/api/v1/sucursales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'Sucursal Publica Test', direccion: 'Dir', telefono: '70000000' });
    const id = crear.body.datos.id;

    const res = await request(app).get('/api/v1/sucursales/publico');
    expect(res.status).toBe(200);

    const encontrada = res.body.datos.find((s) => s.id === id);
    expect(encontrada).toBeDefined();
    expect(Object.keys(encontrada).sort()).toEqual(['id', 'nombre']);

    await request(app).delete(`/api/v1/sucursales/${id}`).set('Authorization', `Bearer ${adminToken}`);
  });

  it('GET /sucursales/publico no incluye sucursales inactivas', async () => {
    const crear = await request(app)
      .post('/api/v1/sucursales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'Sucursal Publica Inactiva Test', direccion: 'Dir', telefono: '70000000', activo: 0 });
    const id = crear.body.datos.id;

    const res = await request(app).get('/api/v1/sucursales/publico');
    expect(res.status).toBe(200);
    expect(res.body.datos.some((s) => s.id === id)).toBe(false);

    await request(app).delete(`/api/v1/sucursales/${id}`).set('Authorization', `Bearer ${adminToken}`);
  });
});
