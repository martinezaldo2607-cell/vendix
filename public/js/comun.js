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
let CONFIG = null;

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
  CONFIG = await api('/api/configuracion');

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

function fechaLegible(texto) {
  const [f, h = ''] = String(texto).split(' ');
  const [a, m, d] = f.split('-');
  return `${d}/${m}/${a} ${h.slice(0, 5)}`;
}

function htmlTicket(v) {
  return `
    <div class="ticket">
      <h3 class="logo-ticket">Vendix<span>.</span></h3>
      <p class="meta">${fechaLegible(v.fecha_hora)} · Folio ${esc(v.folio)} · Cajero: ${esc(v.cajero)}</p>
      ${v.detalle.map((d) => `
        <div class="linea-ticket">
          <span>${esc(d.nombre_producto)}</span>
          <span>× ${d.cantidad}</span>
          <span>${moneda.format(d.total)}</span>
        </div>`).join('')}
      <div class="total-ticket"><span>Total</span><strong>${moneda.format(v.total)}</strong></div>
      <div class="linea-ticket fina"><span>Pago en efectivo</span><span></span><span>${moneda.format(v.monto_recibido)}</span></div>
      <div class="cambio"><span>Cambio</span><strong>${moneda.format(v.cambio)}</strong></div>
      ${v.ieps + v.iva > 0 ? `<p class="desglose">Incluye: subtotal ${moneda.format(v.subtotal)} · IEPS ${moneda.format(v.ieps)} · IVA ${moneda.format(v.iva)}</p>` : ''}
    </div>`;
}