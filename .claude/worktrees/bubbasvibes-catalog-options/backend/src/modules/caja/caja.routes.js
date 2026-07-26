const { Router } = require('express');
const ctrl = require('./caja.controller');
const auth = require('../../middlewares/auth');
const { verificarPermiso } = require('../../middlewares/permisos');

const router = Router();
router.use(auth);

router.get('/estado', verificarPermiso('caja', 'ver'), ctrl.estado);
router.get('/', verificarPermiso('caja', 'ver'), ctrl.listar);
router.post('/abrir', verificarPermiso('caja', 'abrir'), ctrl.abrir);
router.get('/:id', verificarPermiso('caja', 'ver'), ctrl.obtener);
router.get('/:id/gastos', verificarPermiso('caja', 'ver'), ctrl.listarGastos);
router.post('/:id/gastos', verificarPermiso('caja', 'ver'), ctrl.registrarGasto);
router.post('/:id/cerrar', verificarPermiso('caja', 'cerrar'), ctrl.cerrar);
router.get('/:id/reporte', verificarPermiso('caja', 'ver'), ctrl.reporte);

module.exports = router;
