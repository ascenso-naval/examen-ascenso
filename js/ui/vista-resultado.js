// vista-resultado.js — Resultado del simulacro (nota vigesimal, aprobado/desaprobado,
// desglose por fuente y dificultad, tiempo, XP, comparación) y revisión de respuestas.

import { estado, statDe, guardarYa } from '../estado.js';
import { D, examenNombre } from '../datos.js';
import { esc, fmtNota, fmtPct, fmtDuracion, fmtFechaHora, fmtNum, hoyISO, siglaCorta, plural } from '../util.js';
import { icono } from './iconos.js';
import { cabecera, medidor, vacio, chipFuente, nombreDificultad, segmentos } from './comun.js';
import { htmlAlternativasRevision } from './pregunta.js';
import { toast } from './toast.js';

function buscarSim(id) {
  const i = estado.sims.findIndex((s) => s.id === id);
  if (i < 0) return { sim: null, anterior: null };
  const sim = estado.sims[i];
  let anterior = null;
  for (let j = i - 1; j >= 0; j--) if (estado.sims[j].ex === sim.ex) { anterior = estado.sims[j]; break; }
  return { sim, anterior };
}

const noEncontrado = () => `${cabecera({ volver: '/simulacro' })}<h1>Simulacro</h1>${vacio({
  titulo: 'No encontramos ese simulacro', texto: 'Puede que se haya reiniciado el progreso.', accion: '<a class="btn btn-primario" href="#/simulacro">Ir a Simulacro</a>',
})}`;

export function montarResultado(raiz, params) {
  const { sim, anterior } = buscarSim(params.id);
  if (!sim) { raiz.innerHTML = noEncontrado(); return null; }
  const pct = sim.tot ? sim.ac / sim.tot : 0;
  const delta = anterior ? Math.round((sim.nota - anterior.nota) * 10) / 10 : null;
  const fuentes = Object.entries(sim.porFuente || {})
    .map(([sigla, v]) => ({ sigla, ...v, orden: D.fuentePorSigla.get(sigla)?.orden ?? 99 }))
    .sort((a, b) => a.orden - b.orden);

  raiz.innerHTML = `
    ${cabecera({ volver: '/simulacro' })}
    <h1>Resultado</h1>
    <p class="sub">Simulacro de ${esc(examenNombre(sim.ex))}, ${esc(fmtFechaHora(sim.f))}${sim.auto ? '. Entregado al agotarse el tiempo' : ''}.</p>
    <section class="resultado-hero ${sim.aprobado ? 'ok' : 'mal'}" aria-label="Nota">
      <div class="nota-grande"><strong>${fmtNota(sim.nota)}</strong><span>/ 20</span></div>
      <p class="veredicto">${icono(sim.aprobado ? 'check' : 'cerrar', { tam: 20 })}${sim.aprobado ? 'Aprobado' : 'Desaprobado'} <span class="atenuado" style="font-weight:600">(nota mínima ${Number.isInteger(sim.minima) ? sim.minima : fmtNota(sim.minima)})</span></p>
      <dl class="cifras">
        <div><dt>Correctas</dt><dd>${sim.ac} de ${sim.tot}</dd></div>
        <div><dt>Porcentaje</dt><dd>${fmtPct(pct)}</dd></div>
        <div><dt>Tiempo usado</dt><dd>${fmtDuracion(sim.seg)}</dd></div>
        <div><dt>Experiencia</dt><dd class="oro">+${fmtNum(sim.xp)} XP</dd></div>
      </dl>
      ${sim.bonus ? `<p class="mini mt-s">Incluye +${sim.bonus} XP de bonificación por ${sim.nota >= 18 ? 'aprobar con 18 o más' : 'aprobar'}.</p>` : ''}
      ${anterior ? `<p class="comparacion">${delta > 0
    ? `<span class="sube">${icono('arriba', { tam: 16 })}${fmtNota(delta)}</span>`
    : delta < 0 ? `<span class="baja">${icono('abajo', { tam: 16 })}${fmtNota(-delta)}</span>` : '<strong>Igual</strong>'}
        <span>respecto al simulacro anterior (${fmtNota(anterior.nota)}, ${esc(fmtFechaHora(anterior.f))})</span></p>`
    : '<p class="comparacion">Es tu primer simulacro de este examen: será la referencia para los siguientes.</p>'}
    </section>

    <div class="botones">
      ${sim.ids ? `<a class="btn btn-primario btn-bloque" href="#/simulacro/revision/${encodeURIComponent(sim.id)}">${icono('ojo', { tam: 20 })}Revisar respuestas</a>` : ''}
    </div>

    ${fuentes.length > 1 ? `<h2>Por fuente</h2><ul class="lista desglose">${fuentes.map((f) => `<li class="fila">
      <span class="fila-cuerpo"><span class="fila-titulo">${esc(siglaCorta(f.sigla))}<span class="atenuado" style="font-weight:500"> ${f.a} de ${f.t}</span></span>
      ${medidor(f.t ? f.a / f.t : null)}</span></li>`).join('')}</ul>` : ''}

    <h2>Por dificultad</h2>
    <ul class="lista desglose">${[1, 2, 3].filter((d) => sim.porDif?.[d]?.t).map((d) => {
    const v = sim.porDif[d];
    return `<li class="fila"><span class="fila-cuerpo"><span class="fila-titulo">${nombreDificultad(d)}<span class="atenuado" style="font-weight:500"> ${v.a} de ${v.t}</span></span>${medidor(v.a / v.t)}</span></li>`;
  }).join('')}</ul>

    <div class="botones">
      <a class="btn btn-secundario btn-bloque" href="#/simulacro">Nuevo simulacro</a>
      <a class="btn btn-borde btn-bloque" href="#/inicio">Inicio</a>
    </div>`;
  return null;
}

