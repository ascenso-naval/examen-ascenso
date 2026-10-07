// vista-progreso.js — Progreso por examen: dominio, vistas, aciertos, promedio de los
// últimos 5 simulacros, evolución de notas (SVG), actividad de 12 semanas, dominio por
// fuente → ítem y puntos débiles con «Practicar débiles».

import { estado } from '../estado.js';
import { D, disponibles, disponiblesFuente, disponiblesGrupo, fuentesDe, etiquetaGrupos, examenNombre } from '../datos.js';
import { esc, fmtNum, fmtNota, fmtPct, hoyISO, siglaCorta, plural, fmtFechaHora, debounce } from '../util.js';
import { resumen } from '../estadisticas.js';
import { seleccionarPractica } from '../seleccion.js';
import { resumenExamen, simulacrosDe, promedioUltimos, puntosDebiles, dominioDeGrupo } from '../consultas.js';
import { icono } from './iconos.js';
import { segmentosExamen, medidor, vacio, codigoGrupo } from './comun.js';
import { anillo } from './anillo.js';
import { graficoNotas } from './grafico.js';
import { mapaCalor } from './heatmap.js';
import { arrancarPractica } from './arranque.js';
import { navegar } from '../router.js';

let examenActual = 'reglamentos';

function htmlFuentes(examen) {
  const fuentes = fuentesDe(examen).filter((f) => disponiblesFuente(f.sigla, estado.ajustes).length);
  return fuentes.map((f) => {
    const r = resumen(disponiblesFuente(f.sigla, estado.ajustes), estado.p);
    return `<details class="desplegable" data-fuente="${esc(f.sigla)}">
      <summary><span class="fila-cuerpo"><span class="fila-titulo">${esc(fuentes.length > 1 ? siglaCorta(f.sigla) : f.nombre)}</span>
        <span class="fila-sub">${fmtNum(r.vistas)} de ${fmtNum(r.total)} vistas</span>${medidor(r.dominio)}</span>
        ${icono('chev-abajo', { clase: 'chev', tam: 20 })}</summary>
      <div class="desplegable-cuerpo"></div>
    </details>`;
  }).join('');
}

function htmlGrupos(sigla, examen) {
  const f = D.fuentePorSigla.get(sigla);
  return `<ul class="lista desglose" style="box-shadow:none;border-radius:0">${f.grupos.map((g) => {
    const qs = disponiblesGrupo(g.clave, estado.ajustes);
    if (!qs.length) return '';
    const r = resumen(qs, estado.p);
    const codigo = codigoGrupo(g);
    return `<li><a class="fila" href="#/explorar/${encodeURIComponent(examen)}/${encodeURIComponent(f.sigla)}/${encodeURIComponent(g.codigo)}">
      <span class="fila-cuerpo"><span class="fila-titulo" style="font-weight:600">${codigo ? `<span class="etiqueta item-codigo">${esc(codigo)}</span> ` : ''}${esc(g.titulo)}</span>
      <span class="fila-sub">${plural(r.intentos, 'intento', 'intentos')}</span>${medidor(r.dominio)}</span></a></li>`;
  }).join('')}</ul>`;
}

