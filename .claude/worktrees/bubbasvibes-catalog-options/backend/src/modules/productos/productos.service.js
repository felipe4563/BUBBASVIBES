const { Categoria, Producto, Sucursal, GrupoOpciones, Opcion, ProductoGrupoOpciones } = require('../../models');
const sequelize = require('../../config/database');
const { ajustarStockSucursal, mezclarStockPorSucursal } = require('../inventario/stock.service');

// --- Categorías ---

async function listarCategorias() {
  return Categoria.findAll({ order: [['nombre', 'ASC']] });
}

async function crearCategoria({ nombre, imagen }) {
  return Categoria.create({ nombre, imagen });
}

async function actualizarCategoria(id, { nombre, imagen, activo }) {
  const cat = await Categoria.findByPk(id);
  if (!cat) throw Object.assign(new Error('Categoría no encontrada'), { status: 404 });
  await cat.update({ nombre, imagen, activo });
  return cat;
}

async function eliminarCategoria(id) {
  const cat = await Categoria.findByPk(id);
  if (!cat) throw Object.assign(new Error('Categoría no encontrada'), { status: 404 });
  const productos = await Producto.findAll({ where: { categoria_id: id }, attributes: ['nombre', 'activo'] });
  if (productos.length > 0) {
    // Un producto "eliminado" solo se desactiva (para no perder su historial de
    // ventas), así que puede seguir bloqueando la categoría sin aparecer en el
    // listado normal (que solo muestra activos) — se listan por nombre para que
    // quede claro cuál reasignar, en vez de un mensaje genérico.
    const detalle = productos.map((p) => p.nombre + (p.activo ? '' : ' (inactivo)')).join(', ');
    throw Object.assign(new Error(`La categoría tiene productos asignados: ${detalle}. Reasígnalos a otra categoría antes de eliminarla.`), { status: 409 });
  }
  await cat.destroy();
}

// --- Grupos de opciones ---

async function listarGruposOpciones() {
  return GrupoOpciones.findAll({
    include: [{ model: Opcion, as: 'opciones', attributes: ['id', 'nombre', 'orden', 'precio_delta'] }],
    order: [['nombre', 'ASC'], [{ model: Opcion, as: 'opciones' }, 'orden', 'ASC']],
  });
}

async function _conOpciones(id, transaction) {
  return GrupoOpciones.findByPk(id, {
    include: [{ model: Opcion, as: 'opciones', attributes: ['id', 'nombre', 'orden', 'precio_delta'] }],
    order: [[{ model: Opcion, as: 'opciones' }, 'orden', 'ASC']],
    transaction,
  });
}

async function crearGrupoOpciones({ nombre, opciones = [] }) {
  return sequelize.transaction(async (t) => {
    const grupo = await GrupoOpciones.create({ nombre }, { transaction: t });
    if (opciones.length) {
      await Opcion.bulkCreate(
        opciones.map((o, i) => ({ grupo_opciones_id: grupo.id, nombre: o.nombre, orden: o.orden ?? i, precio_delta: o.precio_delta ?? 0 })),
        { transaction: t }
      );
    }
    return _conOpciones(grupo.id, t);
  });
}

async function actualizarGrupoOpciones(id, { nombre, opciones = [] }) {
  return sequelize.transaction(async (t) => {
    const grupo = await GrupoOpciones.findByPk(id, { transaction: t });
    if (!grupo) throw Object.assign(new Error('Grupo de opciones no encontrado'), { status: 404 });
    await grupo.update({ nombre }, { transaction: t });
    await Opcion.destroy({ where: { grupo_opciones_id: id }, transaction: t });
    if (opciones.length) {
      await Opcion.bulkCreate(
        opciones.map((o, i) => ({ grupo_opciones_id: id, nombre: o.nombre, orden: o.orden ?? i, precio_delta: o.precio_delta ?? 0 })),
        { transaction: t }
      );
    }
    return _conOpciones(id, t);
  });
}

async function eliminarGrupoOpciones(id) {
  const grupo = await GrupoOpciones.findByPk(id);
  if (!grupo) throw Object.assign(new Error('Grupo de opciones no encontrado'), { status: 404 });
  await ProductoGrupoOpciones.destroy({ where: { grupo_opciones_id: id } });
  await grupo.destroy();
}

async function _reemplazarPasos(producto_id, pasos = [], transaction) {
  await ProductoGrupoOpciones.destroy({ where: { producto_id }, transaction });
  if (!pasos.length) return;
  await ProductoGrupoOpciones.bulkCreate(
    pasos.map((p, i) => ({
      producto_id,
      grupo_opciones_id: p.grupo_opciones_id,
      orden: p.orden ?? i,
      obligatorio: p.obligatorio ?? true,
      disparado_por_opcion_id: p.disparado_por_opcion_id || null,
    })),
    { transaction }
  );
}

