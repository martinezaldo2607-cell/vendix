// [id, texto, página, roles que lo ven]
const MENU = [
  ['inicio', 'Inicio', 'index.html', ['ADMINISTRADOR', 'CAJERO']],
  ['ventas', 'Ventas', 'ventas.html', ['ADMINISTRADOR', 'CAJERO']],
  ['productos', 'Productos', 'productos.html', ['ADMINISTRADOR']],
  ['inventario', 'Inventario', 'inventario.html', ['ADMINISTRADOR', 'CAJERO']],
  ['historial', 'Historial', 'historial.html', ['ADMINISTRADOR', 'CAJERO']],
  ['reportes', 'Reportes', 'reportes.html', ['ADMINISTRADOR']],
  ['usuarios', 'Usuarios', 'usuarios.html', ['ADMINISTRADOR']],
  ['ajustes', 'Ajustes', 'ajustes.html', ['ADMINISTRADOR']],
];

const ROLES = { ADMINISTRADOR: 'Administrador', CAJERO: 'Cajero' };
let USUARIO = null;

const moneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

function esc(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

async function api(url, opciones = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opciones });
  if (res.status === 401) {
    location.href = 'login.html';
    throw new Error('Inicia sesión para continuar');
  }
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

async function montarLayout() {
  USUARIO = await api('/api/auth/yo');

  // Páginas restringidas: <body data-roles="ADMINISTRADOR">
  const permitidos = document.body.dataset.roles;
  if (permitidos && !permitidos.split(',').includes(USUARIO.rol)) {
    location.href = 'index.html';
    return;
  }

  const activa = document.body.dataset.pagina;
  document.getElementById('barra-lateral').innerHTML = `
    <div class="logo">Vendix<span>.</span></div>
    <nav>${MENU.filter((m) => m[3].includes(USUARIO.rol)).map(([id, texto, url]) =>
      `<a href="${url}" class="${id === activa ? 'activo' : ''}">${texto}</a>`).join('')}</nav>
    <div class="usuario">
      ${esc(USUARIO.nombre)}<br>${ROLES[USUARIO.rol]}<br>
      <button id="cerrar-sesion" class="cerrar-sesion">Cerrar sesión</button>
    </div>`;

  document.getElementById('cerrar-sesion').addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    location.href = 'login.html';
  });
}

const sesionLista = montarLayout().catch(() => {});