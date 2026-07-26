const { Router } = require('express');
const ctrl = require('./clientes.controller');
const auth = require('../../middlewares/auth');
const { verificarPermiso } = require('../../middlewares/permisos');

const router = Router();
router.use(auth);

router.get('/', verificarPermiso('clientes', 'ver'), ctrl.listar);
router.post('/', verificarPermiso('clientes', 'crear'), ctrl.crear);
router.get('/:id', verificarPermiso('clientes', 'ver'), ctrl.obtener);
router.put('/:id', verificarPermiso('clientes', 'editar'), ctrl.actualizar);

module.exports = router;
