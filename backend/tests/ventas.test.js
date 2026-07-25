const request = require('supertest');
const app = require('../src/app');

describe('Ventas API', () => {
  it('GET /api/v1/ventas sin token → 401', async () => {
    const res = await request(app).get('/api/v1/ventas');
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/ventas/completa sin token → 401', async () => {
    const res = await request(app).post('/api/v1/ventas/completa').send({});
    expect(res.status).toBe(401);
  });
});

const { Sucursal, Area, Mesa, Categoria, Producto, ProductoStockSucursal, Usuario, Rol, SesionCaja, Pedido, RegistroInventario, LibroCaja, Caja } = require('../src/models');
const bcrypt = require('bcryptjs');

describe('Ventas por sucursal', () => {
  let sucursalB, usuarioBId, tokenB, sesionCajaBId, mesaBId, productoId;

  beforeAll(async () => {
    sucursalB = await Sucursal.create({ nombre: 'Sucursal Ventas Test B' });
    const area = await Area.create({ nombre: 'Area Ventas Test B', sucursal_id: sucursalB.id });
    const mesa = await Mesa.create({ area_id: area.id, nombre: 'Mesa Ventas Test B' });
    mesaBId = mesa.id;

    const categoria = await Categoria.create({ nombre: 'Categoria Ventas Test' });
    const producto = await Producto.create({ categoria_id: categoria.id, nombre: 'Producto Ventas Test', precio: 5, stock: 0 });
    productoId = producto.id;
    await ProductoStockSucursal.create({ producto_id: producto.id, sucursal_id: sucursalB.id, stock: 3 });

    const rol = await Rol.findOne({ where: { nombre: 'Cajero' } });
    const hash = await bcrypt.hash('clave123', 10);
    const usuario = await Usuario.create({ rol_id: rol.id, nombre: 'Ventas Sucursal B Test', email: 'ventas-sucursal-b-test@restaurante.com', contrasena: hash });
    await usuario.addSucursal(sucursalB);
    usuarioBId = usuario.id;

    const login = await request(app).post('/api/v1/auth/login').send({ email: 'ventas-sucursal-b-test@restaurante.com', contrasena: 'clave123' });
    tokenB = login.body.datos.token; // única sucursal → login directo

    const cajaB = await Caja.create({ sucursal_id: sucursalB.id, nombre: 'Caja Ventas Test B' });
    const sesion = await SesionCaja.create({ usuario_id: usuarioBId, sucursal_id: sucursalB.id, caja_id: cajaB.id, monto_apertura: 0 });
    sesionCajaBId = sesion.id;
  });

  afterAll(async () => {
    await Pedido.destroy({ where: { usuario_id: usuarioBId } });
    await RegistroInventario.destroy({ where: { usuario_id: usuarioBId } });
    await LibroCaja.destroy({ where: { usuario_id: usuarioBId } });
    await SesionCaja.destroy({ where: { id: sesionCajaBId } });
    await Caja.destroy({ where: { sucursal_id: sucursalB.id } });
    await ProductoStockSucursal.destroy({ where: { producto_id: productoId } });
    await Producto.destroy({ where: { id: productoId } });
    await Usuario.destroy({ where: { id: usuarioBId } });
    await Mesa.destroy({ where: { id: mesaBId } });
    await Area.destroy({ where: { sucursal_id: sucursalB.id } });
    await Sucursal.destroy({ where: { id: sucursalB.id } });
  });

  it('el pedido hereda la sucursal de la sesión de caja activa', async () => {
    const res = await request(app)
      .post('/api/v1/ventas')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ mesa_id: mesaBId, tipo: 'mesa', sesion_caja_id: sesionCajaBId });

    expect(res.status).toBe(201);
    expect(res.body.datos.sucursal_id).toBe(sucursalB.id);
  });

  it('una venta completa descuenta del stock de la sucursal del pedido', async () => {
    const res = await request(app)
      .post('/api/v1/ventas/completa')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        tipo: 'llevar', metodo_pago: 'efectivo', monto_recibido: 10, sesion_caja_id: sesionCajaBId,
        items: [{ producto_id: productoId, cantidad: 2 }],
      });

    expect(res.status).toBe(201);

    const fila = await ProductoStockSucursal.findOne({ where: { producto_id: productoId, sucursal_id: sucursalB.id } });
    expect(fila.stock).toBe(1); // 3 - 2
  });
});

