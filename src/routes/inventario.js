const express = require('express');
const ctrl = require('../controllers/inventarioController');
const { requiereSesion, requiereRol } = require('../middlewares/auth');

const router = express.Router();

router.use(requiereSesion);
router.get('/', ctrl.listar);
router.post('/entradas', requiereRol('ADMINISTRADOR'), ctrl.registrarEntrada);

module.exports = router;