const { Router } = require('express');
const ctrl = require('./usuarios.controller');
const auth = require('../../middlewares/auth');
const { verificarPermiso } = require('../../middlewares/permisos');

const router = Router();
router.use(auth);

router.get('/', verificarPermiso('usuarios', 'ver'), ctrl.listar);
router.post('/', verificarPermiso('usuarios', 'crear'), ctrl.crear);
router.get('/:id', verificarPermiso('usuarios', 'ver'), ctrl.obtener);
router.put('/:id', verificarPermiso('usuarios', 'editar'), ctrl.actualizar);
router.put('/:id/sucursales', verificarPermiso('usuarios', 'editar'), ctrl.actualizarSucursales);
router.delete('/:id', verificarPermiso('usuarios', 'eliminar'), ctrl.eliminar);

module.exports = router;
