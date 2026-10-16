const el = (id) => document.getElementById(id);

function saludo() {
  const h = new Date().getHours();
  const base = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  return `${base}, ${USUARIO.nombre.split(' ')[0]}`;
}

function pintarAlertas(lista, total) {
  if (lista.length === 0) {
    el('alertas').innerHTML = '<p class="vacio">Todo en orden: ningún producto está por debajo de su mínimo.</p>';
    return;
  }
  el('alertas').innerHTML = lista.map((p) => `
    <div class="fila-alerta">
      <span>${esc(p.nombre)}</span>
      ${p.stock === 0
        ? '<span class="estado estado-agotado">Agotado</span>'
        : `<span class="estado estado-bajo">${p.stock} uds</span>`}
    </div>`).join('') +
    (total > lista.length
      ? `<a class="mas-alertas" href="inventario.html">Y ${total - lista.length} más en Inventario →</a>`
      : '');
}

async function cargar() {
  try {
    const r = await api('/api/inicio');
    const n = r.ventas.cantidad;
    el('etq-ventas').textContent = USUARIO.rol === 'CAJERO' ? 'Tus ventas del día' : 'Ventas del día';
    el('dato-ventas').textContent = moneda.format(r.ventas.total);
    el('sub-ventas').textContent = `${n} ${n === 1 ? 'venta registrada' : 'ventas registradas'}`;
    el('dato-productos').textContent = r.productos.cantidad;
    el('dato-existencias').textContent = r.productos.unidades;
    pintarAlertas(r.alertas, r.alertas_total);
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
}

sesionLista.then(() => {
  if (!USUARIO) return;
  el('saludo').textContent = saludo();

  const accesos = ['<a class="btn btn-primario" href="ventas.html">Nueva venta</a>'];
  if (USUARIO.rol === 'ADMINISTRADOR') {
    accesos.push('<a class="btn btn-secundario" href="producto-form.html">Agregar producto</a>');
    accesos.push('<a class="btn btn-secundario" href="inventario.html?entrada=1">Registrar entrada de mercancía</a>');
  }
  el('accesos').innerHTML = accesos.join('');

  cargar();
  actualizarAutomaticamente(cargar, 30);
});