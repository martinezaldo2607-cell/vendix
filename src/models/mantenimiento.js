const db = require('../config/db');

function contar() {
  const n = (tabla, donde = '') => db.prepare(`SELECT COUNT(*) AS n FROM ${tabla} ${donde}`).get().n;
  return {
    productos: n('productos', 'WHERE eliminado = 0'),
    ventas: n('ventas'),
    movimientos: n('movimientos_inventario'),
  };
}

// Quita todos los productos del catálogo; las ventas pasadas se conservan
function vaciarCatalogo() {
  db.prepare('UPDATE productos SET eliminado = 1, activo = 0 WHERE eliminado = 0').run();
}

// Borra productos, ventas y movimientos, y reinicia folios y códigos
const reiniciarTodo = db.transaction(() => {
  db.exec('DELETE FROM detalle_venta');
  db.exec('DELETE FROM ventas');
  db.exec('DELETE FROM movimientos_inventario');
  db.exec('DELETE FROM productos');
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('detalle_venta', 'ventas', 'movimientos_inventario', 'productos')");
});

module.exports = { contar, vaciarCatalogo, reiniciarTodo };