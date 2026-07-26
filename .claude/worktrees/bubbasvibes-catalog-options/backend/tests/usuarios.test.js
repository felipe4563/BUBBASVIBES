const request = require('supertest');
const app = require('../src/app');

describe('Usuarios API', () => {
  it('GET /api/v1/usuarios sin token → 401', async () => {
    const res = await request(app).get('/api/v1/usuarios');
    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });
});

const bcrypt = require('bcryptjs');
const { Usuario, Rol, Sucursal } = require('../src/models');

describe('PUT /api/v1/usuarios/:id/sucursales', () => {
  let adminToken;
  let usuarioId;
  let sucursalId;
  let sucursalId2;

  beforeAll(async () => {
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@restaurante.com', contrasena: process.env.ADMIN_PASSWORD || 'admin123' });
    adminToken = login.body.datos.token;

    const rol = await Rol.findOne({ where: { nombre: 'Mozo' } });
    const hash = await bcrypt.hash('clave123', 10);
    const usuario = await Usuario.create({
      rol_id: rol.id, nombre: 'Asignar Sucursal Test', email: 'asignar-sucursal-test@restaurante.com', contrasena: hash,
    });
    usuarioId = usuario.id;

    const sucursal = await Sucursal.create({ nombre: 'Sucursal Asignacion Test' });
    sucursalId = sucursal.id;

    const sucursal2 = await Sucursal.create({ nombre: 'Sucursal Asignacion Test 2' });
    sucursalId2 = sucursal2.id;
  });

  afterAll(async () => {
    await Usuario.destroy({ where: { id: usuarioId } });
    await Sucursal.destroy({ where: { id: sucursalId } });
    await Sucursal.destroy({ where: { id: sucursalId2 } });
  });

  it('asigna sucursales y refleja el cambio al obtener el usuario', async () => {
    const res = await request(app)
      .put(`/api/v1/usuarios/${usuarioId}/sucursales`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sucursal_ids: [sucursalId], acceso_todas_sucursales: false });

    expect(res.status).toBe(200);
    expect(res.body.datos.sucursales).toHaveLength(1);
    expect(res.body.datos.sucursales[0].id).toBe(sucursalId);
    expect(res.body.datos.acceso_todas_sucursales).toBe(0);
  });

  it('activa acceso_todas_sucursales y limpia las asignaciones puntuales', async () => {
    const res = await request(app)
      .put(`/api/v1/usuarios/${usuarioId}/sucursales`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sucursal_ids: [], acceso_todas_sucursales: true });

    expect(res.status).toBe(200);
    expect(res.body.datos.sucursales).toHaveLength(0);
    expect(res.body.datos.acceso_todas_sucursales).toBe(1);
  });

  it('reemplaza (no acumula) una asignacion previa de multiples sucursales', async () => {
    const primero = await request(app)
      .put(`/api/v1/usuarios/${usuarioId}/sucursales`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sucursal_ids: [sucursalId, sucursalId2], acceso_todas_sucursales: false });

    expect(primero.status).toBe(200);
    expect(primero.body.datos.sucursales).toHaveLength(2);

    const res = await request(app)
      .put(`/api/v1/usuarios/${usuarioId}/sucursales`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sucursal_ids: [sucursalId2], acceso_todas_sucursales: false });

    expect(res.status).toBe(200);
    expect(res.body.datos.sucursales).toHaveLength(1);
    expect(res.body.datos.sucursales[0].id).toBe(sucursalId2);
  });
});
