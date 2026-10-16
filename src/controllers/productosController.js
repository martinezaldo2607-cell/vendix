const Producto = require('../models/producto');
const { calcularLinea, SIN_IMPUESTOS } = require('../utils/impuestos');
const Config = require('../models/configuracion');

function conImpuestos(p, usaImpuestos) {
  const r = calcularLinea({ precio_base: p.precio_base, litros: p.litros }, usaImpuestos ? p : SIN_IMPUESTOS);
  return { ...p, ieps: r.ieps, iva: r.iva, precio_final: r.total, stock_bajo: p.stock < p.stock_minimo };
}

// Si la tienda no calcula impuestos, el precio capturado es el precio final
function ajustarSegunModo(datos) {
  if (!Config.usaImpuestos()) {
    datos.impuesto_id = Producto.impuestoNinguno();
    datos.litros = 0;
  }
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
    soloDesactivados: req.query.solo_desactivados === '1',
  });
  const usa = Config.usaImpuestos();
  res.json(productos.map((p) => conImpuestos(p, usa)));
}

function obtener(req, res) {
  const id = leerId(req);
  if (id === null) return res.status(400).json({ error: 'ID inválido' });
  const producto = Producto.obtener(id);
  if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(conImpuestos(producto, Config.usaImpuestos()));
}

function crear(req, res) {
  const datos = leerDatos(req.body);
  ajustarSegunModo(datos);
  const errores = validar(datos);
  if (errores.length) return res.status(400).json({ errores });
  try {
    const id = Producto.crear(datos, req.session.usuario.id);
    res.status(201).json(conImpuestos(Producto.obtener(id), Config.usaImpuestos()));
  } catch (err) {
    responderError(err, res);
  }
}

function actualizar(req, res) {
  const id = leerId(req);
  if (id === null) return res.status(400).json({ error: 'ID inválido' });
  if (!Producto.obtener(id)) return res.status(404).json({ error: 'Producto no encontrado' });
  const datos = leerDatos(req.body);
  ajustarSegunModo(datos);
  const errores = validar(datos);
  if (errores.length) return res.status(400).json({ errores });
  try {
    Producto.actualizar(id, datos, req.session.usuario.id);
    res.json(conImpuestos(Producto.obtener(id), Config.usaImpuestos()));
  } catch (err) {
    responderError(err, res);
  }
}

function cambiarEstado(req, res, accion, mensaje) {
  const id = leerId(req);
  if (id === null) return res.status(400).json({ error: 'ID inválido' });
  if (!Producto.obtener(id)) return res.status(404).json({ error: 'Producto no encontrado' });
  Producto[accion](id);
  res.json({ mensaje });
}

const desactivar = (req, res) => cambiarEstado(req, res, 'desactivar', 'Producto desactivado');
const reactivar = (req, res) => cambiarEstado(req, res, 'reactivar', 'Producto reactivado');
const eliminar = (req, res) => cambiarEstado(req, res, 'eliminar', 'Producto eliminado');

module.exports = { listar, obtener, crear, actualizar, desactivar, reactivar, eliminar };