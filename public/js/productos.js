const cuerpo = document.getElementById('tabla-productos');
const inputBuscar = document.getElementById('buscar');
const checkBajo = document.getElementById('solo-bajo');
const checkDesactivados = document.getElementById('solo-desactivados');
const dialogo = document.getElementById('dialogo');

let productos = [];
let pendiente = null;   // { accion, producto } esperando confirmación

const ACCIONES = {
  desactivar: {
    titulo: '¿Desactivar producto?',
    texto: (p) => `${p.nombre} dejará de aparecer en Ventas y en esta lista, pero seguirá en Inventario marcado como desactivado. Podrás reactivarlo cuando quieras.`,
    boton: 'Desactivar',
    clase: 'btn-primario',
    ruta: (id) => `/api/productos/${id}/desactivar`,
    metodo: 'POST',
    ok: 'Producto desactivado',
  },
  reactivar: {
    ruta: (id) => `/api/productos/${id}/reactivar`,
    metodo: 'POST',
    ok: 'Producto reactivado',
  },
  eliminar: {
    titulo: '¿Eliminar producto?',
    texto: (p) => `Se dará de baja ${p.nombre} del catálogo y del inventario. Las ventas anteriores se conservan en el historial.`,
    boton: 'Eliminar',
    clase: 'btn-peligro',
    ruta: (id) => `/api/productos/${id}`,
    metodo: 'DELETE',
    ok: 'Producto eliminado',
  },
};

async function cargarProductos() {
  const params = new URLSearchParams();
  if (inputBuscar.value.trim()) params.set('buscar', inputBuscar.value.trim());
  if (checkBajo.checked) params.set('stock_bajo', '1');
  if (checkDesactivados.checked) params.set('solo_desactivados', '1');
  try {
    productos = await api('/api/productos?' + params);
    pintarTabla();
    return true;
  } catch (err) {
    mostrarMensaje(err.message, 'error');
    return false;
  }
}

function pintarTabla() {
  const usa = CONFIG.calcular_impuestos;
  document.getElementById('th-base').textContent = usa ? 'Precio base' : 'Precio';
  document.getElementById('th-final').hidden = !usa;

  if (productos.length === 0) {
      cuerpo.innerHTML = `<tr><td colspan="6" class="vacio">${checkDesactivados.checked ? 'No hay productos desactivados.' : 'No hay productos que mostrar.'}</td></tr>`;
    return;
  }
  cuerpo.innerHTML = productos.map((p) => `
    <tr class="${p.activo ? '' : 'fila-desactivada'}">
      <td>${esc(p.nombre)}${p.activo ? '' : '<span class="etiqueta etiqueta-gris">Desactivado</span>'}</td>
      <td>${esc(p.categoria)}</td>
      <td>${moneda.format(p.precio_base)}</td>
      ${usa ? `<td><strong>${moneda.format(p.precio_final)}</strong></td>` : ''}
      <td>${p.stock}${p.activo && p.stock_bajo ? '<span class="etiqueta">Stock bajo</span>' : ''}</td>
      <td class="acciones">
        <a class="btn btn-secundario" href="producto-form.html?id=${p.id}">Editar</a>
        ${p.activo
          ? `<button class="btn btn-secundario" data-accion="desactivar" data-id="${p.id}">Desactivar</button>`
          : `<button class="btn btn-primario" data-accion="reactivar" data-id="${p.id}">Reactivar</button>`}
        <button class="btn btn-peligro" data-accion="eliminar" data-id="${p.id}">Eliminar</button>
      </td>
    </tr>`).join('');
}

async function ejecutar(accion, producto) {
  const a = ACCIONES[accion];
  try {
    await api(a.ruta(producto.id), { method: a.metodo });
    mostrarMensaje(a.ok, 'ok');
    await cargarProductos();
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
}

cuerpo.addEventListener('click', (e) => {
  const boton = e.target.closest('button[data-accion]');
  if (!boton) return;
  const producto = productos.find((p) => p.id === Number(boton.dataset.id));
  const accion = boton.dataset.accion;

  // Reactivar no necesita confirmación
  if (accion === 'reactivar') return ejecutar(accion, producto);

  const a = ACCIONES[accion];
  pendiente = { accion, producto };
  document.getElementById('dialogo-titulo').textContent = a.titulo;
  document.getElementById('dialogo-texto').textContent = a.texto(producto);
  const confirmar = document.getElementById('dialogo-confirmar');
  confirmar.className = `btn ${a.clase}`;
  confirmar.textContent = a.boton;
  dialogo.showModal();
});

document.getElementById('dialogo-cancelar').addEventListener('click', () => dialogo.close());
document.getElementById('dialogo-confirmar').addEventListener('click', async () => {
  dialogo.close();
  await ejecutar(pendiente.accion, pendiente.producto);
});

let temporizador;
inputBuscar.addEventListener('input', () => {
  clearTimeout(temporizador);
  temporizador = setTimeout(cargarProductos, 300);
});

// Los dos filtros son excluyentes: encender uno apaga el otro
checkBajo.addEventListener('change', () => {
  if (checkBajo.checked) checkDesactivados.checked = false;
  cargarProductos();
});
checkDesactivados.addEventListener('change', () => {
  if (checkDesactivados.checked) checkBajo.checked = false;
  cargarProductos();
});

document.getElementById('btn-actualizar').addEventListener('click', async () => {
  if (await cargarProductos()) avisar('Lista actualizada');
});

sesionLista.then(cargarProductos);