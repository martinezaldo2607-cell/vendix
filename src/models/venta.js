const db = require('../config/db');
const { calcularLinea, redondear, SIN_IMPUESTOS } = require('../utils/impuestos');
const Config = require('./configuracion');

class ErrorNegocio extends Error {}

// Calcula las líneas y los totales con los precios de la base de datos
function armarLineas(items) {
  // Une los productos repetidos
  const usaImpuestos = Config.usaImpuestos();
  const cantidades = new Map();
  for (const it of items) {
    cantidades.set(it.producto_id, (cantidades.get(it.producto_id) || 0) + it.cantidad);
  }

  const buscar = db.prepare(`
    SELECT p.id, p.nombre, p.precio_base, p.litros, p.stock, p.activo,
           i.iva_tasa, i.ieps_tipo, i.ieps_valor
    FROM productos p
    JOIN impuestos i ON i.id = p.impuesto_id
    WHERE p.id = ?
  `);

  const lineas = [];
  for (const [id, cantidad] of cantidades) {
    const p = buscar.get(id);
    if (!p || !p.activo) throw new ErrorNegocio('Uno de los productos ya no está disponible');
    if (cantidad > p.stock) {
      throw new ErrorNegocio(p.stock === 0 ? `${p.nombre} está agotado` : `Solo quedan ${p.stock} de ${p.nombre}`);
    }
    const r = calcularLinea({ precio_base: p.precio_base, litros: p.litros }, usaImpuestos ? p : SIN_IMPUESTOS, cantidad);
    lineas.push({
      producto_id: p.id,
      nombre_producto: p.nombre,
      cantidad,
      precio_unitario: p.precio_base,
      subtotal: r.subtotal,
      ieps: r.ieps,
      iva: r.iva,
      total: r.total,
    });
  }

  const suma = (campo) => redondear(lineas.reduce((acc, l) => acc + l[campo], 0));
  return { lineas, subtotal: suma('subtotal'), ieps: suma('ieps'), iva: suma('iva'), total: suma('total') };
}

// Registra la venta completa o no registra nada
const crear = db.transaction((items, montoRecibido, usuarioId) => {
  const c = armarLineas(items);
  if (montoRecibido < c.total) throw new ErrorNegocio('El monto recibido no cubre el total');
  const cambio = redondear(montoRecibido - c.total);

  const ventaId = db.prepare(`
    INSERT INTO ventas (usuario_id, subtotal, ieps, iva, total, monto_recibido, cambio)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(usuarioId, c.subtotal, c.ieps, c.iva, c.total, montoRecibido, cambio).lastInsertRowid;

  const folio = 'VEN-' + String(ventaId).padStart(6, '0');
  db.prepare('UPDATE ventas SET folio = ? WHERE id = ?').run(folio, ventaId);

  const insDetalle = db.prepare(`
    INSERT INTO detalle_venta
      (venta_id, producto_id, nombre_producto, cantidad, precio_unitario, subtotal, ieps, iva, total)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const bajaStock = db.prepare('UPDATE productos SET stock = stock - ? WHERE id = ? AND stock >= ?');
  const insMov = db.prepare(`
    INSERT INTO movimientos_inventario (producto_id, usuario_id, tipo, cantidad, observacion)
    VALUES (?, ?, 'salida', ?, ?)
  `);

  for (const l of c.lineas) {
    insDetalle.run(ventaId, l.producto_id, l.nombre_producto, l.cantidad, l.precio_unitario, l.subtotal, l.ieps, l.iva, l.total);
    if (bajaStock.run(l.cantidad, l.producto_id, l.cantidad).changes !== 1) {
      throw new ErrorNegocio(`Ya no hay suficientes existencias de ${l.nombre_producto}`);
    }
    insMov.run(l.producto_id, usuarioId, l.cantidad, `Venta ${folio}`);
  }
  return ventaId;
});

function obtener(id) {
  const venta = db.prepare(`
    SELECT v.*, u.nombre AS cajero
    FROM ventas v
    JOIN usuarios u ON u.id = v.usuario_id
    WHERE v.id = ?
  `).get(id);
  if (!venta) return null;
  venta.detalle = db.prepare('SELECT * FROM detalle_venta WHERE venta_id = ? ORDER BY id').all(id);
  return venta;
}

function listar({ desde, hasta, usuarioId } = {}) {
  let sql = `
    SELECT v.id, v.folio, v.fecha_hora, v.total, u.nombre AS cajero
    FROM ventas v
    JOIN usuarios u ON u.id = v.usuario_id
    WHERE 1 = 1
  `;
  const params = [];
  if (usuarioId) { sql += ' AND v.usuario_id = ?'; params.push(usuarioId); }
  if (desde) { sql += ' AND date(v.fecha_hora) >= ?'; params.push(desde); }
  if (hasta) { sql += ' AND date(v.fecha_hora) <= ?'; params.push(hasta); }
  sql += ' ORDER BY v.id DESC LIMIT 200';
  return db.prepare(sql).all(...params);
}

module.exports = { ErrorNegocio, armarLineas, crear, obtener, listar };