describe('Ventas - aislamiento entre sucursales (acceso por id)', () => {
  let sucursalA, sucursalC, usuarioAId, usuarioCId, tokenA, tokenC, sesionCajaAId, mesaAId, pedidoAId;

  beforeAll(async () => {
    sucursalA = await Sucursal.create({ nombre: 'Sucursal Aislamiento A' });
    sucursalC = await Sucursal.create({ nombre: 'Sucursal Aislamiento C' });
    const area = await Area.create({ nombre: 'Area Aislamiento A', sucursal_id: sucursalA.id });
    const mesa = await Mesa.create({ area_id: area.id, nombre: 'Mesa Aislamiento A' });
    mesaAId = mesa.id;

    const rol = await Rol.findOne({ where: { nombre: 'Cajero' } });
    const hash = await bcrypt.hash('clave123', 10);

    const usuarioA = await Usuario.create({ rol_id: rol.id, nombre: 'Aislamiento A', email: 'aislamiento-a-test@restaurante.com', contrasena: hash });
    await usuarioA.addSucursal(sucursalA);
    usuarioAId = usuarioA.id;

    const usuarioC = await Usuario.create({ rol_id: rol.id, nombre: 'Aislamiento C', email: 'aislamiento-c-test@restaurante.com', contrasena: hash });
    await usuarioC.addSucursal(sucursalC);
    usuarioCId = usuarioC.id;

    const loginA = await request(app).post('/api/v1/auth/login').send({ email: 'aislamiento-a-test@restaurante.com', contrasena: 'clave123' });
    tokenA = loginA.body.datos.token;
    const loginC = await request(app).post('/api/v1/auth/login').send({ email: 'aislamiento-c-test@restaurante.com', contrasena: 'clave123' });
    tokenC = loginC.body.datos.token;

    const cajaA = await Caja.create({ sucursal_id: sucursalA.id, nombre: 'Caja Aislamiento A' });
    const sesion = await SesionCaja.create({ usuario_id: usuarioAId, sucursal_id: sucursalA.id, caja_id: cajaA.id, monto_apertura: 0 });
    sesionCajaAId = sesion.id;

    const crear = await request(app)
      .post('/api/v1/ventas')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ mesa_id: mesaAId, tipo: 'mesa', sesion_caja_id: sesionCajaAId });
    pedidoAId = crear.body.datos.id;
  });

  afterAll(async () => {
    await Pedido.destroy({ where: { usuario_id: usuarioAId } });
    await SesionCaja.destroy({ where: { id: sesionCajaAId } });
    await Caja.destroy({ where: { sucursal_id: sucursalA.id } });
    await Usuario.destroy({ where: { id: [usuarioAId, usuarioCId] } });
    await Mesa.destroy({ where: { id: mesaAId } });
    await Area.destroy({ where: { sucursal_id: sucursalA.id } });
    await Sucursal.destroy({ where: { id: [sucursalA.id, sucursalC.id] } });
  });

  it('un usuario de otra sucursal NO puede leer un pedido por id (404)', async () => {
    const res = await request(app)
      .get(`/api/v1/ventas/${pedidoAId}`)
      .set('Authorization', `Bearer ${tokenC}`);
    expect(res.status).toBe(404);
  });

  it('un usuario de otra sucursal NO puede cobrar un pedido de otra sucursal (404)', async () => {
    const res = await request(app)
      .post(`/api/v1/ventas/${pedidoAId}/cobrar`)
      .set('Authorization', `Bearer ${tokenC}`)
      .send({ metodo_pago: 'efectivo', monto_recibido: 100 });
    expect(res.status).toBe(404);
  });

  it('un usuario de otra sucursal NO puede cancelar un pedido de otra sucursal (404)', async () => {
    const res = await request(app)
      .post(`/api/v1/ventas/${pedidoAId}/cancelar`)
      .set('Authorization', `Bearer ${tokenC}`);
    expect(res.status).toBe(404);
  });
});

