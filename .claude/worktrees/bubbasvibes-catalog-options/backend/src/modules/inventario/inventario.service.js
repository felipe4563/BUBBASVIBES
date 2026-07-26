const { RegistroInventario, Producto, Usuario } = require('../../models');
const { ajustarStockSucursal } = require('./stock.service');

const INCLUDE_REGISTRO = [
  { model: Producto, as: 'producto', attributes: ['id', 'nombre', 'stock'] },
  { model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] },
];

async function listar({ producto_id, sucursal_id, acceso_todas } = {}) {
  const where = {};
  if (producto_id) where.producto_id = producto_id;
  if (!acceso_todas) where.sucursal_id = sucursal_id;
  return RegistroInventario.findAll({ where, include: INCLUDE_REGISTRO, order: [['creado_en', 'DESC']], limit: 200 });
}

async function listarPorProducto(producto_id, { sucursal_id, acceso_todas } = {}) {
  const producto = await Producto.findByPk(producto_id);
  if (!producto) throw Object.assign(new Error('Producto no encontrado'), { status: 404 });
  const where = { producto_id };
  if (!acceso_todas) where.sucursal_id = sucursal_id;
  return RegistroInventario.findAll({
    where,
    include: INCLUDE_REGISTRO,
    order: [['creado_en', 'DESC']],
  });
}

async function entrada(usuario_id, sucursal_id, { producto_id, cantidad, nota }) {
  return ajustarStockSucursal({ producto_id, sucursal_id, tipo: 'entrada', cantidad, usuario_id, nota });
}

async function salida(usuario_id, sucursal_id, { producto_id, cantidad, nota }) {
  return ajustarStockSucursal({ producto_id, sucursal_id, tipo: 'salida', cantidad, usuario_id, nota });
}

async function ajuste(usuario_id, sucursal_id, { producto_id, cantidad, nota }) {
  return ajustarStockSucursal({ producto_id, sucursal_id, tipo: 'ajuste', cantidad, usuario_id, nota });
}

module.exports = { listar, listarPorProducto, entrada, salida, ajuste };
