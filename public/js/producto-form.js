const id = new URLSearchParams(location.search).get('id');
const form = document.getElementById('formulario');
const bloqueLitros = document.getElementById('bloque-litros');
const errorForm = document.getElementById('error-form');
let impuestos = [];

const opciones = (lista) =>
  '<option value="">Seleccionar...</option>' +
  lista.map((x) => `<option value="${x.id}">${esc(x.nombre)}</option>`).join('');

// Los litros solo se piden si el impuesto es por litro
function actualizarLitros() {
  const imp = impuestos.find((i) => i.id === Number(form.impuesto_id.value));
  bloqueLitros.hidden = !(imp && imp.ieps_tipo === 'cuota_litro');
}

async function iniciar() {
  const [categorias, imps] = await Promise.all([api('/api/categorias'), api('/api/impuestos')]);
  impuestos = imps;
  form.categoria_id.innerHTML = opciones(categorias);
  form.impuesto_id.innerHTML = opciones(imps);

  if (id) {
    document.getElementById('titulo').textContent = 'Editar producto';
    const p = await api(`/api/productos/${id}`);
    form.nombre.value = p.nombre;
    form.categoria_id.value = p.categoria_id;
    form.impuesto_id.value = p.impuesto_id;
    form.litros.value = p.litros;
    form.precio_base.value = p.precio_base;
    form.stock.value = p.stock;
    form.stock_minimo.value = p.stock_minimo;
  }
  actualizarLitros();
}

form.impuesto_id.addEventListener('change', actualizarLitros);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const datos = Object.fromEntries(new FormData(form));
  if (bloqueLitros.hidden) datos.litros = 0;

  try {
    await api(id ? `/api/productos/${id}` : '/api/productos', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(datos),
    });
    location.href = 'productos.html';
  } catch (err) {
    errorForm.textContent = err.message;
    errorForm.hidden = false;
  }
});

iniciar().catch((err) => {
  errorForm.textContent = err.message;
  errorForm.hidden = false;
});