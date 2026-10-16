const db = require('../config/db');

const CAMPOS = 'id, nombre, usuario, rol, activo';

function buscarPorUsuario(usuario) {
  return db.prepare('SELECT * FROM usuarios WHERE usuario = ?').get(usuario);
}

function listar() {
  return db.prepare(`SELECT ${CAMPOS} FROM usuarios ORDER BY activo DESC, nombre`).all();
}

function obtener(id) {
  return db.prepare(`SELECT ${CAMPOS} FROM usuarios WHERE id = ?`).get(id);
}

function crear(d) {
  return db.prepare(
    'INSERT INTO usuarios (nombre, usuario, password_hash, rol) VALUES (?, ?, ?, ?)'
  ).run(d.nombre, d.usuario, d.password_hash, d.rol).lastInsertRowid;
}

const actualizar = db.transaction((id, d) => {
  db.prepare('UPDATE usuarios SET nombre = ?, usuario = ?, rol = ?, activo = ? WHERE id = ?')
    .run(d.nombre, d.usuario, d.rol, d.activo, id);
  if (d.password_hash) {
    db.prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?').run(d.password_hash, id);
  }
});

module.exports = { buscarPorUsuario, listar, obtener, crear, actualizar };