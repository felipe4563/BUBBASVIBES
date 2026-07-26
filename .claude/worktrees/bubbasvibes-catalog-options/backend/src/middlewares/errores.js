const { ValidationError } = require('sequelize');

function manejarErrores(err, _req, res, _next) {
  console.error(err);

  if (err instanceof ValidationError) {
    return res.status(400).json({
      ok: false,
      mensaje: err.errors.map(e => e.message).join(', '),
    });
  }

  const estado = err.status || 500;
  const esProduccion = process.env.NODE_ENV === 'production';
  const mensaje = (esProduccion && estado === 500)
    ? 'Error interno del servidor'
    : (err.message || 'Error interno del servidor');

  res.status(estado).json({ ok: false, mensaje });
}

module.exports = manejarErrores;
