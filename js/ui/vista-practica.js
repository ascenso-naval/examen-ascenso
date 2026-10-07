// vista-practica.js — Configuración de la práctica: examen, fuentes, artículos/temas,
// dificultad, cantidad y orden (aleatorio / no vistas / débiles).

import { estado, guardar } from '../estado.js';
import { D, disponibles, disponiblesFuente, disponiblesGrupo, fuentesDe, etiquetaGrupos, examenNombre, referenciaUtil } from '../datos.js';
import { esc, fmtNum, siglaCorta, plural } from '../util.js';
import { seleccionarPractica } from '../seleccion.js';
import { resumen } from '../estadisticas.js';
import { dominioDeGrupo } from '../consultas.js';
import { icono } from './iconos.js';
import { segmentosExamen, segmentos, codigoGrupo, pctOGuion } from './comun.js';
import { htmlContinuar, manejarContinuar } from './continuar.js';
import { arrancarPractica } from './arranque.js';
import { toast } from './toast.js';

const ORDENES = [
  { valor: 'aleatorio', texto: 'Aleatorio', ayuda: 'Preguntas al azar entre las disponibles.' },
  { valor: 'no_vistas', texto: 'No vistas', ayuda: 'Primero las que nunca respondiste; luego el resto.' },
  { valor: 'debiles', texto: 'Débiles', ayuda: 'Más peso a las falladas (×4) y a las no vistas (×3); menos a las acertadas hace poco (×0.5).' },
];
const CANTIDADES = [10, 20, 40];

/** Normaliza la configuración guardada contra los datos actuales. */
function configuracion() {
  const cfg = estado.config.practica;
  if (!D.examenPorId.has(cfg.examen)) cfg.examen = D.examenes[0].id;
  const siglas = new Set(fuentesDe(cfg.examen).map((f) => f.sigla));
  cfg.fuentes = (cfg.fuentes || []).filter((s) => siglas.has(s));
  if (cfg.fuentes.length === siglas.size) cfg.fuentes = [];
  cfg.grupos = (cfg.grupos || []).filter((k) => {
    const g = D.grupoPorClave.get(k);
    return g && g.examen === cfg.examen && (!cfg.fuentes.length || cfg.fuentes.includes(g.fuente));
  });
  if (![0, 1, 2, 3].includes(cfg.dificultad)) cfg.dificultad = 0;
  if (![0, ...CANTIDADES].includes(cfg.cantidad)) cfg.cantidad = 10;
  if (!ORDENES.some((o) => o.valor === cfg.orden)) cfg.orden = 'aleatorio';
  return cfg;
}

/** Preguntas candidatas según la configuración. */
export function poolPractica(cfg) {
  let pool = disponibles(cfg.examen, estado.ajustes);
  if (cfg.fuentes.length) {
    const set = new Set(cfg.fuentes);
    pool = pool.filter((q) => set.has(q.fuente));
  }
  if (cfg.grupos.length) {
    const set = new Set(cfg.grupos);
    pool = pool.filter((q) => set.has(q._g.clave));
  }
  if (cfg.dificultad) pool = pool.filter((q) => q.dificultad === cfg.dificultad);
  return pool;
}

function tituloSesion(cfg) {
  const base = examenNombre(cfg.examen);
  if (cfg.grupos.length === 1) {
    const g = D.grupoPorClave.get(cfg.grupos[0]);
    return `${base}: ${g.tipo === 'tema' ? g.titulo : `${siglaCorta(g.fuente)} ${codigoGrupo(g)}`}`;
  }
  if (cfg.grupos.length > 1) return `${base}: ${cfg.grupos.length} ${etiquetaGrupos(D.fuentePorSigla.get(D.grupoPorClave.get(cfg.grupos[0]).fuente))}`;
  if (cfg.fuentes.length === 1) return `${base}: ${siglaCorta(cfg.fuentes[0])}`;
  if (cfg.fuentes.length > 1) return `${base}: ${cfg.fuentes.length} fuentes`;
  return base;
}