describe('Ventas — cobro con QR estático (manual)', () => {
  let sucursalId, areaId, mesaId, usuarioId, cajaId, sesionId, productoId, token;

  beforeAll(async () => {
    const sucursal = await Sucursal.create({ nombre: 'Sucursal QR Estático Ventas Test' });
    sucursalId = sucursal.id;
    const area = await Area.create({ nombre: 'Area QR Estático Ventas Test', sucursal_id: sucursalId });
    areaId = area.id;
    const mesa = await Mesa.create({ area_id: areaId, nombre: 'Mesa QR Estático Ventas Test' });
    mesaId = mesa.id;
    const categoria = await Categoria.create({ nombre: 'Categoria QR Estático Ventas Test' });
    const producto = await Producto.create({ categoria_id: categoria.id, nombre: 'Producto QR Estático Ventas Test', precio: 5, stock: 0 });
    productoId = producto.id;
    await ProductoStockSucursal.create({ producto_id: productoId, sucursal_id: sucursalId, stock: 10 });

    const rol = await Rol.findOne({ where: { nombre: 'Cajero' } });
    const hash = await bcrypt.hash('clave123', 10);
    const usuario = await Usuario.create({ rol_id: rol.id, nombre: 'QR Estático Ventas Test', email: 'qr-estatico-ventas-test@restaurante.com', contrasena: hash });
    usuarioId = usuario.id;
    await usuario.addSucursal(sucursal);

    const login = await request(app).post('/api/v1/auth/login').send({ email: 'qr-estatico-ventas-test@restaurante.com', contrasena: 'clave123' });
    token = login.body.datos.token;

    const caja = await Caja.create({ sucursal_id: sucursalId, nombre: 'Caja QR Estático Ventas Test' });
    cajaId = caja.id;
    const sesion = await SesionCaja.create({ usuario_id: usuarioId, sucursal_id: sucursalId, caja_id: cajaId, monto_apertura: 0 });
    sesionId = sesion.id;
  });

  afterAll(async () => {
    await Pedido.destroy({ where: { usuario_id: usuarioId } });
    await LibroCaja.destroy({ where: { usuario_id: usuarioId } });
    await SesionCaja.destroy({ where: { id: sesionId } });
    await Caja.destroy({ where: { id: cajaId } });
    await ProductoStockSucursal.destroy({ where: { producto_id: productoId } });
    await Producto.destroy({ where: { id: productoId } });
    await Usuario.destroy({ where: { id: usuarioId } });
    await Mesa.destroy({ where: { id: mesaId } });
    await Area.destroy({ where: { id: areaId } });
    await Sucursal.destroy({ where: { id: sucursalId } });
  });

  it('metodo_pago=qr completa la venta de inmediato (sin registro externo), descuenta stock y registra el ingreso', async () => {
    const res = await request(app)
      .post('/api/v1/ventas/completa')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tipo: 'llevar', metodo_pago: 'qr', sesion_caja_id: sesionId,
        items: [{ producto_id: productoId, cantidad: 2 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.datos.estado).toBe('completado');
    expect(res.body.datos.metodo_pago).toBe('qr');

    const fila = await ProductoStockSucursal.findOne({ where: { producto_id: productoId, sucursal_id: sucursalId } });
    expect(fila.stock).toBe(8); // 10 - 2

    const entradasLibro = await LibroCaja.count({ where: { referencia_id: res.body.datos.id } });
    expect(entradasLibro).toBe(1);
  });

  it('cobrar un pedido pendiente con metodo_pago=qr también completa de inmediato', async () => {
    const creado = await request(app)
      .post('/api/v1/ventas')
      .set('Authorization', `Bearer ${token}`)
      .send({ mesa_id: mesaId, tipo: 'mesa', sesion_caja_id: sesionId });
    const pedidoId = creado.body.datos.id;

    await request(app)
      .post(`/api/v1/ventas/${pedidoId}/items`)
      .set('Authorization', `Bearer ${token}`)
      .send({ producto_id: productoId, cantidad: 1 });

    const res = await request(app)
      .post(`/api/v1/ventas/${pedidoId}/cobrar`)
      .set('Authorization', `Bearer ${token}`)
      .send({ metodo_pago: 'qr' });

    expect(res.status).toBe(200);
    expect(res.body.datos.estado).toBe('completado');
  });
});
