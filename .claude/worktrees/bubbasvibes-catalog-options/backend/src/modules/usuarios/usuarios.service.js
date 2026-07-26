const bcrypt = require('bcryptjs');
const { Usuario, Rol, Sucursal } = require('../../models');

const ATTRS_PUBLICOS = { exclude: ['contrasena', 'token_recordar'] };
const INCLUDE_RELS = [
  { model: Rol, as: 'rol', attributes: ['id', 'nombre'] },
  { model: Sucursal, as: 'sucursales', attributes: ['id', 'nombre'], through: { attributes: [] } },
];

async function listar() {
  return Usuario.findAll({ include: INCLUDE_RELS, attributes: ATTRS_PUBLICOS, order: [['creado_en', 'DESC']] });
}

async function obtener(id) {
  const u = await Usuario.findByPk(id, { include: INCLUDE_RELS, attributes: ATTRS_PUBLICOS });
  if (!u) throw Object.assign(new Error('Usuario no encontrado'), { status: 404 });
  return u;
}

async function crear({ nombre, email, contrasena, rol_id, activo = 1 }) {
  const hash = await bcrypt.hash(contrasena, 10);
  const u = await Usuario.create({ nombre, email, contrasena: hash, rol_id, activo });
  return obtener(u.id);
}

async function actualizar(id, { nombre, email, contrasena, rol_id, activo }) {
  const u = await Usuario.findByPk(id);
  if (!u) throw Object.assign(new Error('Usuario no encontrado'), { status: 404 });
  const datos = {};
  if (nombre !== undefined) datos.nombre = nombre;
  if (email !== undefined) datos.email = email;
  if (rol_id !== undefined) datos.rol_id = rol_id;
  if (activo !== undefined) datos.activo = activo;
  if (contrasena) datos.contrasena = await bcrypt.hash(contrasena, 10);
  await u.update(datos);
  return obtener(id);
}

async function eliminar(id, solicitante_id) {
  if (Number(id) === Number(solicitante_id)) {
    throw Object.assign(new Error('No puedes desactivar tu propio usuario'), { status: 409 });
  }
  const u = await Usuario.findByPk(id);
  if (!u) throw Object.assign(new Error('Usuario no encontrado'), { status: 404 });
  await u.update({ activo: 0 });
}

async function actualizarSucursales(id, sucursalIds = [], accesoTodas = false) {
  const u = await Usuario.findByPk(id);
  if (!u) throw Object.assign(new Error('Usuario no encontrado'), { status: 404 });
  await u.update({ acceso_todas_sucursales: accesoTodas ? 1 : 0 });
  const sucursales = sucursalIds.length ? await Sucursal.findAll({ where: { id: sucursalIds } }) : [];
  await u.setSucursales(sucursales);
  return obtener(id);
}

module.exports = { listar, obtener, crear, actualizar, eliminar, actualizarSucursales };
