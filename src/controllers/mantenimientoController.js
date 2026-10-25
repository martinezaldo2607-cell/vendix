const bcrypt = require('bcryptjs');
const Mantenimiento = require('../models/mantenimiento');
const Respaldo = require('../models/respaldo');
const Usuario = require('../models/usuario');

// Pide escribir BORRAR y la contraseña de quien está haciendo la operación
function verificar(req, res) {
  const confirmacion = String(req.body?.confirmacion ?? '').trim().toUpperCase();
  const password = String(req.body?.password ?? '');

  if (confirmacion !== 'BORRAR') {
    res.status(400).json({ error: 'Escribe BORRAR para confirmar' });
    return false;
  }
  const fila = Usuario.buscarPorId(req.session.usuario.id);
  if (!fila || !bcrypt.compareSync(password, fila.password_hash)) {
    res.status(403).json({ error: 'La contraseña no es correcta' });
    return false;
  }
  return true;
}

async function ejecutar(req, res, accion, mensaje) {
  if (!verificar(req, res)) return;
  try {
    // Primero el respaldo: si falla, no se borra nada
    const respaldo = await Respaldo.crear({ prefijo: 'vendix_antes-de-borrar_', registrar: false });
    accion();
    res.json({ mensaje, respaldo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo completar la operación. No se borró nada.' });
  }
}

function resumen(req, res) {
  res.json(Mantenimiento.contar());
}

const vaciarCatalogo = (req, res) => ejecutar(req, res, Mantenimiento.vaciarCatalogo, 'Catálogo vaciado');
const reiniciar = (req, res) => ejecutar(req, res, Mantenimiento.reiniciarTodo, 'Tienda reiniciada');

module.exports = { resumen, vaciarCatalogo, reiniciar };