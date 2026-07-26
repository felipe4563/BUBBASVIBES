const { Area, Mesa } = require('../../models');

// --- Áreas ---

function _filtroSucursal({ sucursal_id, acceso_todas }) {
  return acceso_todas ? {} : { sucursal_id };
}

// Orden natural ("MESA 2" antes que "MESA 10") en vez del alfabético que
// hace ORDER BY nombre en SQL, donde "MESA 10" queda antes que "MESA 2".
function _ordenNatural(a, b) {
  return a.nombre.localeCompare(b.nombre, 'es', { numeric: true, sensitivity: 'base' });
}

async function listarAreas(alcance) {
  const areas = await Area.findAll({ where: _filtroSucursal(alcance), include: [{ model: Mesa, as: 'mesas' }] });
  areas.sort(_ordenNatural);
  areas.forEach((area) => area.mesas.sort(_ordenNatural));
  return areas;
}

async function crearArea({ nombre }, sucursal_id) {
  return Area.create({ nombre, sucursal_id });
}

async function actualizarArea(id, { nombre }, alcance) {
  const area = await Area.findByPk(id);
  if (!area) throw Object.assign(new Error('Área no encontrada'), { status: 404 });
  if (!alcance.acceso_todas && area.sucursal_id !== alcance.sucursal_id) {
    throw Object.assign(new Error('Área no encontrada'), { status: 404 });
  }
  await area.update({ nombre });
  return area;
}

async function eliminarArea(id, alcance) {
  const area = await Area.findByPk(id);
  if (!area) throw Object.assign(new Error('Área no encontrada'), { status: 404 });
  if (!alcance.acceso_todas && area.sucursal_id !== alcance.sucursal_id) {
    throw Object.assign(new Error('Área no encontrada'), { status: 404 });
  }
  const mesas = await Mesa.count({ where: { area_id: id } });
  if (mesas > 0) throw Object.assign(new Error('El área tiene mesas asignadas'), { status: 409 });
  await area.destroy();
}

// --- Mesas ---

async function listarMesas(area_id, alcance) {
  const where = area_id ? { area_id } : {};
  const mesas = await Mesa.findAll({
    where,
    include: [{ model: Area, as: 'area', attributes: ['id', 'nombre', 'sucursal_id'], where: _filtroSucursal(alcance) }],
  });
  mesas.sort(_ordenNatural);
  return mesas;
}

async function obtenerMesa(id, alcance) {
  const mesa = await Mesa.findByPk(id, { include: [{ model: Area, as: 'area', attributes: ['id', 'nombre', 'sucursal_id'] }] });
  if (!mesa) throw Object.assign(new Error('Mesa no encontrada'), { status: 404 });
  if (alcance && !alcance.acceso_todas && mesa.area.sucursal_id !== alcance.sucursal_id) {
    throw Object.assign(new Error('Mesa no encontrada'), { status: 404 });
  }
  return mesa;
}

async function crearMesa({ area_id, nombre, asientos = 4, pos_x = 0, pos_y = 0 }, sucursal_id) {
  const area = await Area.findByPk(area_id);
  if (!area) throw Object.assign(new Error('Área no encontrada'), { status: 404 });
  if (area.sucursal_id !== sucursal_id) {
    throw Object.assign(new Error('El área no pertenece a tu sucursal'), { status: 404 });
  }
  return Mesa.create({ area_id, nombre, asientos, pos_x, pos_y });
}

async function actualizarMesa(id, datos, alcance) {
  const mesa = await obtenerMesa(id, alcance);
  await mesa.update(datos);
  return obtenerMesa(id, alcance);
}

async function actualizarPosicion(id, { pos_x, pos_y }, alcance) {
  const mesa = await obtenerMesa(id, alcance);
  await mesa.update({ pos_x, pos_y });
  return mesa;
}

async function eliminarMesa(id, alcance) {
  const mesa = await obtenerMesa(id, alcance);
  if (mesa.estado === 'ocupada') throw Object.assign(new Error('No se puede eliminar una mesa ocupada'), { status: 409 });
  await mesa.destroy();
}

module.exports = { listarAreas, crearArea, actualizarArea, eliminarArea, listarMesas, obtenerMesa, crearMesa, actualizarMesa, actualizarPosicion, eliminarMesa };
