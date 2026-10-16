const Venta = require('../models/venta');
const { redondear } = require('../utils/impuestos');

function leerItems(body) {
  const items = body?.items;
  if (!Array.isArray(items) || items.length === 0 || items.length > 100) return null;
  const limpios = items.map((i) => ({
    producto_id: Number(i?.producto_id),
    cantidad: Number(i?.cantidad),
  }));
  const validos = limpios.every((i) =>
    Number.isInteger(i.producto_id) && i.producto_id > 0 &&
    Number.isInteger(i.cantidad) && i.cantidad > 0 && i.cantidad <= 1000);
  return validos ? limpios : null;
}

function responderError(err, res) {
  if (err instanceof Venta.ErrorNegocio) return res.status(400).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
}

function calcular(req, res) {
  const items = leerItems(req.body);
  if (!items) return res.status(400).json({ error: 'La venta no tiene productos válidos' });
  try {
    res.json(Venta.armarLineas(items));
  } catch (err) {
    responderError(err, res);
  }
}

function crear(req, res) {
  const items = leerItems(req.body);
  if (!items) return res.status(400).json({ error: 'La venta no tiene productos válidos' });

  const recibido = Number(req.body.monto_recibido);
  if (!Number.isFinite(recibido) || recibido < 0 || recibido > 1000000) {
    return res.status(400).json({ error: 'El monto recibido no es válido' });
  }

  try {
    const id = Venta.crear(items, redondear(recibido), req.session.usuario.id);
    res.status(201).json(Venta.obtener(id));
  } catch (err) {
    responderError(err, res);
  }
}

// El cajero solo puede ver sus propias ventas
function obtener(req, res) {
  const id = Number.parseInt(req.params.id, 10);
  const venta = Number.isInteger(id) ? Venta.obtener(id) : null;
  const u = req.session.usuario;
  if (!venta || (u.rol === 'CAJERO' && venta.usuario_id !== u.id)) {
    return res.status(404).json({ error: 'Venta no encontrada' });
  }
  res.json(venta);
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

// El cajero solo recibe sus propias ventas
function listar(req, res) {
  const { desde, hasta } = req.query;
  if ((desde && !FECHA.test(desde)) || (hasta && !FECHA.test(hasta))) {
    return res.status(400).json({ error: 'Las fechas no son válidas' });
  }
  const u = req.session.usuario;
  res.json(Venta.listar({ desde, hasta, usuarioId: u.rol === 'CAJERO' ? u.id : null }));
}

module.exports = { calcular, crear, obtener, listar };