const express = require('express');
const ctrl = require('../controllers/productosController');
const { requiereSesion, requiereRol } = require('../middlewares/auth');

const router = express.Router();

router.use(requiereSesion);
router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', requiereRol('ADMINISTRADOR'), ctrl.crear);
router.put('/:id', requiereRol('ADMINISTRADOR'), ctrl.actualizar);
router.delete('/:id', requiereRol('ADMINISTRADOR'), ctrl.eliminar);

module.exports = router;