const express = require('express');
const Config = require('../models/configuracion');
const { requiereSesion, requiereRol } = require('../middlewares/auth');

const router = express.Router();

const respuesta = () => {
  const c = Config.obtener();
  return { ...c, calcular_impuestos: c.calcular_impuestos === 1 };
};

router.get('/', requiereSesion, (req, res) => res.json(respuesta()));

router.put('/', requiereRol('ADMINISTRADOR'), (req, res) => {
  const nombre = String(req.body?.nombre_tienda ?? '').trim();
  const moneda = String(req.body?.moneda ?? '');
  const errores = [];
  if (!nombre || nombre.length > 100) errores.push('El nombre de la tienda es obligatorio (máximo 100 caracteres)');
  if (!Config.MONEDAS.includes(moneda)) errores.push('Elige una moneda válida');
  if (typeof req.body?.calcular_impuestos !== 'boolean') errores.push('Indica si se calculan impuestos');
  if (errores.length) return res.status(400).json({ errores });

  Config.guardar({ nombre_tienda: nombre, moneda, calcular_impuestos: req.body.calcular_impuestos });
  res.json(respuesta());
});

module.exports = router;