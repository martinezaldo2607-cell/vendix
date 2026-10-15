-- Vendix: esquema de la base de datos (SQLite)
-- Basado en el diseño de Arely, con adaptaciones del desarrollo

CREATE TABLE IF NOT EXISTS impuestos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre      TEXT NOT NULL UNIQUE,
  iva_tasa    REAL NOT NULL DEFAULT 0 CHECK (iva_tasa >= 0),
  ieps_tipo   TEXT NOT NULL DEFAULT 'ninguno'
              CHECK (ieps_tipo IN ('ninguno', 'porcentaje', 'cuota_litro')),
  ieps_valor  REAL NOT NULL DEFAULT 0 CHECK (ieps_valor >= 0)
);

CREATE TABLE IF NOT EXISTS categorias (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre               TEXT NOT NULL UNIQUE CHECK (length(nombre) <= 100),
  descripcion          TEXT CHECK (length(descripcion) <= 200),
  impuesto_defecto_id  INTEGER REFERENCES impuestos(id)
);

CREATE TABLE IF NOT EXISTS productos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo        TEXT UNIQUE,
  nombre        TEXT NOT NULL CHECK (length(nombre) <= 100),
  descripcion   TEXT CHECK (length(descripcion) <= 200),
  categoria_id  INTEGER NOT NULL REFERENCES categorias(id),
  impuesto_id   INTEGER NOT NULL REFERENCES impuestos(id),
  precio_base   REAL NOT NULL CHECK (precio_base > 0),
  litros        REAL NOT NULL DEFAULT 0 CHECK (litros >= 0),
  stock         INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  stock_minimo  INTEGER NOT NULL DEFAULT 10 CHECK (stock_minimo >= 0),
  activo        INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1))
);

CREATE TABLE IF NOT EXISTS usuarios (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre         TEXT NOT NULL CHECK (length(nombre) <= 100),
  usuario        TEXT NOT NULL UNIQUE CHECK (length(usuario) <= 50),
  password_hash  TEXT NOT NULL,
  rol            TEXT NOT NULL CHECK (rol IN ('ADMINISTRADOR', 'CAJERO')),
  activo         INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1))
);

CREATE TABLE IF NOT EXISTS ventas (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  folio           TEXT UNIQUE,
  fecha_hora      TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  usuario_id      INTEGER NOT NULL REFERENCES usuarios(id),
  subtotal        REAL NOT NULL CHECK (subtotal >= 0),
  ieps            REAL NOT NULL DEFAULT 0 CHECK (ieps >= 0),
  iva             REAL NOT NULL DEFAULT 0 CHECK (iva >= 0),
  total           REAL NOT NULL CHECK (total >= 0),
  monto_recibido  REAL NOT NULL,
  cambio          REAL NOT NULL CHECK (cambio >= 0),
  CHECK (monto_recibido >= total)
);

CREATE TABLE IF NOT EXISTS detalle_venta (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  venta_id         INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  producto_id      INTEGER NOT NULL REFERENCES productos(id),
  nombre_producto  TEXT NOT NULL,
  cantidad         INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario  REAL NOT NULL CHECK (precio_unitario >= 0),
  subtotal         REAL NOT NULL CHECK (subtotal >= 0),
  ieps             REAL NOT NULL DEFAULT 0,
  iva              REAL NOT NULL DEFAULT 0,
  total            REAL NOT NULL CHECK (total >= 0)
);

CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  producto_id  INTEGER NOT NULL REFERENCES productos(id),
  usuario_id   INTEGER REFERENCES usuarios(id),
  tipo         TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida')),
  cantidad     INTEGER NOT NULL CHECK (cantidad > 0),
  fecha_hora   TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  observacion  TEXT CHECK (length(observacion) <= 200)
);

CREATE TABLE IF NOT EXISTS configuracion_negocio (
  id               INTEGER PRIMARY KEY CHECK (id = 1),
  nombre_tienda    TEXT NOT NULL CHECK (length(nombre_tienda) <= 100),
  moneda           TEXT NOT NULL DEFAULT 'MXN' CHECK (length(moneda) <= 10),
  ultimo_respaldo  TEXT
);

CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos(nombre);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha_hora);
CREATE INDEX IF NOT EXISTS idx_detalle_venta ON detalle_venta(venta_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_producto ON movimientos_inventario(producto_id);