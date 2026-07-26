const bcrypt = require('bcryptjs');
const { Usuario, Rol } = require('../../models');

async function obtener(req, res, next) {
  try {
    const u = await Usuario.findByPk(req.usuario.id, {
      attributes: { exclude: ['contrasena', 'token_recordar'] },
      include: [{ model: Rol, as: 'rol', attributes: ['id', 'nombre'] }],
    });
    res.json({ ok: true, datos: u });
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const { nombre, email } = req.body;
    if (!nombre && !email) {
      return res.status(400).json({ ok: false, mensaje: 'Proporciona al menos nombre o email' });
    }
    const u = await Usuario.findByPk(req.usuario.id);
    const datos = {};
    if (nombre) datos.nombre = nombre.trim();
    if (email)  datos.email  = email.trim().toLowerCase();

    // Check email uniqueness if changing
    if (datos.email && datos.email !== u.email) {
      const existe = await Usuario.findOne({ where: { email: datos.email } });
      if (existe) return res.status(409).json({ ok: false, mensaje: 'Ese correo ya está en uso' });
    }

    await u.update(datos);
    // Return updated user without sensitive fields
    const actualizado = await Usuario.findByPk(u.id, {
      attributes: { exclude: ['contrasena', 'token_recordar'] },
      include: [{ model: Rol, as: 'rol', attributes: ['id', 'nombre'] }],
    });
    res.json({ ok: true, datos: actualizado });
  } catch (err) { next(err); }
}

async function cambiarContrasena(req, res, next) {
  try {
    const { contrasena_actual, nueva_contrasena } = req.body;
    if (!contrasena_actual || !nueva_contrasena) {
      return res.status(400).json({ ok: false, mensaje: 'contrasena_actual y nueva_contrasena son requeridos' });
    }
    if (nueva_contrasena.length < 6) {
      return res.status(400).json({ ok: false, mensaje: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    const u = await Usuario.findByPk(req.usuario.id);
    const valida = await bcrypt.compare(contrasena_actual, u.contrasena);
    if (!valida) {
      return res.status(401).json({ ok: false, mensaje: 'La contraseña actual es incorrecta' });
    }

    await u.update({ contrasena: await bcrypt.hash(nueva_contrasena, 10) });
    res.json({ ok: true, datos: null });
  } catch (err) { next(err); }
}

module.exports = { obtener, actualizar, cambiarContrasena };
