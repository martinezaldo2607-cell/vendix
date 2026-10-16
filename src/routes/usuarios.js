const express = require('express');
const ctrl = require('../controllers/usuariosController');
const { requiereRol } = require('../middlewares/auth');

const router = express.Router();

router.use(requiereRol('ADMINISTRADOR'));
router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', ctrl.crear);
router.put('/:id', ctrl.actualizar);

module.exports = router;