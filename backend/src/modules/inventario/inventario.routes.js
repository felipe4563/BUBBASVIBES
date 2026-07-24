const { Router } = require('express');
const ctrl = require('./inventario.controller');
const auth = require('../../middlewares/auth');
const { verificarPermiso } = require('../../middlewares/permisos');

const router = Router();
router.use(auth);

router.get('/', verificarPermiso('inventario', 'ver'), ctrl.listar);
router.get('/producto/:id', verificarPermiso('inventario', 'ver'), ctrl.listarPorProducto);
router.post('/entrada', verificarPermiso('inventario', 'entrada'), ctrl.entrada);
router.post('/salida', verificarPermiso('inventario', 'salida'), ctrl.salida);
router.post('/ajuste', verificarPermiso('inventario', 'ajustar'), ctrl.ajuste);

module.exports = router;
