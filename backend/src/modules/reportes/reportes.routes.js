const { Router } = require('express');
const ctrl = require('./reportes.controller');
const auth = require('../../middlewares/auth');
const { verificarPermiso } = require('../../middlewares/permisos');

const router = Router();
router.use(auth);

router.get('/ventas',     verificarPermiso('reportes', 'ver'), ctrl.getVentas);
router.get('/inventario', verificarPermiso('reportes', 'ver'), ctrl.getInventario);
router.get('/compras',    verificarPermiso('reportes', 'ver'), ctrl.getCompras);
router.get('/caja',       verificarPermiso('reportes', 'ver'), ctrl.getCaja);

module.exports = router;
