// vista-simulacro.js — Configuración del simulacro (examen, n.º de preguntas, minutos,
// composición «como el examen» o «solo fuentes seleccionadas») e historial de intentos.

import { estado, guardar } from '../estado.js';
import { D, disponibles, disponiblesFuente, fuentesDe, examenNombre } from '../datos.js';
import { esc, fmtNota, fmtFechaHora, siglaCorta, plural } from '../util.js';
import { componerSimulacro, idsRecientes, repartoPrevisto } from '../seleccion.js';
import { iniciarSimulacro, sesionEnCurso } from '../sesion.js';
import { navegar } from '../router.js';
import { icono } from './iconos.js';
import { segmentosExamen, segmentos } from './comun.js';
import { htmlContinuar, manejarContinuar } from './continuar.js';
import { confirmar } from './modal.js';
import { toast } from './toast.js';

const PREGUNTAS = [10, 20, 40, 60];
const MINUTOS = [15, 30, 45, 60, 90];

export function montar(raiz) {
  const cfg = estado.config.simulacro;
  if (!D.examenPorId.has(cfg.examen)) cfg.examen = D.examenes[0].id;
  // Valores del intento: parten de los ajustes por defecto.
  let n = estado.ajustes.simPreguntas;
  let minutos = estado.ajustes.simMinutos;
  let sinTiempo = false;
  let verTodo = false;

  const fuentesExamen = () => fuentesDe(cfg.examen).filter((f) => disponiblesFuente(f.sigla, estado.ajustes).length);

  function pool() {
    let p = disponibles(cfg.examen, estado.ajustes);
    if (cfg.composicion === 'seleccion' && fuentesExamen().length > 1) {
      const set = new Set(cfg.fuentes || []);
      p = p.filter((q) => set.has(q.fuente));
    }
    return p;
  }

  function fuentesComposicion() {
    const fs = fuentesExamen();
    if (cfg.composicion === 'seleccion' && fs.length > 1) return fs.filter((f) => (cfg.fuentes || []).includes(f.sigla));
    return fs;
  }

  function htmlReparto() {
    const fs = fuentesComposicion();
    if (fs.length < 2) return '';
    const rep = repartoPrevisto(fs, pool(), n);
    const items = fs.filter((f) => rep.get(f.sigla)).map((f) =>
      `<span class="etiqueta" title="${esc(f.nombre)}">${esc(siglaCorta(f.sigla))} <b class="num">${rep.get(f.sigla)}</b></span>`).join('');
    return `<div class="campo"><span class="rotulo">Reparto por fuente</span><div class="chips" style="gap:6px">${items}</div>
      <span class="ayuda">Proporcional al número de artículos del temario, con al menos una pregunta por fuente.</span></div>`;
  }

  function htmlHistorial() {
    const sims = estado.sims.slice().reverse();
    if (!sims.length) return '';
    const visibles = verTodo ? sims : sims.slice(0, 6);
    return `<h2>Historial</h2><ul class="lista">${visibles.map((s) => `<li><a class="fila" href="#/simulacro/resultado/${encodeURIComponent(s.id)}">
      <span class="fila-icono">${icono(s.aprobado ? 'check' : 'cerrar', { tam: 20 })}</span>
      <span class="fila-cuerpo"><span class="fila-titulo">${esc(examenNombre(s.ex))}</span>
      <span class="fila-sub">${esc(fmtFechaHora(s.f))}, ${s.ac} de ${s.tot}</span></span>
      <span class="fila-valor"><span class="etiqueta ${s.aprobado ? 'etiqueta-ok' : 'etiqueta-mal'}">${fmtNota(s.nota)}</span></span>
      ${icono('chev-der', { clase: 'chev', tam: 20 })}</a></li>`).join('')}</ul>
      ${sims.length > 6 && !verTodo ? `<button type="button" class="btn btn-fantasma btn-bloque mt-s" data-accion="ver-todo">Ver los ${sims.length} simulacros</button>` : ''}`;
  }

  function pintar() {
    const fs = fuentesExamen();
    const varias = fs.length > 1;
    const disponiblesN = pool().length;
    const opcionesN = PREGUNTAS.includes(estado.ajustes.simPreguntas) ? PREGUNTAS : [...PREGUNTAS, estado.ajustes.simPreguntas].sort((a, b) => a - b);
    const opcionesM = MINUTOS.includes(estado.ajustes.simMinutos) ? MINUTOS : [...MINUTOS, estado.ajustes.simMinutos].sort((a, b) => a - b);
    raiz.innerHTML = `
      <h1>Simulacro</h1>
      <p class="sub">Cronometrado y sin ayudas: verás tu nota vigesimal al entregar.</p>
      ${htmlContinuar('simulacro')}

      <div class="campo mt-m">${segmentosExamen(cfg.examen)}</div>

      <div class="campo">
        <span class="rotulo">Preguntas</span>
        <div class="chips" role="group" aria-label="Número de preguntas">${opcionesN.map((v) =>
    `<button type="button" class="chip" data-accion="n" data-valor="${v}" aria-pressed="${n === v}">${v}</button>`).join('')}</div>
      </div>

      <div class="campo">
        <span class="rotulo">Tiempo</span>
        <div class="chips" role="group" aria-label="Minutos">${opcionesM.map((v) =>
    `<button type="button" class="chip" data-accion="min" data-valor="${v}" aria-pressed="${!sinTiempo && minutos === v}">${v} min</button>`).join('')}
          <button type="button" class="chip" data-accion="sin-tiempo" aria-pressed="${sinTiempo}">Sin tiempo</button>
        </div>
      </div>

      ${varias ? `<div class="campo">
        <span class="rotulo">Composición</span>
        ${segmentos([{ valor: 'examen', texto: 'Como el examen' }, { valor: 'seleccion', texto: 'Solo fuentes seleccionadas' }], cfg.composicion, 'composicion', 'Composición')}
        ${cfg.composicion === 'seleccion' ? `<div class="chips mt-m" role="group" aria-label="Fuentes del simulacro">${fs.map((f) =>
    `<button type="button" class="chip" data-accion="fuente" data-valor="${esc(f.sigla)}" aria-pressed="${(cfg.fuentes || []).includes(f.sigla)}" title="${esc(f.nombre)}">${esc(siglaCorta(f.sigla))}</button>`).join('')}</div>` : ''}
      </div>` : `<div class="campo"><span class="rotulo">Composición</span><p class="peq atenuado" style="margin:0">${cfg.examen === 'maplo'
      ? 'Como el examen: 60 % preguntas del cuestionario oficial y 40 % generadas, con máximo 3 por tema.'
      : 'Como el examen: mezcla de dificultad 35/40/25 y máximo 3 preguntas por tema.'}</p></div>`}

      ${htmlReparto()}

      <div class="pie-fijo">
        <div class="pie-texto"><strong>${n} preguntas${sinTiempo ? ', sin tiempo' : `, ${minutos} min`}</strong> ${plural(disponiblesN, 'disponible', 'disponibles')} en ${esc(examenNombre(cfg.examen))}</div>
        <button type="button" class="btn btn-primario" data-accion="empezar" ${disponiblesN ? '' : 'disabled'}>${icono('simulacro', { tam: 20 })}Empezar</button>
      </div>

      ${htmlHistorial()}`;
  }

  async function empezar() {
    const p = pool();
    if (!p.length) { toast('Elige al menos una fuente.', { tipo: 'error' }); return; }
    if (sesionEnCurso('simulacro')) {
      const ok = await confirmar({
        titulo: 'Ya tienes un simulacro en curso',
        texto: '¿Descartarlo y empezar uno nuevo? Sus respuestas no se calificarán.',
        aceptar: 'Empezar nuevo', peligro: true,
      });
      if (!ok) return;
    }
    const preguntas = componerSimulacro({
      examen: cfg.examen,
      n,
      pool: p,
      fuentes: fuentesComposicion(),
      recientes: idsRecientes(estado.sims, cfg.examen, 2),
    });
    if (preguntas.length < n) toast(`Solo hay ${preguntas.length} preguntas compatibles con esa configuración.`, { tipo: 'info' });
    iniciarSimulacro({
      examen: cfg.examen,
      ids: preguntas.map((q) => q.id),
      limiteSeg: sinTiempo ? null : minutos * 60,
      composicion: cfg.composicion === 'seleccion' && fuentesExamen().length > 1 ? 'seleccion' : 'examen',
    });
    navegar('/simulacro/examen');
  }

  async function alClic(e) {
    const b = e.target.closest('[data-accion]');
    if (!b) return;
    if (await manejarContinuar(b, pintar)) return;
    const v = b.dataset.valor;
    switch (b.dataset.accion) {
      case 'examen':
        cfg.examen = v;
        // Al cambiar de examen, «solo fuentes seleccionadas» parte con todas sus fuentes marcadas.
        if (cfg.composicion === 'seleccion') cfg.fuentes = fuentesExamen().map((f) => f.sigla);
        break;
      case 'n': n = Number(v); break;
      case 'min': minutos = Number(v); sinTiempo = false; break;
      case 'sin-tiempo': sinTiempo = !sinTiempo; break;
      case 'composicion':
        cfg.composicion = v;
        if (v === 'seleccion' && !(cfg.fuentes || []).length) cfg.fuentes = fuentesExamen().map((f) => f.sigla);
        break;
      case 'fuente': {
        const set = new Set(cfg.fuentes || []);
        if (set.has(v)) set.delete(v); else set.add(v);
        cfg.fuentes = [...set];
        break;
      }
      case 'ver-todo': verTodo = true; break;
      case 'empezar': await empezar(); return;
      default: return;
    }
    guardar();
    const y = window.scrollY;
    pintar();
    window.scrollTo(0, y);
  }

  pintar();
  raiz.addEventListener('click', alClic);
  return () => raiz.removeEventListener('click', alClic);
}
