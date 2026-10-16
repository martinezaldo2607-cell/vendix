const db = require('../config/db');
const { redondear } = require('../utils/impuestos');

function generar(desde, hasta, limite = 10) {
  const resumen = db.prepare(`
    SELECT COUNT(*) AS num_ventas, COALESCE(SUM(total), 0) AS total_vendido
    FROM ventas
    WHERE date(fecha_hora) BETWEEN ? AND ?
  `).get(desde, hasta);

  const porDia = db.prepare(`
    SELECT date(fecha_hora) AS fecha, COUNT(*) AS ventas, SUM(total) AS total
    FROM ventas
    WHERE date(fecha_hora) BETWEEN ? AND ?
    GROUP BY date(fecha_hora)
    ORDER BY fecha
  `).all(desde, hasta);

  const productos = db.prepare(`
    SELECT d.producto_id, MAX(d.nombre_producto) AS nombre,
           SUM(d.cantidad) AS unidades, SUM(d.total) AS importe
    FROM detalle_venta d
    JOIN ventas v ON v.id = d.venta_id
    WHERE date(v.fecha_hora) BETWEEN ? AND ?
    GROUP BY d.producto_id
    ORDER BY unidades DESC, importe DESC
    LIMIT ?
  `).all(desde, hasta, limite);

  return {
    desde,
    hasta,
    num_ventas: resumen.num_ventas,
    total_vendido: redondear(resumen.total_vendido),
    por_dia: porDia.map((d) => ({ ...d, total: redondear(d.total) })),
    productos: productos.map((p) => ({ ...p, importe: redondear(p.importe) })),
  };
}

module.exports = { generar };