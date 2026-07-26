const { SesionCaja, DetalleArqueo, Gasto, LibroCaja, Usuario, Pedido, Mesa, Caja, sequelize } = require('../../models');

async function listarConEstado(sucursal_id) {
  const cajas = await Caja.findAll({
    where: { sucursal_id, activo: 1 },
    order: [['nombre', 'ASC']],
  });
  const sesiones = await SesionCaja.findAll({
    where: { caja_id: cajas.map(c => c.id), estado: 'abierta' },
    include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] }],
  });
  return cajas.map(c => {
    const sesion = sesiones.find(s => s.caja_id === c.id) ?? null;
    return { id: c.id, nombre: c.nombre, sesion_abierta: sesion };
  });
}

async function listar(alcance = {}) {
  const where = alcance.acceso_todas ? {} : { sucursal_id: alcance.sucursal_id };
  return SesionCaja.findAll({
    where,
    include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] }],
    order: [['abierto_en', 'DESC']],
    limit: 50,
  });
}

function _verificarAlcance(sesion, alcance) {
  if (alcance && !alcance.acceso_todas && sesion.sucursal_id !== alcance.sucursal_id) {
    throw Object.assign(new Error('Sesión no encontrada'), { status: 404 });
  }
}

async function obtener(id, alcance) {
  const s = await SesionCaja.findByPk(id, {
    include: [
      { model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] },
      { model: DetalleArqueo, as: 'detalle_arqueo' },
      { model: Gasto, as: 'gastos' },
    ],
  });
  if (!s) throw Object.assign(new Error('Sesión no encontrada'), { status: 404 });
  _verificarAlcance(s, alcance);

  const [ventasEfectivo, ventasQR] = await Promise.all([
    LibroCaja.sum('monto', { where: { sesion_caja_id: s.id, tipo: 'ingreso', metodo_pago: 'efectivo' } }),
    LibroCaja.sum('monto', { where: { sesion_caja_id: s.id, tipo: 'ingreso', metodo_pago: 'qr' } }),
  ]);

  const datos = s.toJSON();
  datos.ventas_efectivo = ventasEfectivo || 0;
  datos.ventas_qr       = ventasQR       || 0;
  return datos;
}

async function abrir(usuario_id, caja_id, monto_apertura = 0) {
  const caja = await Caja.findByPk(caja_id);
  if (!caja || !caja.activo) throw Object.assign(new Error('Caja no encontrada'), { status: 404 });

  const abierta = await SesionCaja.findOne({ where: { caja_id, estado: 'abierta' } });
  if (abierta) throw Object.assign(new Error('Esta caja ya tiene una sesión abierta'), { status: 409 });

  return SesionCaja.create({ usuario_id, caja_id, sucursal_id: caja.sucursal_id, monto_apertura });
}

async function registrarGasto(sesion_id, usuario_id, { descripcion, monto }, alcance) {
  const sesion = await SesionCaja.findByPk(sesion_id);
  if (!sesion) throw Object.assign(new Error('Sesión no encontrada'), { status: 404 });
  _verificarAlcance(sesion, alcance);
  if (sesion.estado !== 'abierta') throw Object.assign(new Error('La sesión ya está cerrada'), { status: 409 });
  if (sesion.usuario_id !== usuario_id) throw Object.assign(new Error('Solo el cajero que abrió puede registrar gastos en esta sesión'), { status: 403 });

  const gasto = await Gasto.create({ sesion_caja_id: sesion_id, usuario_id, descripcion, monto });

  await LibroCaja.create({
    sesion_caja_id: sesion_id,
    usuario_id,
    tipo: 'egreso',
    concepto: descripcion,
    monto,
    metodo_pago: 'efectivo',
    referencia_id: gasto.id,
  });

  await SesionCaja.increment('total_gastos', { by: parseFloat(monto), where: { id: sesion_id } });

  return gasto;
}

async function listarGastos(sesion_id, alcance) {
  const sesion = await SesionCaja.findByPk(sesion_id);
  if (!sesion) throw Object.assign(new Error('Sesión no encontrada'), { status: 404 });
  _verificarAlcance(sesion, alcance);
  return Gasto.findAll({
    where: { sesion_caja_id: sesion_id },
    include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] }],
    order: [['creado_en', 'DESC']],
  });
}

