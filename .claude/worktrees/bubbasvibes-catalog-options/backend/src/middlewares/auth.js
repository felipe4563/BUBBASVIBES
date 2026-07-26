const jwt = require('jsonwebtoken');
const { Usuario, Rol, Permiso } = require('../models');

async function auth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, mensaje: 'Token requerido' });
  }

  const token = header.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (payload.tipo === 'pre_login') {
      return res.status(401).json({ ok: false, mensaje: 'Token inválido o expirado' });
    }

    const usuario = await Usuario.findOne({
      where: { id: payload.id, activo: 1 },
      include: [{
        model: Rol,
        as: 'rol',
        include: [{ model: Permiso, as: 'permisos' }],
      }],
    });

    if (!usuario) {
      return res.status(401).json({ ok: false, mensaje: 'Usuario no encontrado' });
    }

    const sucursalId = payload.sucursal_id ?? null;

    req.usuario = {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol_id: usuario.rol_id,
      permisos: usuario.rol.permisos.map(p => `${p.modulo}.${p.accion}`),
      sucursal_id: sucursalId,
      acceso_todas: sucursalId === null,
    };

    next();
  } catch {
    return res.status(401).json({ ok: false, mensaje: 'Token inválido o expirado' });
  }
}

module.exports = auth;
