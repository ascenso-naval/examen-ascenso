// consultas.js — Consultas combinadas sobre datos + estado que usan varias vistas.

import { estado } from './estado.js';
import { D, disponibles, disponiblesGrupo, pasaFiltroBase, fuentesDe } from './datos.js';
import { resumen } from './estadisticas.js';
import { preguntasEnRepaso } from './srs.js';
import { hoyISO } from './util.js';

/** Preguntas en repaso (filtro base aplicado), opcionalmente de un examen. */
export function enRepaso(examen = null) {
  const aj = estado.ajustes;
  return preguntasEnRepaso(estado.p, D.porId, (q) => pasaFiltroBase(q, aj) && (!examen || q.examen === examen));
}

/** Pendientes de hoy por examen y total. */
export function pendientesHoy() {
  const hoy = hoyISO();
  const porExamen = {};
  let total = 0;
  for (const x of enRepaso()) {
    if (x.proxima <= hoy) {
      porExamen[x.q.examen] = (porExamen[x.q.examen] || 0) + 1;
      total += 1;
    }
  }
  return { total, porExamen };
}

/** Resumen (dominio, vistas…) de un examen con el filtro base. */
export const resumenExamen = (examen) => resumen(disponibles(examen, estado.ajustes), estado.p);

/** Resumen de un grupo (ítem/tema) con el filtro base. */
export const resumenGrupo = (clave) => resumen(disponiblesGrupo(clave, estado.ajustes), estado.p);

/** Función q → dominio de su grupo (con memo local), para ponderar «débiles». */
export function dominioDeGrupo() {
  const memo = new Map();
  return (q) => {
    const k = q._g ? q._g.clave : '';
    if (!memo.has(k)) memo.set(k, k ? resumenGrupo(k).dominio : null);
    return memo.get(k);
  };
}

/** Simulacros de un examen (más recientes al final). */
export const simulacrosDe = (examen) => estado.sims.filter((s) => s.ex === examen);

/** Promedio de las últimas n notas de un examen (null si no hay). */
export function promedioUltimos(examen, n = 5) {
  const notas = simulacrosDe(examen).slice(-n).map((s) => s.nota);
  return notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null;
}

/**
 * Ítems/temas más débiles: peor dominio con ≥ 3 intentos.
 * @returns {{g, r}[]}
 */
export function puntosDebiles(examen = null, limite = 10) {
  const lista = [];
  for (const f of D.fuentes) {
    if (examen && f.examen !== examen) continue;
    for (const g of f.grupos) {
      const r = resumenGrupo(g.clave);
      if (r.total && r.intentos >= 3 && r.dominio !== null) lista.push({ g, r });
    }
  }
  lista.sort((a, b) => a.r.dominio - b.r.dominio || b.r.intentos - a.r.intentos);
  return lista.slice(0, limite);
}

export { fuentesDe };
