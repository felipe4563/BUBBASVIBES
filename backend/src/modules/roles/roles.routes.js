const { Router } = require('express');
const ctrl = require('./roles.controller');
const auth = require('../../middlewares/auth');
const { verificarPermiso } = require('../../middlewares/permisos');

const router = Router();

router.use(auth);

router.get('/permisos', verificarPermiso('roles', 'ver'), ctrl.listarPermisos);
router.get('/', verificarPermiso('roles', 'ver'), ctrl.listar);
router.post('/', verificarPermiso('roles', 'crear'), ctrl.crear);
router.put('/:id', verificarPermiso('roles', 'editar'), ctrl.actualizar);
router.delete('/:id', verificarPermiso('roles', 'eliminar'), ctrl.eliminar);

module.exports = router;