const INCLUDE_PASOS = {
  model: ProductoGrupoOpciones,
  as: 'pasos',
  separate: true,
  order: [['orden', 'ASC']],
  include: [
    { model: GrupoOpciones, as: 'grupo_opciones', attributes: ['id', 'nombre'],
      include: [{ model: Opcion, as: 'opciones', attributes: ['id', 'nombre', 'orden', 'precio_delta'] }] },
  ],
};

function _ordenarOpcionesDePasos(producto) {
  for (const paso of producto.pasos || []) {
    paso.grupo_opciones.opciones.sort((a, b) => a.orden - b.orden);
  }
  return producto;
}

// --- Productos ---

async function listarProductos({ categoria_id, solo_vendibles, solo_disponibles, order_by, incluir_inactivos } = {}, alcance) {
  const where = {};
  if (!(incluir_inactivos === 'true' || incluir_inactivos === true)) where.activo = 1;
  if (categoria_id) where.categoria_id = categoria_id;
  if (solo_vendibles === 'true' || solo_vendibles === true) where.es_vendible = 1;

  const order = order_by === 'mas_vendido'
    ? [
        [sequelize.literal('(SELECT COALESCE(SUM(cantidad), 0) FROM detalle_pedidos WHERE producto_id = `Producto`.`id`)'), 'DESC'],
        ['nombre', 'ASC'],
      ]
    : [['nombre', 'ASC']];

  const productos = await Producto.findAll({
    where,
    include: [
      { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] },
      INCLUDE_PASOS,
    ],
    order,
  });
  productos.forEach(_ordenarOpcionesDePasos);

  const conStock = await mezclarStockPorSucursal(productos, alcance);

  if (solo_disponibles === 'true' || solo_disponibles === true) {
    return conStock.filter((p) => p.stock === null || p.stock > 0);
  }
  return conStock;
}

async function obtenerProducto(id, alcance) {
  const p = await Producto.findByPk(id, {
    include: [
      { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] },
      INCLUDE_PASOS,
    ],
  });
  if (!p) throw Object.assign(new Error('Producto no encontrado'), { status: 404 });
  _ordenarOpcionesDePasos(p);
  const [conStock] = await mezclarStockPorSucursal([p], alcance);
  return conStock;
}

async function crearProducto({ categoria_id, nombre, codigo_barras, codigo, precio, costo, stock, sucursal_id, es_vendible, imagen, pasos }, alcance) {
  let sucursalDestino;
  const conStock = stock !== undefined && stock !== null;

  if (conStock) {
    sucursalDestino = alcance.acceso_todas ? sucursal_id : alcance.sucursal_id;
    if (alcance.acceso_todas && !sucursalDestino) {
      throw Object.assign(new Error('sucursal_id es requerido para asignar stock inicial'), { status: 400 });
    }
    if (alcance.acceso_todas) {
      const existe = await Sucursal.findByPk(sucursalDestino);
      if (!existe) throw Object.assign(new Error('Sucursal no encontrada'), { status: 404 });
    }
  }

  const producto = await sequelize.transaction(async (t) => {
    const p = await Producto.create({ categoria_id, nombre, codigo_barras, codigo, precio, costo, stock: conStock ? 0 : null, es_vendible, imagen }, { transaction: t });
    await _reemplazarPasos(p.id, pasos, t);
    return p;
  });

  if (conStock) {
    await ajustarStockSucursal({ producto_id: producto.id, sucursal_id: sucursalDestino, tipo: 'ajuste', cantidad: stock, usuario_id: alcance.usuario_id, nota: 'Stock inicial' });
  }

  return obtenerProducto(producto.id, alcance);
}

async function actualizarProducto(id, datos, alcance) {
  const { stock, pasos, ...resto } = datos; // stock nunca se edita aquí — solo vía ajustarStockSucursal
  const p = await Producto.findByPk(id);
  if (!p) throw Object.assign(new Error('Producto no encontrado'), { status: 404 });
  await sequelize.transaction(async (t) => {
    await p.update(resto, { transaction: t });
    if (pasos !== undefined) await _reemplazarPasos(id, pasos, t);
  });
  return obtenerProducto(id, alcance);
}

async function eliminarProducto(id) {
  const p = await Producto.findByPk(id);
  if (!p) throw Object.assign(new Error('Producto no encontrado'), { status: 404 });
  await p.update({ activo: 0 });
}

module.exports = { listarCategorias, crearCategoria, actualizarCategoria, eliminarCategoria, listarGruposOpciones, crearGrupoOpciones, actualizarGrupoOpciones, eliminarGrupoOpciones, listarProductos, obtenerProducto, crearProducto, actualizarProducto, eliminarProducto };
