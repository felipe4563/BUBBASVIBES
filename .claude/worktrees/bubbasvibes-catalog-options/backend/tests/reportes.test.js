const request = require('supertest');
const app = require('../src/app');
const { Sucursal, Area, Mesa, Categoria, Producto, SesionCaja, LibroCaja, Pedido, Caja } = require('../src/models');

describe('Reportes filtrados por sucursal', () => {
  let adminToken, sucursalOtra, pedidoOtraSucursalId, pedidoPropioId, cajaOtra;

  beforeAll(async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'admin@restaurante.com', contrasena: process.env.ADMIN_PASSWORD || 'admin123' });
    adminToken = login.body.datos.token;
    const sucursalPropiaId = login.body.datos.usuario.sucursal_activa.id;

    sucursalOtra = await Sucursal.create({ nombre: 'Sucursal Reportes Test' });
    const categoria = await Categoria.create({ nombre: 'Categoria Reportes Test' });
    const producto = await Producto.create({ categoria_id: categoria.id, nombre: 'Producto Reportes Test', precio: 6, stock: null });
    cajaOtra = await Caja.create({ sucursal_id: sucursalOtra.id, nombre: 'Caja Reportes Test' });
    const sesion = await SesionCaja.create({ usuario_id: 1, sucursal_id: sucursalOtra.id, caja_id: cajaOtra.id, monto_apertura: 0 });
    const pedido = await Pedido.create({
      sucursal_id: sucursalOtra.id, usuario_id: 1, sesion_caja_id: sesion.id, tipo: 'llevar',
      estado: 'completado', total: 6,
    });
    pedidoOtraSucursalId = pedido.id;

    // Fixture: the dev DB has no completado pedidos in the admin's own sucursal,
    // so create one to exercise the "sucursal incluida en cada fila" assertion.
    const pedidoPropio = await Pedido.create({
      sucursal_id: sucursalPropiaId, usuario_id: 1, tipo: 'llevar',
      estado: 'completado', total: 6,
    });
    pedidoPropioId = pedidoPropio.id;

    this._cleanup = { producto, categoria, sesion, pedido };
  });

  afterAll(async () => {
    await Pedido.destroy({ where: { id: pedidoPropioId } });
    await Pedido.destroy({ where: { id: pedidoOtraSucursalId } });
    await SesionCaja.destroy({ where: { sucursal_id: sucursalOtra.id } });
    await Caja.destroy({ where: { sucursal_id: sucursalOtra.id } });
    await Sucursal.destroy({ where: { id: sucursalOtra.id } });
  });

  it('el reporte de ventas del admin (sucursal Principal) no incluye pedidos de otra sucursal', async () => {
    const res = await request(app)
      .get('/api/v1/reportes/ventas')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.datos.find(p => p.id === pedidoOtraSucursalId)).toBeUndefined();
  });

  it('el reporte de ventas incluye el objeto sucursal en cada fila', async () => {
    const res = await request(app)
      .get('/api/v1/reportes/ventas')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.datos.length).toBeGreaterThan(0);
    expect(res.body.datos[0].sucursal).toHaveProperty('id');
    expect(res.body.datos[0].sucursal).toHaveProperty('nombre');
  });

  it('el reporte de caja filtra por sucursal e incluye el objeto sucursal en cada fila', async () => {
    const sesionOtra = await SesionCaja.create({ usuario_id: 1, sucursal_id: sucursalOtra.id, caja_id: cajaOtra.id, monto_apertura: 0 });
    const registroOtra = await LibroCaja.create({
      sesion_caja_id: sesionOtra.id, usuario_id: 1, tipo: 'ingreso', concepto: 'Test caja otra sucursal', monto: 50, metodo_pago: 'efectivo',
    });

    const res = await request(app)
      .get('/api/v1/reportes/caja')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.datos.find(r => r.id === registroOtra.id)).toBeUndefined();

    if (res.body.datos.length > 0) {
      expect(res.body.datos[0].sucursal).toHaveProperty('id');
      expect(res.body.datos[0].sucursal).toHaveProperty('nombre');
    }

    await LibroCaja.destroy({ where: { id: registroOtra.id } });
    await SesionCaja.destroy({ where: { id: sesionOtra.id } });
  });
});
