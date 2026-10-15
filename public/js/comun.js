const MENU = [
  ['inicio', 'Inicio', 'index.html'],
  ['ventas', 'Ventas', 'ventas.html'],
  ['productos', 'Productos', 'productos.html'],
  ['inventario', 'Inventario', 'inventario.html'],
  ['historial', 'Historial', 'historial.html'],
  ['reportes', 'Reportes', 'reportes.html'],
  ['usuarios', 'Usuarios', 'usuarios.html'],
  ['ajustes', 'Ajustes', 'ajustes.html'],
];

// Sesión simulada: se reemplaza cuando hagamos el login
const USUARIO = { nombre: 'Ricardo Gómez', rol: 'Administrador' };

const moneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

function esc(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

async function api(url, opciones = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opciones });
  const datos = await res.json();
  if (!res.ok) throw new Error(datos.errores ? datos.errores.join('. ') : datos.error);
  return datos;
}

let temporizadorMensaje;
function mostrarMensaje(texto, tipo) {
  const caja = document.getElementById('mensaje');
  caja.textContent = texto;
  caja.className = `mensaje ${tipo}`;
  caja.hidden = false;
  clearTimeout(temporizadorMensaje);
  temporizadorMensaje = setTimeout(() => { caja.hidden = true; }, 4000);
}

function montarLayout() {
  const activa = document.body.dataset.pagina;
  document.getElementById('barra-lateral').innerHTML = `
    <div class="logo">Vendix<span>.</span></div>
    <nav>${MENU.map(([id, texto, url]) =>
      `<a href="${url}" class="${id === activa ? 'activo' : ''}">${texto}</a>`).join('')}</nav>
    <div class="usuario">${esc(USUARIO.nombre)}<br>${esc(USUARIO.rol)}</div>`;
}

montarLayout();