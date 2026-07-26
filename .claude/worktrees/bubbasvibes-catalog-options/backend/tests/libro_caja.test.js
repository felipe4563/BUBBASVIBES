const request = require('supertest');
const app = require('../src/app');

describe('Libro Caja API', () => {
  it('GET /api/v1/libro-caja sin token → 401', async () => {
    const res = await request(app).get('/api/v1/libro-caja');
    expect(res.status).toBe(401);
  });
});

const bcrypt = require('bcryptjs');
const {
  Sucursal, Rol, Usuario, Caja, SesionCaja, LibroCaja,
} = require('../src/models');

describe('Libro Caja — aislamiento entre sucursales', () => {
  let sucursalA, sucursalB, usuarioAId, usuarioBId, tokenA, tokenB, cajaAId, cajaBId, sesionAId, sesionBId, movimientoAId;

  beforeAll(async () => {
    sucursalA = await Sucursal.create({ nombre: 'Sucursal LibroCaja Test A' });
    sucursalB = await Sucursal.create({ nombre: 'Sucursal LibroCaja Test B' });

    const rol = await Rol.findOne({ where: { nombre: 'Cajero' } });
    const hash = await bcrypt.hash('clave123', 10);

    const usuarioA = await Usuario.create({ rol_id: rol.id, nombre: 'LibroCaja Test A', email: 'librocaja-a-test@restaurante.com', contrasena: hash });
    await usuarioA.addSucursal(sucursalA);
    usuarioAId = usuarioA.id;

    const usuarioB = await Usuario.create({ rol_id: rol.id, nombre: 'LibroCaja Test B', email: 'librocaja-b-test@restaurante.com', contrasena: hash });
    await usuarioB.addSucursal(sucursalB);
    usuarioBId = usuarioB.id;

    const loginA = await request(app).post('/api/v1/auth/login').send({ email: 'librocaja-a-test@restaurante.com', contrasena: 'clave123' });
    tokenA = loginA.body.datos.token;
    const loginB = await request(app).post('/api/v1/auth/login').send({ email: 'librocaja-b-test@restaurante.com', contrasena: 'clave123' });
    tokenB = loginB.body.datos.token;

    const cajaA = await Caja.create({ sucursal_id: sucursalA.id, nombre: 'Caja LibroCaja Test A' });
    cajaAId = cajaA.id;
    const cajaB = await Caja.create({ sucursal_id: sucursalB.id, nombre: 'Caja LibroCaja Test B' });
    cajaBId = cajaB.id;

    const sesionA = await SesionCaja.create({ usuario_id: usuarioAId, sucursal_id: sucursalA.id, caja_id: cajaAId, monto_apertura: 0 });
    sesionAId = sesionA.id;
    const sesionB = await SesionCaja.create({ usuario_id: usuarioBId, sucursal_id: sucursalB.id, caja_id: cajaBId, monto_apertura: 0 });
    sesionBId = sesionB.id;

    const movimientoA = await request(app)
      .post('/api/v1/libro-caja')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ sesion_caja_id: sesionAId, tipo: 'ingreso', concepto: 'Movimiento A', monto: 50 });
    movimientoAId = movimientoA.body.datos.id;
  });

  afterAll(async () => {
    await LibroCaja.destroy({ where: { sesion_caja_id: [sesionAId, sesionBId] } });
    await SesionCaja.destroy({ where: { id: [sesionAId, sesionBId] } });
    await Caja.destroy({ where: { id: [cajaAId, cajaBId] } });
    await Usuario.destroy({ where: { id: [usuarioAId, usuarioBId] } });
    await Sucursal.destroy({ where: { id: [sucursalA.id, sucursalB.id] } });
  });

  it('un usuario de la sucursal B NO ve los movimientos de la sucursal A al listar sin filtro', async () => {
    const res = await request(app)
      .get('/api/v1/libro-caja')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(200);
    const ids = res.body.datos.map((m) => m.id);
    expect(ids).not.toContain(movimientoAId);
  });

  it('un usuario de la sucursal A sí ve su propio movimiento al listar sin filtro', async () => {
    const res = await request(app)
      .get('/api/v1/libro-caja')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    const ids = res.body.datos.map((m) => m.id);
    expect(ids).toContain(movimientoAId);
  });

  it('un usuario de otra sucursal NO puede listar filtrando por un sesion_caja_id ajeno (404)', async () => {
    const res = await request(app)
      .get('/api/v1/libro-caja')
      .query({ sesion_caja_id: sesionAId })
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(404);
  });

  it('un usuario de otra sucursal NO puede crear un movimiento en una sesión de caja ajena (404)', async () => {
    const res = await request(app)
      .post('/api/v1/libro-caja')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ sesion_caja_id: sesionAId, tipo: 'ingreso', concepto: 'Intento ajeno', monto: 10 });

    expect(res.status).toBe(404);

    const entradas = await LibroCaja.count({ where: { sesion_caja_id: sesionAId } });
    expect(entradas).toBe(1); // solo el movimiento original, no se creó el intruso
  });

  it('POST /api/v1/libro-caja sin sesion_caja_id → 400', async () => {
    const res = await request(app)
      .post('/api/v1/libro-caja')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ tipo: 'ingreso', concepto: 'Sin sesión', monto: 10 });

    expect(res.status).toBe(400);
  });
});
