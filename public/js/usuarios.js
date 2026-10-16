const el = (id) => document.getElementById(id);
const form = el('formulario');
let usuarios = [];
let idEditando = null;

async function cargar() {
  usuarios = await api('/api/usuarios');
  el('tabla-usuarios').innerHTML = usuarios.map((u) => `
    <tr class="${u.activo ? '' : 'fila-desactivada'}">
      <td>${esc(u.nombre)}</td>
      <td>${esc(u.usuario)}</td>
      <td><span class="estado estado-neutro">${ROLES[u.rol]}</span></td>
      <td><span class="estado ${u.activo ? 'estado-ok' : 'estado-desactivado'}">${u.activo ? 'Activo' : 'Inactivo'}</span></td>
      <td class="acciones"><button class="btn btn-secundario" data-id="${u.id}">Editar</button></td>
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
  if (b) abrir(usuarios.find((u) => u.id === Number(b.dataset.id)));
});
el('btn-nuevo').addEventListener('click', () => abrir());
el('btn-cancelar').addEventListener('click', () => el('dialogo').close());

sesionLista.then(() => {
  if (USUARIO && USUARIO.rol === 'ADMINISTRADOR') {
    cargar().catch((err) => mostrarMensaje(err.message, 'error'));
  }
});