const request = require('supertest');
const app = require('../src/app');
const { SesionCaja, Caja, Sucursal, Usuario, Rol } = require('../src/models');
const bcrypt = require('bcryptjs');

describe('Caja API', () => {
  it('GET /api/v1/caja/estado sin token → 401', async () => {
    const res = await request(app).get('/api/v1/caja/estado');
    expect(res.status).toBe(401);
  });
});

describe('Caja — apertura por caja física', () => {
  let sucursalPropia, sucursalAjena, cajaPropia, cajaAjena, usuarioId, token;

  beforeAll(async () => {
    sucursalPropia = await Sucursal.create({ nombre: 'Sucursal Caja Fisica Propia Test' });
    sucursalAjena = await Sucursal.create({ nombre: 'Sucursal Caja Fisica Ajena Test' });
    cajaPropia = await Caja.create({ sucursal_id: sucursalPropia.id, nombre: 'Caja 1 Test' });
    cajaAjena = await Caja.create({ sucursal_id: sucursalAjena.id, nombre: 'Caja Ajena Test' });

    const rol = await Rol.findOne({ where: { nombre: 'Cajero' } });
    const hash = await bcrypt.hash('clave123', 10);
    const usuario = await Usuario.create({ rol_id: rol.id, nombre: 'Caja Fisica Test', email: 'caja-fisica-test@restaurante.com', contrasena: hash });
    await usuario.addSucursal(sucursalPropia);
    usuarioId = usuario.id;

    const login = await request(app).post('/api/v1/auth/login').send({ email: 'caja-fisica-test@restaurante.com', contrasena: 'clave123' });
    token = login.body.datos.token;
  });

  afterAll(async () => {
    await SesionCaja.destroy({ where: { usuario_id: usuarioId } });
    await Usuario.destroy({ where: { id: usuarioId } });
    await Caja.destroy({ where: { id: [cajaPropia.id, cajaAjena.id] } });
    await Sucursal.destroy({ where: { id: [sucursalPropia.id, sucursalAjena.id] } });
  });

  it('sin caja_id → 400', async () => {
    const res = await request(app)
      .post('/api/v1/caja/abrir')
      .set('Authorization', `Bearer ${token}`)
      .send({ monto_apertura: 100 });
    expect(res.status).toBe(400);
  });

  it('con caja_id inexistente → 404', async () => {
    const res = await request(app)
      .post('/api/v1/caja/abrir')
      .set('Authorization', `Bearer ${token}`)
      .send({ caja_id: 999999, monto_apertura: 100 });
    expect(res.status).toBe(404);
  });

  it('no puede abrir una caja de otra sucursal', async () => {
    const res = await request(app)
      .post('/api/v1/caja/abrir')
      .set('Authorization', `Bearer ${token}`)
      .send({ caja_id: cajaAjena.id, monto_apertura: 100 });
    expect(res.status).toBe(404);
  });

  it('abre su propia caja correctamente', async () => {
    const res = await request(app)
      .post('/api/v1/caja/abrir')
      .set('Authorization', `Bearer ${token}`)
      .send({ caja_id: cajaPropia.id, monto_apertura: 100 });
    expect(res.status).toBe(201);
    expect(res.body.datos.caja_id).toBe(cajaPropia.id);
    expect(res.body.datos.sucursal_id).toBe(sucursalPropia.id);
  });

  it('no se puede volver a abrir la misma caja mientras sigue abierta (aunque sea otro usuario)', async () => {
    const rol = await Rol.findOne({ where: { nombre: 'Cajero' } });
    const hash = await bcrypt.hash('clave123', 10);
    const otroUsuario = await Usuario.create({ rol_id: rol.id, nombre: 'Caja Fisica Otro Test', email: 'caja-fisica-otro-test@restaurante.com', contrasena: hash });
    await otroUsuario.addSucursal(sucursalPropia);
    const loginOtro = await request(app).post('/api/v1/auth/login').send({ email: 'caja-fisica-otro-test@restaurante.com', contrasena: 'clave123' });

    const res = await request(app)
      .post('/api/v1/caja/abrir')
      .set('Authorization', `Bearer ${loginOtro.body.datos.token}`)
      .send({ caja_id: cajaPropia.id, monto_apertura: 50 });
    expect(res.status).toBe(409);

    await Usuario.destroy({ where: { id: otroUsuario.id } });
  });

  it('otro usuario de la misma sucursal no puede registrar gastos en una sesión que no abrió (403)', async () => {
    const rol = await Rol.findOne({ where: { nombre: 'Cajero' } });
    const hash = await bcrypt.hash('clave123', 10);
    const otroUsuario = await Usuario.create({ rol_id: rol.id, nombre: 'Caja Fisica Gasto Otro Test', email: 'caja-fisica-gasto-otro-test@restaurante.com', contrasena: hash });
    await otroUsuario.addSucursal(sucursalPropia);
    const loginOtro = await request(app).post('/api/v1/auth/login').send({ email: 'caja-fisica-gasto-otro-test@restaurante.com', contrasena: 'clave123' });

    const sesionPropia = await SesionCaja.findOne({ where: { caja_id: cajaPropia.id, estado: 'abierta' } });

    try {
      const res = await request(app)
        .post(`/api/v1/caja/${sesionPropia.id}/gastos`)
        .set('Authorization', `Bearer ${loginOtro.body.datos.token}`)
        .send({ descripcion: 'Gasto no autorizado', monto: 10 });
      expect(res.status).toBe(403);
    } finally {
      await Usuario.destroy({ where: { id: otroUsuario.id } });
    }
  });

  it('GET /caja/estado devuelve la caja con su sesión abierta', async () => {
    const res = await request(app)
      .get('/api/v1/caja/estado')
      .query({ sucursal_id: sucursalPropia.id })
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const propia = res.body.datos.find(c => c.id === cajaPropia.id);
    expect(propia.sesion_abierta).not.toBeNull();
    expect(propia.sesion_abierta.usuario_id).toBe(usuarioId);
  });
});

