const bcrypt = require('bcryptjs');
const Usuario = require('../models/usuario');

const LOGIN = /^[a-z0-9._-]{3,50}$/;
const ROLES = ['ADMINISTRADOR', 'CAJERO'];

function leerDatos(b = {}) {
  return {
    nombre: String(b.nombre ?? '').trim(),
    usuario: String(b.usuario ?? '').trim().toLowerCase(),
    rol: String(b.rol ?? ''),
    password: String(b.password ?? ''),
    activo: b.activo === false || b.activo === 0 ? 0 : 1,
  };
}

function validar(d, esNuevo) {
  const e = [];
  if (!d.nombre || d.nombre.length > 100) e.push('El nombre es obligatorio (máximo 100 caracteres)');
  if (!LOGIN.test(d.usuario)) {
    e.push('El usuario debe tener de 3 a 50 caracteres: letras minúsculas, números, punto, guion o guion bajo');
  }
  if (!ROLES.includes(d.rol)) e.push('Elige un rol válido');
  if ((esNuevo || d.password) && (d.password.length < 8 || d.password.length > 72)) {
    e.push('La contraseña debe tener entre 8 y 72 caracteres');
  }
  return e;
}

function leerId(req) {
  const id = Number.parseInt(req.params.id, 10);
  return Number.isInteger(id) ? id : null;
}

function responderError(err, res) {
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({ error: 'Ese nombre de usuario ya existe' });
  }
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
}

function listar(req, res) {
  res.json(Usuario.listar());
}

function obtener(req, res) {
  const id = leerId(req);
  const u = id === null ? null : Usuario.obtener(id);
  if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(u);
}

function crear(req, res) {
  const d = leerDatos(req.body);
  const errores = validar(d, true);
  if (errores.length) return res.status(400).json({ errores });
  try {
    const id = Usuario.crear({ ...d, password_hash: bcrypt.hashSync(d.password, 10) });
    res.status(201).json(Usuario.obtener(id));
  } catch (err) {
    responderError(err, res);
  }
}

function actualizar(req, res) {
  const id = leerId(req);
  if (id === null || !Usuario.obtener(id)) return res.status(404).json({ error: 'Usuario no encontrado' });

  const d = leerDatos(req.body);
  const errores = validar(d, false);
  if (errores.length) return res.status(400).json({ errores });

  // Evita que el administrador se deje fuera del sistema
  if (id === req.session.usuario.id && (d.rol !== 'ADMINISTRADOR' || !d.activo)) {
    return res.status(400).json({ error: 'No puedes quitarte el rol de administrador ni desactivar tu propia cuenta' });
  }

  try {
    Usuario.actualizar(id, { ...d, password_hash: d.password ? bcrypt.hashSync(d.password, 10) : null });
    res.json(Usuario.obtener(id));
  } catch (err) {
    responderError(err, res);
  }
}

function eliminar(req, res) {
  const id = leerId(req);
  if (id === null || !Usuario.obtener(id)) return res.status(404).json({ error: 'Usuario no encontrado' });
  if (id === req.session.usuario.id) {
    return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
  }
  Usuario.eliminar(id);
  res.json({ mensaje: 'Usuario eliminado' });
}

module.exports = { listar, obtener, crear, actualizar, eliminar };