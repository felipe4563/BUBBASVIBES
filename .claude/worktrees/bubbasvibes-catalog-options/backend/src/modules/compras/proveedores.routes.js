const { Router } = require('express');
const ctrl = require('./compras.controller');
const auth = require('../../middlewares/auth');
const { verificarPermiso } = require('../../middlewares/permisos');

const router = Router();
router.use(auth);

router.get('/', verificarPermiso('proveedores', 'ver'), ctrl.listarProveedores);
router.post('/', verificarPermiso('proveedores', 'crear'), ctrl.crearProveedor);
router.put('/:id', verificarPermiso('proveedores', 'editar'), ctrl.actualizarProveedor);
router.delete('/:id', verificarPermiso('proveedores', 'editar'), ctrl.desactivarProveedor);

module.exports = router;
