const express = require('express');
const ctrl = require('../controllers/ventasController');
const { requiereSesion } = require('../middlewares/auth');

const router = express.Router();

router.use(requiereSesion);
router.post('/calcular', ctrl.calcular);
router.post('/', ctrl.crear);
router.get('/:id', ctrl.obtener);

module.exports = router;