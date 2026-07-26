const svc = require('./configuracion.service');

async function obtenerTodo(req, res, next) {
  try { res.json({ ok: true, datos: await svc.obtenerTodo() }); }
  catch (err) { next(err); }
}

async function obtenerPublica(req, res, next) {
  try { res.json({ ok: true, datos: await svc.obtenerPublica() }); }
  catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ ok: false, mensaje: 'Body debe ser un objeto { clave: valor }' });
    }
    res.json({ ok: true, datos: await svc.actualizar(req.body) });
  } catch (err) { next(err); }
}

module.exports = { obtenerTodo, obtenerPublica, actualizar };
