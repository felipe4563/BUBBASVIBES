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

async function manifest(req, res, next) {
  try {
    const backendOrigin = `${req.protocol}://${req.get('host')}`;
    const frontendOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
    const datos = await svc.obtenerManifest({ backendOrigin, frontendOrigin });
    res.set('Content-Type', 'application/manifest+json');
    res.json(datos);
  } catch (err) { next(err); }
}

module.exports = { obtenerTodo, obtenerPublica, actualizar, manifest };
