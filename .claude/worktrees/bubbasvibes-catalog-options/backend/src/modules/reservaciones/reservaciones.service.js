const { Op } = require('sequelize');
const { Reservacion, Mesa } = require('../../models');

async function listar({ fecha, estado } = {}) {
  const where = {};
  if (estado) where.estado = estado;
  if (fecha) {
    const inicio = new Date(fecha);
    const fin = new Date(fecha);
    fin.setDate(fin.getDate() + 1);
    where.hora_reserva = { [Op.between]: [inicio, fin] };
  }
  return Reservacion.findAll({
    where,
    include: [{ model: Mesa, as: 'mesa', attributes: ['id', 'nombre'] }],
    order: [['hora_reserva', 'ASC']],
  });
}

async function obtener(id) {
  const r = await Reservacion.findByPk(id, {
    include: [{ model: Mesa, as: 'mesa', attributes: ['id', 'nombre'] }],
  });
  if (!r) throw Object.assign(new Error('Reservación no encontrada'), { status: 404 });
  return r;
}

async function crear({ nombre_cliente, telefono, hora_reserva, personas, mesa_id, nota }) {
  return Reservacion.create({ nombre_cliente, telefono, hora_reserva, personas, mesa_id, nota });
}

async function actualizar(id, datos) {
  const r = await Reservacion.findByPk(id);
  if (!r) throw Object.assign(new Error('Reservación no encontrada'), { status: 404 });
  if (r.estado === 'cancelada') throw Object.assign(new Error('No se puede modificar una reservación cancelada'), { status: 409 });
  await r.update(datos);
  return obtener(id);
}

async function cancelar(id) {
  const r = await Reservacion.findByPk(id);
  if (!r) throw Object.assign(new Error('Reservación no encontrada'), { status: 404 });
  await r.update({ estado: 'cancelada' });
  return r;
}

module.exports = { listar, obtener, crear, actualizar, cancelar };
