const el = (id) => document.getElementById(id);

let productos = [];
let categorias = [];
let categoriaActiva = 0;
let carrito = new Map();   // producto_id -> cantidad
let calculo = null;        // respuesta de /api/ventas/calcular
let recibido = '';         // lo que se va tecleando en el cobro
let vistaActual = 'catalogo';
let turno = 0;
let cobrando = false;
let firmaCatalogo = null;

// ---------- Vistas ----------
function mostrarVista(nombre) {
  vistaActual = nombre;
  for (const v of ['catalogo', 'cobro', 'ticket']) el('vista-' + v).hidden = v !== nombre;
  el('panel-venta').hidden = nombre === 'ticket';
  el('btn-cobrar').hidden = nombre !== 'catalogo';
  el('btn-confirmar').hidden = nombre !== 'cobro';
  el('fila-cambio').hidden = nombre !== 'cobro';
  el('btn-vaciar').hidden = nombre !== 'catalogo';
  actualizarBotones();
}

// ---------- Catálogo ----------
function filtrados() {
  const texto = el('buscar').value.trim().toLowerCase();
  return productos.filter((p) =>
    (categoriaActiva === 0 || p.categoria_id === categoriaActiva) &&
    (!texto || p.nombre.toLowerCase().includes(texto)));
}

function pintarChips() {
  const lista = [{ id: 0, nombre: 'Todos' }, ...categorias];
  el('chips').innerHTML = lista.map((c) =>
    `<button class="chip ${c.id === categoriaActiva ? 'activo' : ''}" data-cat="${c.id}">${esc(c.nombre)}</button>`).join('');
}

function pintarTarjetas() {
  const lista = filtrados();
  if (lista.length === 0) {
    el('tarjetas').innerHTML = '<p class="vacio">No hay productos que mostrar.</p>';
    return;
  }
  el('tarjetas').innerHTML = lista.map((p) => {
    const agotado = p.stock === 0;
    const aviso = agotado
      ? '<span class="estado estado-agotado">Agotado</span>'
      : `<span class="estado ${p.stock_bajo ? 'estado-bajo' : 'estado-neutro'}">Quedan ${p.stock}</span>`;
    return `
      <button class="producto ${agotado ? 'agotado' : ''}" data-id="${p.id}" title="${esc(p.nombre)}" ${agotado ? 'disabled' : ''}>
        <div class="imagen">${esc(p.nombre.charAt(0).toUpperCase())}</div>
        <div class="info">
          <span class="nombre">${esc(p.nombre)}</span>
          <div class="pie">
            <span class="precio">${moneda.format(p.precio_final)}</span>
            ${aviso}
          </div>
        </div>
      </button>`;
  }).join('');
}

async function recargarCatalogo(silencioso = false) {
  // Nunca se toca la venta mientras se está cobrando
  if (silencioso && (vistaActual !== 'catalogo' || cobrando)) return;

  const [prod, cats] = await Promise.all([api('/api/productos'), api('/api/categorias')]);
  const firma = JSON.stringify([prod, cats]);
  const cambio = firmaCatalogo !== null && firma !== firmaCatalogo;
  firmaCatalogo = firma;
  if (silencioso && !cambio) return;

  productos = prod;
  categorias = cats;

  // Si cambió la disponibilidad, se ajusta lo que ya estaba en la venta
  let ajustada = false;
  for (const [id, cantidad] of carrito) {
    const p = productos.find((x) => x.id === id);
    if (!p || p.stock === 0) { carrito.delete(id); ajustada = true; }
    else if (cantidad > p.stock) { carrito.set(id, p.stock); ajustada = true; }
  }

  pintarChips();
  pintarTarjetas();
  await actualizarVenta();

  if (ajustada) mostrarMensaje('Se ajustó la venta: cambió la disponibilidad de algún producto', 'error');
  else if (cambio && silencioso) avisar('Catálogo actualizado');
}

// ---------- Venta actual ----------
function cambiar(id, delta) {
  const p = productos.find((x) => x.id === id);
  const nueva = (carrito.get(id) || 0) + delta;
  if (nueva <= 0) {
    carrito.delete(id);
  } else if (nueva > p.stock) {
    mostrarMensaje(`Solo hay ${p.stock} de ${p.nombre} en existencia`, 'error');
    return;
  } else {
    carrito.set(id, nueva);
  }
  actualizarVenta();
}

