const express = require('express');
const ctrl = require('../controllers/reportesController');
const { requiereRol } = require('../middlewares/auth');

const router = express.Router();

router.use(requiereRol('ADMINISTRADOR'));
router.get('/', ctrl.generar);
router.get('/exportar', ctrl.exportar);

module.exports = router;