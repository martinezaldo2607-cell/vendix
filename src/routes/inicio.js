const express = require('express');
const Resumen = require('../models/resumen');
const { requiereSesion } = require('../middlewares/auth');

const router = express.Router();

router.get('/', requiereSesion, (req, res) => {
  res.json(Resumen.obtener(req.session.usuario));
});

module.exports = router;