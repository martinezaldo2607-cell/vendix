const formatoMoneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

const cuerpoTabla = document.getElementById('tabla-productos');
const inputBuscar = document.getElementById('buscar');
const checkBajo = document.getElementById('solo-bajo');
const mensaje = document.getElementById('mensaje');
const dialogo = document.getElementById('dialogo');
const formulario = document.getElementById('formulario');
const tituloDialogo = document.getElementById('titulo-dialogo');
const errorForm = document.getElementById('error-form');
const selectCategoria = document.getElementById('categoria_id');
const campoStock = document.getElementById('stock');
const ayudaStock = document.getElementById('ayuda-stock');

let productos = [];
let idEditando = null;
let temporizadorMensaje;

// Evita que texto con símbolos HTML rompa la página (o inyecte código)
function esc(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// Función única para hablar con la API
async function api(url, opciones = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opciones,
  });
  const datos = await res.json();
  if (!res.ok) {
    throw new Error(datos.errores ? datos.errores.join('. ') : datos.error);
  }
  return datos;
}

function mostrarMensaje(texto, tipo) {
  mensaje.textContent = texto;
  mensaje.className = `mensaje ${tipo}`;
  mensaje.hidden = false;
  clearTimeout(temporizadorMensaje);
  temporizadorMensaje = setTimeout(() => { mensaje.hidden = true; }, 4000);
}

async function cargarCategorias() {
  const categorias = await api('/api/categorias');
  selectCategoria.innerHTML =
    '<option value="">Selecciona...</option>' +
    categorias.map((c) => `<option value="${c.id}">${esc(c.nombre)}</option>`).join('');
}

async function cargarProductos() {
  const params = new URLSearchParams();
  if (inputBuscar.value.trim()) params.set('buscar', inputBuscar.value.trim());
  if (checkBajo.checked) params.set('stock_bajo', '1');

  try {
    productos = await api('/api/productos?' + params.toString());
    pintarTabla();
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
}

function pintarTabla() {
  if (productos.length === 0) {
    cuerpoTabla.innerHTML = '<tr><td colspan="9" class="vacio">No hay productos que mostrar.</td></tr>';
    return;
  }

  cuerpoTabla.innerHTML = productos.map((p) => `
    <tr class="${p.stock_bajo ? 'stock-bajo' : ''}">
      <td>${esc(p.codigo)}</td>
      <td>${esc(p.nombre)}</td>
      <td>${esc(p.categoria)}</td>
      <td class="num">${formatoMoneda.format(p.precio_base)}</td>
      <td class="num">${formatoMoneda.format(p.ieps)}</td>
      <td class="num">${formatoMoneda.format(p.iva)}</td>
      <td class="num"><strong>${formatoMoneda.format(p.precio_final)}</strong></td>
      <td class="num">${p.stock}${p.stock_bajo ? '<span class="etiqueta">Bajo</span>' : ''}</td>
      <td class="acciones">
        <button class="btn btn-secundario" data-accion="editar" data-id="${p.id}">Editar</button>
        <button class="btn btn-peligro" data-accion="baja" data-id="${p.id}">Baja</button>
      </td>
    </tr>
  `).join('');
}

function abrirFormulario(producto = null) {
  formulario.reset();
  errorForm.hidden = true;
  idEditando = producto ? producto.id : null;
  tituloDialogo.textContent = producto ? 'Editar producto' : 'Nuevo producto';

  if (producto) {
    formulario.codigo.value = producto.codigo;
    formulario.nombre.value = producto.nombre;
    formulario.categoria_id.value = producto.categoria_id;
    formulario.precio_base.value = producto.precio_base;
    formulario.litros.value = producto.litros;
    formulario.stock_minimo.value = producto.stock_minimo;
    campoStock.value = producto.stock;
    campoStock.disabled = true;   // el stock no se edita aquí
    ayudaStock.hidden = false;
  } else {
    campoStock.disabled = false;
    ayudaStock.hidden = true;
  }

  dialogo.showModal();
}

// Guardar (crear o editar)
formulario.addEventListener('submit', async (e) => {
  e.preventDefault();
  // FormData no incluye los campos deshabilitados, así que al editar no se manda el stock
  const datos = Object.fromEntries(new FormData(formulario));

  try {
    if (idEditando === null) {
      await api('/api/productos', { method: 'POST', body: JSON.stringify(datos) });
    } else {
      await api(`/api/productos/${idEditando}`, { method: 'PUT', body: JSON.stringify(datos) });
    }
    dialogo.close();
    mostrarMensaje(idEditando === null ? 'Producto creado' : 'Producto actualizado', 'ok');
    await cargarProductos();
  } catch (err) {
    errorForm.textContent = err.message;
    errorForm.hidden = false;
  }
});

// Botones Editar / Baja de la tabla (un solo listener para todas las filas)
cuerpoTabla.addEventListener('click', async (e) => {
  const boton = e.target.closest('button[data-accion]');
  if (!boton) return;

  const id = Number(boton.dataset.id);
  const producto = productos.find((p) => p.id === id);

  if (boton.dataset.accion === 'editar') {
    abrirFormulario(producto);
  } else if (boton.dataset.accion === 'baja') {
    if (!confirm(`¿Dar de baja "${producto.nombre}"?`)) return;
    try {
      await api(`/api/productos/${id}`, { method: 'DELETE' });
      mostrarMensaje('Producto dado de baja', 'ok');
      await cargarProductos();
    } catch (err) {
      mostrarMensaje(err.message, 'error');
    }
  }
});

document.getElementById('btn-nuevo').addEventListener('click', () => abrirFormulario());
document.getElementById('btn-cancelar').addEventListener('click', () => dialogo.close());

// Búsqueda: espera 300 ms después de la última tecla para no saturar el servidor
let temporizadorBusqueda;
inputBuscar.addEventListener('input', () => {
  clearTimeout(temporizadorBusqueda);
  temporizadorBusqueda = setTimeout(cargarProductos, 300);
});
checkBajo.addEventListener('change', cargarProductos);

// Arranque
cargarCategorias().then(cargarProductos);