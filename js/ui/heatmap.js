// heatmap.js — Mapa de calor de actividad de las últimas 12 semanas (SVG propio):
// columnas = semanas (lunes a domingo), intensidad = preguntas respondidas ese día.

import { esc, sumarDias, lunesDe, deISO, nombreMes, fmtFechaLarga, plural, fmtNum } from '../util.js';

const DIAS_ETQ = ['L', '', 'X', '', 'V', '', ''];

/** Nivel de intensidad 0-4 relativo a la meta diaria. */
export function nivelCalor(n, meta) {
  if (!n) return 0;
  if (n < meta / 2) return 1;
  if (n < meta) return 2;
  if (n < meta * 2) return 3;
  return 4;
}

/**
 * @param {HTMLElement} cont contenedor (.calor)
 * @param {object} dias estado.dias
 * @param {{meta:number, hoy:string, semanas?:number}} op
 */
export function mapaCalor(cont, dias, { meta, hoy, semanas = 12 }) {
  const celda = 18;
  const hueco = 3;
  const izq = 16;
  const sup = 16;
  const inicio = sumarDias(lunesDe(hoy), -7 * (semanas - 1));
  const W = izq + semanas * (celda + hueco);
  const H = sup + 7 * (celda + hueco);
  let rects = '';
  let meses = '';
  let mesPrevio = -1;
  let total = 0;
  let activos = 0;
  for (let c = 0; c < semanas; c++) {
    const lunes = sumarDias(inicio, c * 7);
    const mes = deISO(lunes).getMonth();
    if (mes !== mesPrevio) {
      if (c < semanas - 1) meses += `<text class="mes-etq" x="${izq + c * (celda + hueco)}" y="10">${nombreMes(mes)}</text>`;
      mesPrevio = mes;
    }
    for (let r = 0; r < 7; r++) {
      const f = sumarDias(lunes, r);
      if (f > hoy) continue;
      const n = dias[f]?.r || 0;
      total += n;
      if (n) activos += 1;
      const nivel = nivelCalor(n, meta);
      const etq = `${fmtFechaLarga(f)}: ${n ? plural(n, 'pregunta', 'preguntas') : 'sin actividad'}${dias[f]?.meta ? ', meta cumplida' : ''}`;
      rects += `<rect class="celda-calor${f === hoy ? ' hoy' : ''}" x="${izq + c * (celda + hueco)}" y="${sup + r * (celda + hueco)}"
        width="${celda}" height="${celda}" rx="4" fill="var(--calor-${nivel})" tabindex="0" role="img"
        aria-label="${esc(etq)}" data-etq="${esc(etq)}"><title>${esc(etq)}</title></rect>`;
    }
  }
  const diasEtq = DIAS_ETQ.map((d, r) => (d ? `<text class="dia-etq" x="0" y="${sup + r * (celda + hueco) + 13}">${d}</text>` : '')).join('');
  cont.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" role="group" aria-label="Actividad de las últimas ${semanas} semanas" style="max-width:560px">
      ${meses}${diasEtq}${rects}
    </svg>
    <p class="calor-detalle" aria-live="polite">${fmtNum(total)} preguntas en ${plural(activos, 'día activo', 'días activos')}. Toca un día para ver el detalle.</p>
    <div class="calor-pie"><span>Menos</span>
      <span class="calor-escala" aria-hidden="true">${[0, 1, 2, 3, 4].map((i) => `<i style="background:var(--calor-${i})"></i>`).join('')}</span>
      <span>Más</span></div>`;
  const detalle = cont.querySelector('.calor-detalle');
  const mostrar = (el) => { if (el && el.dataset.etq) detalle.textContent = el.dataset.etq.charAt(0).toUpperCase() + el.dataset.etq.slice(1); };
  cont.querySelector('svg').addEventListener('click', (e) => mostrar(e.target.closest('rect')));
  cont.querySelector('svg').addEventListener('focusin', (e) => mostrar(e.target.closest('rect')));
}
