const { Router } = require('express');
const ctrl = require('./productos.controller');
const auth = require('../../middlewares/auth');
const { verificarPermiso } = require('../../middlewares/permisos');

const router = Router();
router.use(auth);

router.get('/', verificarPermiso('productos', 'ver'), ctrl.listarProductos);
router.post('/', verificarPermiso('productos', 'crear'), ctrl.crearProducto);
router.get('/:id', verificarPermiso('productos', 'ver'), ctrl.obtenerProducto);
router.put('/:id', verificarPermiso('productos', 'editar'), ctrl.actualizarProducto);
router.delete('/:id', verificarPermiso('productos', 'eliminar'), ctrl.eliminarProducto);

module.exports = router;
