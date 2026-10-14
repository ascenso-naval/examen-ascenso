// csv.js — Exportación CSV sin librerías (Blob + <a download>). UTF-8 con BOM para que
// Excel muestre bien las tildes; separador coma y comillas dobles cuando hace falta.

/** Escapa un valor para CSV. */
export function celdaCsv(v) {
  if (v === null || v === undefined) return '';
  let t = typeof v === 'boolean' ? (v ? 'sí' : 'no') : String(v);
  // [Auditoría] Evita la «inyección de fórmulas» al abrir el CSV en Excel: un texto que
  // empieza con = + - @ (p. ej. un correo «=HYPERLINK(…)@x.pe») se antepone con un apóstrofo.
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(t)) t = `'${t}`;
  return /[",\n\r;]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

/**
 * @param {object[]} filas
 * @param {{clave:string, titulo:string, valor?:(fila)=>any}[]} columnas
 * @returns {string}
 */
export function aCsv(filas, columnas) {
  const cab = columnas.map((c) => celdaCsv(c.titulo)).join(',');
  const cuerpo = filas.map((f) => columnas.map((c) => celdaCsv(c.valor ? c.valor(f) : f[c.clave])).join(','));
  return [cab, ...cuerpo].join('\r\n');
}

/** Descarga un texto CSV con el nombre indicado. */
export function descargarCsv(nombre, texto) {
  const blob = new Blob(['﻿', texto], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
