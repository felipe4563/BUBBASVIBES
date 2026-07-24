const { Router } = require('express');
const ctrl = require('./ventas.controller');
const auth = require('../../middlewares/auth');
const { verificarPermiso } = require('../../middlewares/permisos');
const { requiereSucursalActiva } = require('../../middlewares/sucursalActiva');

const router = Router();
router.use(auth);

router.get('/cocina', verificarPermiso('ventas', 'ver'), ctrl.listarCocina);
router.get('/', verificarPermiso('ventas', 'ver'), ctrl.listar);
router.post('/', verificarPermiso('ventas', 'crear'), requiereSucursalActiva, ctrl.crear);
router.post('/completa', verificarPermiso('ventas', 'crear'), requiereSucursalActiva, ctrl.crearCompleta);
router.get('/:id', verificarPermiso('ventas', 'ver'), ctrl.obtener);
router.post('/:id/items', verificarPermiso('ventas', 'crear'), ctrl.agregarItem);
router.put('/:id/items/:item_id', verificarPermiso('ventas', 'crear'), ctrl.actualizarItem);
router.delete('/:id/items/:item_id', verificarPermiso('ventas', 'crear'), ctrl.eliminarItem);
router.post('/:id/cobrar', verificarPermiso('ventas', 'cobrar'), requiereSucursalActiva, ctrl.cobrar);
router.get('/:id/pago-qr/estado', verificarPermiso('ventas', 'cobrar'), ctrl.estadoPagoQr);
router.post('/:id/pago-qr/cancelar', verificarPermiso('ventas', 'cobrar'), ctrl.cancelarPagoQr);
router.post('/:id/cancelar', verificarPermiso('ventas', 'cancelar'), ctrl.cancelar);
router.patch('/:id/listo', verificarPermiso('ventas', 'ver'), ctrl.marcarListo);

module.exports = router;
