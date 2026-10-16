const Reporte = require('../models/reporte');

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function leerRango(query) {
  const { desde, hasta } = query;
  if (!FECHA.test(desde ?? '') || !FECHA.test(hasta ?? '')) {
    return { error: 'Elige las fechas del reporte' };
  }
  if (desde > hasta) return { error: 'La fecha inicial no puede ser mayor que la final' };
  return { desde, hasta };
}

// Un valor de celda seguro para CSV
function celda(valor) {
  let texto = String(valor ?? '');
  if (/^[=+\-@\t\r]/.test(texto)) texto = "'" + texto;   // evita fórmulas en Excel
  return /[",\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}
const fila = (...valores) => valores.map(celda).join(',');

function generar(req, res) {
  const rango = leerRango(req.query);
  if (rango.error) return res.status(400).json({ error: rango.error });
  res.json(Reporte.generar(rango.desde, rango.hasta));
}

function exportar(req, res) {
  const rango = leerRango(req.query);
  if (rango.error) return res.status(400).json({ error: rango.error });
  const r = Reporte.generar(rango.desde, rango.hasta, 100);

  const lineas = [
    fila('Reporte de ventas'),
    fila('Periodo', r.desde, r.hasta),
    fila('Total vendido', r.total_vendido.toFixed(2)),
    fila('Numero de ventas', r.num_ventas),
    '',
    fila('Ventas por dia'),
    fila('Fecha', 'Ventas', 'Total'),
    ...r.por_dia.map((d) => fila(d.fecha, d.ventas, d.total.toFixed(2))),
    '',
    fila('Productos mas vendidos'),
    fila('Producto', 'Unidades vendidas', 'Importe'),
    ...r.productos.map((p) => fila(p.nombre, p.unidades, p.importe.toFixed(2))),
  ];

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="reporte-ventas_${r.desde}_${r.hasta}.csv"`);
  res.send('\uFEFF' + lineas.join('\r\n'));   // el BOM hace que Excel respete los acentos
}

module.exports = { generar, exportar };