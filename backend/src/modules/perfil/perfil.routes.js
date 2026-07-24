const { Router } = require('express');
const ctrl = require('./perfil.controller');
const auth = require('../../middlewares/auth');

const router = Router();
router.use(auth);

router.get('/', ctrl.obtener);
router.put('/', ctrl.actualizar);
router.put('/contrasena', ctrl.cambiarContrasena);

module.exports = router;
