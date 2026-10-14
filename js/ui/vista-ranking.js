// vista-ranking.js — Ranking por apodo (top 50): pestañas XP / Nota promedio, fila propia
// resaltada, invitación a elegir apodo, actualización con botón o «tirar para actualizar»,
// y copia en caché para verla sin conexión.

import * as nube from '../nube.js';
import * as sync from '../sincronizacion.js';
import { pedirApodo } from '../cuenta.js';
import { esc, fmtNum, fmtNota, fmtFechaHora } from '../util.js';
import { icono } from './iconos.js';
import { cabecera, segmentos, vacio } from './comun.js';

/** Ranking en caché por orden: {filas, fecha}. */
function cache(orden) {
  const r = sync.metaNube().ranking;
  return r && r[orden] ? r[orden] : null;
}
function guardarCache(orden, filas) {
  const r = { ...(sync.metaNube().ranking || {}) };
  r[orden] = { filas, fecha: new Date().toISOString() };
  sync.actualizarMeta({ ranking: r });
}

/**
 * Pide el ranking al servidor (o usa la caché si es reciente). Devuelve {filas, fecha, deCache, error}.
 * @param {'xp'|'nota'} orden
 * @param {number} maxEdadMs edad máxima de la caché para no consultar
 */
export async function obtenerRanking(orden = 'xp', maxEdadMs = 0) {
  const c = cache(orden);
  if (c && maxEdadMs && Date.now() - new Date(c.fecha).getTime() < maxEdadMs) return { ...c, deCache: true };
  if (!nube.enLinea()) return c ? { ...c, deCache: true, error: 'Sin conexión' } : { filas: null, error: 'Sin conexión' };
  try {
    const filas = await nube.ranking(50, orden);
    guardarCache(orden, filas);
    return { filas, fecha: new Date().toISOString(), deCache: false };
  } catch (e) {
    return c ? { ...c, deCache: true, error: e.message } : { filas: null, error: e.message };
  }
}

function filaRanking(r, orden) {
  const valor = orden === 'nota'
    ? `<strong class="num">${r.nota_promedio === null ? '—' : fmtNota(Number(r.nota_promedio))}</strong><span class="mini">nota</span>`
    : `<strong class="num">${fmtNum(r.xp)}</strong><span class="mini">XP</span>`;
  const medalla = r.posicion <= 3 ? ` medalla-${r.posicion}` : '';
  return `<li class="fila fila-ranking${r.es_yo ? ' es-yo' : ''}"${r.es_yo ? ' aria-current="true"' : ''}>
    <span class="ranking-pos${medalla}" aria-label="Posición ${r.posicion}">${r.posicion}</span>
    <span class="fila-cuerpo">
      <span class="fila-titulo">${esc(r.apodo)}${r.es_yo ? ' <span class="etiqueta etiqueta-oro">Tú</span>' : ''}</span>
      <span class="fila-sub">${orden === 'nota' ? `${fmtNum(r.xp)} XP` : `Nota ${r.nota_promedio === null ? '—' : fmtNota(Number(r.nota_promedio))}`} · ${r.simulacros} simulacro${r.simulacros === 1 ? '' : 's'} · ${icono('llama', { tam: 14 })} ${r.racha}</span>
    </span>
    <span class="ranking-valor">${valor}</span>
  </li>`;
}

export function montar(raiz) {
  let orden = 'xp';
  let datos = cache(orden) ? { ...cache(orden), deCache: true } : null;
  let cargando = false;
  let vivo = true;

  function pintar() {
    const apodo = sync.metaNube().apodo;
    const filas = datos && datos.filas;
    const yo = filas ? filas.find((r) => r.es_yo) : null;
    raiz.innerHTML = `
      ${cabecera({ volver: '/mas', derecha: `<button type="button" class="btn-icono" data-accion="actualizar" aria-label="Actualizar ranking"${cargando ? ' aria-busy="true"' : ''}>${icono('repaso')}</button>` })}
      <h1>Ranking</h1>
      <p class="sub">Top 50 de la promoción. Solo se muestra el apodo.</p>
      ${!apodo ? `<section class="tarjeta invitacion-apodo">${icono('usuario', { tam: 26 })}<div>
        <p><strong>Elige un apodo para aparecer en el ranking.</strong> Tu correo nunca se muestra.</p>
        <button type="button" class="btn btn-primario btn-chico" data-accion="apodo">Elegir apodo</button></div></section>` : ''}
      ${segmentos([{ valor: 'xp', texto: 'XP' }, { valor: 'nota', texto: 'Nota promedio' }], orden, 'orden', 'Ordenar por')}
      ${yo ? `<p class="mi-posicion" role="status">Tu posición: <strong>${yo.posicion}.º</strong> ${orden === 'nota' ? `con nota ${yo.nota_promedio === null ? '—' : fmtNota(Number(yo.nota_promedio))}` : `con ${fmtNum(yo.xp)} XP`}</p>` : ''}
      ${cargando && !filas ? '<p class="peq atenuado mt-m" role="status">Cargando ranking…</p>' : ''}
      ${filas && filas.length ? `<ol class="lista lista-ranking mt-m">${filas.map((r) => filaRanking(r, orden)).join('')}</ol>` : ''}
      ${filas && !filas.length ? vacio({ icono: 'podio', titulo: orden === 'nota' ? 'Aún nadie tiene simulacros' : 'Aún no hay participantes', texto: 'Estudia y vuelve más tarde.' }) : ''}
      ${!filas && !cargando ? vacio({ icono: 'nube-off', titulo: 'Ranking no disponible', texto: datos && datos.error ? datos.error : 'Conéctate a internet para ver el ranking.' }) : ''}
      ${datos && datos.fecha ? `<p class="mini centro mt-m">${datos.deCache && datos.error ? `${esc(datos.error)} · ` : ''}Actualizado: ${esc(fmtFechaHora(datos.fecha))}</p>` : ''}`;
  }

  async function cargar() {
    if (cargando) return;
    cargando = true;
    pintar();
    const r = await obtenerRanking(orden, 0);
    cargando = false;
    if (!vivo) return;
    datos = r;
    pintar();
  }

  async function alClic(e) {
    const b = e.target.closest('[data-accion]');
    if (!b) return;
    if (b.dataset.accion === 'orden') {
      orden = b.dataset.valor;
      datos = cache(orden) ? { ...cache(orden), deCache: true } : null;
      cargar();
    } else if (b.dataset.accion === 'actualizar') {
      cargar();
    } else if (b.dataset.accion === 'apodo') {
      if (await pedirApodo()) cargar();
    }
  }

  // «Tirar para actualizar»: arrastrar hacia abajo desde arriba del todo.
  let y0 = null;
  const alTocar = (e) => { y0 = window.scrollY <= 0 ? e.touches[0].clientY : null; };
  const alSoltar = (e) => {
    if (y0 !== null && e.changedTouches[0].clientY - y0 > 80) cargar();
    y0 = null;
  };

  pintar();
  cargar();
  raiz.addEventListener('click', alClic);
  raiz.addEventListener('touchstart', alTocar, { passive: true });
  raiz.addEventListener('touchend', alSoltar, { passive: true });
  return () => {
    vivo = false;
    raiz.removeEventListener('click', alClic);
    raiz.removeEventListener('touchstart', alTocar);
    raiz.removeEventListener('touchend', alSoltar);
  };
}
