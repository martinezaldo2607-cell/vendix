const Producto = require('../models/producto');
const { calcularLinea } = require('../utils/impuestos');

function conImpuestos(p) {
  // p ya trae iva_tasa, ieps_tipo e ieps_valor del impuesto asignado
  const r = calcularLinea({ precio_base: p.precio_base, litros: p.litros }, p);
  return { ...p, ieps: r.ieps, iva: r.iva, precio_final: r.total, stock_bajo: p.stock < p.stock_minimo };
}

const num = (v, defecto) => (v === undefined || v === null || v === '' ? defecto : Number(v));

function leerDatos(b = {}) {
  return {
    nombre: String(b.nombre ?? '').trim(),
    categoria_id: Number(b.categoria_id),
    impuesto_id: Number(b.impuesto_id),
    precio_base: num(b.precio_base, NaN),
    litros: num(b.litros, 0),
    stock: num(b.stock, 0),
    stock_minimo: num(b.stock_minimo, 10),
  };
}

function validar(d) {
  const e = [];
  if (!d.nombre) e.push('El nombre es obligatorio');
  if (!Number.isInteger(d.categoria_id) || d.categoria_id <= 0) e.push('Elige una categoría');
  if (!Number.isInteger(d.impuesto_id) || d.impuesto_id <= 0) e.push('Elige un tipo de impuesto');
  if (Number.isNaN(d.precio_base) || d.precio_base <= 0) e.push('El precio debe ser un número mayor a 0');
  if (Number.isNaN(d.litros) || d.litros < 0) e.push('Los litros deben ser un número mayor o igual a 0');
  if (!Number.isInteger(d.stock) || d.stock < 0) e.push('Las existencias deben ser un entero mayor o igual a 0');
  if (!Number.isInteger(d.stock_minimo) || d.stock_minimo < 0) e.push('El stock mínimo debe ser un entero mayor o igual a 0');
  return e;
}

function leerId(req) {
  const id = Number.parseInt(req.params.id, 10);
  return Number.isInteger(id) ? id : null;
}

function responderError(err, res) {
  if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    return res.status(400).json({ error: 'La categoría o el impuesto no existe' });
  }
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
}

function listar(req, res) {
  const productos = Producto.listar({
    buscar: req.query.buscar || '',
    stockBajo: req.query.stock_bajo === '1',
    incluirInactivos: req.query.incluir_inactivos === '1',
  });
  res.json(productos.map(conImpuestos));
}

function obtener(req, res) {
  const id = leerId(req);
  if (id === null) return res.status(400).json({ error: 'ID inválido' });
  const producto = Producto.obtener(id);
  if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(conImpuestos(producto));
}

function crear(req, res) {
  const datos = leerDatos(req.body);
  const errores = validar(datos);
  if (errores.length) return res.status(400).json({ errores });
  try {
    const id = Producto.crear(datos);
    res.status(201).json(conImpuestos(Producto.obtener(id)));
  } catch (err) {
    responderError(err, res);
  }
}

function actualizar(req, res) {
  const id = leerId(req);
  if (id === null) return res.status(400).json({ error: 'ID inválido' });
  if (!Producto.obtener(id)) return res.status(404).json({ error: 'Producto no encontrado' });
  const datos = leerDatos(req.body);
  const errores = validar(datos);
  if (errores.length) return res.status(400).json({ errores });
  try {
    Producto.actualizar(id, datos);
    res.json(conImpuestos(Producto.obtener(id)));
  } catch (err) {
    responderError(err, res);
  }
}

function eliminar(req, res) {
  const id = leerId(req);
  if (id === null) return res.status(400).json({ error: 'ID inválido' });
  if (!Producto.obtener(id)) return res.status(404).json({ error: 'Producto no encontrado' });
  Producto.desactivar(id);
  res.json({ mensaje: 'Producto dado de baja' });
}

module.exports = { listar, obtener, crear, actualizar, eliminar };