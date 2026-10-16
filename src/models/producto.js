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

function registrarMovimiento(productoId, usuarioId, tipo, cantidad, observacion) {
  db.prepare(
    'INSERT INTO movimientos_inventario (producto_id, usuario_id, tipo, cantidad, observacion) VALUES (?, ?, ?, ?, ?)'
  ).run(productoId, usuarioId, tipo, cantidad, observacion);
}

function listar({ buscar = '', stockBajo = false, incluirInactivos = false, soloDesactivados = false } = {}) {
  let sql = SELECT_BASE + ' WHERE 1 = 1';
  const params = [];
  sql += ' AND p.eliminado = 0';
  if (soloDesactivados) sql += ' AND p.activo = 0';
  else if (!incluirInactivos) sql += ' AND p.activo = 1';
  if (buscar) {
    sql += ' AND (p.nombre LIKE ? OR p.codigo LIKE ?)';
    params.push(`%${buscar}%`, `%${buscar}%`);
  }
  if (stockBajo) sql += ' AND p.stock < p.stock_minimo';
  sql += ' ORDER BY p.nombre';
  return db.prepare(sql).all(...params);
}

function obtener(id) {
  return db.prepare(SELECT_BASE + ' WHERE p.id = ? AND p.eliminado = 0').get(id);
}

// Crea el producto, le genera el código y registra su existencia inicial
const crear = db.transaction((d, usuarioId) => {
  const id = db.prepare(`
    INSERT INTO productos
      (nombre, categoria_id, impuesto_id, precio_base, litros, stock, stock_minimo)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(d.nombre, d.categoria_id, d.impuesto_id, d.precio_base, d.litros, d.stock, d.stock_minimo)
    .lastInsertRowid;

  db.prepare("UPDATE productos SET codigo = 'P' || printf('%04d', id) WHERE id = ?").run(id);
  if (d.stock > 0) registrarMovimiento(id, usuarioId, 'entrada', d.stock, 'Existencia inicial');
  return id;
});

// Si cambian las existencias, deja registrado un movimiento de ajuste
const actualizar = db.transaction((id, d, usuarioId) => {
  const actual = db.prepare('SELECT stock FROM productos WHERE id = ?').get(id).stock;

  db.prepare(`
    UPDATE productos
    SET nombre = ?, categoria_id = ?, impuesto_id = ?, precio_base = ?,
        litros = ?, stock = ?, stock_minimo = ?
    WHERE id = ?
  `).run(d.nombre, d.categoria_id, d.impuesto_id, d.precio_base, d.litros, d.stock, d.stock_minimo, id);

  const diferencia = d.stock - actual;
  if (diferencia !== 0) {
    registrarMovimiento(id, usuarioId, diferencia > 0 ? 'entrada' : 'salida', Math.abs(diferencia), 'Ajuste manual');
  }
});

function desactivar(id) {
  db.prepare('UPDATE productos SET activo = 0 WHERE id = ?').run(id);
}

function reactivar(id) {
  db.prepare('UPDATE productos SET activo = 1 WHERE id = ?').run(id);
}

// Baja lógica: el producto desaparece de todo, pero las ventas pasadas lo conservan
function eliminar(id) {
  db.prepare('UPDATE productos SET eliminado = 1, activo = 0 WHERE id = ?').run(id);
}

// Suma existencias y deja registrado el movimiento, todo en una sola transacción
const registrarEntrada = db.transaction((id, cantidad, observacion, usuarioId) => {
  db.prepare('UPDATE productos SET stock = stock + ? WHERE id = ?').run(cantidad, id);
  registrarMovimiento(id, usuarioId, 'entrada', cantidad, observacion || 'Entrada de mercancía');
});

// Impuesto "sin impuestos", que se asigna cuando la tienda no calcula impuestos
function impuestoNinguno() {
  return db.prepare(
    "SELECT id FROM impuestos WHERE iva_tasa = 0 AND ieps_tipo = 'ninguno' ORDER BY id LIMIT 1"
  ).get().id;
}

module.exports = { listar, obtener, crear, actualizar, desactivar, reactivar, eliminar, registrarEntrada, impuestoNinguno };