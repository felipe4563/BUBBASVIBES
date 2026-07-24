const rolesService = require('./roles.service');

async function listar(req, res, next) {
  try { res.json({ ok: true, datos: await rolesService.listar() }); }
  catch (err) { next(err); }
}

async function crear(req, res, next) {
  try { res.status(201).json({ ok: true, datos: await rolesService.crear(req.body) }); }
  catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try { res.json({ ok: true, datos: await rolesService.actualizar(req.params.id, req.body) }); }
  catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try { await rolesService.eliminar(req.params.id); res.json({ ok: true, datos: null }); }
  catch (err) { next(err); }
}

async function listarPermisos(req, res, next) {
  try { res.json({ ok: true, datos: await rolesService.listarPermisos() }); }
  catch (err) { next(err); }
}

module.exports = { listar, crear, actualizar, eliminar, listarPermisos };
