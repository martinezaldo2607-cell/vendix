const form = document.getElementById('formulario');
const errorForm = document.getElementById('error-form');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    const datos = await res.json();
    if (!res.ok) throw new Error(datos.error);
    location.href = 'index.html';
  } catch (err) {
    errorForm.textContent = err.message;
    errorForm.hidden = false;
  }
});