const db = require('../config/db');

function buscarPorUsuario(usuario) {
  return db.prepare('SELECT * FROM usuarios WHERE usuario = ?').get(usuario);
}

module.exports = { buscarPorUsuario };