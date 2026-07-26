const svc = require('./libro_caja.service');

function _alcance(req) {
  return { sucursal_id: req.usuario.sucursal_id, acceso_todas: req.usuario.acceso_todas };
}

async function listar(req, res, next) {
  try { res.json({ ok: true, datos: await svc.listar(req.query, _alcance(req)) }); }
  catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { tipo, concepto, monto, sesion_caja_id } = req.body;
    if (!tipo || !concepto || monto === undefined) {
      return res.status(400).json({ ok: false, mensaje: 'tipo, concepto y monto son requeridos' });
    }
    if (!sesion_caja_id) {
      return res.status(400).json({ ok: false, mensaje: 'sesion_caja_id es requerido' });
    }
    res.status(201).json({ ok: true, datos: await svc.crear(req.usuario.id, req.body, _alcance(req)) });
  } catch (err) { next(err); }
}

module.exports = { listar, crear };
