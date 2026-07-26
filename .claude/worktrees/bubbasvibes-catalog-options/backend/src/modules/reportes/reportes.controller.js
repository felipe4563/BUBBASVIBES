const svc = require('./reportes.service');

function _alcance(req) {
  return { sucursal_id: req.usuario.sucursal_id, acceso_todas: req.usuario.acceso_todas };
}

async function getVentas(req, res, next) {
  try { res.json({ ok: true, datos: await svc.ventas({ ...req.query, ..._alcance(req) }) }); } catch (e) { next(e); }
}

async function getInventario(req, res, next) {
  try { res.json({ ok: true, datos: await svc.inventario({ ...req.query, ..._alcance(req) }) }); } catch (e) { next(e); }
}

async function getCompras(req, res, next) {
  try { res.json({ ok: true, datos: await svc.compras({ ...req.query, ..._alcance(req) }) }); } catch (e) { next(e); }
}

async function getCaja(req, res, next) {
  try { res.json({ ok: true, datos: await svc.caja({ ...req.query, ..._alcance(req) }) }); } catch (e) { next(e); }
}

module.exports = { getVentas, getInventario, getCompras, getCaja };
