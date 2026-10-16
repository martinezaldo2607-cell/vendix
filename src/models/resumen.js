const db = require('../config/db');

function obtener(usuario) {
  const soloMias = usuario.rol === 'CAJERO';

  const ventas = db.prepare(`
    SELECT COUNT(*) AS cantidad, COALESCE(SUM(total), 0) AS total
    FROM ventas
    WHERE date(fecha_hora) = date('now', 'localtime') ${soloMias ? 'AND usuario_id = ?' : ''}
  `).get(...(soloMias ? [usuario.id] : []));

  const productos = db.prepare(`
    SELECT COUNT(*) AS cantidad, COALESCE(SUM(stock), 0) AS unidades
    FROM productos
    WHERE activo = 1 AND eliminado = 0
  `).get();

  const bajo = 'FROM productos WHERE activo = 1 AND eliminado = 0 AND stock < stock_minimo';
  const alertas = db.prepare(
    `SELECT id, nombre, stock, stock_minimo ${bajo} ORDER BY stock ASC, nombre LIMIT 8`
  ).all();
  const alertasTotal = db.prepare(`SELECT COUNT(*) AS n ${bajo}`).get().n;

  return { ventas, productos, alertas, alertas_total: alertasTotal };
}

module.exports = { obtener };