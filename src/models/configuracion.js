const db = require('../config/db');

const MONEDAS = ['MXN', 'USD'];

function obtener() {
  return db.prepare(
    'SELECT nombre_tienda, moneda, calcular_impuestos, ultimo_respaldo FROM configuracion_negocio WHERE id = 1'
  ).get();
}

function usaImpuestos() {
  return obtener().calcular_impuestos === 1;
}

function guardar({ nombre_tienda, moneda, calcular_impuestos }) {
  db.prepare(
    'UPDATE configuracion_negocio SET nombre_tienda = ?, moneda = ?, calcular_impuestos = ? WHERE id = 1'
  ).run(nombre_tienda, moneda, calcular_impuestos ? 1 : 0);
}

function registrarRespaldo() {
  db.prepare("UPDATE configuracion_negocio SET ultimo_respaldo = datetime('now', 'localtime') WHERE id = 1").run();
}

module.exports = { MONEDAS, obtener, usaImpuestos, guardar, registrarRespaldo };