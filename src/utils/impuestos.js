// Redondea a 2 decimales
function redondear(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Calcula los impuestos de una línea de venta.
 *
 * producto:  { precio_base, litros }        (litros solo aplica a bebidas)
 * categoria: { iva_tasa, ieps_tipo, ieps_valor }
 *   - iva_tasa:   0 o 16 (porcentaje)
 *   - ieps_tipo:  'ninguno' | 'porcentaje' | 'cuota_litro'
 *   - ieps_valor: % (si es porcentaje) o pesos por litro (si es cuota_litro)
 */
function calcularLinea(producto, categoria, cantidad = 1) {
  const subtotal = producto.precio_base * cantidad;

  let ieps = 0;
  if (categoria.ieps_tipo === 'porcentaje') {
    ieps = subtotal * (categoria.ieps_valor / 100);
  } else if (categoria.ieps_tipo === 'cuota_litro') {
    ieps = (producto.litros || 0) * cantidad * categoria.ieps_valor;
  }
  ieps = redondear(ieps);

  // El IVA se calcula sobre el precio más el IEPS
  const iva = redondear((subtotal + ieps) * (categoria.iva_tasa / 100));
  const total = redondear(subtotal + ieps + iva);

  return { subtotal: redondear(subtotal), ieps, iva, total };
}

const SIN_IMPUESTOS = { iva_tasa: 0, ieps_tipo: 'ninguno', ieps_valor: 0 };

module.exports = { calcularLinea, redondear, SIN_IMPUESTOS };