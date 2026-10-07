// pregunta.js — Presentación de una pregunta: enunciado, alternativas A-E barajadas
// (orden estable por sesión) y panel de explicación.

import { esc, refCorta } from '../util.js';
import { permutacion } from '../datos.js';
import { icono } from './iconos.js';
import { chipFuente, puntosDificultad } from './comun.js';

export const LETRAS = ['A', 'B', 'C', 'D', 'E'];

/** Letra con la que se muestra una alternativa original en una sesión. */
export function letraDe(q, idSesion, indiceOriginal) {
  const perm = permutacion(q, idSesion);
  return LETRAS[perm.indexOf(indiceOriginal)];
}

/**
 * HTML de la pregunta.
 * @param {object} q
 * @param {object} op
 *   idSesion, modo: 'practica' | 'examen',
 *   elegido: índice ORIGINAL elegido (o undefined),
 *   resuelta: true si ya se respondió en práctica (muestra correcta/incorrecta),
 *   recien: true para animar el resultado,
 *   numero: texto opcional («Pregunta 3»)
 */
export function htmlPregunta(q, op) {
  const { idSesion, modo = 'practica', elegido, resuelta = false, recien = false } = op;
  const perm = permutacion(q, idSesion);
  const idEnun = `enun-${q.id}`;
  const botones = perm.map((orig, j) => {
    const clases = ['opcion'];
    let extra = '';
    let marca = '';
    if (modo === 'practica' && resuelta) {
      if (orig === q.correcta) { clases.push('correcta'); marca = icono('check', { tam: 18 }); }
      else if (orig === elegido) { clases.push('incorrecta'); marca = icono('cerrar', { tam: 18 }); }
      else clases.push('apagada');
      if (recien && (orig === q.correcta || orig === elegido)) clases.push('recien');
      extra = ' disabled';
    }
    if (modo === 'examen') extra = ` aria-pressed="${orig === elegido}"`;
    const letra = marca ? `<span class="letra" aria-hidden="true">${marca}</span>` : `<span class="letra" aria-hidden="true">${LETRAS[j]}</span>`;
    const estadoSr = modo === 'practica' && resuelta
      ? (orig === q.correcta ? ' (respuesta correcta)' : (orig === elegido ? ' (tu respuesta, incorrecta)' : ''))
      : '';
    return `<button type="button" class="${clases.join(' ')}" data-opcion="${orig}"${extra}
      aria-label="${LETRAS[j]}: ${esc(q.opciones[orig])}${estadoSr}">${letra}<span class="opcion-texto">${esc(q.opciones[orig])}</span></button>`;
  }).join('');

  return `<article class="pregunta" data-id="${esc(q.id)}">
    <div class="pregunta-meta">
      ${op.numero ? `<span class="etiqueta etiqueta-oro">${esc(op.numero)}</span>` : ''}
      ${chipFuente(q.fuente)}
      <span class="etiqueta" title="${esc(q.referencia)}">${esc(refCorta(q.referencia))}</span>
      ${puntosDificultad(q.dificultad)}
    </div>
    <p class="enunciado" id="${idEnun}">${esc(q.pregunta)}</p>
    <div class="opciones" role="group" aria-labelledby="${idEnun}">${botones}</div>
  </article>`;
}

/** Panel de explicación tras responder (práctica / repaso). */
export function htmlRetro(q, { correcta, xp = 0, idSesion, recien = false }) {
  const letra = letraDe(q, idSesion, q.correcta);
  return `<section class="retro ${correcta ? 'ok' : 'mal'}${recien ? ' recien' : ''}" aria-label="Resultado">
    <p class="retro-titulo">${icono(correcta ? 'check' : 'cerrar', { tam: 22 })}${correcta ? 'Correcto' : 'Incorrecto'}
      ${xp ? `<span class="xp-ganado">${icono('rayo', { tam: 16 })}+${xp} XP</span>` : ''}</p>
    ${correcta ? '' : `<p class="retro-respuesta">Respuesta correcta: <strong>${letra}) ${esc(q.opciones[q.correcta])}</strong></p>`}
    <p class="retro-explicacion">${esc(q.explicacion)}</p>
    <p class="referencia">${icono('libro', { tam: 16 })}<span>${esc(q.referencia)}<br>${esc(q.fuente_nombre || q.fuente)} (${esc(q.fuente)})</span></p>
  </section>`;
}

/**
 * Alternativas en modo revisión: muestra la correcta y la elegida (si falló).
 * `elegido` puede ser undefined/null (sin responder).
 */
export function htmlAlternativasRevision(q, idSesion, elegido) {
  const perm = permutacion(q, idSesion);
  return `<ul class="alts">${perm.map((orig, j) => {
    const esCorrecta = orig === q.correcta;
    const esError = orig === elegido && !esCorrecta;
    const tuya = orig === elegido ? '<span class="tuya">Tu respuesta</span>' : '';
    return `<li class="${esCorrecta ? 'es-correcta' : ''}${esError ? 'es-error' : ''}">
      <span class="letra-mini" aria-hidden="true">${esCorrecta ? icono('check', { tam: 14 }) : (esError ? icono('cerrar', { tam: 14 }) : LETRAS[j])}</span>
      <span>${esc(q.opciones[orig])}${esCorrecta ? '<span class="sr-only"> (correcta)</span>' : ''}${esError ? '<span class="sr-only"> (incorrecta)</span>' : ''}</span>${tuya}</li>`;
  }).join('')}</ul>`;
}

/** Hoja con el detalle de una pregunta ya respondida (resumen de práctica, repaso…). */
export function htmlDetalle(q, idSesion, elegido) {
  return `<div class="pregunta-meta">${chipFuente(q.fuente)}<span class="etiqueta">${esc(refCorta(q.referencia))}</span></div>
    <p class="enunciado">${esc(q.pregunta)}</p>
    ${htmlAlternativasRevision(q, idSesion, elegido)}
    <p class="explicacion">${esc(q.explicacion)}</p>
    <p class="referencia">${icono('libro', { tam: 16 })}<span>${esc(q.referencia)}<br>${esc(q.fuente_nombre || q.fuente)} (${esc(q.fuente)})</span></p>`;
}
