const request = require('supertest');
const app = require('../src/app');

describe('Compras API', () => {
  it('GET /api/v1/proveedores sin token → 401', async () => {
    const res = await request(app).get('/api/v1/proveedores');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/compras sin token → 401', async () => {
    const res = await request(app).get('/api/v1/compras');
    expect(res.status).toBe(401);
  });
});

const { Sucursal, Proveedor, Categoria, Producto, ProductoStockSucursal, Compra, DetalleCompra } = require('../src/models');

describe('Compras por sucursal', () => {
  let adminToken, sucursalOtra, proveedor, producto;

  beforeAll(async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'admin@restaurante.com', contrasena: process.env.ADMIN_PASSWORD || 'admin123' });
    adminToken = login.body.datos.token;

    sucursalOtra = await Sucursal.create({ nombre: 'Sucursal Compras Test' });
    proveedor = await Proveedor.create({ nombre: 'Proveedor Compras Test' });
    const categoria = await Categoria.create({ nombre: 'Categoria Compras Test' });
    producto = await Producto.create({ categoria_id: categoria.id, nombre: 'Producto Compras Test', precio: 8, stock: 0 });
  });

  afterAll(async () => {
    await DetalleCompra.destroy({ where: { producto_id: producto.id } });
    await Compra.destroy({ where: { proveedor_id: proveedor.id } });
    await ProductoStockSucursal.destroy({ where: { producto_id: producto.id } });
    await Producto.destroy({ where: { id: producto.id } });
    await Proveedor.destroy({ where: { id: proveedor.id } });
    await Sucursal.destroy({ where: { id: sucursalOtra.id } });
  });

  it('la compra creada por el admin usa su sucursal activa, no la del body', async () => {
    const res = await request(app)
      .post('/api/v1/compras')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ proveedor_id: proveedor.id, sucursal_id: sucursalOtra.id, items: [{ producto_id: producto.id, cantidad: 5, costo_unitario: 3 }] });

    expect(res.status).toBe(201);
    expect(res.body.datos.sucursal_id).not.toBe(sucursalOtra.id);
    this.compraId = res.body.datos.id;
  });

  it('al recibir la compra, el stock entra a la sucursal de la compra (no a otra)', async () => {
    const crear = await request(app)
      .post('/api/v1/compras')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ proveedor_id: proveedor.id, items: [{ producto_id: producto.id, cantidad: 7, costo_unitario: 3 }] });

    const compraId = crear.body.datos.id;
    const compraSucursalId = crear.body.datos.sucursal_id;

    const recibir = await request(app)
      .put(`/api/v1/compras/${compraId}/recibir`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(recibir.status).toBe(200);

    const fila = await ProductoStockSucursal.findOne({ where: { producto_id: producto.id, sucursal_id: compraSucursalId } });
    expect(fila.stock).toBeGreaterThanOrEqual(7);

    const filaOtra = await ProductoStockSucursal.findOne({ where: { producto_id: producto.id, sucursal_id: sucursalOtra.id } });
    expect(filaOtra).toBeNull();
  });
});

const { Rol, Usuario } = require('../src/models');
const bcrypt = require('bcryptjs');

describe('Compras - aislamiento entre sucursales (acceso por id)', () => {
  let sucursalA, sucursalB, usuarioAId, usuarioBId, tokenA, tokenB, proveedorA, productoA, compraAId;

  beforeAll(async () => {
    sucursalA = await Sucursal.create({ nombre: 'Sucursal Compras Aislamiento A' });
    sucursalB = await Sucursal.create({ nombre: 'Sucursal Compras Aislamiento B' });
    proveedorA = await Proveedor.create({ nombre: 'Proveedor Compras Aislamiento A' });
    const categoria = await Categoria.create({ nombre: 'Categoria Compras Aislamiento A' });
    productoA = await Producto.create({ categoria_id: categoria.id, nombre: 'Producto Compras Aislamiento A', precio: 8, stock: 0 });

    // Cajero no tiene permisos de compras; usamos rol Administrador pero con
    // acceso_todas_sucursales = 0 para que quede restringido a su sucursal.
    const rol = await Rol.findOne({ where: { nombre: 'Administrador' } });
    const hash = await bcrypt.hash('clave123', 10);
    const usuarioA = await Usuario.create({ rol_id: rol.id, nombre: 'Compras Aislamiento A', email: 'compras-aislamiento-a-test@restaurante.com', contrasena: hash, acceso_todas_sucursales: 0 });
    await usuarioA.addSucursal(sucursalA);
    usuarioAId = usuarioA.id;

    const usuarioB = await Usuario.create({ rol_id: rol.id, nombre: 'Compras Aislamiento B', email: 'compras-aislamiento-b-test@restaurante.com', contrasena: hash, acceso_todas_sucursales: 0 });
    await usuarioB.addSucursal(sucursalB);
    usuarioBId = usuarioB.id;

    const loginA = await request(app).post('/api/v1/auth/login').send({ email: 'compras-aislamiento-a-test@restaurante.com', contrasena: 'clave123' });
    tokenA = loginA.body.datos.token;
    const loginB = await request(app).post('/api/v1/auth/login').send({ email: 'compras-aislamiento-b-test@restaurante.com', contrasena: 'clave123' });
    tokenB = loginB.body.datos.token;

    const crear = await request(app)
      .post('/api/v1/compras')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ proveedor_id: proveedorA.id, items: [{ producto_id: productoA.id, cantidad: 4, costo_unitario: 2 }] });
    compraAId = crear.body.datos.id;
  });

  afterAll(async () => {
    await DetalleCompra.destroy({ where: { producto_id: productoA.id } });
    await Compra.destroy({ where: { proveedor_id: proveedorA.id } });
    await ProductoStockSucursal.destroy({ where: { producto_id: productoA.id } });
    await Producto.destroy({ where: { id: productoA.id } });
    await Proveedor.destroy({ where: { id: proveedorA.id } });
    await Usuario.destroy({ where: { id: [usuarioAId, usuarioBId] } });
    await Sucursal.destroy({ where: { id: [sucursalA.id, sucursalB.id] } });
  });

  it('un usuario de otra sucursal NO puede leer una compra por id (404)', async () => {
    const res = await request(app)
      .get(`/api/v1/compras/${compraAId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(404);
  });

  it('un usuario de otra sucursal NO puede recibir una compra de otra sucursal (404)', async () => {
    const res = await request(app)
      .put(`/api/v1/compras/${compraAId}/recibir`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(404);
  });

  it('el usuario dueño de la sucursal SÍ puede leer su propia compra', async () => {
    const res = await request(app)
      .get(`/api/v1/compras/${compraAId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
  });
});
