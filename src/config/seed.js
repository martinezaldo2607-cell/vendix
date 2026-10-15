const db = require('./db');
const { calcularLinea } = require('../utils/impuestos');

// [nombre, iva_tasa, ieps_tipo, ieps_valor]
const categorias = [
  ['Canasta básica y frescos', 0, 'ninguno', 0],
  ['Botanas y confitería', 16, 'porcentaje', 8],
  ['Galletas y pan dulce', 0, 'porcentaje', 8],
  ['Agua natural', 0, 'ninguno', 0],
  ['Refrescos y bebidas azucaradas', 16, 'cuota_litro', 3.08],
  ['Bebidas light o zero', 16, 'cuota_litro', 1.5],
  ['Bebidas energizantes', 16, 'porcentaje', 25],
  ['Cervezas, vinos y licores suaves', 16, 'porcentaje', 26.5],
  ['Destilados', 16, 'porcentaje', 53],
  ['Higiene personal', 16, 'ninguno', 0],
  ['Limpieza del hogar', 16, 'ninguno', 0],
  ['Alimento para mascotas', 16, 'ninguno', 0],
];

// [codigo, nombre, categoria, precio_base, litros, stock, stock_minimo]
const productos = [
  ['P001', 'Leche entera 1 L', 'Canasta básica y frescos', 26, 0, 30, 10],
  ['P002', 'Frijol negro 1 kg', 'Canasta básica y frescos', 32, 0, 25, 8],
  ['P003', 'Papitas sal 45 g', 'Botanas y confitería', 18, 0, 40, 10],
  ['P004', 'Chocolate barra', 'Botanas y confitería', 15, 0, 3, 10],
  ['P005', 'Galletas marías', 'Galletas y pan dulce', 14, 0, 25, 8],
  ['P006', 'Agua natural 1 L', 'Agua natural', 12, 1, 50, 15],
  ['P007', 'Refresco cola 600 ml', 'Refrescos y bebidas azucaradas', 15, 0.6, 48, 12],
  ['P008', 'Refresco zero 600 ml', 'Bebidas light o zero', 15, 0.6, 30, 12],
  ['P009', 'Energizante 473 ml', 'Bebidas energizantes', 28, 0.473, 18, 6],
  ['P010', 'Cerveza 355 ml', 'Cervezas, vinos y licores suaves', 30, 0.355, 60, 12],
  ['P011', 'Detergente 1 kg', 'Limpieza del hogar', 45, 0, 15, 5],
  ['P012', 'Shampoo 400 ml', 'Higiene personal', 55, 0, 4, 5],
  ['P013', 'Croquetas perro 1 kg', 'Alimento para mascotas', 70, 0, 12, 4],
];

const insertarCategoria = db.prepare(
  'INSERT OR IGNORE INTO categorias (nombre, iva_tasa, ieps_tipo, ieps_valor) VALUES (?, ?, ?, ?)'
);
const buscarCategoria = db.prepare('SELECT id FROM categorias WHERE nombre = ?');
const insertarProducto = db.prepare(
  `INSERT OR IGNORE INTO productos
   (codigo, nombre, categoria_id, precio_base, litros, stock, stock_minimo)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);

// Todo en una transacción: o se guarda todo o no se guarda nada
const sembrar = db.transaction(() => {
  categorias.forEach((c) => insertarCategoria.run(...c));
  productos.forEach(([codigo, nombre, cat, precio, litros, stock, minimo]) => {
    const { id } = buscarCategoria.get(cat);
    insertarProducto.run(codigo, nombre, id, precio, litros, stock, minimo);
  });
});

sembrar();

// Muestra el catálogo con los impuestos calculados
const filas = db.prepare(`
  SELECT p.codigo, p.nombre, p.precio_base, p.litros, p.stock, p.stock_minimo,
         c.iva_tasa, c.ieps_tipo, c.ieps_valor
  FROM productos p
  JOIN categorias c ON c.id = p.categoria_id
  ORDER BY p.codigo
`).all();

console.table(
  filas.map((f) => {
    const r = calcularLinea(
      { precio_base: f.precio_base, litros: f.litros },
      { iva_tasa: f.iva_tasa, ieps_tipo: f.ieps_tipo, ieps_valor: f.ieps_valor }
    );
    return {
      codigo: f.codigo,
      producto: f.nombre,
      base: r.subtotal,
      ieps: r.ieps,
      iva: r.iva,
      total: r.total,
      stock: f.stock,
      stock_bajo: f.stock <= f.stock_minimo ? 'SÍ' : '',
    };
  })
);