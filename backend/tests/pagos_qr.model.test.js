const request = require('supertest');
const app = require('../src/app');
const bcrypt = require('bcryptjs');
const {
  Sucursal, Area, Mesa, Rol, Usuario, Caja, SesionCaja, Pedido, PagoQr,
} = require('../src/models');

describe('Modelo PagoQr', () => {
  let sucursalId, areaId, mesaId, usuarioId, cajaId, sesionId, pedidoId;

  beforeAll(async () => {
    const sucursal = await Sucursal.create({ nombre: 'Sucursal PagoQr Test' });
    sucursalId = sucursal.id;
    const area = await Area.create({ nombre: 'Area PagoQr Test', sucursal_id: sucursalId });
    areaId = area.id;
    const mesa = await Mesa.create({ area_id: areaId, nombre: 'Mesa PagoQr Test' });
    mesaId = mesa.id;
    const rol = await Rol.findOne({ where: { nombre: 'Cajero' } });
    const hash = await bcrypt.hash('clave123', 10);
    const usuario = await Usuario.create({ rol_id: rol.id, nombre: 'PagoQr Test', email: 'pagoqr-model-test@restaurante.com', contrasena: hash });
    usuarioId = usuario.id;
    const caja = await Caja.create({ sucursal_id: sucursalId, nombre: 'Caja PagoQr Test' });
    cajaId = caja.id;
    const sesion = await SesionCaja.create({ usuario_id: usuarioId, sucursal_id: sucursalId, caja_id: cajaId, monto_apertura: 0 });
    sesionId = sesion.id;
    const pedido = await Pedido.create({
      sucursal_id: sucursalId, mesa_id: mesaId, usuario_id: usuarioId, sesion_caja_id: sesionId,
      tipo: 'mesa', estado: 'pendiente_pago', total: 10,
    });
    pedidoId = pedido.id;
  });

  afterAll(async () => {
    await PagoQr.destroy({ where: { pedido_id: pedidoId } });
    await Pedido.destroy({ where: { id: pedidoId } });
    await SesionCaja.destroy({ where: { id: sesionId } });
    await Caja.destroy({ where: { id: cajaId } });
    await Usuario.destroy({ where: { id: usuarioId } });
    await Mesa.destroy({ where: { id: mesaId } });
    await Area.destroy({ where: { id: areaId } });
    await Sucursal.destroy({ where: { id: sucursalId } });
  });

  it('el pedido acepta el estado pendiente_pago', async () => {
    const pedido = await Pedido.findByPk(pedidoId);
    expect(pedido.estado).toBe('pendiente_pago');
  });

  it('crea un pago_qr asociado al pedido y lo recupera vía la asociación', async () => {
    await PagoQr.create({
      pedido_id: pedidoId,
      sucursal_id: sucursalId,
      order_id: `pedido_${pedidoId}_1`,
      estado: 'pendiente',
      estado_previo: 'pendiente',
      monto_neto: 10,
      expires_at: new Date(Date.now() + 30 * 60000),
    });

    const pedido = await Pedido.findByPk(pedidoId, { include: [{ model: PagoQr, as: 'pagosQr' }] });
    expect(pedido.pagosQr).toHaveLength(1);
    expect(pedido.pagosQr[0].order_id).toBe(`pedido_${pedidoId}_1`);
  });

  it('sanidad: la app sigue arrancando con el modelo nuevo cargado', async () => {
    const res = await request(app).get('/api/v1/salud');
    expect(res.status).toBe(200);
  });
});
