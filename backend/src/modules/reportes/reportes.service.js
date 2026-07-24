const { Op } = require('sequelize');
const {
  Pedido, DetallePedido, Mesa, Cliente, Producto, Usuario,
  RegistroInventario, Compra, Proveedor, LibroCaja, SesionCaja, Sucursal,
} = require('../../models');

// Offset fijo de Bolivia: un datetime sin offset se parsea en la hora local
// del proceso de Node, que puede no coincidir con la del negocio (-04:00).
function filtroFecha(desde, hasta) {
  if (!desde && !hasta) return {};
  const range = {};
  if (desde) range[Op.gte] = new Date(`${desde}T00:00:00-04:00`);
  if (hasta) range[Op.lte] = new Date(`${hasta}T23:59:59-04:00`);
  return { creado_en: range };
}

const INCLUDE_SUCURSAL = { model: Sucursal, as: 'sucursal', attributes: ['id', 'nombre'] };

async function ventas({ desde, hasta, sucursal_id, acceso_todas } = {}) {
  const where = { estado: 'completado', ...filtroFecha(desde, hasta) };
  if (!acceso_todas) where.sucursal_id = sucursal_id;
  return Pedido.findAll({
    where,
    include: [
      { model: Mesa,    as: 'mesa',    attributes: ['id', 'nombre'] },
      { model: Cliente, as: 'cliente', attributes: ['id', 'nombre'] },
      { model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] },
      INCLUDE_SUCURSAL,
      {
        model: DetallePedido, as: 'detalles',
        include: [{ model: Producto, as: 'producto', attributes: ['id', 'nombre'] }],
      },
    ],
    order: [['creado_en', 'DESC']],
  });
}

async function inventario({ desde, hasta, sucursal_id, acceso_todas } = {}) {
  const where = filtroFecha(desde, hasta);
  if (!acceso_todas) where.sucursal_id = sucursal_id;
  return RegistroInventario.findAll({
    where,
    include: [
      { model: Producto, as: 'producto', attributes: ['id', 'nombre', 'stock'] },
      { model: Usuario,  as: 'usuario',  attributes: ['id', 'nombre'] },
      INCLUDE_SUCURSAL,
    ],
    order: [['creado_en', 'DESC']],
  });
}

async function compras({ desde, hasta, sucursal_id, acceso_todas } = {}) {
  const where = filtroFecha(desde, hasta);
  if (!acceso_todas) where.sucursal_id = sucursal_id;
  return Compra.findAll({
    where,
    include: [
      { model: Proveedor, as: 'proveedor', attributes: ['id', 'nombre'] },
      { model: Usuario,   as: 'usuario',   attributes: ['id', 'nombre'] },
      INCLUDE_SUCURSAL,
    ],
    order: [['creado_en', 'DESC']],
  });
}

async function caja({ desde, hasta, sucursal_id, acceso_todas } = {}) {
  const includeSesion = {
    model: SesionCaja,
    as: 'sesion_caja',
    attributes: ['id'],
    include: [INCLUDE_SUCURSAL],
  };
  if (!acceso_todas) includeSesion.where = { sucursal_id };

  const registros = await LibroCaja.findAll({
    where: filtroFecha(desde, hasta),
    include: [
      { model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] },
      includeSesion,
    ],
    order: [['creado_en', 'DESC']],
  });

  return registros.map(r => {
    const plano = r.toJSON();
    plano.sucursal = plano.sesion_caja?.sucursal ?? null;
    delete plano.sesion_caja;
    return plano;
  });
}

module.exports = { ventas, inventario, compras, caja };