async function actualizarVenta() {
  const mio = ++turno;   // descarta respuestas viejas si se toca rápido
  if (carrito.size === 0) {
    calculo = null;
    pintarVenta();
    return;
  }
  try {
    const items = [...carrito].map(([producto_id, cantidad]) => ({ producto_id, cantidad }));
    const resp = await api('/api/ventas/calcular', { method: 'POST', body: JSON.stringify({ items }) });
    if (mio !== turno) return;
    calculo = resp;
  } catch (err) {
    if (mio !== turno) return;
    mostrarMensaje(err.message, 'error');
    await recargarCatalogo();
    return;
  }
  pintarVenta();
}

function pintarVenta() {
  if (!calculo) {
    el('lista-venta').innerHTML = '<p class="vacio">Agrega productos a la venta.</p>';
    el('total-venta').textContent = moneda.format(0);
  } else {
      el('lista-venta').innerHTML = calculo.lineas.map((l) => {
      const p = productos.find((x) => x.id === l.producto_id);
      return `
        <div class="item-venta">
          <div class="item-nombre" title="${esc(l.nombre_producto)}">${esc(l.nombre_producto)}</div>
          <small class="item-precio">${moneda.format(p.precio_final)} c/u</small>
          <div class="cantidad">
            <button class="btn-cant" data-id="${l.producto_id}" data-delta="-1">−</button>
            <span>${l.cantidad}</span>
            <button class="btn-cant ${l.cantidad >= p.stock ? 'limite' : ''}" data-id="${l.producto_id}" data-delta="1">+</button>
          </div>
          <strong class="item-total">${moneda.format(l.total)}</strong>
        </div>`;
    }).join('');
    el('total-venta').textContent = moneda.format(calculo.total);
  }
  actualizarBotones();
}

function actualizarBotones() {
  const hayVenta = calculo !== null;
  el('btn-vaciar').disabled = !hayVenta;
  const num = Number(recibido || 0);
  const dif = hayVenta ? Math.round((num - calculo.total) * 100) / 100 : 0;

  el('panel-venta').classList.toggle('solo-lectura', vistaActual === 'cobro');
  el('btn-cobrar').disabled = !hayVenta;
  el('btn-cobrar').textContent = hayVenta ? `Cobrar ${moneda.format(calculo.total)} (Enter)` : 'Cobrar';
  el('btn-confirmar').disabled = !hayVenta || dif < 0;

  if (vistaActual === 'cobro' && hayVenta) {
    el('cobro-total').textContent = moneda.format(calculo.total);
    el('cobro-recibido').textContent = moneda.format(num);
    el('fila-cambio').classList.toggle('falta', dif < 0);
    el('fila-cambio').firstElementChild.textContent = dif < 0 ? 'Falta' : 'Cambio';
    el('cambio-venta').textContent = moneda.format(Math.abs(dif));
  }
}

// ---------- Cobro ----------
function teclear(t) {
  if (t === 'C') {
    recibido = '';
  } else if (t === '.') {
    if (!recibido.includes('.')) recibido = (recibido || '0') + '.';
  } else {
    const decimales = recibido.includes('.') ? recibido.split('.')[1].length : 0;
    if (decimales >= 2 || recibido.replace('.', '').length >= 8) return;
    recibido = recibido === '0' ? t : recibido + t;
  }
  actualizarBotones();
}

async function confirmar() {
  if (cobrando) return;
  cobrando = true;
  try {
    const items = [...carrito].map(([producto_id, cantidad]) => ({ producto_id, cantidad }));
    const venta = await api('/api/ventas', {
      method: 'POST',
      body: JSON.stringify({ items, monto_recibido: Number(recibido) }),
    });
    carrito.clear();
    calculo = null;
    recibido = '';
    el('ticket-contenido').innerHTML = htmlTicket(venta);
    mostrarVista('ticket');
    await recargarCatalogo();
  } catch (err) {
    mostrarMensaje(err.message, 'error');
    mostrarVista('catalogo');
    await recargarCatalogo().catch(() => {});
  } finally {
    cobrando = false;
  }
}

