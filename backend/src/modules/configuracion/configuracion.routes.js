const { Router } = require('express');
const ctrl = require('./configuracion.controller');
const auth = require('../../middlewares/auth');
const { verificarPermiso } = require('../../middlewares/permisos');

const router = Router();

// Ruta pública — solo nombre y logo, sin token
router.get('/publica', ctrl.obtenerPublica);

router.use(auth);
router.get('/', verificarPermiso('configuracion', 'ver'), ctrl.obtenerTodo);
router.put('/', verificarPermiso('configuracion', 'editar'), ctrl.actualizar);

module.exports = router;