function filasGrupos(cfg) {
  const fuentes = fuentesDe(cfg.examen).filter((f) => !cfg.fuentes.length || cfg.fuentes.includes(f.sigla));
  const seleccion = new Set(cfg.grupos);
  const varias = fuentes.length > 1;
  return fuentes.map((f) => {
    const grupos = f.grupos.filter((g) => disponiblesGrupo(g.clave, estado.ajustes).length);
    if (!grupos.length) return '';
    const cab = varias || f.tipoGrupos === 'articulo'
      ? `<div class="fuente-cabeza"><span>${esc(siglaCorta(f.sigla))}</span><span class="atenuado">${esc(f.nombre)}</span></div>` : '';
    return cab + grupos.map((g) => {
      const qs = disponiblesGrupo(g.clave, estado.ajustes);
      const r = resumen(qs, estado.p);
      const codigo = codigoGrupo(g);
      return `<label class="item-fila">
        <input type="checkbox" data-grupo="${esc(g.clave)}" ${seleccion.has(g.clave) ? 'checked' : ''}>
        <span class="fila-cuerpo">
          <span class="fila-titulo">${codigo ? `<span class="etiqueta item-codigo">${esc(codigo)}</span> ` : ''}${esc(g.titulo)}</span>
          ${referenciaUtil(g) ? `<span class="fila-sub">${esc(referenciaUtil(g))}</span>` : ''}
          <span class="fila-sub">${plural(qs.length, 'pregunta', 'preguntas')}, dominio ${pctOGuion(r.dominio)}</span>
        </span>
      </label>`;
    }).join('');
  }).join('');
}

