const { Router } = require('express');
const ctrl = require('./productos.controller');
const auth = require('../../middlewares/auth');
const { verificarPermiso } = require('../../middlewares/permisos');

const router = Router();
router.use(auth);

router.get('/', verificarPermiso('productos', 'ver'), ctrl.listarGruposOpciones);
router.post('/', verificarPermiso('productos', 'crear'), ctrl.crearGrupoOpciones);
router.put('/:id', verificarPermiso('productos', 'editar'), ctrl.actualizarGrupoOpciones);
router.delete('/:id', verificarPermiso('productos', 'eliminar'), ctrl.eliminarGrupoOpciones);

module.exports = router;
