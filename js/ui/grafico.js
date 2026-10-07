// grafico.js — Gráfico de línea propio (SVG, sin librerías) con la evolución de las notas
// de simulacro: eje 0-20, línea de nota mínima, puntos accesibles y tooltip con cruz.

import { esc, fmtNota, fmtFechaCorta } from '../util.js';

/**
 * Dibuja el gráfico dentro de `cont`.
 * @param {HTMLElement} cont contenedor (.grafico)
 * @param {{nota:number, f:string, ac:number, tot:number}[]} sims en orden cronológico
 * @param {{minima:number, titulo:string}} op
 */
export function graficoNotas(cont, sims, { minima = 14, titulo = 'Evolución de notas' } = {}) {
  const datos = sims.slice(-20);
  const W = Math.max(260, Math.round((cont.clientWidth || 330) - 28));
  const H = 196;
  const m = { l: 28, r: 50, t: 16, b: 28 };
  const ancho = W - m.l - m.r;
  const alto = H - m.t - m.b;
  const x = (i) => (datos.length === 1 ? m.l + ancho / 2 : m.l + (ancho * i) / (datos.length - 1));
  const y = (v) => m.t + alto * (1 - v / 20);

  const rejilla = [0, 5, 10, 15, 20].map((v) => `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/>`).join('');
  const etiquetasY = [0, 5, 10, 15, 20].map((v) => `<text x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`).join('');
  const linea = datos.map((s, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(s.nota).toFixed(1)}`).join(' ');
  const puntos = datos.map((s, i) => `<circle class="punto" data-i="${i}" cx="${x(i).toFixed(1)}" cy="${y(s.nota).toFixed(1)}" r="4.5"
      tabindex="0" role="img" aria-label="Simulacro ${i + 1}, ${esc(fmtFechaCorta(s.f))}: nota ${fmtNota(s.nota)}"/>`).join('');
  const ult = datos[datos.length - 1];
  const etiquetasX = datos.length > 1
    ? `<text x="${x(0)}" y="${H - 6}" text-anchor="start">${esc(fmtFechaCorta(datos[0].f))}</text>
       <text x="${x(datos.length - 1)}" y="${H - 6}" text-anchor="end">${esc(fmtFechaCorta(ult.f))}</text>`
    : `<text x="${x(0)}" y="${H - 6}" text-anchor="middle">${esc(fmtFechaCorta(ult.f))}</text>`;

  cont.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="group" aria-label="${esc(titulo)}">
      <g class="rejilla-g">${rejilla}</g>
      <g class="eje">${etiquetasY}${etiquetasX}</g>
      <line class="umbral" x1="${m.l}" x2="${W - m.r}" y1="${y(minima)}" y2="${y(minima)}"/>
      <text class="umbral-texto" x="${W - m.r + 5}" y="${y(minima) + 4}">mín. ${String(minima)}</text>
      <line class="cruz" x1="0" x2="0" y1="${m.t}" y2="${H - m.b}" visibility="hidden"/>
      ${datos.length > 1 ? `<path class="linea" d="${linea}"/>` : ''}
      ${puntos}
      <text class="valor-final" x="${x(datos.length - 1)}" y="${y(ult.nota) - 11}" text-anchor="${datos.length > 1 ? 'end' : 'middle'}">${fmtNota(ult.nota)}</text>
    </svg>
    <div class="grafico-tip" hidden></div>`;

  const svg = cont.querySelector('svg');
  const tip = cont.querySelector('.grafico-tip');
  const cruz = cont.querySelector('.cruz');
  let activo = -1;

  function mostrar(i) {
    if (i < 0 || i >= datos.length) return;
    activo = i;
    const s = datos[i];
    const escala = svg.clientWidth / W || 1;
    cruz.setAttribute('x1', x(i));
    cruz.setAttribute('x2', x(i));
    cruz.setAttribute('visibility', 'visible');
    cont.querySelectorAll('.punto').forEach((p) => p.setAttribute('r', Number(p.dataset.i) === i ? '6' : '4.5'));
    tip.innerHTML = `<strong>${fmtNota(s.nota)}</strong>${esc(fmtFechaCorta(s.f))}, ${s.ac} de ${s.tot}`;
    tip.hidden = false;
    const izq = svg.offsetLeft + x(i) * escala;
    const arriba = svg.offsetTop + y(s.nota) * escala - 10;
    const mitad = tip.offsetWidth / 2;
    tip.style.left = `${Math.max(mitad + 4, Math.min(cont.clientWidth - mitad - 4, izq))}px`;
    tip.style.top = `${Math.max(tip.offsetHeight + 4, arriba)}px`;
  }
  function ocultar() {
    activo = -1;
    tip.hidden = true;
    cruz.setAttribute('visibility', 'hidden');
    cont.querySelectorAll('.punto').forEach((p) => p.setAttribute('r', '4.5'));
  }
  function cercano(ev) {
    const r = svg.getBoundingClientRect();
    const px = ((ev.clientX - r.left) / r.width) * W;
    let mejor = 0;
    let dist = Infinity;
    datos.forEach((_, i) => { const d = Math.abs(x(i) - px); if (d < dist) { dist = d; mejor = i; } });
    return mejor;
  }
  svg.addEventListener('pointermove', (ev) => mostrar(cercano(ev)));
  svg.addEventListener('pointerdown', (ev) => mostrar(cercano(ev)));
  svg.addEventListener('pointerleave', (ev) => { if (ev.pointerType === 'mouse') ocultar(); });
  svg.addEventListener('focusin', (ev) => { const p = ev.target.closest('.punto'); if (p) mostrar(Number(p.dataset.i)); });
  svg.addEventListener('focusout', ocultar);
  return { ocultar, activo: () => activo };
}
