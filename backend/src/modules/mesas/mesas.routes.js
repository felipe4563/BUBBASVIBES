const { Router } = require('express');
const ctrl = require('./mesas.controller');
const auth = require('../../middlewares/auth');
const { verificarPermiso } = require('../../middlewares/permisos');
const { requiereSucursalActiva } = require('../../middlewares/sucursalActiva');

const router = Router();
router.use(auth);

router.get('/', verificarPermiso('ventas', 'ver'), ctrl.listarMesas);
router.post('/', verificarPermiso('configuracion', 'editar'), requiereSucursalActiva, ctrl.crearMesa);
router.get('/:id', verificarPermiso('ventas', 'ver'), ctrl.obtenerMesa);
router.put('/:id', verificarPermiso('configuracion', 'editar'), ctrl.actualizarMesa);
router.patch('/:id/posicion', verificarPermiso('configuracion', 'editar'), ctrl.actualizarPosicion);
router.delete('/:id', verificarPermiso('configuracion', 'editar'), ctrl.eliminarMesa);

module.exports = router;
