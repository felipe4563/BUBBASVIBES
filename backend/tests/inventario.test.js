const request = require('supertest');
const app = require('../src/app');

describe('Inventario API', () => {
  it('GET /api/v1/inventario sin token → 401', async () => {
    const res = await request(app).get('/api/v1/inventario');
    expect(res.status).toBe(401);
  });
});

const bcrypt = require('bcryptjs');
const { Sucursal, Categoria, Producto, ProductoStockSucursal, Usuario, Rol, RegistroInventario } = require('../src/models');

describe('Inventario manual por sucursal', () => {
  let adminToken, producto;

  beforeAll(async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'admin@restaurante.com', contrasena: process.env.ADMIN_PASSWORD || 'admin123' });
    adminToken = login.body.datos.token;

    const categoria = await Categoria.create({ nombre: 'Categoria Inventario Test' });
    producto = await Producto.create({ categoria_id: categoria.id, nombre: 'Producto Inventario Test', precio: 4, stock: 0 });
  });

  afterAll(async () => {
    await ProductoStockSucursal.destroy({ where: { producto_id: producto.id } });
    await Producto.destroy({ where: { id: producto.id } });
  });

  it('una entrada manual va al stock de la sucursal activa del admin', async () => {
    const res = await request(app)
      .post('/api/v1/inventario/entrada')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ producto_id: producto.id, cantidad: 20, nota: 'Entrada test' });

    expect(res.status).toBe(201);

    const principal = await Sucursal.findOne({ where: { nombre: 'Sucursal Principal' } });
    const fila = await ProductoStockSucursal.findOne({ where: { producto_id: producto.id, sucursal_id: principal.id } });
    expect(fila.stock).toBe(20);
  });
});

describe('Inventario — acceso a todas las sucursales', () => {
  let sucursalX, productoTest, usuarioTodasId, tokenTodas, usuarioNormalId, tokenNormal;

  beforeAll(async () => {
    sucursalX = await Sucursal.create({ nombre: 'Sucursal Inventario Todas X' });
    const categoria = await Categoria.create({ nombre: 'Categoria Inventario Todas Test' });
    productoTest = await Producto.create({ categoria_id: categoria.id, nombre: 'Producto Inventario Todas Test', precio: 5, stock: 0 });

    const rolAdmin = await Rol.findOne({ where: { nombre: 'Administrador' } });
    const hash = await bcrypt.hash('clave123', 10);

    const todas = await Usuario.create({
      rol_id: rolAdmin.id, nombre: 'Inventario Acceso Todas Test', email: 'inventario-todas-test@restaurante.com',
      contrasena: hash, acceso_todas_sucursales: 1,
    });
    usuarioTodasId = todas.id;
    const loginTodas = await request(app).post('/api/v1/auth/login').send({ email: 'inventario-todas-test@restaurante.com', contrasena: 'clave123' });
    const elegidoTodas = await request(app).post('/api/v1/auth/login/sucursal').send({ pre_token: loginTodas.body.datos.pre_token, sucursal_id: null });
    tokenTodas = elegidoTodas.body.datos.token;

    const principal = await Sucursal.findOne({ where: { nombre: 'Sucursal Principal' } });
    const normal = await Usuario.create({
      rol_id: rolAdmin.id, nombre: 'Inventario Normal Todas Test', email: 'inventario-normal-todas-test@restaurante.com',
      contrasena: hash, acceso_todas_sucursales: 0,
    });
    await normal.addSucursal(principal);
    usuarioNormalId = normal.id;
    const loginNormal = await request(app).post('/api/v1/auth/login').send({ email: 'inventario-normal-todas-test@restaurante.com', contrasena: 'clave123' });
    tokenNormal = loginNormal.body.datos.token;
  });

  afterAll(async () => {
    await RegistroInventario.destroy({ where: { producto_id: productoTest.id } });
    await ProductoStockSucursal.destroy({ where: { producto_id: productoTest.id } });
    await Producto.destroy({ where: { id: productoTest.id } });
    await Usuario.destroy({ where: { id: [usuarioTodasId, usuarioNormalId] } });
    await Sucursal.destroy({ where: { id: sucursalX.id } });
  });

  it('acceso-todas sin sucursal_id → 400 al registrar entrada', async () => {
    const res = await request(app)
      .post('/api/v1/inventario/entrada')
      .set('Authorization', `Bearer ${tokenTodas}`)
      .send({ producto_id: productoTest.id, cantidad: 10 });
    expect(res.status).toBe(400);
  });

  it('acceso-todas con sucursal_id inexistente → 404 al registrar entrada', async () => {
    const res = await request(app)
      .post('/api/v1/inventario/entrada')
      .set('Authorization', `Bearer ${tokenTodas}`)
      .send({ producto_id: productoTest.id, cantidad: 10, sucursal_id: 999999 });
    expect(res.status).toBe(404);
  });

  it('acceso-todas con sucursal_id válido → registra entrada en esa sucursal', async () => {
    const res = await request(app)
      .post('/api/v1/inventario/entrada')
      .set('Authorization', `Bearer ${tokenTodas}`)
      .send({ producto_id: productoTest.id, cantidad: 10, sucursal_id: sucursalX.id });
    expect(res.status).toBe(201);

    const stock = await ProductoStockSucursal.findOne({ where: { producto_id: productoTest.id, sucursal_id: sucursalX.id } });
    expect(stock.stock).toBe(10);
  });

  it('acceso-todas con sucursal_id válido → registra ajuste en esa sucursal', async () => {
    const res = await request(app)
      .post('/api/v1/inventario/ajuste')
      .set('Authorization', `Bearer ${tokenTodas}`)
      .send({ producto_id: productoTest.id, cantidad: 25, sucursal_id: sucursalX.id });
    expect(res.status).toBe(201);

    const stock = await ProductoStockSucursal.findOne({ where: { producto_id: productoTest.id, sucursal_id: sucursalX.id } });
    expect(stock.stock).toBe(25);
  });

  it('usuario normal no puede cargar stock en otra sucursal aunque la mande en el body', async () => {
    const principal = await Sucursal.findOne({ where: { nombre: 'Sucursal Principal' } });
    const res = await request(app)
      .post('/api/v1/inventario/entrada')
      .set('Authorization', `Bearer ${tokenNormal}`)
      .send({ producto_id: productoTest.id, cantidad: 5, sucursal_id: sucursalX.id });
    expect(res.status).toBe(201);

    const stockPropia = await ProductoStockSucursal.findOne({ where: { producto_id: productoTest.id, sucursal_id: principal.id } });
    expect(stockPropia.stock).toBe(5); // fue a su propia sucursal, no a sucursalX
  });
});
