const bcrypt = require('bcryptjs');
const Usuario = require('../models/usuario');

function login(req, res) {
  const usuario = String(req.body?.usuario ?? '').trim();
  const password = String(req.body?.password ?? '');
  if (!usuario || !password) {
    return res.status(400).json({ error: 'Escribe tu usuario y contraseña' });
  }

  const fila = Usuario.buscarPorUsuario(usuario);
  // Mismo mensaje si el usuario no existe, está inactivo o la contraseña falla
  if (!fila || !fila.activo || !bcrypt.compareSync(password, fila.password_hash)) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }

  // Sesión nueva al entrar, para no reutilizar un identificador anterior
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'No se pudo iniciar sesión' });
    req.session.usuario = { id: fila.id, nombre: fila.nombre, usuario: fila.usuario, rol: fila.rol };
    res.json(req.session.usuario);
  });
}

function logout(req, res) {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ mensaje: 'Sesión cerrada' });
  });
}

function yo(req, res) {
  res.json(req.session.usuario);
}

module.exports = { login, logout, yo };