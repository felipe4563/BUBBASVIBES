const { Router } = require('express');
const ctrl = require('./cajas.controller');
const auth = require('../../middlewares/auth');
const { verificarPermiso } = require('../../middlewares/permisos');

const router = Router();
router.use(auth);

router.get('/', verificarPermiso('cajas', 'ver'), ctrl.listar);
router.post('/', verificarPermiso('cajas', 'crear'), ctrl.crear);
router.put('/:id', verificarPermiso('cajas', 'editar'), ctrl.actualizar);
router.delete('/:id', verificarPermiso('cajas', 'eliminar'), ctrl.eliminar);

module.exports = router;
