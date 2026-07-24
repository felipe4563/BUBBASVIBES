const svc = require('./caja.service');
const { Caja } = require('../../models');

function _alcance(req) {
  return { sucursal_id: req.usuario.sucursal_id, acceso_todas: req.usuario.acceso_todas };
}

async function estado(req, res, next) {
  try {
    const sucursal_id = req.usuario.acceso_todas ? req.query.sucursal_id : req.usuario.sucursal_id;
    if (!sucursal_id) return res.status(400).json({ ok: false, mensaje: 'sucursal_id es requerido' });
    res.json({ ok: true, datos: await svc.listarConEstado(sucursal_id) });
  } catch (err) { next(err); }
}

async function listar(req, res, next) {
  try { res.json({ ok: true, datos: await svc.listar(_alcance(req)) }); }
  catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try { res.json({ ok: true, datos: await svc.obtener(req.params.id, _alcance(req)) }); }
  catch (err) { next(err); }
}

async function abrir(req, res, next) {
  try {
    const { caja_id, monto_apertura } = req.body;
    if (!caja_id) return res.status(400).json({ ok: false, mensaje: 'caja_id es requerido' });

    const caja = await Caja.findByPk(caja_id);
    if (!caja) return res.status(404).json({ ok: false, mensaje: 'Caja no encontrada' });
    if (!req.usuario.acceso_todas && caja.sucursal_id !== req.usuario.sucursal_id) {
      return res.status(404).json({ ok: false, mensaje: 'Caja no encontrada' });
    }

    res.status(201).json({ ok: true, datos: await svc.abrir(req.usuario.id, caja_id, monto_apertura) });
  } catch (err) { next(err); }
}

async function registrarGasto(req, res, next) {
  try {
    const { descripcion, monto } = req.body;
    if (!descripcion || monto === undefined) return res.status(400).json({ ok: false, mensaje: 'descripcion y monto son requeridos' });
    res.status(201).json({ ok: true, datos: await svc.registrarGasto(req.params.id, req.usuario.id, { descripcion, monto }, _alcance(req)) });
  } catch (err) { next(err); }
}

async function listarGastos(req, res, next) {
  try { res.json({ ok: true, datos: await svc.listarGastos(req.params.id, _alcance(req)) }); }
  catch (err) { next(err); }
}

async function cerrar(req, res, next) {
  try {
    const { denominaciones = [], monto_cierre } = req.body;
    res.json({ ok: true, datos: await svc.cerrar(req.params.id, req.usuario.id, { denominaciones, monto_cierre }, _alcance(req)) });
  } catch (err) { next(err); }
}

async function reporte(req, res, next) {
  try { res.json({ ok: true, datos: await svc.reporte(req.params.id, _alcance(req)) }); }
  catch (err) { next(err); }
}

module.exports = { estado, listar, obtener, abrir, registrarGasto, listarGastos, cerrar, reporte };
