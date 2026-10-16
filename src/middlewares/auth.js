const db = require('../config/db');

// En cada petición se confirma que el usuario siga existiendo y activo, y se toma su rol vigente
function usuarioVigente(req) {
  const guardado = req.session.usuario;
  if (!guardado) return null;
  const u = db.prepare('SELECT id, nombre, usuario, rol, activo FROM usuarios WHERE id = ?').get(guardado.id);
  if (!u || !u.activo) return null;
  if (guardado.rol !== u.rol || guardado.nombre !== u.nombre) {
    req.session.usuario = { id: u.id, nombre: u.nombre, usuario: u.usuario, rol: u.rol };
  }
  return req.session.usuario;
}

function sinSesion(req, res) {
  req.session.destroy(() => res.status(401).json({ error: 'Inicia sesión para continuar' }));
}

function requiereSesion(req, res, next) {
  if (!usuarioVigente(req)) return sinSesion(req, res);
  next();
}

function requiereRol(...roles) {
  return (req, res, next) => {
    const u = usuarioVigente(req);
    if (!u) return sinSesion(req, res);
    if (!roles.includes(u.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para esta acción' });
    }
    next();
  };
}

module.exports = { requiereSesion, requiereRol };