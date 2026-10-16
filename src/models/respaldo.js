const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const Config = require('./configuracion');

const CARPETA = path.join(__dirname, '..', '..', 'respaldos');
const NOMBRE = /^vendix_[\w-]+\.db$/;
const MAXIMO = 30;

// Primero las tablas "padre", después las que dependen de ellas
const TABLAS = [
  'configuracion_negocio', 'impuestos', 'categorias', 'productos',
  'usuarios', 'ventas', 'detalle_venta', 'movimientos_inventario',
];

function marca() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}

function listar() {
  if (!fs.existsSync(CARPETA)) return [];
  return fs.readdirSync(CARPETA)
    .filter((n) => NOMBRE.test(n))
    .map((n) => {
      const s = fs.statSync(path.join(CARPETA, n));
      return { nombre: n, fecha: s.mtime.toISOString(), tamano: s.size };
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

// Devuelve la ruta solo si el nombre es válido y el archivo existe (evita rutas manipuladas)
function ruta(nombre) {
  if (!NOMBRE.test(nombre)) return null;
  const completa = path.join(CARPETA, nombre);
  return fs.existsSync(completa) ? completa : null;
}

function podar() {
  for (const r of listar().slice(MAXIMO)) fs.unlinkSync(path.join(CARPETA, r.nombre));
}

async function crear({ prefijo = 'vendix_', registrar = true } = {}) {
  fs.mkdirSync(CARPETA, { recursive: true });
  const nombre = `${prefijo}${marca()}.db`;
  if (registrar) Config.registrarRespaldo();
  await db.backup(path.join(CARPETA, nombre));
  podar();
  return nombre;
}

// Reemplaza todos los datos por los del respaldo: o se copia todo, o no se cambia nada
async function restaurar(nombre) {
  const origen = ruta(nombre);
  if (!origen) throw new Error('El respaldo no existe');

  // Copia de seguridad del estado actual, por si hay que deshacer
  await crear({ prefijo: 'vendix_antes-de-restaurar_', registrar: false });

  db.prepare('ATTACH DATABASE ? AS respaldo').run(origen);
  try {
    const valido = TABLAS.every((t) =>
      db.prepare("SELECT 1 FROM respaldo.sqlite_master WHERE type = 'table' AND name = ?").get(t));
    if (!valido) throw new Error('El archivo no es un respaldo válido de Vendix');

    db.pragma('foreign_keys = OFF');
    db.transaction(() => {
      for (const t of [...TABLAS].reverse()) db.exec(`DELETE FROM main.${t}`);
      db.exec(`DELETE FROM sqlite_sequence WHERE name IN (${TABLAS.map((t) => `'${t}'`).join(',')})`);
      for (const t of TABLAS) {
        // Solo las columnas que existen en ambas: así sirven también los respaldos de versiones anteriores
        const nuevas = db.prepare(`PRAGMA main.table_info(${t})`).all().map((c) => c.name);
        const viejas = new Set(db.prepare(`PRAGMA respaldo.table_info(${t})`).all().map((c) => c.name));
        const comunes = nuevas.filter((c) => viejas.has(c)).join(', ');
        db.exec(`INSERT INTO main.${t} (${comunes}) SELECT ${comunes} FROM respaldo.${t}`);
      }
    })();
  } finally {
    db.pragma('foreign_keys = ON');
    db.exec('DETACH DATABASE respaldo');
  }
}

module.exports = { listar, ruta, crear, restaurar };