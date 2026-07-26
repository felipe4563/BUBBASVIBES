const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const { Usuario, Rol, Sucursal } = require('../src/models');

let sucursalB;
let usuarioMultiId;
let usuarioTodasId;

beforeAll(async () => {
  const rol = await Rol.findOne({ where: { nombre: 'Mozo' } });
  const principal = await Sucursal.findOne({ where: { nombre: 'Sucursal Principal' } });
  sucursalB = await Sucursal.create({ nombre: 'Sucursal Test B' });

  const hash = await bcrypt.hash('clave123', 10);

  const multi = await Usuario.create({
    rol_id: rol.id, nombre: 'Multi Sucursal', email: 'multi-sucursal-test@restaurante.com', contrasena: hash,
  });
  await multi.addSucursales([principal, sucursalB]);
  usuarioMultiId = multi.id;

  const todas = await Usuario.create({
    rol_id: rol.id, nombre: 'Acceso Todas', email: 'acceso-todas-test@restaurante.com', contrasena: hash,
    acceso_todas_sucursales: 1,
  });
  usuarioTodasId = todas.id;
});

afterAll(async () => {
  await Usuario.destroy({ where: { id: [usuarioMultiId, usuarioTodasId] } });
  await Sucursal.destroy({ where: { id: sucursalB.id } });
});

describe('Login con múltiples sucursales', () => {
  it('usuario con varias sucursales recibe requiere_sucursal y pre_token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'multi-sucursal-test@restaurante.com', contrasena: 'clave123' });

    expect(res.status).toBe(200);
    expect(res.body.datos.requiere_sucursal).toBe(true);
    expect(res.body.datos.pre_token).toBeDefined();
    expect(res.body.datos.sucursales).toHaveLength(2);
    expect(res.body.datos.token).toBeUndefined();
  });

  it('completa el login eligiendo una sucursal válida', async () => {
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'multi-sucursal-test@restaurante.com', contrasena: 'clave123' });
    const { pre_token, sucursales } = login.body.datos;

    const res = await request(app)
      .post('/api/v1/auth/login/sucursal')
      .send({ pre_token, sucursal_id: sucursales[0].id });

    expect(res.status).toBe(200);
    expect(res.body.datos.token).toBeDefined();
    expect(res.body.datos.usuario.sucursal_activa.id).toBe(sucursales[0].id);
  });

  it('rechaza una sucursal que no le pertenece al usuario', async () => {
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'multi-sucursal-test@restaurante.com', contrasena: 'clave123' });

    const otraSucursal = await Sucursal.create({ nombre: 'Sucursal Ajena Test' });
    const res = await request(app)
      .post('/api/v1/auth/login/sucursal')
      .send({ pre_token: login.body.datos.pre_token, sucursal_id: otraSucursal.id });

    expect(res.status).toBe(403);
    await Sucursal.destroy({ where: { id: otraSucursal.id } });
  });

  it('usuario con acceso_todas_sucursales puede elegir "Todas las sucursales"', async () => {
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'acceso-todas-test@restaurante.com', contrasena: 'clave123' });

    expect(login.body.datos.sucursales[0]).toEqual({ id: null, nombre: 'Todas las sucursales' });

    const res = await request(app)
      .post('/api/v1/auth/login/sucursal')
      .send({ pre_token: login.body.datos.pre_token, sucursal_id: null });

    expect(res.status).toBe(200);
    expect(res.body.datos.usuario.sucursal_activa).toEqual({ id: null, nombre: 'Todas las sucursales' });

    const yo = await request(app)
      .get('/api/v1/auth/yo')
      .set('Authorization', `Bearer ${res.body.datos.token}`);
    expect(yo.body.datos.sucursal_id).toBeNull();
    expect(yo.body.datos.acceso_todas).toBe(true);
  });

  it('rechaza el pre_token como token de acceso en una ruta protegida', async () => {
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'multi-sucursal-test@restaurante.com', contrasena: 'clave123' });
    const { pre_token } = login.body.datos;

    const res = await request(app)
      .get('/api/v1/auth/yo')
      .set('Authorization', `Bearer ${pre_token}`);

    expect(res.status).toBe(401);
  });

  it('el refresh conserva la sucursal_id elegida en el login de dos pasos', async () => {
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'multi-sucursal-test@restaurante.com', contrasena: 'clave123' });
    const { pre_token, sucursales } = login.body.datos;

    const elegida = sucursales[0];
    const conSucursal = await request(app)
      .post('/api/v1/auth/login/sucursal')
      .send({ pre_token, sucursal_id: elegida.id });

    const { refresh_token } = conSucursal.body.datos;

    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refresh_token });

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.datos.token).toBeDefined();

    const yo = await request(app)
      .get('/api/v1/auth/yo')
      .set('Authorization', `Bearer ${refreshRes.body.datos.token}`);

    expect(yo.body.datos.sucursal_id).toBe(elegida.id);
  });
});

describe('Login con una sola sucursal (compatibilidad)', () => {
  it('admin sigue logueando directo, sin paso de sucursal', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@restaurante.com', contrasena: process.env.ADMIN_PASSWORD || 'admin123' });

    expect(res.status).toBe(200);
    expect(res.body.datos.token).toBeDefined();
    expect(res.body.datos.usuario.sucursal_activa.nombre).toBe('Sucursal Principal');

    const yo = await request(app)
      .get('/api/v1/auth/yo')
      .set('Authorization', `Bearer ${res.body.datos.token}`);
    expect(yo.body.datos.acceso_todas).toBe(false);
    expect(typeof yo.body.datos.sucursal_id).toBe('number');
  });
});
