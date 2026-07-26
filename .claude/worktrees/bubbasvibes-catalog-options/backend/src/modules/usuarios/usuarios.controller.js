const svc = require('./usuarios.service');

async function listar(req, res, next) {
  try { res.json({ ok: true, datos: await svc.listar() }); }
  catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try { res.json({ ok: true, datos: await svc.obtener(req.params.id) }); }
  catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { nombre, email, contrasena, rol_id, activo } = req.body;
    if (!nombre || !email || !contrasena || !rol_id) {
      return res.status(400).json({ ok: false, mensaje: 'nombre, email, contrasena y rol_id son requeridos' });
    }
    res.status(201).json({ ok: true, datos: await svc.crear({ nombre, email, contrasena, rol_id, activo }) });
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try { res.json({ ok: true, datos: await svc.actualizar(req.params.id, req.body) }); }
  catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    await svc.eliminar(req.params.id, req.usuario.id);
    res.json({ ok: true, datos: null });
  } catch (err) { next(err); }
}

async function actualizarSucursales(req, res, next) {
  try {
    const { sucursal_ids = [], acceso_todas_sucursales = false } = req.body;
    const datos = await svc.actualizarSucursales(req.params.id, sucursal_ids, acceso_todas_sucursales);
    res.json({ ok: true, datos });
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar, actualizarSucursales };
