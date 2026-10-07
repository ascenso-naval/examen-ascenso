// srs.js — Repetición espaciada (sistema de cajas tipo Leitner).
// Cada pregunta en repaso guarda s = [caja 0-5, próxima fecha AAAA-MM-DD].
//  · Falla (en cualquier modo)         → caja 0, próxima = hoy.
//  · Acierto en repaso                  → caja + 1 y próxima = hoy + INTERVALOS[caja anterior].
//  · Acierto en práctica/simulacro de una pregunta en repaso y ya vencida → también avanza.
//  · Marcar con bandera                 → entra (o vuelve) a repaso con caja 0 para hoy.

import { sumarDias } from './util.js';

/** Días de espera al acertar desde la caja 0, 1, 2, 3, 4 y 5. */
export const INTERVALOS = [1, 3, 7, 14, 30, 60];

export const enRepaso = (st) => !!(st && st.s);
export const estaPendiente = (st, hoy) => !!(st && st.s && st.s[1] <= hoy);

/** Aplica el resultado de una respuesta al estado SRS de la pregunta. */
export function aplicarResultado(st, correcta, modo, hoy) {
  if (!correcta) {
    st.s = [0, hoy];
    return;
  }
  if (!st.s) return; // acertada y fuera de repaso: nada que programar
  const vencida = st.s[1] <= hoy;
  if (modo === 'repaso' || vencida) {
    const caja = Math.min(st.s[0], 5);
    st.s = [Math.min(caja + 1, 5), sumarDias(hoy, INTERVALOS[caja])];
  }
}

/** Marca con bandera: entra a repaso con caja 0 para hoy (se recuerda el estado previo). */
export function marcar(st, hoy) {
  if (st.m) return;
  st.m = 1;
  st.sm = st.s ? st.s.slice() : null; // estado SRS previo
  st.mn = st.n || 0;                    // intentos al momento de marcar
  st.s = [0, hoy];
}

/** Quita la bandera; si no se respondió desde que se marcó, restaura el estado SRS previo. */
export function desmarcar(st) {
  if (!st.m) return;
  delete st.m;
  if ((st.n || 0) === (st.mn || 0)) {
    if (st.sm) st.s = st.sm; else delete st.s;
  }
  delete st.sm;
  delete st.mn;
}

/**
 * Lista de preguntas en repaso que pasan el filtro dado.
 * @param {object} p        mapa de estadísticas (estado.p)
 * @param {Map} porId       índice de preguntas
 * @param {(q)=>boolean} filtro
 * @returns {{q, caja, proxima}[]}
 */
export function preguntasEnRepaso(p, porId, filtro) {
  const lista = [];
  for (const [id, st] of Object.entries(p)) {
    if (!st.s) continue;
    const q = porId.get(id);
    if (!q || !filtro(q)) continue;
    lista.push({ q, caja: st.s[0], proxima: st.s[1] });
  }
  return lista;
}

/** Ordena para repasar: primero las más atrasadas y de caja más baja. */
export function ordenarParaRepaso(lista) {
  return lista.slice().sort((a, b) => (a.proxima < b.proxima ? -1 : a.proxima > b.proxima ? 1 : a.caja - b.caja));
}
