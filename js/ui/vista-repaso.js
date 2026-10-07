// vista-repaso.js — Repaso inteligente: pendientes de hoy por examen, «Repasar ahora»,
// pronóstico de la semana, lista plegable por fuente y «Adelantar repaso».

import { estado } from '../estado.js';
import { D, examenNombre } from '../datos.js';
import { esc, hoyISO, sumarDias, fmtNum, plural, siglaCorta, fmtFechaCorta, deISO } from '../util.js';
import { seleccionarRepaso } from '../seleccion.js';
import { enRepaso } from '../consultas.js';
import { icono } from './iconos.js';
import { segmentosExamen, vacio, chipFuente } from './comun.js';
import { htmlContinuar, manejarContinuar } from './continuar.js';
import { arrancarPractica } from './arranque.js';
import { abrirHoja } from './modal.js';

const POR_SESION = 20;
const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

export function montar(raiz) {
  let filtro = 'todos';

  function pintar() {
    const hoy = hoyISO();
    const todas = enRepaso();
    const lista = filtro === 'todos' ? todas : todas.filter((x) => x.q.examen === filtro);
    const pendientes = lista.filter((x) => x.proxima <= hoy);
    const futuras = lista.filter((x) => x.proxima > hoy);
    const porExamen = {};
    for (const x of todas) if (x.proxima <= hoy) porExamen[x.q.examen] = (porExamen[x.q.examen] || 0) + 1;

    // Pronóstico de los próximos 7 días (mañana en adelante).
    const dias = [];
    for (let i = 1; i <= 7; i++) {
      const f = sumarDias(hoy, i);
      dias.push({ f, n: futuras.filter((x) => x.proxima === f).length });
    }
    const maxDia = Math.max(1, ...dias.map((d) => d.n));

    // Pendientes agrupadas por fuente.
    const porFuente = new Map();
    for (const x of pendientes) {
      if (!porFuente.has(x.q.fuente)) porFuente.set(x.q.fuente, []);
      porFuente.get(x.q.fuente).push(x);
    }
    const fuentesOrdenadas = [...porFuente.entries()].sort((a, b) => (D.fuentePorSigla.get(a[0])?.orden ?? 0) - (D.fuentePorSigla.get(b[0])?.orden ?? 0));
    const proxima = futuras.length ? futuras.reduce((m, x) => (x.proxima < m ? x.proxima : m), futuras[0].proxima) : null;

    raiz.innerHTML = `
      <h1>Repaso</h1>
      <p class="sub">Lo que fallas vuelve en 1, 3, 7, 14, 30 y 60 días hasta que lo domines.</p>
      ${htmlContinuar('practica')}
      <div class="campo mt-m">${segmentosExamen(filtro, 'filtro', true)}</div>

      ${pendientes.length ? `
      <section class="tarjeta">
        <div class="repaso-hero">
          <span class="num-grande">${fmtNum(pendientes.length)}</span>
          <div><strong>${pendientes.length === 1 ? 'pregunta para hoy' : 'preguntas para hoy'}</strong>
          <span class="mini" style="display:block">${D.examenes.filter((e) => porExamen[e.id]).map((e) => `${esc(e.nombre)}: ${porExamen[e.id]}`).join(', ')}</span></div>
        </div>
        <button type="button" class="btn btn-primario btn-bloque mt-m" data-accion="repasar">${icono('play', { tam: 20 })}Repasar ahora (${Math.min(POR_SESION, pendientes.length)})</button>
      </section>`
    : vacio({
      icono: 'check',
      titulo: 'Estás al día',
      texto: futuras.length
        ? `No tienes repasos pendientes. El próximo es el ${fmtFechaCorta(proxima)}.`
        : 'Cuando falles una pregunta o la marques con la bandera, aparecerá aquí.',
      accion: futuras.length ? `<button type="button" class="btn btn-secundario" data-accion="adelantar">Adelantar repaso (${Math.min(POR_SESION, futuras.length)})</button>` : '',
    })}

      <h2>Próximos 7 días</h2>
      <section class="tarjeta">
        ${futuras.length ? `<div class="pronostico" role="img" aria-label="Repasos programados: ${dias.map((d) => `${DIAS_CORTOS[deISO(d.f).getDay()]} ${d.n}`).join(', ')}">
          ${dias.map((d) => `<div><b>${d.n || ''}</b>${d.n ? `<i style="height:${Math.max(4, Math.round((d.n / maxDia) * 60))}px"></i>` : '<i class="cero"></i>'}<span>${DIAS_CORTOS[deISO(d.f).getDay()]}</span></div>`).join('')}
        </div>` : ''}
        <p class="mini ${futuras.length ? 'mt-s' : ''}" style="${futuras.length ? '' : 'margin:0'}">${futuras.length ? `${plural(dias.reduce((t, d) => t + d.n, 0), 'repaso programado', 'repasos programados')} esta semana; ${plural(lista.length, 'pregunta', 'preguntas')} en tu repaso en total.` : 'Sin repasos programados para los próximos días: lo que repases bien hoy aparecerá aquí.'}</p>
      </section>

      ${fuentesOrdenadas.length ? `<h2>Pendientes por fuente</h2>
        ${fuentesOrdenadas.map(([sigla, xs]) => `<details class="desplegable">
          <summary><span class="etiqueta">${esc(siglaCorta(sigla))}</span><span>${plural(xs.length, 'pendiente', 'pendientes')}</span>${icono('chev-abajo', { clase: 'chev', tam: 20 })}</summary>
          <ul class="lista desplegable-cuerpo" style="box-shadow:none;border-radius:0">${xs.map((x) => `<li><button type="button" class="fila" data-accion="ver" data-id="${esc(x.q.id)}">
            <span class="fila-cuerpo"><span class="fila-titulo" style="font-weight:540">${esc(x.q.pregunta)}</span>
            <span class="fila-sub">Caja ${x.caja}${estado.p[x.q.id]?.m ? ', marcada con bandera' : ''}</span></span>${icono('chev-der', { clase: 'chev', tam: 20 })}</button></li>`).join('')}</ul>
        </details>`).join('')}` : ''}
      ${pendientes.length && futuras.length ? `<button type="button" class="btn btn-fantasma btn-bloque mt-m" data-accion="adelantar">Adelantar las próximas (${Math.min(POR_SESION, futuras.length)})</button>` : ''}`;
  }

  async function iniciar(adelantar) {
    const hoy = hoyISO();
    const lista = filtro === 'todos' ? enRepaso() : enRepaso(filtro);
    const qs = seleccionarRepaso(lista, hoy, { max: POR_SESION, adelantar });
    const examenes = new Set(qs.map((q) => q.examen));
    await arrancarPractica({
      tipo: 'repaso',
      examen: examenes.size === 1 ? [...examenes][0] : 'mixto',
      ids: qs.map((q) => q.id),
      titulo: `${adelantar ? 'Repaso adelantado' : 'Repaso'}${filtro !== 'todos' ? `: ${examenNombre(filtro)}` : ''}`,
    });
  }

  async function alClic(e) {
    const b = e.target.closest('[data-accion]');
    if (!b) return;
    if (await manejarContinuar(b, pintar)) return;
    const a = b.dataset.accion;
    if (a === 'filtro') { filtro = b.dataset.valor; pintar(); }
    else if (a === 'repasar') iniciar(false);
    else if (a === 'adelantar') iniciar(true);
    else if (a === 'ver') {
      const q = D.porId.get(b.dataset.id);
      if (!q) return;
      abrirHoja({
        etiqueta: 'Pregunta pendiente',
        html: `<div class="pregunta-meta">${chipFuente(q.fuente)}</div><p class="enunciado">${esc(q.pregunta)}</p>
          <p class="mini">La respuesta se muestra al repasarla.</p>`,
        acciones: [{ texto: 'Cerrar', clase: 'btn-secundario', valor: null }],
      });
    }
  }

  pintar();
  raiz.addEventListener('click', alClic);
  return () => raiz.removeEventListener('click', alClic);
}
