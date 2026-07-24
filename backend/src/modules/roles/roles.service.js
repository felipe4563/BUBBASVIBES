const { Rol, Permiso, Usuario } = require('../../models');

async function listar() {
  return Rol.findAll({ include: [{ model: Permiso, as: 'permisos' }] });
}

async function crear({ nombre, descripcion, permiso_ids = [] }) {
  const rol = await Rol.create({ nombre, descripcion });
  if (permiso_ids.length) {
    const permisos = await Permiso.findAll({ where: { id: permiso_ids } });
    await rol.setPermisos(permisos);
  }
  return Rol.findByPk(rol.id, { include: [{ model: Permiso, as: 'permisos' }] });
}

async function actualizar(id, { nombre, descripcion, permiso_ids }) {
  const rol = await Rol.findByPk(id);
  if (!rol) throw Object.assign(new Error('Rol no encontrado'), { status: 404 });
  await rol.update({ nombre, descripcion });
  if (permiso_ids !== undefined) {
    const permisos = await Permiso.findAll({ where: { id: permiso_ids } });
    await rol.setPermisos(permisos);
  }
  return Rol.findByPk(id, { include: [{ model: Permiso, as: 'permisos' }] });
}

async function eliminar(id) {
  const rol = await Rol.findByPk(id);
  if (!rol) throw Object.assign(new Error('Rol no encontrado'), { status: 404 });
  const usuarios = await Usuario.count({ where: { rol_id: id } });
  if (usuarios > 0) throw Object.assign(new Error('El rol tiene usuarios asignados'), { status: 409 });
  await rol.destroy();
}

async function listarPermisos() {
  const permisos = await Permiso.findAll({ order: [['modulo', 'ASC'], ['accion', 'ASC']] });
  return permisos.reduce((acc, p) => {
    if (!acc[p.modulo]) acc[p.modulo] = [];
    acc[p.modulo].push({ id: p.id, accion: p.accion, descripcion: p.descripcion });
    return acc;
  }, {});
}

module.exports = { listar, crear, actualizar, eliminar, listarPermisos };
