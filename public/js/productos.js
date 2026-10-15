const cuerpo = document.getElementById('tabla-productos');
const inputBuscar = document.getElementById('buscar');
const checkBajo = document.getElementById('solo-bajo');
const dialogo = document.getElementById('dialogo-baja');

let productos = [];
let idBaja = null;

async function cargarProductos() {
  const params = new URLSearchParams();
  if (inputBuscar.value.trim()) params.set('buscar', inputBuscar.value.trim());
  if (checkBajo.checked) params.set('stock_bajo', '1');
  try {
    productos = await api('/api/productos?' + params);
    pintarTabla();
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
}

function pintarTabla() {
  if (productos.length === 0) {
    cuerpo.innerHTML = '<tr><td colspan="6" class="vacio">No hay productos que mostrar.</td></tr>';
    return;
  }
  cuerpo.innerHTML = productos.map((p) => `
    <tr>
      <td>${esc(p.nombre)}</td>
      <td>${esc(p.categoria)}</td>
      <td>${moneda.format(p.precio_base)}</td>
      <td><strong>${moneda.format(p.precio_final)}</strong></td>
      <td>${p.stock}${p.stock_bajo ? '<span class="etiqueta">Stock bajo</span>' : ''}</td>
      <td class="acciones">
        <a class="btn btn-secundario" href="producto-form.html?id=${p.id}">Editar</a>
        <button class="btn btn-peligro" data-id="${p.id}">Eliminar</button>
      </td>
    </tr>`).join('');
}

cuerpo.addEventListener('click', (e) => {
  const boton = e.target.closest('button[data-id]');
  if (!boton) return;
  const producto = productos.find((p) => p.id === Number(boton.dataset.id));
  idBaja = producto.id;
  document.getElementById('texto-baja').textContent =
    `Se dará de baja ${producto.nombre} del catálogo. Las ventas anteriores se conservan en el historial.`;
  dialogo.showModal();
});

document.getElementById('cancelar-baja').addEventListener('click', () => dialogo.close());
document.getElementById('confirmar-baja').addEventListener('click', async () => {
  dialogo.close();
  try {
    await api(`/api/productos/${idBaja}`, { method: 'DELETE' });
    mostrarMensaje('Producto dado de baja', 'ok');
    await cargarProductos();
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
});

let temporizador;
inputBuscar.addEventListener('input', () => {
  clearTimeout(temporizador);
  temporizador = setTimeout(cargarProductos, 300);
});
checkBajo.addEventListener('change', cargarProductos);

cargarProductos();