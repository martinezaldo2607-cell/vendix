const db = require('../config/db');

const SELECT_BASE = `
  SELECT p.id, p.codigo, p.nombre, p.categoria_id, c.nombre AS categoria,
         p.impuesto_id, i.nombre AS impuesto, p.precio_base, p.litros,
         p.stock, p.stock_minimo, p.activo,
         i.iva_tasa, i.ieps_tipo, i.ieps_valor
  FROM productos p
  JOIN categorias c ON c.id = p.categoria_id
  JOIN impuestos i ON i.id = p.impuesto_id
`;

function registrarMovimiento(productoId, tipo, cantidad, motivo) {
  db.prepare(
    'INSERT INTO movimientos_inventario (producto_id, tipo, cantidad, observacion) VALUES (?, ?, ?, ?)'
  ).run(productoId, tipo, cantidad, motivo);
}

function listar({ buscar = '', stockBajo = false, incluirInactivos = false } = {}) {
  let sql = SELECT_BASE + ' WHERE 1 = 1';
  const params = [];
  if (!incluirInactivos) sql += ' AND p.activo = 1';
  if (buscar) {
    sql += ' AND (p.nombre LIKE ? OR p.codigo LIKE ?)';
    params.push(`%${buscar}%`, `%${buscar}%`);
  }
  if (stockBajo) sql += ' AND p.stock < p.stock_minimo';
  sql += ' ORDER BY p.nombre';
  return db.prepare(sql).all(...params);
}

function obtener(id) {
  return db.prepare(SELECT_BASE + ' WHERE p.id = ?').get(id);
}

// Crea el producto, le genera el código y registra su existencia inicial
const crear = db.transaction((d) => {
  const id = db.prepare(`
    INSERT INTO productos
      (nombre, categoria_id, impuesto_id, precio_base, litros, stock, stock_minimo)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(d.nombre, d.categoria_id, d.impuesto_id, d.precio_base, d.litros, d.stock, d.stock_minimo)
    .lastInsertRowid;

  db.prepare("UPDATE productos SET codigo = 'P' || printf('%04d', id) WHERE id = ?").run(id);
  if (d.stock > 0) registrarMovimiento(id, 'entrada', d.stock, 'Existencia inicial');
  return id;
});

// Si cambian las existencias, deja registrado un movimiento de ajuste
const actualizar = db.transaction((id, d) => {
  const actual = db.prepare('SELECT stock FROM productos WHERE id = ?').get(id).stock;

  db.prepare(`
    UPDATE productos
    SET nombre = ?, categoria_id = ?, impuesto_id = ?, precio_base = ?,
        litros = ?, stock = ?, stock_minimo = ?
    WHERE id = ?
  `).run(d.nombre, d.categoria_id, d.impuesto_id, d.precio_base, d.litros, d.stock, d.stock_minimo, id);

  const diferencia = d.stock - actual;
  if (diferencia !== 0) {
    registrarMovimiento(id, diferencia > 0 ? 'entrada' : 'salida', Math.abs(diferencia), 'Ajuste manual');
  }
});

function desactivar(id) {
  db.prepare('UPDATE productos SET activo = 0 WHERE id = ?').run(id);
}

module.exports = { listar, obtener, crear, actualizar, desactivar };