const cuerpo = document.getElementById('tabla-inventario');
const inputBuscar = document.getElementById('buscar');
const selectEstado = document.getElementById('filtro-estado');
const btnEntrada = document.getElementById('btn-entrada');
const dialogo = document.getElementById('dialogo-entrada');
const formulario = document.getElementById('formulario');
const errorForm = document.getElementById('error-form');
const selectProducto = document.getElementById('select-producto');

const ETIQUETAS = {
  DISPONIBLE: ['Disponible', 'estado-ok'],
  STOCK_BAJO: ['Stock bajo', 'estado-bajo'],
  AGOTADO: ['Agotado', 'estado-agotado'],
  DESACTIVADO: ['Desactivado', 'estado-desactivado'],
};

let filas = [];

let ultimaFirma = null;

async function cargar(silencioso = false) {
  const params = new URLSearchParams();
  if (inputBuscar.value.trim()) params.set('buscar', inputBuscar.value.trim());
  try {
    const datos = await api('/api/inventario?' + params);
    // La "firma" sirve para saber si algo cambió desde la última vez
    const firma = params.toString() + JSON.stringify(datos);
    const cambio = silencioso && ultimaFirma !== null && firma !== ultimaFirma;
    ultimaFirma = firma;
    if (silencioso && !cambio) return true;

    filas = datos;
    pintar();
    if (cambio) avisar('El inventario se actualizó');
    return true;
  } catch (err) {
    if (!silencioso) mostrarMensaje(err.message, 'error');
    return false;
  }
}

function pintar() {
  const filtro = selectEstado.value;
  const visibles = filas.filter((f) => !filtro || f.estado === filtro);

  if (visibles.length === 0) {
    cuerpo.innerHTML = '<tr><td colspan="4" class="vacio">No hay productos que mostrar.</td></tr>';
    return;
  }
  cuerpo.innerHTML = visibles.map((f) => {
    const [texto, clase] = ETIQUETAS[f.estado];
    return `
      <tr class="${f.estado === 'DESACTIVADO' ? 'fila-desactivada' : ''}">
        <td>${esc(f.nombre)}</td>
        <td>${f.stock}</td>
        <td>${f.stock_minimo}</td>
        <td><span class="estado ${clase}">${texto}</span></td>
      </tr>`;
  }).join('');
}

async function abrirEntrada() {
  formulario.reset();
  errorForm.hidden = true;
  // Se pide la lista completa, sin importar lo que haya en el buscador
  const todos = await api('/api/inventario');
  selectProducto.innerHTML =
    '<option value="">Seleccionar...</option>' +
    todos.map((p) => `<option value="${p.id}">${esc(p.nombre)} (existencias: ${p.stock})${p.estado === 'DESACTIVADO' ? ' [desactivado]' : ''}</option>`).join('');
  dialogo.showModal();
}

formulario.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('/api/inventario/entradas', {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(new FormData(formulario))),
    });
    dialogo.close();
    mostrarMensaje('Entrada registrada', 'ok');
    await cargar();
  } catch (err) {
    errorForm.textContent = err.message;
    errorForm.hidden = false;
  }
});

btnEntrada.addEventListener('click', abrirEntrada);
document.getElementById('btn-cancelar').addEventListener('click', () => dialogo.close());
selectEstado.addEventListener('change', pintar);

let temporizador;
inputBuscar.addEventListener('input', () => {
  clearTimeout(temporizador);
  temporizador = setTimeout(cargar, 300);
});

// El botón de entrada solo aparece para el administrador; el cajero ve una nota
sesionLista.then(() => {
  if (!USUARIO) return;
  if (USUARIO.rol === 'ADMINISTRADOR') btnEntrada.hidden = false;
  else document.getElementById('nota-lectura').hidden = false;
});

cargar();

document.getElementById('btn-actualizar').addEventListener('click', async () => {
  if (await cargar()) avisar('Inventario actualizado');
});
actualizarAutomaticamente(() => cargar(true));