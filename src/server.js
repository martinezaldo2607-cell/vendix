const express = require('express');
const session = require('express-session');
const SqliteStore = require('better-sqlite3-session-store')(session);
const path = require('path');

const db = require('./config/db');
const { requiereSesion } = require('./middlewares/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.use(express.json());

app.use(session({
  store: new SqliteStore({ client: db }),
  secret: process.env.SESSION_SECRET || 'vendix-secreto-de-desarrollo',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 8 * 60 * 60 * 1000 },
}));

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/salud', (req, res) => {
  res.json({ ok: true, mensaje: 'Vendix funcionando' });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/productos', require('./routes/productos'));
app.use('/api/inventario', require('./routes/inventario'));
app.use('/api/categorias', requiereSesion, require('./routes/categorias'));
app.use('/api/impuestos', requiereSesion, require('./routes/impuestos'));

app.listen(PORT, () => {
  console.log(`Vendix corriendo en http://localhost:${PORT}`);
});