const el = (id) => document.getElementById(id);
const form = el('formulario');
let usuarios = [];
let idEditando = null;
let pendiente = null;   // usuario que se va a eliminar

async function cargar() {
  usuarios = await api('/api/usuarios');
  pintar();
}

function pintar() {
  const verInactivos = el('ver-inactivos').checked;
  const visibles = usuarios.filter((u) => u.activo || verInactivos);

  if (visibles.length === 0) {
    el('tabla-usuarios').innerHTML = '<tr><td colspan="5" class="vacio">No hay usuarios que mostrar.</td></tr>';
    return;
  }
  el('tabla-usuarios').innerHTML = visibles.map((u) => `
    <tr class="${u.activo ? '' : 'fila-desactivada'}">
      <td>${esc(u.nombre)}</td>
      <td>${esc(u.usuario)}</td>
      <td><span class="estado estado-neutro">${ROLES[u.rol]}</span></td>
      <td><span class="estado ${u.activo ? 'estado-ok' : 'estado-desactivado'}">${u.activo ? 'Activo' : 'Inactivo'}</span></td>
      <td class="acciones">
        <button class="btn btn-secundario" data-accion="editar" data-id="${u.id}">Editar</button>
        ${u.id === USUARIO.id ? '' : `<button class="btn btn-peligro" data-accion="eliminar" data-id="${u.id}">Eliminar</button>`}
      </td>
    </tr>`).join('');
}

function abrir(u = null) {
  form.reset();
  el('error-form').hidden = true;
  idEditando = u ? u.id : null;
  el('titulo-dialogo').textContent = u ? 'Editar usuario' : 'Agregar usuario';
  form.password.required = !u;
  el('etq-password').textContent = u
    ? 'Contraseña nueva (déjala vacía para no cambiarla)'
    : 'Contraseña (mínimo 8 caracteres)';

  // Tu propia cuenta: no se puede cambiar el rol ni desactivar
  const propia = Boolean(u && u.id === USUARIO.id);
  form.rol.disabled = propia;
  form.activo.disabled = propia;
  el('ayuda-propia').hidden = !propia;

  if (u) {
    form.nombre.value = u.nombre;
    form.usuario.value = u.usuario;
    form.rol.value = u.rol;
    form.activo.checked = Boolean(u.activo);
  }
  el('dialogo').showModal();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const datos = {
    nombre: form.nombre.value,
    usuario: form.usuario.value,
    rol: form.rol.value,
    password: form.password.value,
    activo: form.activo.checked,
  };
  try {
    await api(idEditando ? `/api/usuarios/${idEditando}` : '/api/usuarios', {
      method: idEditando ? 'PUT' : 'POST',
      body: JSON.stringify(datos),
    });
    el('dialogo').close();
    mostrarMensaje(idEditando ? 'Usuario actualizado' : 'Usuario creado', 'ok');
    await cargar();
  } catch (err) {
    el('error-form').textContent = err.message;
    el('error-form').hidden = false;
  }
});

el('tabla-usuarios').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-id]');
  if (!b) return;
  const u = usuarios.find((x) => x.id === Number(b.dataset.id));

  if (b.dataset.accion === 'eliminar') {
    pendiente = u;
    el('texto-eliminar').textContent =
      `Se eliminará a ${u.nombre} (${u.usuario}). Ya no podrá entrar y desaparecerá de esta lista, ` +
      'pero sus ventas y movimientos se conservan en el historial. ' +
      'Si solo quieres que no entre por ahora, mejor desactiva su cuenta desde Editar.';
    el('dialogo-eliminar').showModal();
  } else {
    abrir(u);
  }
});

el('eliminar-cancelar').addEventListener('click', () => el('dialogo-eliminar').close());
el('eliminar-confirmar').addEventListener('click', async () => {
  el('dialogo-eliminar').close();
  try {
    await api(`/api/usuarios/${pendiente.id}`, { method: 'DELETE' });
    mostrarMensaje('Usuario eliminado', 'ok');
    await cargar();
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
});

el('btn-nuevo').addEventListener('click', () => abrir());
el('btn-cancelar').addEventListener('click', () => el('dialogo').close());
el('ver-inactivos').addEventListener('change', pintar);

sesionLista.then(() => {
  if (USUARIO && USUARIO.rol === 'ADMINISTRADOR') {
    cargar().catch((err) => mostrarMensaje(err.message, 'error'));
  }
});