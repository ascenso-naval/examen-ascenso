// bus.js — Avisos internos entre módulos sin dependencias cruzadas.
// Uso: emitir('sesion-terminada', datos) · const quitar = escuchar('sesion-terminada', fn)
// Eventos:
//   'sesion-terminada' → { tipo: 'practica'|'repaso'|'simulacro', examen, inicio, fin, n, aciertos, nota, duracion_s, id_cliente }

const oyentes = new Map();

export function escuchar(nombre, fn) {
  if (!oyentes.has(nombre)) oyentes.set(nombre, new Set());
  oyentes.get(nombre).add(fn);
  return () => oyentes.get(nombre)?.delete(fn);
}

export function emitir(nombre, datos) {
  for (const fn of oyentes.get(nombre) || []) {
    try { fn(datos); } catch (e) { console.warn(e); }
  }
}
