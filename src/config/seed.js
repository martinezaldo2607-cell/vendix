const db = require('./db');
const Producto = require('../models/producto');

// [nombre, iva_tasa, ieps_tipo, ieps_valor]
const impuestos = [
  ['Sin impuestos (canasta básica)', 0, 'ninguno', 0],
  ['IVA 16%', 16, 'ninguno', 0],
  ['Botanas y dulces (IVA 16% + IEPS 8%)', 16, 'porcentaje', 8],
  ['Galletas y pan dulce (IEPS 8%)', 0, 'porcentaje', 8],
  ['Refrescos (IEPS por litro)', 16, 'cuota_litro', 3.08],
  ['Light o zero (IEPS por litro)', 16, 'cuota_litro', 1.5],
  ['Energizantes (IEPS 25%)', 16, 'porcentaje', 25],
  ['Cerveza y vinos (IEPS 26.5%)', 16, 'porcentaje', 26.5],
  ['Destilados (IEPS 53%)', 16, 'porcentaje', 53],
];

const categorias = ['Abarrotes', 'Lácteos', 'Bebidas', 'Botanas', 'Panadería', 'Limpieza e higiene', 'Mascotas'];

// [nombre, categoría, impuesto, precio_base, litros, stock, stock_minimo]
const productos = [
  ['Leche entera 1 L', 'Lácteos', 'Sin impuestos (canasta básica)', 26, 0, 24, 10],
  ['Arroz 1 kg', 'Abarrotes', 'Sin impuestos (canasta básica)', 24, 0, 8, 10],
  ['Frijol 1 kg', 'Abarrotes', 'Sin impuestos (canasta básica)', 32, 0, 12, 10],
  ['Aceite 1 L', 'Abarrotes', 'Sin impuestos (canasta básica)', 38, 0, 15, 10],
  ['Azúcar 1 kg', 'Abarrotes', 'Sin impuestos (canasta básica)', 26, 0, 20, 10],
  ['Pan de caja', 'Panadería', 'Sin impuestos (canasta básica)', 45, 0, 10, 10],
  ['Galletas surtidas', 'Botanas', 'Galletas y pan dulce (IEPS 8%)', 16, 0, 40, 10],
  ['Papitas sal 45 g', 'Botanas', 'Botanas y dulces (IVA 16% + IEPS 8%)', 18, 0, 40, 10],
  ['Refresco cola 600 ml', 'Bebidas', 'Refrescos (IEPS por litro)', 15, 0.6, 6, 10],
  ['Agua natural 1 L', 'Bebidas', 'Sin impuestos (canasta básica)', 12, 1, 50, 15],
  ['Cerveza 355 ml', 'Bebidas', 'Cerveza y vinos (IEPS 26.5%)', 30, 0.355, 60, 12],
  ['Detergente 1 kg', 'Limpieza e higiene', 'IVA 16%', 45, 0, 15, 5],
  ['Croquetas perro 1 kg', 'Mascotas', 'IVA 16%', 70, 0, 12, 4],
];

const insImpuesto = db.prepare(
  'INSERT OR IGNORE INTO impuestos (nombre, iva_tasa, ieps_tipo, ieps_valor) VALUES (?, ?, ?, ?)'
);
const insCategoria = db.prepare('INSERT OR IGNORE INTO categorias (nombre) VALUES (?)');
const insConfig = db.prepare(
  "INSERT OR IGNORE INTO configuracion_negocio (id, nombre_tienda, moneda) VALUES (1, ?, 'MXN')"
);
const idCategoria = db.prepare('SELECT id FROM categorias WHERE nombre = ?');
const idImpuesto = db.prepare('SELECT id FROM impuestos WHERE nombre = ?');
const existe = db.prepare('SELECT 1 FROM productos WHERE nombre = ?');

db.transaction(() => {
  impuestos.forEach((i) => insImpuesto.run(...i));
  categorias.forEach((c) => insCategoria.run(c));
  insConfig.run('Abarrotes San Miguel');

  productos.forEach(([nombre, cat, imp, precio, litros, stock, minimo]) => {
    if (existe.get(nombre)) return;
    Producto.crear({
      nombre,
      categoria_id: idCategoria.get(cat).id,
      impuesto_id: idImpuesto.get(imp).id,
      precio_base: precio,
      litros,
      stock,
      stock_minimo: minimo,
    });
  });
})();

console.log(`Listo: ${Producto.listar().length} productos en la base de datos.`);