export function montar(raiz) {
  const cfg = configuracion();
  let gruposAbiertos = cfg.grupos.length > 0;

  function textoDisponibles() {
    const pool = poolPractica(cfg);
    const n = pool.length;
    const enSesion = cfg.cantidad ? Math.min(cfg.cantidad, n) : n;
    return { n, html: `<strong>${plural(n, 'pregunta disponible', 'preguntas disponibles')}</strong> ${n ? `La sesión tendrá hasta ${fmtNum(enSesion)}` : 'Cambia los filtros'}` };
  }

  function pintar() {
    const fuentes = fuentesDe(cfg.examen).filter((f) => disponiblesFuente(f.sigla, estado.ajustes).length);
    const etq = etiquetaGrupos(fuentes[0]);
    const disp = textoDisponibles();
    const ayudaOrden = ORDENES.find((o) => o.valor === cfg.orden).ayuda;
    raiz.innerHTML = `
      <h1>Práctica</h1>
      <p class="sub">Responde y recibe la explicación al instante.</p>
      ${htmlContinuar('practica')}

      <div class="campo mt-m">${segmentosExamen(cfg.examen)}</div>

      ${fuentes.length > 1 ? `<div class="campo">
        <span class="rotulo">Fuentes</span>
        <div class="chips" role="group" aria-label="Fuentes">
          <button type="button" class="chip" data-accion="fuente" data-valor="" aria-pressed="${!cfg.fuentes.length}">Todas</button>
          ${fuentes.map((f) => `<button type="button" class="chip" data-accion="fuente" data-valor="${esc(f.sigla)}"
            aria-pressed="${cfg.fuentes.includes(f.sigla)}" title="${esc(f.nombre)}">${esc(siglaCorta(f.sigla))}
            <span class="cuenta">${fmtNum(disponiblesFuente(f.sigla, estado.ajustes).length)}</span></button>`).join('')}
        </div>
      </div>` : ''}

      <details class="desplegable campo" id="grupos" ${gruposAbiertos ? 'open' : ''}>
        <summary>${icono('libro', { tam: 20 })}<span>Elegir ${etq}${cfg.grupos.length ? ` <span class="etiqueta etiqueta-oro">${cfg.grupos.length}</span>` : ''}</span>${icono('chev-abajo', { clase: 'chev', tam: 20 })}</summary>
        <div class="desplegable-cuerpo" id="lista-grupos">${gruposAbiertos ? filasGrupos(cfg) : ''}</div>
        <div class="fila-flex" style="padding:10px 16px;border-top:1px solid var(--borde)">
          <span class="mini" style="flex:1">Sin selección se usan todos.</span>
          <button type="button" class="btn btn-fantasma btn-chico" data-accion="limpiar-grupos">Quitar selección</button>
        </div>
      </details>

      <div class="campo">
        <span class="rotulo">Dificultad</span>
        ${segmentos([{ valor: 0, texto: 'Todas' }, { valor: 1, texto: 'Fácil' }, { valor: 2, texto: 'Media' }, { valor: 3, texto: 'Difícil' }], cfg.dificultad, 'dificultad', 'Dificultad')}
      </div>

      <div class="campo">
        <span class="rotulo">Cantidad</span>
        <div class="chips" role="group" aria-label="Cantidad">
          ${CANTIDADES.map((c) => `<button type="button" class="chip" data-accion="cantidad" data-valor="${c}" aria-pressed="${cfg.cantidad === c}">${c}</button>`).join('')}
          <button type="button" class="chip" data-accion="cantidad" data-valor="0" aria-pressed="${cfg.cantidad === 0}">Todas <span class="cuenta" id="cuenta-todas">${fmtNum(disp.n)}</span></button>
        </div>
      </div>

      <div class="campo">
        <span class="rotulo">Orden</span>
        ${segmentos(ORDENES, cfg.orden, 'orden', 'Orden')}
        <span class="ayuda">${esc(ayudaOrden)}</span>
      </div>

      <div class="pie-fijo">
        <div class="pie-texto" id="pie-texto" aria-live="polite">${disp.html}</div>
        <button type="button" class="btn btn-primario" data-accion="empezar" ${disp.n ? '' : 'disabled'}>${icono('play', { tam: 20 })}Empezar</button>
      </div>`;
  }

  function actualizarPie() {
    const disp = textoDisponibles();
    const pie = raiz.querySelector('#pie-texto');
    if (pie) pie.innerHTML = disp.html;
    const cuenta = raiz.querySelector('#cuenta-todas');
    if (cuenta) cuenta.textContent = fmtNum(disp.n);
    const b = raiz.querySelector('[data-accion="empezar"]');
    if (b) b.disabled = !disp.n;
  }

  async function alClic(e) {
    const b = e.target.closest('[data-accion]');
    if (!b) return;
    if (await manejarContinuar(b, pintar)) return;
    const v = b.dataset.valor;
    switch (b.dataset.accion) {
      case 'examen':
        if (cfg.examen !== v) { cfg.examen = v; cfg.fuentes = []; cfg.grupos = []; gruposAbiertos = false; }
        break;
      case 'fuente': {
        if (!v) cfg.fuentes = [];
        else if (cfg.fuentes.includes(v)) cfg.fuentes = cfg.fuentes.filter((s) => s !== v);
        else cfg.fuentes = [...cfg.fuentes, v];
        if (cfg.fuentes.length === fuentesDe(cfg.examen).length) cfg.fuentes = [];
        cfg.grupos = cfg.grupos.filter((k) => !cfg.fuentes.length || cfg.fuentes.includes(D.grupoPorClave.get(k)?.fuente));
        break;
      }
      case 'limpiar-grupos':
        cfg.grupos = [];
        break;
      case 'dificultad': cfg.dificultad = Number(v); break;
      case 'cantidad': cfg.cantidad = Number(v); break;
      case 'orden': cfg.orden = v; break;
      case 'empezar': {
        const pool = poolPractica(cfg);
        const ids = seleccionarPractica(pool, {
          cantidad: cfg.cantidad,
          orden: cfg.orden,
          stats: estado.p,
          dominioGrupo: dominioDeGrupo(),
        }).map((q) => q.id);
        guardar();
        const esperadas = cfg.cantidad ? Math.min(cfg.cantidad, pool.length) : pool.length;
        const ok = await arrancarPractica({ tipo: 'practica', examen: cfg.examen, ids, titulo: tituloSesion(cfg), config: { ...cfg } });
        if (ok && ids.length < esperadas) {
          const n = esperadas - ids.length;
          toast(`Se ${n === 1 ? 'omitió 1 pregunta que revela' : `omitieron ${n} preguntas que revelan`} la respuesta de otras de esta sesión.`, { icono: 'info' });
        }
        return;
      }
      default: return;
    }
    guardar();
    const y = window.scrollY;
    pintar();
    window.scrollTo(0, y);
  }

  function alCambiar(e) {
    const cb = e.target.closest('input[data-grupo]');
    if (!cb) return;
    const k = cb.dataset.grupo;
    cfg.grupos = cb.checked ? [...new Set([...cfg.grupos, k])] : cfg.grupos.filter((x) => x !== k);
    guardar();
    const summary = raiz.querySelector('#grupos summary span');
    if (summary) {
      const etq = etiquetaGrupos(fuentesDe(cfg.examen)[0]);
      summary.innerHTML = `Elegir ${etq}${cfg.grupos.length ? ` <span class="etiqueta etiqueta-oro">${cfg.grupos.length}</span>` : ''}`;
    }
    actualizarPie();
  }

  function alDesplegar(e) {
    if (e.target.id !== 'grupos') return;
    gruposAbiertos = e.target.open;
    const cont = raiz.querySelector('#lista-grupos');
    if (gruposAbiertos && cont && !cont.children.length) cont.innerHTML = filasGrupos(cfg);
  }

  pintar();
  raiz.addEventListener('click', alClic);
  raiz.addEventListener('change', alCambiar);
  raiz.addEventListener('toggle', alDesplegar, true);
  return () => {
    raiz.removeEventListener('click', alClic);
    raiz.removeEventListener('change', alCambiar);
    raiz.removeEventListener('toggle', alDesplegar, true);
  };
}
