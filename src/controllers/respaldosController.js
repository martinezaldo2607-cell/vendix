const Respaldo = require('../models/respaldo');

function listar(req, res) {
  res.json(Respaldo.listar());
}

async function crear(req, res) {
  try {
    res.status(201).json({ nombre: await Respaldo.crear() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo crear el respaldo' });
  }
}

function descargar(req, res) {
  const ruta = Respaldo.ruta(req.params.nombre);
  if (!ruta) return res.status(404).json({ error: 'Respaldo no encontrado' });
  res.download(ruta, req.params.nombre);
}

async function restaurar(req, res) {
  if (!Respaldo.ruta(req.params.nombre)) return res.status(404).json({ error: 'Respaldo no encontrado' });
  try {
    await Respaldo.restaurar(req.params.nombre);
    res.json({ mensaje: 'Respaldo restaurado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo restaurar el respaldo. Los datos actuales no se modificaron.' });
  }
}

module.exports = { listar, crear, descargar, restaurar };