async function cerrar(sesion_id, usuario_id, { denominaciones = [], monto_cierre } = {}, alcance) {
  const sesion = await SesionCaja.findByPk(sesion_id);
  if (!sesion) throw Object.assign(new Error('Sesión no encontrada'), { status: 404 });
  _verificarAlcance(sesion, alcance);
  if (sesion.estado !== 'abierta') throw Object.assign(new Error('La sesión ya está cerrada'), { status: 409 });
  if (sesion.usuario_id !== usuario_id) throw Object.assign(new Error('Solo el cajero que abrió puede cerrar la sesión'), { status: 403 });

  // Dos formas de cerrar: conteo detallado por denominación, o un monto total
  // anotado directamente. Son mutuamente excluyentes — si hay denominaciones,
  // el total sale de ahí y se guarda el detalle del arqueo; si no, se usa el
  // monto anotado y no queda detalle de billetes/monedas.
  const total_fisico = denominaciones.length > 0
    ? denominaciones.reduce((sum, d) => sum + (parseFloat(d.denominacion) * parseInt(d.cantidad)), 0)
    : parseFloat(monto_cierre);

  if (!Number.isFinite(total_fisico) || total_fisico <= 0) {
    throw Object.assign(new Error('Debes indicar el conteo de efectivo o el monto total para cerrar la caja'), { status: 400 });
  }

  if (denominaciones.length > 0) {
    await DetalleArqueo.destroy({ where: { sesion_caja_id: sesion_id } });
    await DetalleArqueo.bulkCreate(
      denominaciones.map(d => ({
        sesion_caja_id: sesion_id,
        denominacion: d.denominacion,
        cantidad: d.cantidad,
        subtotal: parseFloat(d.denominacion) * parseInt(d.cantidad),
      }))
    );
  }

  const ventasEfectivo = await LibroCaja.sum('monto', {
    where: { sesion_caja_id: sesion_id, tipo: 'ingreso', metodo_pago: 'efectivo' },
  }) || 0;

  const efectivo_esperado = parseFloat(sesion.monto_apertura) + ventasEfectivo - parseFloat(sesion.total_gastos);
  const diferencia = total_fisico - efectivo_esperado;

  await sesion.update({
    monto_cierre: total_fisico,
    diferencia,
    estado: 'cerrada',
    cerrado_en: new Date(),
  });

  return obtener(sesion_id, alcance);
}

async function reporte(sesion_id, alcance) {
  const sesion = await obtener(sesion_id, alcance);

  const ventasPorMetodoArr = await sequelize.query(
    `SELECT metodo_pago, COUNT(*) as cantidad, SUM(monto) as total
     FROM libro_caja
     WHERE sesion_caja_id = ? AND tipo = 'ingreso'
     GROUP BY metodo_pago`,
    { replacements: [sesion_id], type: sequelize.QueryTypes.SELECT }
  );

  const pedidos = await Pedido.findAll({
    where: { sesion_caja_id: sesion_id, estado: 'completado' },
    include: [{ model: Mesa, as: 'mesa', attributes: ['id', 'nombre'] }],
    order: [['creado_en', 'DESC']],
  });

  const productosVendidos = await sequelize.query(
    `SELECT pr.nombre, SUM(dp.cantidad) AS total_cantidad, SUM(dp.cantidad * dp.precio) AS total
     FROM detalle_pedidos dp
     JOIN pedidos pe ON pe.id = dp.pedido_id
     JOIN productos pr ON pr.id = dp.producto_id
     WHERE pe.sesion_caja_id = ? AND pe.estado = 'completado'
     GROUP BY dp.producto_id, pr.nombre
     ORDER BY total_cantidad DESC`,
    { replacements: [sesion_id], type: sequelize.QueryTypes.SELECT }
  );

  const efectivoEsperado =
    parseFloat(sesion.monto_apertura) +
    parseFloat(ventasPorMetodoArr.find(v => v.metodo_pago === 'efectivo')?.total ?? 0) -
    parseFloat(sesion.total_gastos);

  return {
    sesion,
    ventas_por_metodo: ventasPorMetodoArr,
    pedidos,
    efectivo_esperado: efectivoEsperado,
    productos_vendidos: productosVendidos,
  };
}

module.exports = { listarConEstado, listar, obtener, abrir, registrarGasto, listarGastos, cerrar, reporte };
