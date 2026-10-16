const el = (id) => document.getElementById(id);
let reporteActual = null;

const dosDigitos = (n) => String(n).padStart(2, '0');
const aTexto = (d) => `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`;
const fechaCorta = (iso) => iso.split('-').reverse().join('/');

function pintar(r) {
  el('total-vendido').textContent = moneda.format(r.total_vendido);
  el('num-ventas').textContent = r.num_ventas;

  el('tabla-dias').innerHTML = r.por_dia.length
    ? r.por_dia.map((d) => `
        <tr><td>${fechaCorta(d.fecha)}</td><td>${d.ventas}</td><td>${moneda.format(d.total)}</td></tr>`).join('')
    : '<tr><td colspan="3" class="vacio">No hay ventas en este periodo.</td></tr>';

  el('tabla-productos').innerHTML = r.productos.length
    ? r.productos.map((p, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${esc(p.nombre)}</td>
          <td>${p.unidades}</td>
          <td>${moneda.format(p.importe)}</td>
        </tr>`).join('')
    : '<tr><td colspan="4" class="vacio">No hay productos vendidos en este periodo.</td></tr>';

  el('btn-exportar').disabled = false;
}

async function generar() {
  const desde = el('desde').value;
  const hasta = el('hasta').value;
  if (!desde || !hasta) {
    mostrarMensaje('Elige las dos fechas', 'error');
    return;
  }
  if (desde > hasta) {
    mostrarMensaje('La fecha inicial no puede ser mayor que la final', 'error');
    return;
  }
  try {
    reporteActual = await api(`/api/reportes?desde=${desde}&hasta=${hasta}`);
    pintar(reporteActual);
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
}

// Descarga exactamente el periodo que se ve en pantalla
el('btn-exportar').addEventListener('click', () => {
  if (!reporteActual) return;
  location.href = `/api/reportes/exportar?desde=${reporteActual.desde}&hasta=${reporteActual.hasta}`;
  avisar('Descargando el reporte…');
});

el('btn-generar').addEventListener('click', generar);

sesionLista.then(() => {
  if (!USUARIO || USUARIO.rol !== 'ADMINISTRADOR') return;
  const hoy = new Date();
  el('desde').value = aTexto(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  el('hasta').value = aTexto(hoy);
  generar();
});