describe('Caja — acceso a todas las sucursales', () => {
  let sucursalX, cajaX, usuarioTodasId, tokenTodas;

  beforeAll(async () => {
    sucursalX = await Sucursal.create({ nombre: 'Sucursal Caja Todas X Test' });
    cajaX = await Caja.create({ sucursal_id: sucursalX.id, nombre: 'Caja Todas X Test' });

    const rol = await Rol.findOne({ where: { nombre: 'Administrador' } });
    const hash = await bcrypt.hash('clave123', 10);
    const todas = await Usuario.create({
      rol_id: rol.id, nombre: 'Caja Acceso Todas Fisica Test', email: 'caja-todas-fisica-test@restaurante.com',
      contrasena: hash, acceso_todas_sucursales: 1,
    });
    usuarioTodasId = todas.id;
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'caja-todas-fisica-test@restaurante.com', contrasena: 'clave123' });
    const elegido = await request(app).post('/api/v1/auth/login/sucursal').send({ pre_token: login.body.datos.pre_token, sucursal_id: null });
    tokenTodas = elegido.body.datos.token;
  });

  afterAll(async () => {
    await SesionCaja.destroy({ where: { usuario_id: usuarioTodasId } });
    await Usuario.destroy({ where: { id: usuarioTodasId } });
    await Caja.destroy({ where: { id: cajaX.id } });
    await Sucursal.destroy({ where: { id: sucursalX.id } });
  });

  it('acceso-todas sin sucursal_id → 400 en /caja/estado', async () => {
    const res = await request(app)
      .get('/api/v1/caja/estado')
      .set('Authorization', `Bearer ${tokenTodas}`);
    expect(res.status).toBe(400);
  });

  it('acceso-todas puede ver el estado de cualquier sucursal', async () => {
    const res = await request(app)
      .get('/api/v1/caja/estado')
      .query({ sucursal_id: sucursalX.id })
      .set('Authorization', `Bearer ${tokenTodas}`);
    expect(res.status).toBe(200);
    expect(res.body.datos.some(c => c.id === cajaX.id)).toBe(true);
  });

  it('acceso-todas puede abrir cualquier caja de cualquier sucursal', async () => {
    const res = await request(app)
      .post('/api/v1/caja/abrir')
      .set('Authorization', `Bearer ${tokenTodas}`)
      .send({ caja_id: cajaX.id, monto_apertura: 100 });
    expect(res.status).toBe(201);
    expect(res.body.datos.caja_id).toBe(cajaX.id);
  });
});

describe('Caja — cierre de sesión', () => {
  let sucursal, caja, usuarioId, token;

  beforeAll(async () => {
    sucursal = await Sucursal.create({ nombre: 'Sucursal Cierre Caja Test' });
    caja = await Caja.create({ sucursal_id: sucursal.id, nombre: 'Caja Cierre Test' });

    const rol = await Rol.findOne({ where: { nombre: 'Cajero' } });
    const hash = await bcrypt.hash('clave123', 10);
    const usuario = await Usuario.create({ rol_id: rol.id, nombre: 'Cierre Caja Test', email: 'cierre-caja-test@restaurante.com', contrasena: hash });
    await usuario.addSucursal(sucursal);
    usuarioId = usuario.id;

    const login = await request(app).post('/api/v1/auth/login').send({ email: 'cierre-caja-test@restaurante.com', contrasena: 'clave123' });
    token = login.body.datos.token;
  });

  afterAll(async () => {
    await SesionCaja.destroy({ where: { usuario_id: usuarioId } });
    await Usuario.destroy({ where: { id: usuarioId } });
    await Caja.destroy({ where: { id: caja.id } });
    await Sucursal.destroy({ where: { id: sucursal.id } });
  });

  async function abrirNuevaSesion() {
    const abrir = await request(app)
      .post('/api/v1/caja/abrir')
      .set('Authorization', `Bearer ${token}`)
      .send({ caja_id: caja.id, monto_apertura: 100 });
    return abrir.body.datos.id;
  }

  it('cierra con conteo detallado por denominación', async () => {
    const sesionId = await abrirNuevaSesion();
    const res = await request(app)
      .post(`/api/v1/caja/${sesionId}/cerrar`)
      .set('Authorization', `Bearer ${token}`)
      .send({ denominaciones: [{ denominacion: 100, cantidad: 1 }] });
    expect(res.status).toBe(200);
    expect(parseFloat(res.body.datos.monto_cierre)).toBe(100);
    expect(res.body.datos.estado).toBe('cerrada');
  });

  it('cierra con un monto total anotado directamente (sin denominaciones)', async () => {
    const sesionId = await abrirNuevaSesion();
    const res = await request(app)
      .post(`/api/v1/caja/${sesionId}/cerrar`)
      .set('Authorization', `Bearer ${token}`)
      .send({ monto_cierre: 137.50 });
    expect(res.status).toBe(200);
    expect(parseFloat(res.body.datos.monto_cierre)).toBe(137.50);
    expect(res.body.datos.estado).toBe('cerrada');
  });

  it('sin denominaciones ni monto_cierre → 400', async () => {
    const sesionId = await abrirNuevaSesion();
    const res = await request(app)
      .post(`/api/v1/caja/${sesionId}/cerrar`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });
});
