const express = require('express');
const ctrl = require('../controllers/respaldosController');
const { requiereRol } = require('../middlewares/auth');

const router = express.Router();

router.use(requiereRol('ADMINISTRADOR'));
router.get('/', ctrl.listar);
router.post('/', ctrl.crear);
router.get('/:nombre', ctrl.descargar);
router.post('/:nombre/restaurar', ctrl.restaurar);

module.exports = router;