const svc = require('./compras.service');

function _alcance(req) {
  return { sucursal_id: req.usuario.sucursal_id, acceso_todas: req.usuario.acceso_todas };
}

async function listarProveedores(req, res, next) {
  try { res.json({ ok: true, datos: await svc.listarProveedores() }); }
  catch (err) { next(err); }
}

async function crearProveedor(req, res, next) {
  try {
    if (!req.body.nombre) return res.status(400).json({ ok: false, mensaje: 'nombre es requerido' });
    res.status(201).json({ ok: true, datos: await svc.crearProveedor(req.body) });
  } catch (err) { next(err); }
}

async function actualizarProveedor(req, res, next) {
  try { res.json({ ok: true, datos: await svc.actualizarProveedor(req.params.id, req.body) }); }
  catch (err) { next(err); }
}

async function desactivarProveedor(req, res, next) {
  try { await svc.desactivarProveedor(req.params.id); res.json({ ok: true, datos: null }); }
  catch (err) { next(err); }
}

async function listarCompras(req, res, next) {
  try { res.json({ ok: true, datos: await svc.listarCompras(_alcance(req)) }); }
  catch (err) { next(err); }
}

async function obtenerCompra(req, res, next) {
  try { res.json({ ok: true, datos: await svc.obtenerCompra(req.params.id, _alcance(req)) }); }
  catch (err) { next(err); }
}

async function crearCompra(req, res, next) {
  try {
    const { proveedor_id, items } = req.body;
    if (!proveedor_id || !items || !items.length) {
      return res.status(400).json({ ok: false, mensaje: 'proveedor_id e items son requeridos' });
    }
    res.status(201).json({ ok: true, datos: await svc.crearCompra(req.usuario.id, req.usuario.sucursal_id, req.body) });
  } catch (err) { next(err); }
}

async function actualizarCompra(req, res, next) {
  try { res.json({ ok: true, datos: await svc.actualizarCompra(req.params.id, req.body, _alcance(req)) }); }
  catch (err) { next(err); }
}

async function recibirCompra(req, res, next) {
  try { res.json({ ok: true, datos: await svc.recibirCompra(req.params.id, req.usuario.id, _alcance(req)) }); }
  catch (err) { next(err); }
}

module.exports = { listarProveedores, crearProveedor, actualizarProveedor, desactivarProveedor, listarCompras, obtenerCompra, crearCompra, actualizarCompra, recibirCompra };
