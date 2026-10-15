const db = require('../config/db');

const SELECT_BASE = `
  SELECT p.id, p.codigo, p.nombre, p.categoria_id, c.nombre AS categoria,
         p.precio_base, p.litros, p.stock, p.stock_minimo, p.activo,
         c.iva_tasa, c.ieps_tipo, c.ieps_valor
  FROM productos p
  JOIN categorias c ON c.id = p.categoria_id
`;

function listar({ buscar = '', stockBajo = false, incluirInactivos = false } = {}) {
  let sql = SELECT_BASE + ' WHERE 1 = 1';
  const params = [];

  if (!incluirInactivos) sql += ' AND p.activo = 1';
  if (buscar) {
    sql += ' AND (p.nombre LIKE ? OR p.codigo LIKE ?)';
    params.push(`%${buscar}%`, `%${buscar}%`);
  }
  if (stockBajo) sql += ' AND p.stock <= p.stock_minimo';

  sql += ' ORDER BY p.nombre';
  return db.prepare(sql).all(...params);
}

function obtener(id) {
  return db.prepare(SELECT_BASE + ' WHERE p.id = ?').get(id);
}

function crear(d) {
  const info = db.prepare(`
    INSERT INTO productos
      (codigo, nombre, categoria_id, precio_base, litros, stock, stock_minimo)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(d.codigo, d.nombre, d.categoria_id, d.precio_base, d.litros, d.stock, d.stock_minimo);
  return info.lastInsertRowid;
}

// El stock NO se edita aquí: cambiará con las entradas/salidas y las ventas
function actualizar(id, d) {
  db.prepare(`
    UPDATE productos
    SET codigo = ?, nombre = ?, categoria_id = ?, precio_base = ?,
        litros = ?, stock_minimo = ?
    WHERE id = ?
  `).run(d.codigo, d.nombre, d.categoria_id, d.precio_base, d.litros, d.stock_minimo, id);
}

// "Baja" lógica: no se borra para no romper el historial de ventas
function desactivar(id) {
  db.prepare('UPDATE productos SET activo = 0 WHERE id = ?').run(id);
}

module.exports = { listar, obtener, crear, actualizar, desactivar };