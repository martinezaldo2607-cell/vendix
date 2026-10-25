const express = require('express');
const ctrl = require('../controllers/mantenimientoController');
const { requiereRol } = require('../middlewares/auth');

const router = express.Router();

router.use(requiereRol('ADMINISTRADOR'));
router.get('/resumen', ctrl.resumen);
router.post('/vaciar-catalogo', ctrl.vaciarCatalogo);
router.post('/reiniciar', ctrl.reiniciar);

module.exports = router;