const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const rutaDB = path.join(__dirname, '..', '..', 'database', 'vendix.db');
const rutaSchema = path.join(__dirname, '..', '..', 'database', 'schema.sql');

const db = new Database(rutaDB);

// SQLite no valida las llaves foráneas a menos que se active
db.pragma('foreign_keys = ON');

// Crea las tablas si todavía no existen
db.exec(fs.readFileSync(rutaSchema, 'utf8'));

module.exports = db;