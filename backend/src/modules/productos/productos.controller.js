const svc = require('./productos.service');

function _alcance(req) {
  return { sucursal_id: req.usuario.sucursal_id, acceso_todas: req.usuario.acceso_todas, usuario_id: req.usuario.id };
}

async function listarCategorias(req, res, next) {
  try { res.json({ ok: true, datos: await svc.listarCategorias() }); }
  catch (err) { next(err); }
}

async function crearCategoria(req, res, next) {
  try {
    if (!req.body.nombre) return res.status(400).json({ ok: false, mensaje: 'nombre es requerido' });
    res.status(201).json({ ok: true, datos: await svc.crearCategoria(req.body) });
  } catch (err) { next(err); }
}

async function actualizarCategoria(req, res, next) {
  try { res.json({ ok: true, datos: await svc.actualizarCategoria(req.params.id, req.body) }); }
  catch (err) { next(err); }
}

async function eliminarCategoria(req, res, next) {
  try { await svc.eliminarCategoria(req.params.id); res.json({ ok: true, datos: null }); }
  catch (err) { next(err); }
}

async function listarGruposOpciones(req, res, next) {
  try { res.json({ ok: true, datos: await svc.listarGruposOpciones() }); }
  catch (err) { next(err); }
}

async function crearGrupoOpciones(req, res, next) {
  try {
    if (!req.body.nombre) return res.status(400).json({ ok: false, mensaje: 'nombre es requerido' });
    res.status(201).json({ ok: true, datos: await svc.crearGrupoOpciones(req.body) });
  } catch (err) { next(err); }
}

async function actualizarGrupoOpciones(req, res, next) {
  try { res.json({ ok: true, datos: await svc.actualizarGrupoOpciones(req.params.id, req.body) }); }
  catch (err) { next(err); }
}

async function eliminarGrupoOpciones(req, res, next) {
  try { await svc.eliminarGrupoOpciones(req.params.id); res.json({ ok: true, datos: null }); }
  catch (err) { next(err); }
}

async function listarProductos(req, res, next) {
  try { res.json({ ok: true, datos: await svc.listarProductos(req.query, _alcance(req)) }); }
  catch (err) { next(err); }
}

async function obtenerProducto(req, res, next) {
  try { res.json({ ok: true, datos: await svc.obtenerProducto(req.params.id, _alcance(req)) }); }
  catch (err) { next(err); }
}

function _precioInvalido(precio) {
  return precio !== undefined && !(parseFloat(precio) > 1);
}

async function crearProducto(req, res, next) {
  try {
    const { categoria_id, nombre, precio } = req.body;
    if (!categoria_id || !nombre || precio === undefined) {
      return res.status(400).json({ ok: false, mensaje: 'categoria_id, nombre y precio son requeridos' });
    }
    if (_precioInvalido(precio)) {
      return res.status(400).json({ ok: false, mensaje: 'El precio debe ser mayor a 1' });
    }
    res.status(201).json({ ok: true, datos: await svc.crearProducto(req.body, _alcance(req)) });
  } catch (err) { next(err); }
}

async function actualizarProducto(req, res, next) {
  try {
    if (_precioInvalido(req.body.precio)) {
      return res.status(400).json({ ok: false, mensaje: 'El precio debe ser mayor a 1' });
    }
    res.json({ ok: true, datos: await svc.actualizarProducto(req.params.id, req.body, _alcance(req)) });
  } catch (err) { next(err); }
}

async function eliminarProducto(req, res, next) {
  try { await svc.eliminarProducto(req.params.id); res.json({ ok: true, datos: null }); }
  catch (err) { next(err); }
}

module.exports = { listarCategorias, crearCategoria, actualizarCategoria, eliminarCategoria, listarGruposOpciones, crearGrupoOpciones, actualizarGrupoOpciones, eliminarGrupoOpciones, listarProductos, obtenerProducto, crearProducto, actualizarProducto, eliminarProducto };
