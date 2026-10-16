const el = (id) => document.getElementById(id);
const form = el('form-negocio');
let respaldoPendiente = null;

function pintarConfig() {
  form.nombre_tienda.value = CONFIG.nombre_tienda;
  form.moneda.value = CONFIG.moneda;
  form.calcular_impuestos.checked = CONFIG.calcular_impuestos;
  el('ultimo-respaldo').textContent = CONFIG.ultimo_respaldo ? fechaLegible(CONFIG.ultimo_respaldo) : 'Todavía no hay';
}

async function cargarRespaldos() {
  const lista = await api('/api/respaldos');
  el('lista-respaldos').innerHTML = lista.length
    ? lista.map((r) => `
        <div class="fila-respaldo">
          <div>
            <strong>${esc(r.nombre)}</strong>
            <small>${new Date(r.fecha).toLocaleString('es-MX')} · ${Math.max(1, Math.round(r.tamano / 1024))} KB</small>
          </div>
          <div class="acciones">
            <a class="btn btn-secundario btn-chico" href="/api/respaldos/${encodeURIComponent(r.nombre)}">Descargar</a>
            <button class="btn btn-peligro btn-chico" data-nombre="${esc(r.nombre)}">Restaurar</button>
          </div>
        </div>`).join('')
    : '<p class="vacio">Todavía no hay respaldos.</p>';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  el('error-negocio').hidden = true;
  try {
    CONFIG = await api('/api/configuracion', {
      method: 'PUT',
      body: JSON.stringify({
        nombre_tienda: form.nombre_tienda.value,
        moneda: form.moneda.value,
        calcular_impuestos: form.calcular_impuestos.checked,
      }),
    });
    const tienda = document.querySelector('.tienda');
    if (tienda) tienda.textContent = CONFIG.nombre_tienda;
    mostrarMensaje('Cambios guardados', 'ok');
  } catch (err) {
    el('error-negocio').textContent = err.message;
    el('error-negocio').hidden = false;
  }
});

el('btn-respaldar').addEventListener('click', async () => {
  try {
    await api('/api/respaldos', { method: 'POST' });
    CONFIG = await api('/api/configuracion');
    pintarConfig();
    await cargarRespaldos();
    avisar('Respaldo creado');
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
});

el('lista-respaldos').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-nombre]');
  if (!b) return;
  respaldoPendiente = b.dataset.nombre;
  el('texto-restaurar').textContent =
    `Se reemplazarán TODOS los datos actuales (productos, ventas, usuarios y ajustes) por los del respaldo «${respaldoPendiente}». ` +
    'Antes se guardará un respaldo del estado actual para poder deshacerlo. Tendrás que volver a iniciar sesión.';
  el('dialogo-restaurar').showModal();
});

el('restaurar-cancelar').addEventListener('click', () => el('dialogo-restaurar').close());
el('restaurar-confirmar').addEventListener('click', async () => {
  el('dialogo-restaurar').close();
  try {
    await api(`/api/respaldos/${encodeURIComponent(respaldoPendiente)}/restaurar`, { method: 'POST' });
    await fetch('/api/auth/logout', { method: 'POST' });
    location.href = 'login.html';
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
});

sesionLista.then(() => {
  if (!USUARIO || USUARIO.rol !== 'ADMINISTRADOR') return;
  pintarConfig();
  cargarRespaldos().catch((err) => mostrarMensaje(err.message, 'error'));
});