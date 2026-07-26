const { Caja, Sucursal } = require('../../models');

async function listar({ sucursal_id } = {}) {
  const where = {};
  if (sucursal_id) where.sucursal_id = sucursal_id;
  return Caja.findAll({
    where,
    include: [{ model: Sucursal, as: 'sucursal', attributes: ['id', 'nombre'] }],
    order: [['nombre', 'ASC']],
  });
}

async function crear({ sucursal_id, nombre, activo = 1 }) {
  if (!sucursal_id) throw Object.assign(new Error('sucursal_id es requerido'), { status: 400 });
  if (!nombre || !nombre.trim()) throw Object.assign(new Error('El nombre es requerido'), { status: 400 });
  const sucursal = await Sucursal.findByPk(sucursal_id);
  if (!sucursal) throw Object.assign(new Error('Sucursal no encontrada'), { status: 404 });
  return Caja.create({ sucursal_id, nombre: nombre.trim(), activo });
}

async function actualizar(id, { nombre, activo }) {
  const caja = await Caja.findByPk(id);
  if (!caja) throw Object.assign(new Error('Caja no encontrada'), { status: 404 });
  const datos = {};
  if (nombre !== undefined) datos.nombre = nombre;
  if (activo !== undefined) datos.activo = activo;
  await caja.update(datos);
  return caja;
}

async function eliminar(id) {
  const caja = await Caja.findByPk(id);
  if (!caja) throw Object.assign(new Error('Caja no encontrada'), { status: 404 });
  const sesiones = await caja.countSesiones();
  if (sesiones > 0) throw Object.assign(new Error('La caja tiene sesiones asociadas'), { status: 409 });
  await caja.destroy();
}

module.exports = { listar, crear, actualizar, eliminar };
