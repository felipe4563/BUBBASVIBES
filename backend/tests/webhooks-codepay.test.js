const request = require('supertest');
const { createHmac } = require('crypto');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const {
  Sucursal, Area, Mesa, Categoria, Producto, ProductoStockSucursal, Usuario, Rol,
  Caja, SesionCaja, Pedido, DetallePedido, PagoQr, LibroCaja,
} = require('../src/models');

function firmar(bodyObj) {
  const raw = JSON.stringify(bodyObj);
  const timestamp = Math.floor(Date.now() / 1000);
  const hmac = createHmac('sha256', process.env.CODEPAY_NOTIFICATION_SECRET).update(`${timestamp}.${raw}`).digest('hex');
  return `t=${timestamp},v1=${hmac}`;
}

describe('POST /webhooks/codepay', () => {
  let sucursalId, areaId, mesaId, usuarioId, cajaId, sesionId, productoId, pedidoId, pagoQrId;
  const orderId = () => `pedido_${pedidoId}_1`;

  beforeAll(async () => {
    const sucursal = await Sucursal.create({ nombre: 'Sucursal Webhook Test' });
    sucursalId = sucursal.id;
    const area = await Area.create({ nombre: 'Area Webhook Test', sucursal_id: sucursalId });
    areaId = area.id;
    const mesa = await Mesa.create({ area_id: areaId, nombre: 'Mesa Webhook Test' });
    mesaId = mesa.id;
    const categoria = await Categoria.create({ nombre: 'Categoria Webhook Test' });
    const producto = await Producto.create({ categoria_id: categoria.id, nombre: 'Producto Webhook Test', precio: 5, stock: 0 });
    productoId = producto.id;
    await ProductoStockSucursal.create({ producto_id: productoId, sucursal_id: sucursalId, stock: 3 });

    const rol = await Rol.findOne({ where: { nombre: 'Cajero' } });
    const hash = await bcrypt.hash('clave123', 10);
    const usuario = await Usuario.create({ rol_id: rol.id, nombre: 'Webhook Test', email: 'webhook-codepay-test@restaurante.com', contrasena: hash });
    usuarioId = usuario.id;

    const caja = await Caja.create({ sucursal_id: sucursalId, nombre: 'Caja Webhook Test' });
    cajaId = caja.id;
    const sesion = await SesionCaja.create({ usuario_id: usuarioId, sucursal_id: sucursalId, caja_id: cajaId, monto_apertura: 0 });
    sesionId = sesion.id;

    const pedido = await Pedido.create({
      sucursal_id: sucursalId, mesa_id: mesaId, usuario_id: usuarioId, sesion_caja_id: sesionId,
      tipo: 'mesa', estado: 'pendiente_pago', total: 10, descuento: 0, propina: 0,
    });
    pedidoId = pedido.id;
    await DetallePedido.create({ pedido_id: pedidoId, producto_id: productoId, cantidad: 2, precio: 5 });

    const pagoQr = await PagoQr.create({
      pedido_id: pedidoId, sucursal_id: sucursalId, order_id: orderId(), tx_id: 'tx_webhook_1',
      estado: 'pendiente', estado_previo: 'pendiente', monto_neto: 10, expires_at: new Date(Date.now() + 30 * 60000),
    });
    pagoQrId = pagoQr.id;
  });

  afterAll(async () => {
    await PagoQr.destroy({ where: { pedido_id: pedidoId } });
    await LibroCaja.destroy({ where: { referencia_id: pedidoId } });
    await Pedido.destroy({ where: { id: pedidoId } });
    await SesionCaja.destroy({ where: { id: sesionId } });
    await Caja.destroy({ where: { id: cajaId } });
    await ProductoStockSucursal.destroy({ where: { producto_id: productoId } });
    await Producto.destroy({ where: { id: productoId } });
    await Usuario.destroy({ where: { id: usuarioId } });
    await Mesa.destroy({ where: { id: mesaId } });
    await Area.destroy({ where: { id: areaId } });
    await Sucursal.destroy({ where: { id: sucursalId } });
  });

  it('firma inválida → 401 y no cambia nada', async () => {
    const body = { event: 'payment.completed', order_id: orderId(), tx_id: 'tx_webhook_1' };
    const res = await request(app)
      .post('/webhooks/codepay')
      .set('X-Codepay-Signature', '00112233')
      .send(body);

    expect(res.status).toBe(401);
    const pedido = await Pedido.findByPk(pedidoId);
    expect(pedido.estado).toBe('pendiente_pago');
  });

  it('firma válida + payment.completed → finaliza la venta', async () => {
    const body = { event: 'payment.completed', order_id: orderId(), tx_id: 'tx_webhook_1', status: 'completed' };
    const res = await request(app)
      .post('/webhooks/codepay')
      .set('X-Codepay-Signature', firmar(body))
      .send(body);

    expect(res.status).toBe(200);

    const pedido = await Pedido.findByPk(pedidoId);
    expect(pedido.estado).toBe('completado');

    const fila = await ProductoStockSucursal.findOne({ where: { producto_id: productoId, sucursal_id: sucursalId } });
    expect(fila.stock).toBe(1); // 3 - 2

    const pagoQr = await PagoQr.findByPk(pagoQrId);
    expect(pagoQr.estado).toBe('completado');

    const entradasLibro = await LibroCaja.count({ where: { referencia_id: pedidoId } });
    expect(entradasLibro).toBe(1);
  });

  it('webhook duplicado sobre el mismo pago ya completado → 200 no-op, no duplica el asiento', async () => {
    const body = { event: 'payment.completed', order_id: orderId(), tx_id: 'tx_webhook_1' };
    const res = await request(app)
      .post('/webhooks/codepay')
      .set('X-Codepay-Signature', firmar(body))
      .send(body);

    expect(res.status).toBe(200);
    const entradasLibro = await LibroCaja.count({ where: { referencia_id: pedidoId } });
    expect(entradasLibro).toBe(1);
  });

  it('order_id desconocido → 200 no-op', async () => {
    const body = { event: 'payment.completed', order_id: 'pedido_9999999_1', tx_id: 'tx_inexistente' };
    const res = await request(app)
      .post('/webhooks/codepay')
      .set('X-Codepay-Signature', firmar(body))
      .send(body);

    expect(res.status).toBe(200);
  });
});
