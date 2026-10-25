const el = (id) => document.getElementById(id);
const form = el('form-negocio');
let respaldoPendiente = null;

function pintarConfig() {
  form.nombre_tienda.value = CONFIG.nombre_tienda;
  form.moneda.value = CONFIG.moneda;
  form.calcular_impuestos.checked = CONFIG.calcular_impuestos;
  el('ultimo-respaldo').textContent = CONFIG.ultimo_respaldo ? fechaLegible(CONFIG.ultimo_respaldo) : 'Todavía no hay';
}

const esAutomatico = (nombre) => nombre.startsWith('vendix_antes-');

async function cargarRespaldos() {
  const lista = await api('/api/respaldos');
  el('lista-respaldos').innerHTML = lista.length
    ? lista.map((r) => `
        <div class="fila-respaldo">
          <div class="datos-respaldo">
            <strong>${esc(r.nombre)}</strong>
            <small>
              ${new Date(r.fecha).toLocaleString('es-MX')} · ${Math.max(1, Math.round(r.tamano / 1024))} KB
              ${esAutomatico(r.nombre) ? '<span class="etiqueta etiqueta-gris">Automático</span>' : ''}
            </small>
          </div>
          <div class="acciones">
            <a class="btn btn-secundario btn-chico" href="/api/respaldos/${encodeURIComponent(r.nombre)}">Descargar</a>
            <button class="btn btn-secundario btn-chico" data-accion="restaurar" data-nombre="${esc(r.nombre)}">Restaurar</button>
            <button class="btn btn-peligro btn-chico" data-accion="eliminar" data-nombre="${esc(r.nombre)}">Eliminar</button>
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

  if (b.dataset.accion === 'eliminar') {
    el('texto-eliminar-respaldo').textContent =
      `Se eliminará el respaldo «${respaldoPendiente}». Si ya descargaste una copia, no pasa nada; si no, no podrás recuperarlo.` +
      (esAutomatico(respaldoPendiente)
        ? ' Es una copia de seguridad automática: al eliminarla ya no podrás deshacer el cambio que la generó.'
        : '');
    el('dialogo-eliminar-respaldo').showModal();
    return;
  }

  el('texto-restaurar').textContent =
    `Se reemplazarán TODOS los datos actuales (productos, ventas, usuarios y ajustes) por los del respaldo «${respaldoPendiente}». ` +
    'Antes se guardará un respaldo del estado actual para poder deshacerlo. Tendrás que volver a iniciar sesión.';
  el('dialogo-restaurar').showModal();
});

el('eliminar-respaldo-cancelar').addEventListener('click', () => el('dialogo-eliminar-respaldo').close());
el('eliminar-respaldo-confirmar').addEventListener('click', async () => {
  el('dialogo-eliminar-respaldo').close();
  try {
    await api(`/api/respaldos/${encodeURIComponent(respaldoPendiente)}`, { method: 'DELETE' });
    avisar('Respaldo eliminado');
    await cargarRespaldos();
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
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

// ---------- Empezar de cero ----------
let claveBorrar = null;

const ACCIONES_BORRAR = {
  catalogo: {
    titulo: 'Vaciar el catálogo',
    ruta: '/api/mantenimiento/vaciar-catalogo',
    texto: (r) => `Se quitarán ${r.productos} productos del catálogo y del inventario. Las ${r.ventas} ventas registradas se conservan.`,
    ok: 'Catálogo vaciado',
  },
  todo: {
    titulo: 'Empezar de cero',
    ruta: '/api/mantenimiento/reiniciar',
    texto: (r) => `Se borrarán ${r.productos} productos, ${r.ventas} ventas y ${r.movimientos} movimientos de inventario. Los folios y los códigos de producto volverán a empezar.`,
    ok: 'Tienda reiniciada',
  },
};

async function abrirBorrar(clave) {
  try {
    const resumen = await api('/api/mantenimiento/resumen');
    claveBorrar = clave;
    el('borrar-titulo').textContent = ACCIONES_BORRAR[clave].titulo;
    el('borrar-texto').textContent = `${ACCIONES_BORRAR[clave].texto(resumen)} Antes se guardará un respaldo automático.`;
    el('form-borrar').reset();
    el('error-borrar').hidden = true;
    el('dialogo-borrar').showModal();
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
}

el('btn-vaciar-catalogo').addEventListener('click', () => abrirBorrar('catalogo'));
el('btn-reiniciar').addEventListener('click', () => abrirBorrar('todo'));
el('borrar-cancelar').addEventListener('click', () => el('dialogo-borrar').close());

el('form-borrar').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  const accion = ACCIONES_BORRAR[claveBorrar];
  try {
    const r = await api(accion.ruta, {
      method: 'POST',
      body: JSON.stringify({ confirmacion: f.confirmacion.value, password: f.password.value }),
    });
    el('dialogo-borrar').close();
    await cargarRespaldos();
    mostrarMensaje(`${accion.ok}. Respaldo guardado: ${r.respaldo}`, 'ok');
  } catch (err) {
    el('error-borrar').textContent = err.message;
    el('error-borrar').hidden = false;
  }
});

sesionLista.then(() => {
  if (!USUARIO || USUARIO.rol !== 'ADMINISTRADOR') return;
  pintarConfig();
  cargarRespaldos().catch((err) => mostrarMensaje(err.message, 'error'));
});