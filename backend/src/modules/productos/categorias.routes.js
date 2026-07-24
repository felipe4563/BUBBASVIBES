const { Router } = require('express');
const ctrl = require('./productos.controller');
const auth = require('../../middlewares/auth');
const { verificarPermiso } = require('../../middlewares/permisos');

const router = Router();
router.use(auth);

router.get('/', verificarPermiso('productos', 'ver'), ctrl.listarCategorias);
router.post('/', verificarPermiso('productos', 'crear'), ctrl.crearCategoria);
router.put('/:id', verificarPermiso('productos', 'editar'), ctrl.actualizarCategoria);
router.delete('/:id', verificarPermiso('productos', 'eliminar'), ctrl.eliminarCategoria);

module.exports = router;
