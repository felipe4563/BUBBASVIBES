const { LibroCaja, SesionCaja, Usuario } = require('../../models');

const INCLUDE_LB = [
  { model: SesionCaja, as: 'sesion_caja', attributes: ['id', 'estado', 'abierto_en'] },
  { model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] },
];

async function _verificarSesionEnAlcance(sesion_caja_id, alcance) {
  const sesion = await SesionCaja.findByPk(sesion_caja_id);
  if (!sesion) throw Object.assign(new Error('Sesión de caja no encontrada'), { status: 404 });
  if (alcance && !alcance.acceso_todas && sesion.sucursal_id !== alcance.sucursal_id) {
    throw Object.assign(new Error('Sesión de caja no encontrada'), { status: 404 });
  }
  return sesion;
}

async function listar({ sesion_caja_id } = {}, alcance) {
  if (sesion_caja_id) {
    await _verificarSesionEnAlcance(sesion_caja_id, alcance);
    return LibroCaja.findAll({ where: { sesion_caja_id }, include: INCLUDE_LB, order: [['creado_en', 'DESC']] });
  }

  const include = alcance && !alcance.acceso_todas
    ? [{ ...INCLUDE_LB[0], where: { sucursal_id: alcance.sucursal_id } }, INCLUDE_LB[1]]
    : INCLUDE_LB;

  return LibroCaja.findAll({ include, order: [['creado_en', 'DESC']] });
}

async function crear(usuario_id, { sesion_caja_id, tipo, concepto, monto, metodo_pago = 'efectivo' }, alcance) {
  if (!['ingreso', 'egreso'].includes(tipo)) throw Object.assign(new Error('tipo debe ser ingreso o egreso'), { status: 400 });
  await _verificarSesionEnAlcance(sesion_caja_id, alcance);
  return LibroCaja.create({ sesion_caja_id, usuario_id, tipo, concepto, monto, metodo_pago });
}

module.exports = { listar, crear };
