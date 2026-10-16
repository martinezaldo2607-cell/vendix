const express = require('express');
const Config = require('../models/configuracion');
const { requiereSesion } = require('../middlewares/auth');

const router = express.Router();

router.get('/', requiereSesion, (req, res) => {
  const c = Config.obtener();
  res.json({ ...c, calcular_impuestos: c.calcular_impuestos === 1 });
});

module.exports = router;