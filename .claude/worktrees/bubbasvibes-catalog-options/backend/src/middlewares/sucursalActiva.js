// backend/src/middlewares/sucursalActiva.js
function requiereSucursalActiva(req, res, next) {
  if (req.usuario.sucursal_id === null) {
    return res.status(403).json({
      ok: false,
      mensaje: 'Debes iniciar sesión en una sucursal específica para realizar esta acción',
    });
  }
  next();
}

module.exports = { requiereSucursalActiva };
