const svc = require('./ventas.service');

function _alcance(req) {
  return { sucursal_id: req.usuario.sucursal_id, acceso_todas: req.usuario.acceso_todas };
}

async function listar(req, res, next) {
  try { res.json({ ok: true, datos: await svc.listar({ ...req.query, ..._alcance(req) }) }); }
  catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try { res.json({ ok: true, datos: await svc.obtener(req.params.id, _alcance(req)) }); }
  catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { mesa_id, tipo = 'mesa' } = req.body;
    if (tipo === 'mesa' && !mesa_id) return res.status(400).json({ ok: false, mensaje: 'mesa_id es requerido' });
    const datos = { ...req.body, usuario_id: req.usuario.id };
    res.status(201).json({ ok: true, datos: await svc.crear(datos) });
  } catch (err) { next(err); }
}

async function crearCompleta(req, res, next) {
  try {
    const { tipo, items, metodo_pago } = req.body;
    if (!tipo) return res.status(400).json({ ok: false, mensaje: "tipo es requerido ('mesa' o 'llevar')" });
    if (!items || !items.length) return res.status(400).json({ ok: false, mensaje: 'items es requerido y no puede estar vacío' });
    if (!metodo_pago) return res.status(400).json({ ok: false, mensaje: 'metodo_pago es requerido (efectivo|qr)' });
    const datos = { ...req.body, usuario_id: req.usuario.id };
    res.status(201).json({ ok: true, datos: await svc.crearCompleta(datos) });
  } catch (err) { next(err); }
}

async function agregarItem(req, res, next) {
  try {
    const { producto_id, cantidad, nota } = req.body;
    if (!producto_id) return res.status(400).json({ ok: false, mensaje: 'producto_id es requerido' });
    res.status(201).json({ ok: true, datos: await svc.agregarItem(req.params.id, { producto_id, cantidad, nota }, _alcance(req)) });
  } catch (err) { next(err); }
}

async function actualizarItem(req, res, next) {
  try { res.json({ ok: true, datos: await svc.actualizarItem(req.params.id, req.params.item_id, req.body, _alcance(req)) }); }
  catch (err) { next(err); }
}

async function eliminarItem(req, res, next) {
  try { await svc.eliminarItem(req.params.id, req.params.item_id, _alcance(req)); res.json({ ok: true, datos: null }); }
  catch (err) { next(err); }
}

async function cobrar(req, res, next) {
  try {
    const { metodo_pago } = req.body;
    if (!metodo_pago) return res.status(400).json({ ok: false, mensaje: 'metodo_pago es requerido (efectivo|qr)' });
    res.json({ ok: true, datos: await svc.cobrar(req.params.id, req.usuario.id, req.body, _alcance(req)) });
  } catch (err) { next(err); }
}

async function cancelar(req, res, next) {
  try { res.json({ ok: true, datos: await svc.cancelar(req.params.id, req.usuario.id, _alcance(req)) }); }
  catch (err) { next(err); }
}

async function listarCocina(req, res, next) {
  try { res.json({ ok: true, datos: await svc.listarCocina(_alcance(req)) }); }
  catch (err) { next(err); }
}

async function marcarListo(req, res, next) {
  try { res.json({ ok: true, datos: await svc.marcarListo(req.params.id, _alcance(req)) }); }
  catch (err) { next(err); }
}

async function estadoPagoQr(req, res, next) {
  try { res.json({ ok: true, datos: await svc.consultarEstadoPagoQr(req.params.id, _alcance(req)) }); }
  catch (err) { next(err); }
}

async function cancelarPagoQr(req, res, next) {
  try { res.json({ ok: true, datos: await svc.cancelarPagoQr(req.params.id, _alcance(req)) }); }
  catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, crearCompleta, agregarItem, actualizarItem, eliminarItem, cobrar, cancelar, listarCocina, marcarListo, estadoPagoQr, cancelarPagoQr };
