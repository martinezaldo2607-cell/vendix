const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Para leer JSON que llegue en las peticiones
app.use(express.json());

// Sirve los archivos de la carpeta public (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Ruta de prueba para confirmar que todo funciona
app.get('/api/salud', (req, res) => {
  res.json({ ok: true, mensaje: 'Vendix funcionando' });
});

app.use('/api/productos', require('./routes/productos'));
app.use('/api/categorias', require('./routes/categorias'));

app.listen(PORT, () => {
  console.log(`Vendix corriendo en http://localhost:${PORT}`);
});