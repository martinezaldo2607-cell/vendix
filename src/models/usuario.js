const db = require('../config/db');

const CAMPOS = 'id, nombre, usuario, rol, activo';

function buscarPorUsuario(usuario) {
  return db.prepare('SELECT * FROM usuarios WHERE usuario = ?').get(usuario);
}

function listar() {
  return db.prepare(`SELECT ${CAMPOS} FROM usuarios WHERE eliminado = 0 ORDER BY activo DESC, nombre`).all();
}

function obtener(id) {
  return db.prepare(`SELECT ${CAMPOS} FROM usuarios WHERE id = ? AND eliminado = 0`).get(id);
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

// Baja lógica: se conserva el historial (ventas y movimientos) y se libera el nombre de usuario
function eliminar(id) {
  db.prepare(`
    UPDATE usuarios
    SET eliminado = 1, activo = 0, usuario = substr(usuario, 1, 30) || '~baja' || id
    WHERE id = ?
  `).run(id);
}

module.exports = { buscarPorUsuario, listar, obtener, crear, actualizar, eliminar };