export function montarRevision(raiz, params) {
  const { sim } = buscarSim(params.id);
  if (!sim) { raiz.innerHTML = noEncontrado(); return null; }
  if (!sim.ids || !sim.r) {
    raiz.innerHTML = `${cabecera({ volver: `/simulacro/resultado/${encodeURIComponent(sim.id)}` })}<h1>Revisión</h1>${vacio({
      titulo: 'Detalle no disponible', texto: 'Solo se guarda el detalle de los 10 últimos simulacros de cada examen.',
    })}`;
    return null;
  }
  let soloErradas = false;
  const preguntas = sim.ids.map((id) => D.porId.get(id)).filter(Boolean);
  const errada = (q) => sim.r[q.id] !== q.correcta;
  const nErradas = preguntas.filter(errada).length;

  function pintar() {
    const lista = preguntas.map((q, i) => ({ q, i })).filter(({ q }) => !soloErradas || errada(q));
    raiz.innerHTML = `
      ${cabecera({ volver: `/simulacro/resultado/${encodeURIComponent(sim.id)}` })}
      <h1>Revisión</h1>
      <p class="sub">${esc(examenNombre(sim.ex))}: ${sim.ac} de ${sim.tot} correctas, nota ${fmtNota(sim.nota)}.</p>
      ${segmentos([{ valor: 'todas', texto: `Todas (${preguntas.length})` }, { valor: 'erradas', texto: `Solo erradas (${nErradas})` }], soloErradas ? 'erradas' : 'todas', 'filtro', 'Filtro')}
      ${nErradas ? `<button type="button" class="btn btn-secundario btn-bloque mt-m" data-accion="a-repaso">${icono('repaso', { tam: 20 })}Mandar erradas a repaso</button>` : ''}
      ${lista.length ? lista.map(({ q, i }) => {
    const elegido = sim.r[q.id];
    const sinResponder = elegido === undefined || elegido === null;
    const ok = !errada(q);
    return `<article class="revision-item">
          <div class="pregunta-meta">
            <span class="etiqueta ${ok ? 'etiqueta-ok' : 'etiqueta-mal'}">${icono(ok ? 'check' : 'cerrar', { tam: 14 })}${i + 1}</span>
            ${chipFuente(q.fuente)}
            ${sinResponder ? '<span class="etiqueta etiqueta-ambar">Sin responder</span>' : ''}
          </div>
          <p class="enunciado">${esc(q.pregunta)}</p>
          ${htmlAlternativasRevision(q, sim.id, elegido)}
          <p class="explicacion">${esc(q.explicacion)}</p>
          <p class="referencia">${icono('libro', { tam: 16 })}<span>${esc(q.referencia)}<br>${esc(q.fuente_nombre || q.fuente)} (${esc(q.fuente)})</span></p>
        </article>`;
  }).join('') : vacio({ icono: 'estrella', titulo: 'Sin errores', texto: 'No hay preguntas erradas en este simulacro.' })}
      <a class="btn btn-borde btn-bloque mt-l" href="#/simulacro/resultado/${encodeURIComponent(sim.id)}">Volver al resultado</a>`;
  }

  function alClic(e) {
    const b = e.target.closest('[data-accion]');
    if (!b) return;
    if (b.dataset.accion === 'filtro') {
      soloErradas = b.dataset.valor === 'erradas';
      pintar();
    } else if (b.dataset.accion === 'a-repaso') {
      // Ya entraron al repaso al entregar; aquí se asegura (por si avanzaron desde entonces).
      const hoy = hoyISO();
      let n = 0;
      for (const q of preguntas.filter(errada)) {
        const st = statDe(q.id, true);
        if (!st.s || st.s[1] > hoy) { st.s = [0, hoy]; n += 1; }
      }
      guardarYa();
      toast(n ? `${plural(n, 'pregunta volvió', 'preguntas volvieron')} a tu repaso de hoy.` : `Las ${nErradas} erradas ya están en tu repaso.`, { tipo: 'exito', icono: 'repaso' });
    }
  }
  pintar();
  raiz.addEventListener('click', alClic);
  return () => raiz.removeEventListener('click', alClic);
}