// Actualiza los totales y abre la pantalla de cobro
async function irACobrar() {
  await actualizarVenta();   // asegura que el total en pantalla sea el vigente
  if (!calculo) return;
  recibido = '';
  mostrarVista('cobro');
}

// ---------- Eventos ----------
el('teclado').innerHTML = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '.']
  .map((t) => `<button class="tecla" data-tecla="${t}">${t}</button>`).join('');

el('teclado').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tecla]');
  if (b) teclear(b.dataset.tecla);
});

document.addEventListener('keydown', (e) => {
  // Esc: del cobro regresa a la venta, sin perder lo capturado
  if (e.key === 'Escape' && vistaActual === 'cobro') {
    mostrarVista('catalogo');
    return;
  }

  // No se interfiere con campos de texto, enlaces, listas, ventanas emergentes
  // ni con botones que ya tienen su propio Enter (volver y actualizar)
  if (e.target.closest('a, input, select, textarea, dialog, #btn-volver, #btn-actualizar, #btn-exacto')) return;

  // Enter: en el catálogo abre el cobro, y en el cobro confirma
  if (e.key === 'Enter' && (vistaActual === 'catalogo' || vistaActual === 'cobro')) {
    e.preventDefault();      // evita que Enter pulse el botón que tenga el foco
    if (e.repeat) return;    // mantener Enter presionado no repite la acción

    if (vistaActual === 'catalogo' && carrito.size > 0) irACobrar();
    else if (vistaActual === 'cobro' && !el('btn-confirmar').disabled) confirmar();
    return;
  }

  // Teclado numérico físico en la pantalla de cobro
  if (vistaActual !== 'cobro') return;
  if (/^[0-9.]$/.test(e.key)) teclear(e.key);
  else if (e.key === 'Backspace') { recibido = recibido.slice(0, -1); actualizarBotones(); }
});

el('chips').addEventListener('click', (e) => {
  const b = e.target.closest('[data-cat]');
  if (!b) return;
  categoriaActiva = Number(b.dataset.cat);
  pintarChips();
  pintarTarjetas();
});

el('tarjetas').addEventListener('click', (e) => {
  const b = e.target.closest('[data-id]');
  if (b) cambiar(Number(b.dataset.id), 1);
});

el('lista-venta').addEventListener('click', (e) => {
  const b = e.target.closest('.btn-cant');
  if (b) cambiar(Number(b.dataset.id), Number(b.dataset.delta));
});

el('buscar').addEventListener('input', pintarTarjetas);
el('btn-cobrar').addEventListener('click', irACobrar);
el('btn-volver').addEventListener('click', () => mostrarVista('catalogo'));
el('btn-confirmar').addEventListener('click', confirmar);
el('btn-imprimir').addEventListener('click', () => window.print());
// Llena el monto recibido con el total exacto
// Llena el monto recibido con el total exacto
el('btn-exacto').addEventListener('click', (e) => {
  if (!calculo) return;
  recibido = String(calculo.total);
  actualizarBotones();
  e.currentTarget.blur();   // así el siguiente Enter confirma el cobro
});
el('btn-nueva').addEventListener('click', () => mostrarVista('catalogo'));
el('btn-actualizar').addEventListener('click', async () => {
  try {
    await recargarCatalogo();
    avisar('Catálogo actualizado');
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
});
actualizarAutomaticamente(() => recargarCatalogo(true).catch(() => {}));

// Vaciar la venta actual (con confirmación)
el('btn-vaciar').addEventListener('click', (e) => {
  if (carrito.size === 0) return;
  e.currentTarget.blur();   // para que un Enter posterior no lo active otra vez
  el('dialogo-vaciar').showModal();
});
el('vaciar-cancelar').addEventListener('click', () => el('dialogo-vaciar').close());
el('vaciar-confirmar').addEventListener('click', () => {
  el('dialogo-vaciar').close();
  carrito.clear();
  actualizarVenta();   // con el carrito vacío limpia la pantalla y descarta cálculos pendientes
  avisar('Venta vaciada');
});


// ---------- Arranque ----------
mostrarVista('catalogo');
recargarCatalogo().catch((err) => mostrarMensaje(err.message, 'error'));