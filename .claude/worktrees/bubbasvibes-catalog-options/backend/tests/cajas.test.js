const request = require('supertest');
const app = require('../src/app');
const { Sucursal, Caja, SesionCaja, Usuario, Rol } = require('../src/models');
const bcrypt = require('bcryptjs');

describe('Cajas API', () => {
  it('GET /api/v1/cajas sin token → 401', async () => {
    const res = await request(app).get('/api/v1/cajas');
    expect(res.status).toBe(401);
  });
});

describe('Cajas CRUD', () => {
  let adminToken, sucursalTest;

  beforeAll(async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'admin@restaurante.com', contrasena: process.env.ADMIN_PASSWORD || 'admin123' });
    adminToken = login.body.datos.token;
    sucursalTest = await Sucursal.create({ nombre: 'Sucursal Cajas Test' });
  });

  afterAll(async () => {
    await Caja.destroy({ where: { sucursal_id: sucursalTest.id } });
    await Sucursal.destroy({ where: { id: sucursalTest.id } });
  });

  it('crea una caja para una sucursal', async () => {
    const res = await request(app)
      .post('/api/v1/cajas')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sucursal_id: sucursalTest.id, nombre: 'Caja Test 1' });
    expect(res.status).toBe(201);
    expect(res.body.datos.nombre).toBe('Caja Test 1');
    expect(res.body.datos.sucursal_id).toBe(sucursalTest.id);
  });

  it('rechaza crear una caja con sucursal_id inexistente', async () => {
    const res = await request(app)
      .post('/api/v1/cajas')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sucursal_id: 999999, nombre: 'Caja Fantasma' });
    expect(res.status).toBe(404);
  });

  it('lista cajas filtradas por sucursal', async () => {
    const res = await request(app)
      .get('/api/v1/cajas')
      .query({ sucursal_id: sucursalTest.id })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.datos.length).toBeGreaterThan(0);
    expect(res.body.datos.every(c => c.sucursal_id === sucursalTest.id)).toBe(true);
  });

  it('edita el nombre y estado de una caja', async () => {
    const caja = await Caja.create({ sucursal_id: sucursalTest.id, nombre: 'Caja Editar Test' });
    const res = await request(app)
      .put(`/api/v1/cajas/${caja.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'Caja Editada Test', activo: 0 });
    expect(res.status).toBe(200);
    expect(res.body.datos.nombre).toBe('Caja Editada Test');
    expect(res.body.datos.activo).toBe(0);
  });

  it('bloquea eliminar una caja con sesiones asociadas', async () => {
    const caja = await Caja.create({ sucursal_id: sucursalTest.id, nombre: 'Caja Con Sesion Test' });
    const rol = await Rol.findOne({ where: { nombre: 'Cajero' } });
    const hash = await bcrypt.hash('clave123', 10);
    const usuario = await Usuario.create({ rol_id: rol.id, nombre: 'Cajas Test User', email: 'cajas-test-user@restaurante.com', contrasena: hash });
    const sesion = await SesionCaja.create({ usuario_id: usuario.id, sucursal_id: sucursalTest.id, caja_id: caja.id, monto_apertura: 0 });

    const res = await request(app)
      .delete(`/api/v1/cajas/${caja.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(409);

    await SesionCaja.destroy({ where: { id: sesion.id } });
    await Usuario.destroy({ where: { id: usuario.id } });
  });

  it('elimina una caja sin sesiones asociadas', async () => {
    const caja = await Caja.create({ sucursal_id: sucursalTest.id, nombre: 'Caja Sin Sesion Test' });
    const res = await request(app)
      .delete(`/api/v1/cajas/${caja.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const buscar = await Caja.findByPk(caja.id);
    expect(buscar).toBeNull();
  });
});
