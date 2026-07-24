const { Sucursal } = require('../../models');

async function listar() {
  return Sucursal.findAll({ order: [['nombre', 'ASC']] });
}

// Sin autenticación — usado por el instalador del agente de impresión para
// elegir la sucursal antes de tener credenciales. Solo id + nombre.
async function listarPublico() {
  return Sucursal.findAll({
    where: { activo: 1 },
    attributes: ['id', 'nombre'],
    order: [['nombre', 'ASC']],
  });
}

async function crear({ nombre, direccion, telefono, activo = 1 }) {
  if (!nombre || !nombre.trim()) {
    throw Object.assign(new Error('El nombre es requerido'), { status: 400 });
  }
  return Sucursal.create({ nombre: nombre.trim(), direccion, telefono, activo });
}

async function actualizar(id, { nombre, direccion, telefono, activo }) {
  const sucursal = await Sucursal.findByPk(id);
  if (!sucursal) throw Object.assign(new Error('Sucursal no encontrada'), { status: 404 });
  const datos = {};
  if (nombre !== undefined) datos.nombre = nombre;
  if (direccion !== undefined) datos.direccion = direccion;
  if (telefono !== undefined) datos.telefono = telefono;
  if (activo !== undefined) datos.activo = activo;
  await sucursal.update(datos);
  return sucursal;
}

async function eliminar(id) {
  const sucursal = await Sucursal.findByPk(id);
  if (!sucursal) throw Object.assign(new Error('Sucursal no encontrada'), { status: 404 });
  const usuarios = await sucursal.countUsuarios();
  if (usuarios > 0) throw Object.assign(new Error('La sucursal tiene usuarios asignados'), { status: 409 });
  await sucursal.destroy();
}

module.exports = { listar, listarPublico, crear, actualizar, eliminar };
