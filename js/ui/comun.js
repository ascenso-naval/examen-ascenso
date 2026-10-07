// comun.js — Piezas de interfaz compartidas (cabeceras, segmentos, medidores, insignia…).

import { esc, fmtPct, siglaCorta } from '../util.js';
import { D } from '../datos.js';
import { nivelDominio } from '../estadisticas.js';
import { tramoNivel } from '../gamificacion.js';
import { icono } from './iconos.js';

/** Cabecera con botón «volver» opcional. */
export function cabecera({ volver = null, titulo = '', derecha = '' } = {}) {
  return `<div class="cabecera">
    ${volver ? `<a class="btn-icono" href="#${volver}" aria-label="Volver">${icono('chev-izq')}</a>` : ''}
    ${titulo ? `<p class="cabecera-titulo">${esc(titulo)}</p>` : ''}
    <span class="espacio"></span>${derecha}
  </div>`;
}

/** Control segmentado de exámenes. */
export function segmentosExamen(seleccionado, accion = 'examen', incluirTodos = false) {
  const ops = (incluirTodos ? [{ id: 'todos', nombre: 'Todos' }] : []).concat(D.examenes);
  return `<div class="segmentos" role="group" aria-label="Examen">${ops.map((e) =>
    `<button type="button" data-accion="${accion}" data-valor="${esc(e.id)}" aria-pressed="${e.id === seleccionado}">${esc(e.nombre)}</button>`).join('')}</div>`;
}

/** Control segmentado genérico. */
export function segmentos(opciones, seleccionado, accion, etiqueta = '') {
  return `<div class="segmentos" role="group" aria-label="${esc(etiqueta)}">${opciones.map((o) =>
    `<button type="button" data-accion="${accion}" data-valor="${esc(o.valor)}" aria-pressed="${String(o.valor) === String(seleccionado)}">${esc(o.texto)}</button>`).join('')}</div>`;
}

/** Medidor de dominio con texto (nunca solo color). */
export function medidor(dominio, { sinDatos = 'Sin datos' } = {}) {
  const nivel = nivelDominio(dominio);
  const pct = dominio === null || dominio === undefined ? 0 : Math.round(dominio * 100);
  return `<div class="medidor ${nivel}">
    <div class="barra" role="presentation"><i style="--v:${pct}%"></i></div>
    <span class="medidor-valor">${dominio === null || dominio === undefined ? sinDatos : `${pct} %`}</span>
  </div>`;
}

/** Barra de progreso simple (0..1). */
export function barra(valor, etiqueta = '') {
  const pct = Math.round(Math.max(0, Math.min(1, valor || 0)) * 100);
  return `<div class="barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"${etiqueta ? ` aria-label="${esc(etiqueta)}"` : ''}><i style="--v:${pct}%"></i></div>`;
}

/** Estado vacío con llamada a la acción. */
export function vacio({ icono: ic = 'ancla', titulo, texto = '', accion = '' }) {
  return `<div class="vacio">${icono(ic, { tam: 34 })}<h3>${esc(titulo)}</h3>${texto ? `<p>${esc(texto)}</p>` : ''}${accion}</div>`;
}

/** Chip con la sigla de la fuente. */
export function chipFuente(sigla) {
  return `<span class="etiqueta" title="${esc(D.fuentePorSigla.get(sigla)?.nombre || sigla)}">${esc(siglaCorta(sigla))}</span>`;
}

const NOMBRES_DIF = { 1: 'Fácil', 2: 'Media', 3: 'Difícil' };
export const nombreDificultad = (d) => NOMBRES_DIF[d] || 'Media';

/** Puntos de dificultad (1 a 3). */
export function puntosDificultad(d) {
  return `<span class="dificultad" title="Dificultad ${nombreDificultad(d).toLowerCase()}" aria-label="Dificultad ${nombreDificultad(d).toLowerCase()}">${
    [1, 2, 3].map((i) => `<i class="${i <= d ? 'on' : ''}"></i>`).join('')}</span>`;
}

/** Porcentaje legible o «—». */
export const pctOGuion = (x) => (x === null || x === undefined ? '—' : fmtPct(x));

/**
 * Insignia de nivel: círculo dorado con el número y 1-3 galones según la posición
 * dentro del rango (Almirante lleva estrella).
 */
export function insignia(nivel, tam = 56) {
  const { indice, posicion } = tramoNivel(nivel);
  let adorno;
  if (indice >= 8) {
    adorno = '<path d="M32 40.5l2 4 4.4.6-3.2 3.1.8 4.4-4-2.1-4 2.1.8-4.4-3.2-3.1 4.4-.6z" fill="currentColor"/>';
  } else {
    adorno = Array.from({ length: posicion }, (_, i) => `<rect x="23" y="${40 + i * 4.4}" width="18" height="2.6" rx="1.3" fill="currentColor"/>`).join('');
  }
  return `<svg class="insignia" width="${tam}" height="${tam}" viewBox="0 0 64 64" role="img" aria-label="Nivel ${nivel}">
    <circle cx="32" cy="32" r="29" fill="none" stroke="currentColor" stroke-width="2.6"/>
    <circle cx="32" cy="32" r="24.5" fill="none" stroke="currentColor" stroke-opacity="0.45" stroke-width="1"/>
    <text x="32" y="${indice >= 8 ? 31 : 33}" text-anchor="middle" font-size="${nivel > 99 ? 15 : 19}">${nivel}</text>
    ${adorno}
  </svg>`;
}

/** Texto del tipo de grupo con su código, p. ej. «Ítem 1.01» o el tema. */
export function codigoGrupo(g) {
  if (g.tipo === 'item') return g.codigo.startsWith('i:') ? g.codigo.slice(2) : g.codigo;
  if (g.tipo === 'otros') return 'Otras';
  return '';
}
