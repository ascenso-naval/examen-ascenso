// estadisticas.js — Dominio y agregados por examen, fuente y grupo (ítem).
// Dominio = media ponderada de los últimos intentos de las preguntas (acierto 1, fallo 0),
// con más peso a lo reciente; sin intentos → null («sin datos»).

/** Pesos de los últimos 5 intentos de cada pregunta (el primero es el más reciente). */
const PESOS = [1, 0.6, 0.36, 0.22, 0.13];

/** Suma ponderada y peso total del historial de una pregunta. */
export function aporte(st) {
  if (!st || !st.h) return [0, 0];
  const h = st.h;
  let suma = 0;
  let peso = 0;
  const k = Math.min(PESOS.length, h.length);
  for (let i = 0; i < k; i++) {
    const w = PESOS[i];
    if (h.charCodeAt(h.length - 1 - i) === 49) suma += w; // '1'
    peso += w;
  }
  return [suma, peso];
}

/**
 * Resumen de un conjunto de preguntas.
 * @returns {{total, vistas, intentos, aciertos, dominio: number|null}}
 */
export function resumen(preguntas, p) {
  let vistas = 0;
  let intentos = 0;
  let aciertos = 0;
  let suma = 0;
  let peso = 0;
  for (const q of preguntas) {
    const st = p[q.id];
    if (!st || !st.n) continue;
    vistas += 1;
    intentos += st.n;
    aciertos += st.a;
    const [s, w] = aporte(st);
    suma += s;
    peso += w;
  }
  return { total: preguntas.length, vistas, intentos, aciertos, dominio: peso > 0 ? suma / peso : null };
}

/** Dominio de una sola pregunta (null si nunca se respondió). */
export function dominioPregunta(st) {
  const [s, w] = aporte(st);
  return w > 0 ? s / w : null;
}

/** Nivel cualitativo del dominio para colorear barras (con texto, nunca solo color). */
export function nivelDominio(d) {
  if (d === null || d === undefined) return 'sin';
  if (d >= 0.8) return 'alto';
  if (d >= 0.6) return 'medio';
  return 'bajo';
}