export function montar(raiz, params) {
  if (params.examen && D.examenPorId.has(params.examen)) examenActual = params.examen;
  const examen = examenActual;

  function pintar() {
    const r = resumenExamen(examen);
    const total = disponibles(examen, estado.ajustes).length;
    const sims = simulacrosDe(examen);
    const prom = promedioUltimos(examen, 5);
    const debiles = puntosDebiles(examen, 10);
    const etq = etiquetaGrupos(fuentesDe(examen)[0]);

    raiz.innerHTML = `
      <h1>Progreso</h1>
      <p class="sub">Dominio = acierto reciente ponderado (lo último pesa más).</p>
      <div class="campo">${segmentosExamen(examen)}</div>

      <section class="mosaico" aria-label="Resumen de ${esc(examenNombre(examen))}">
        <div class="tesela tesela-anillo">${anillo({ valor: r.dominio, tam: 52, grosor: 8, etiqueta: `Dominio ${r.dominio === null ? 'sin datos' : fmtPct(r.dominio)}` })}
          <div><span class="etq">Dominio</span><span class="val">${r.dominio === null ? '— <small>sin datos</small>' : fmtPct(r.dominio)}</span></div></div>
        <div class="tesela"><span class="etq">Vistas</span><span class="val">${fmtNum(r.vistas)} <small>de ${fmtNum(total)}</small></span></div>
        <div class="tesela"><span class="etq">Aciertos acumulados</span><span class="val">${fmtNum(r.aciertos)} <small>de ${fmtNum(r.intentos)}</small></span></div>
        <div class="tesela"><span class="etq">Promedio últimos 5</span><span class="val">${prom === null ? '—' : fmtNota(prom)} <small>${prom === null ? 'sin simulacros' : '/ 20'}</small></span></div>
      </section>

      <h2>Notas de simulacro</h2>
      ${sims.length ? `<section class="tarjeta grafico" id="grafico"></section>
        <p class="mini mt-s">${sims.length === 1 ? 'Tu primer simulacro' : `Últimos ${Math.min(sims.length, 20)} simulacros`} de ${esc(examenNombre(examen))}. La línea discontinua marca la nota mínima.</p>
        <details class="desplegable mt-m"><summary>Ver como tabla${icono('chev-abajo', { clase: 'chev', tam: 20 })}</summary>
          <div class="desplegable-cuerpo" style="padding:4px 16px 10px"><table class="tabla"><thead><tr><th>Fecha</th><th class="num">Correctas</th><th class="num">Nota</th></tr></thead>
          <tbody>${sims.slice().reverse().map((s) => `<tr><td>${esc(fmtFechaHora(s.f))}</td><td class="num">${s.ac}/${s.tot}</td><td class="num">${fmtNota(s.nota)}</td></tr>`).join('')}</tbody></table></div></details>`
    : vacio({ icono: 'simulacro', titulo: 'Aún no hay simulacros', texto: 'Haz tu primer simulacro para ver la evolución de tu nota.', accion: '<a class="btn btn-primario" href="#/simulacro">Hacer un simulacro</a>' })}

      <h2>Actividad</h2>
      <section class="tarjeta calor" id="calor"></section>

      <h2>Dominio por ${fuentesDe(examen).length > 1 ? 'fuente' : esc(etq.replace(/s$/, ''))}</h2>
      ${fuentesDe(examen).length > 1 ? htmlFuentes(examen) : `<div class="lista">${htmlGrupos(fuentesDe(examen)[0].sigla, examen)}</div>`}

      <h2>Puntos débiles</h2>
      ${debiles.length ? `<p class="sub">${debiles.length === 1 ? `El ${esc(etiquetaGrupos(fuentesDe(examen)[0], false))} con menor dominio` : `Los ${debiles.length} ${esc(etq)} con menor dominio`} (con 3 o más intentos).</p>
        <ul class="lista">${debiles.map(({ g, r: rg }) => `<li><a class="fila debil-fila" href="#/explorar/${encodeURIComponent(examen)}/${encodeURIComponent(g.fuente)}/${encodeURIComponent(g.codigo)}">
          <span class="fila-cuerpo"><span class="fila-titulo" style="font-weight:600">${fuentesDe(examen).length > 1 ? `<span class="etiqueta">${esc(siglaCorta(g.fuente))}</span> ` : ''}${codigoGrupo(g) ? `<span class="etiqueta item-codigo">${esc(codigoGrupo(g))}</span> ` : ''}${esc(g.titulo)}</span>
          <span class="fila-sub">${plural(rg.intentos, 'intento', 'intentos')}</span>${medidor(rg.dominio)}</span>${icono('chev-der', { clase: 'chev', tam: 20 })}</a></li>`).join('')}</ul>
        <button type="button" class="btn btn-primario btn-bloque mt-m" data-accion="practicar-debiles">${icono('practica', { tam: 20 })}Practicar débiles</button>`
    : vacio({ icono: 'diana', titulo: 'Sin puntos débiles detectados', texto: 'Aparecerán cuando tengas al menos 3 intentos en un artículo o tema.' })}`;

    const g = raiz.querySelector('#grafico');
    if (g) graficoNotas(g, sims, { minima: estado.ajustes.notaMinima, titulo: `Evolución de notas de ${examenNombre(examen)}` });
    mapaCalor(raiz.querySelector('#calor'), estado.dias, { meta: estado.ajustes.metaDiaria, hoy: hoyISO() });
  }

  async function alClic(e) {
    const b = e.target.closest('[data-accion]');
    if (!b) return;
    if (b.dataset.accion === 'examen') {
      navegar(`/progreso?examen=${encodeURIComponent(b.dataset.valor)}`, { reemplazar: true });
    } else if (b.dataset.accion === 'practicar-debiles') {
      const claves = new Set(puntosDebiles(examen, 10).map((x) => x.g.clave));
      const pool = disponibles(examen, estado.ajustes).filter((q) => claves.has(q._g.clave));
      const ids = seleccionarPractica(pool, { cantidad: 20, orden: 'debiles', stats: estado.p, dominioGrupo: dominioDeGrupo() }).map((q) => q.id);
      await arrancarPractica({ tipo: 'practica', examen, ids, titulo: `${examenNombre(examen)}: puntos débiles` });
    }
  }

  function alDesplegar(e) {
    const d = e.target;
    if (!d.matches || !d.matches('details[data-fuente]') || !d.open) return;
    const cuerpo = d.querySelector('.desplegable-cuerpo');
    if (!cuerpo.children.length) cuerpo.innerHTML = htmlGrupos(d.dataset.fuente, examen);
  }

  const alRedimensionar = debounce(() => {
    const g = raiz.querySelector('#grafico');
    if (g) graficoNotas(g, simulacrosDe(examen), { minima: estado.ajustes.notaMinima });
  }, 200);

  pintar();
  raiz.addEventListener('click', alClic);
  raiz.addEventListener('toggle', alDesplegar, true);
  window.addEventListener('resize', alRedimensionar);
  return () => {
    alRedimensionar.cancel();
    raiz.removeEventListener('click', alClic);
    raiz.removeEventListener('toggle', alDesplegar, true);
    window.removeEventListener('resize', alRedimensionar);
  };
}
