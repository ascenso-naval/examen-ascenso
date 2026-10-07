// vista-resumen.js — Resumen de una práctica o repaso: aciertos, %, XP, tiempo,
// falladas con su explicación y accesos «Repetir las falladas», «Nueva práctica», «Inicio».

import { estado } from '../estado.js';
import { D } from '../datos.js';
import { esc, fmtDuracion, fmtNum, fmtPct, plural } from '../util.js';
import { pendientesHoy } from '../consultas.js';
import { navegar } from '../router.js';
import { icono } from './iconos.js';
import { chipFuente, vacio } from './comun.js';
import { htmlDetalle } from './pregunta.js';
import { abrirHoja } from './modal.js';
import { arrancarPractica } from './arranque.js';

export function montar(raiz) {
  const r = estado.ultimoResumen;
  if (!r) {
    raiz.innerHTML = `<h1>Resumen</h1>${vacio({ titulo: 'No hay una sesión reciente', texto: 'Cuando termines una práctica verás aquí tu resultado.', accion: '<a class="btn btn-primario" href="#/practica">Ir a Práctica</a>' })}`;
    return null;
  }
  const esRepaso = r.tipo === 'repaso';
  const falladas = r.falladas.map((id) => D.porId.get(id)).filter(Boolean);
  const pct = r.total ? r.aciertos / r.total : 0;
  const quedan = esRepaso ? pendientesHoy().total : 0;

  raiz.innerHTML = `
    <h1>${esRepaso ? 'Repaso completado' : 'Práctica completada'}</h1>
    <p class="sub">${esc(r.titulo || '')}</p>
    <section class="resultado-hero ${pct >= 0.7 ? 'ok' : 'mal'}" aria-label="Resultado">
      <div class="nota-grande"><strong>${fmtNum(r.aciertos)}</strong><span>de ${fmtNum(r.total)} correctas</span></div>
      <dl class="cifras">
        <div><dt>Porcentaje</dt><dd>${fmtPct(pct)}</dd></div>
        <div><dt>Experiencia</dt><dd class="oro">+${fmtNum(r.xp)} XP</dd></div>
        <div><dt>Tiempo</dt><dd>${fmtDuracion(r.seg)}</dd></div>
        <div><dt>Falladas</dt><dd>${fmtNum(falladas.length)}</dd></div>
      </dl>
    </section>

    ${falladas.length ? `<h2>Para repasar</h2>
      <p class="sub">Las falladas ya están en tu repaso de hoy. Toca una para ver la explicación.</p>
      <ul class="lista">${falladas.map((q) => `<li><button type="button" class="fila" data-accion="ver" data-id="${esc(q.id)}">
        <span class="fila-cuerpo"><span class="pregunta-meta">${chipFuente(q.fuente)}</span>
        <span class="fila-titulo" style="margin-top:6px;font-weight:560">${esc(q.pregunta)}</span></span>
        ${icono('chev-der', { clase: 'chev', tam: 20 })}</button></li>`).join('')}</ul>`
    : `<div class="vacio mt-l">${icono('estrella', { tam: 34 })}<h3>Sin errores</h3><p>Respondiste todo correctamente. Buen rumbo.</p></div>`}

    <div class="botones">
      ${falladas.length ? `<button type="button" class="btn btn-primario btn-bloque" data-accion="repetir">${icono('repaso', { tam: 20 })}Repetir las falladas</button>` : ''}
      ${esRepaso && quedan ? `<button type="button" class="btn ${falladas.length ? 'btn-secundario' : 'btn-primario'} btn-bloque" data-accion="seguir-repaso">Seguir repasando (${plural(quedan, 'pendiente', 'pendientes')})</button>` : ''}
      <a class="btn ${falladas.length || (esRepaso && quedan) ? 'btn-secundario' : 'btn-primario'} btn-bloque" href="#/practica">Nueva práctica</a>
      <a class="btn btn-borde btn-bloque" href="#/inicio">Inicio</a>
    </div>`;

  async function alClic(e) {
    const b = e.target.closest('[data-accion]');
    if (!b) return;
    const a = b.dataset.accion;
    if (a === 'ver') {
      const q = D.porId.get(b.dataset.id);
      if (q) abrirHoja({ html: htmlDetalle(q, r.semilla, r.resp[q.id]), etiqueta: 'Detalle de la pregunta', acciones: [{ texto: 'Cerrar', clase: 'btn-secundario', valor: null }] });
    } else if (a === 'repetir') {
      await arrancarPractica({
        tipo: 'practica', examen: r.examen, ids: falladas.map((q) => q.id),
        titulo: `Repetir falladas${r.titulo ? `: ${r.titulo}` : ''}`, config: r.config,
      });
    } else if (a === 'seguir-repaso') {
      navegar('/repaso');
    }
  }
  raiz.addEventListener('click', alClic);
  return () => raiz.removeEventListener('click', alClic);
}
