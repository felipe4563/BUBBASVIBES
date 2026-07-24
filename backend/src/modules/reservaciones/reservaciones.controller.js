const svc = require('./reservaciones.service');

async function listar(req, res, next) {
  try { res.json({ ok: true, datos: await svc.listar(req.query) }); }
  catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try { res.json({ ok: true, datos: await svc.obtener(req.params.id) }); }
  catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { nombre_cliente, hora_reserva, personas } = req.body;
    if (!nombre_cliente || !hora_reserva || !personas) {
      return res.status(400).json({ ok: false, mensaje: 'nombre_cliente, hora_reserva y personas son requeridos' });
    }
    res.status(201).json({ ok: true, datos: await svc.crear(req.body) });
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try { res.json({ ok: true, datos: await svc.actualizar(req.params.id, req.body) }); }
  catch (err) { next(err); }
}

async function cancelar(req, res, next) {
  try { res.json({ ok: true, datos: await svc.cancelar(req.params.id) }); }
  catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, cancelar };
