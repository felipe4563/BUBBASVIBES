const { Op } = require('sequelize');
const { Cliente } = require('../../models');

async function listar({ buscar } = {}) {
  const where = {};
  if (buscar) {
    where[Op.or] = [
      { nombre: { [Op.like]: `%${buscar}%` } },
      { numero_documento: { [Op.like]: `%${buscar}%` } },
    ];
  }
  return Cliente.findAll({ where, order: [['nombre', 'ASC']] });
}

async function obtener(id) {
  const c = await Cliente.findByPk(id);
  if (!c) throw Object.assign(new Error('Cliente no encontrado'), { status: 404 });
  return c;
}

async function crear({ nombre, tipo_documento = 'CI', numero_documento, email, telefono, direccion }) {
  return Cliente.create({ nombre, tipo_documento, numero_documento, email, telefono, direccion });
}

async function actualizar(id, datos) {
  const c = await Cliente.findByPk(id);
  if (!c) throw Object.assign(new Error('Cliente no encontrado'), { status: 404 });
  await c.update(datos);
  return c;
}

module.exports = { listar, obtener, crear, actualizar };
