const { Router } = require('express');
const ctrl = require('./reservaciones.controller');
const auth = require('../../middlewares/auth');
const { verificarPermiso } = require('../../middlewares/permisos');

const router = Router();
router.use(auth);

router.get('/', verificarPermiso('ventas', 'ver'), ctrl.listar);
router.post('/', verificarPermiso('ventas', 'crear'), ctrl.crear);
router.get('/:id', verificarPermiso('ventas', 'ver'), ctrl.obtener);
router.put('/:id', verificarPermiso('ventas', 'crear'), ctrl.actualizar);
router.post('/:id/cancelar', verificarPermiso('ventas', 'cancelar'), ctrl.cancelar);

module.exports = router;
