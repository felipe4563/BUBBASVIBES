const { Router } = require('express');
const ctrl = require('./libro_caja.controller');
const auth = require('../../middlewares/auth');
const { verificarPermiso } = require('../../middlewares/permisos');

const router = Router();
router.use(auth);

router.get('/', verificarPermiso('libro_caja', 'ver'), ctrl.listar);
router.post('/', verificarPermiso('libro_caja', 'crear'), ctrl.crear);

module.exports = router;
