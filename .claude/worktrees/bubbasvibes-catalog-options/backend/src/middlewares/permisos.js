function verificarPermiso(modulo, accion) {
  return (req, res, next) => {
    const permiso = `${modulo}.${accion}`;
    if (!req.usuario || !req.usuario.permisos.includes(permiso)) {
      return res.status(403).json({ ok: false, mensaje: `Sin permiso: ${permiso}` });
    }
    next();
  };
}

module.exports = { verificarPermiso };
