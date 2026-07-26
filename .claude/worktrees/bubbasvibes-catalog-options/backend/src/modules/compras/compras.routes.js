const { Router } = require('express');
const ctrl = require('./compras.controller');
const auth = require('../../middlewares/auth');
const { verificarPermiso } = require('../../middlewares/permisos');
const { requiereSucursalActiva } = require('../../middlewares/sucursalActiva');

const router = Router();
router.use(auth);

router.get('/', verificarPermiso('compras', 'ver'), ctrl.listarCompras);
router.post('/', verificarPermiso('compras', 'crear'), requiereSucursalActiva, ctrl.crearCompra);
router.get('/:id', verificarPermiso('compras', 'ver'), ctrl.obtenerCompra);
router.put('/:id', verificarPermiso('compras', 'editar'), ctrl.actualizarCompra);
router.put('/:id/recibir', verificarPermiso('compras', 'recibir'), requiereSucursalActiva, ctrl.recibirCompra);

module.exports = router;
