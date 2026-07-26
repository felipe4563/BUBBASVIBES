const { Router } = require('express');
const ctrl = require('./mesas.controller');
const auth = require('../../middlewares/auth');
const { verificarPermiso } = require('../../middlewares/permisos');
const { requiereSucursalActiva } = require('../../middlewares/sucursalActiva');

const router = Router();
router.use(auth);

router.get('/', verificarPermiso('ventas', 'ver'), ctrl.listarAreas);
router.post('/', verificarPermiso('configuracion', 'editar'), requiereSucursalActiva, ctrl.crearArea);
router.put('/:id', verificarPermiso('configuracion', 'editar'), ctrl.actualizarArea);
router.delete('/:id', verificarPermiso('configuracion', 'editar'), ctrl.eliminarArea);

module.exports = router;
