const db = require('../config/db');

function obtener() {
  return db.prepare(
    'SELECT nombre_tienda, moneda, calcular_impuestos, ultimo_respaldo FROM configuracion_negocio WHERE id = 1'
  ).get();
}

function usaImpuestos() {
  return obtener().calcular_impuestos === 1;
}

module.exports = { obtener, usaImpuestos };