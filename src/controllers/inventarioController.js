const Producto = require('../models/producto');

function estadoDe(p) {
  if (p.stock === 0) return 'AGOTADO';
  if (p.stock < p.stock_minimo) return 'STOCK_BAJO';
  return 'DISPONIBLE';
}

function listar(req, res) {
  const filas = Producto.listar({ buscar: req.query.buscar || '' }).map((p) => ({
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    categoria: p.categoria,
    stock: p.stock,
    stock_minimo: p.stock_minimo,
    estado: estadoDe(p),
  }));
  res.json(filas);
}

function registrarEntrada(req, res) {
  const productoId = Number(req.body?.producto_id);
  const cantidad = Number(req.body?.cantidad);
  const observacion = String(req.body?.observacion ?? '').trim();

  const errores = [];
  if (!Number.isInteger(productoId) || productoId <= 0) errores.push('Elige un producto');
  if (!Number.isInteger(cantidad) || cantidad <= 0 || cantidad > 100000) {
    errores.push('La cantidad debe ser un entero entre 1 y 100000');
  }
  if (observacion.length > 200) errores.push('La observación no puede pasar de 200 caracteres');
  if (errores.length) return res.status(400).json({ errores });

  const producto = Producto.obtener(productoId);
  if (!producto || !producto.activo) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }

  Producto.registrarEntrada(productoId, cantidad, observacion, req.session.usuario.id);
  res.status(201).json({ mensaje: 'Entrada registrada', stock: Producto.obtener(productoId).stock });
}

module.exports = { listar, registrarEntrada };