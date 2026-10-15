CREATE TABLE IF NOT EXISTS categorias (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre      TEXT NOT NULL UNIQUE,
  iva_tasa    REAL NOT NULL DEFAULT 0,
  ieps_tipo   TEXT NOT NULL DEFAULT 'ninguno'
              CHECK (ieps_tipo IN ('ninguno', 'porcentaje', 'cuota_litro')),
  ieps_valor  REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS productos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo        TEXT NOT NULL UNIQUE,
  nombre        TEXT NOT NULL,
  categoria_id  INTEGER NOT NULL REFERENCES categorias(id),
  precio_base   REAL NOT NULL CHECK (precio_base >= 0),
  litros        REAL NOT NULL DEFAULT 0,
  stock         INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  stock_minimo  INTEGER NOT NULL DEFAULT 5,
  activo        INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS usuarios (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre         TEXT NOT NULL,
  usuario        TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  rol            TEXT NOT NULL CHECK (rol IN ('administrador', 'cajero')),
  activo         INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS ventas (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha       TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id),
  subtotal    REAL NOT NULL,
  ieps        REAL NOT NULL,
  iva         REAL NOT NULL,
  total       REAL NOT NULL,
  recibido    REAL NOT NULL,
  cambio      REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS detalle_venta (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  venta_id         INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  producto_id      INTEGER NOT NULL REFERENCES productos(id),
  cantidad         INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario  REAL NOT NULL,
  subtotal         REAL NOT NULL,
  ieps             REAL NOT NULL,
  iva              REAL NOT NULL,
  total            REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  producto_id  INTEGER NOT NULL REFERENCES productos(id),
  tipo         TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida')),
  cantidad     INTEGER NOT NULL CHECK (cantidad > 0),
  motivo       TEXT,
  usuario_id   INTEGER REFERENCES usuarios(id),
  fecha        TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);