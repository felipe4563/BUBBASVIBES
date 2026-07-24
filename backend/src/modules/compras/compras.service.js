const { Proveedor, Compra, DetalleCompra, Producto, sequelize } = require('../../models');
const { ajustarStockSucursal } = require('../inventario/stock.service');

const INCLUDE_COMPRA = [
  { model: Proveedor, as: 'proveedor', attributes: ['id', 'nombre'] },
  {
    model: DetalleCompra, as: 'detalles',
    include: [{ model: Producto, as: 'producto', attributes: ['id', 'nombre', 'stock'] }],
  },
];

// --- Proveedores ---

async function listarProveedores() {
  return Proveedor.findAll({ where: { activo: 1 }, order: [['nombre', 'ASC']] });
}

async function crearProveedor({ nombre, contacto, telefono, email, direccion }) {
  return Proveedor.create({ nombre, contacto, telefono, email, direccion });
}

async function actualizarProveedor(id, datos) {
  const p = await Proveedor.findByPk(id);
  if (!p) throw Object.assign(new Error('Proveedor no encontrado'), { status: 404 });
  await p.update(datos);
  return p;
}

async function desactivarProveedor(id) {
  const p = await Proveedor.findByPk(id);
  if (!p) throw Object.assign(new Error('Proveedor no encontrado'), { status: 404 });
  await p.update({ activo: 0 });
}

// --- Compras ---

async function listarCompras(alcance = {}) {
  const where = alcance.acceso_todas ? {} : { sucursal_id: alcance.sucursal_id };
  return Compra.findAll({ where, include: INCLUDE_COMPRA, order: [['creado_en', 'DESC']] });
}

async function obtenerCompra(id, alcance) {
  const c = await Compra.findByPk(id, { include: INCLUDE_COMPRA });
  if (!c) throw Object.assign(new Error('Compra no encontrada'), { status: 404 });
  if (alcance && !alcance.acceso_todas && c.sucursal_id !== alcance.sucursal_id) {
    throw Object.assign(new Error('Compra no encontrada'), { status: 404 });
  }
  return c;
}

async function crearCompra(usuario_id, sucursal_id, { proveedor_id, notas, items = [] }) {
  const proveedor = await Proveedor.findByPk(proveedor_id);
  if (!proveedor) throw Object.assign(new Error('Proveedor no encontrado'), { status: 404 });

  const total = items.reduce((sum, i) => sum + (parseFloat(i.costo_unitario) * parseInt(i.cantidad)), 0);

  const compra = await Compra.create({ proveedor_id, usuario_id, sucursal_id, total, notas });

  await DetalleCompra.bulkCreate(
    items.map(i => ({
      compra_id: compra.id,
      producto_id: i.producto_id,
      cantidad: i.cantidad,
      costo_unitario: i.costo_unitario,
      subtotal: parseFloat(i.costo_unitario) * parseInt(i.cantidad),
    }))
  );

  return obtenerCompra(compra.id);
}

async function actualizarCompra(id, { notas }, alcance) {
  const c = await obtenerCompra(id, alcance);
  if (c.estado !== 'pendiente') throw Object.assign(new Error('Solo se pueden editar compras pendientes'), { status: 409 });
  await c.update({ notas });
  return obtenerCompra(id, alcance);
}

async function recibirCompra(id, usuario_id, alcance) {
  const compra = await obtenerCompra(id, alcance);
  if (compra.estado !== 'pendiente') throw Object.assign(new Error('La compra ya fue recibida'), { status: 409 });

  await sequelize.transaction(async (t) => {
    for (const detalle of compra.detalles) {
      await ajustarStockSucursal({
        producto_id: detalle.producto_id, sucursal_id: compra.sucursal_id, tipo: 'compra', cantidad: detalle.cantidad,
        usuario_id, nota: `Compra #${compra.id}`, transaction: t,
      });
    }
    await compra.update({ estado: 'recibido' }, { transaction: t });
  });

  return obtenerCompra(id, alcance);
}

module.exports = { listarProveedores, crearProveedor, actualizarProveedor, desactivarProveedor, listarCompras, obtenerCompra, crearCompra, actualizarCompra, recibirCompra };
