const el = (id) => document.getElementById(id);
let ventas = [];

function mostrarTicket(si) {
  el('vista-lista').hidden = si;
  el('vista-ticket').hidden = !si;
}

async function cargar() {
  const desde = el('desde').value;
  const hasta = el('hasta').value;
  if (desde && hasta && desde > hasta) {
    mostrarMensaje('La fecha inicial no puede ser mayor que la final', 'error');
    return;
  }
  const params = new URLSearchParams();
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);

  try {
    ventas = await api('/api/ventas?' + params);
    pintar();
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
}

function pintar() {
  el('nota-limite').hidden = ventas.length < 200;
  if (ventas.length === 0) {
    el('tabla-ventas').innerHTML = '<tr><td colspan="5" class="vacio">No hay ventas en este periodo.</td></tr>';
    return;
  }
  el('tabla-ventas').innerHTML = ventas.map((v) => `
    <tr>
      <td>${esc(v.folio)}</td>
      <td>${fechaLegible(v.fecha_hora)}</td>
      <td>${esc(v.cajero)}</td>
      <td>${moneda.format(v.total)}</td>
      <td><button class="btn btn-secundario" data-id="${v.id}">Ver ticket</button></td>
    </tr>`).join('');
}

el('tabla-ventas').addEventListener('click', async (e) => {
  const boton = e.target.closest('button[data-id]');
  if (!boton) return;
  try {
    const venta = await api(`/api/ventas/${boton.dataset.id}`);
    el('ticket-contenido').innerHTML = htmlTicket(venta);
    mostrarTicket(true);
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
});

el('btn-filtrar').addEventListener('click', cargar);
el('btn-limpiar').addEventListener('click', () => {
  el('desde').value = '';
  el('hasta').value = '';
  cargar();
});
el('btn-volver').addEventListener('click', () => mostrarTicket(false));
el('btn-imprimir').addEventListener('click', () => window.print());

sesionLista.then(() => {
  if (USUARIO && USUARIO.rol === 'CAJERO') el('nota-cajero').hidden = false;
  cargar();
});