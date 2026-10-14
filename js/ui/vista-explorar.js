// vista-explorar.js — Estudiar por artículo: árbol examen → fuente → ítem (artículo/tema),
// fichas (tocar para revelar la respuesta y la explicación) y buscador de texto.
//
// [1.3.0] Prueba gratis: revelar una ficha consume la prueba como una respuesta (evento
// 'respuesta-registrada' con modo 'explorar'), una sola vez por pregunta por sesión de
// exploración (mientras no se salga de Explorar). Durante la prueba se muestra un aviso
// discreto; con la prueba agotada el enrutador desvía /explorar (ver main.js → definirGuardia).

import { estado, statDe, guardar } from '../estado.js';
import { D, disponiblesFuente, disponiblesGrupo, fuentesDe, etiquetaGrupos, examenNombre, buscar, referenciaUtil } from '../datos.js';
import { esc, fmtNum, plural, siglaCorta, refCorta, hoyISO, debounce } from '../util.js';
import { resumen } from '../estadisticas.js';
import { marcar, desmarcar } from '../srs.js';
import { seleccionarPractica } from '../seleccion.js';
import { navegar } from '../router.js';
import { icono } from './iconos.js';
import { cabecera, segmentosExamen, medidor, vacio, chipFuente, codigoGrupo } from './comun.js';
import { arrancarPractica } from './arranque.js';
import { toast } from './toast.js';
import { emitir } from '../bus.js';
import * as acceso from '../acceso.js';

let examenActual = 'reglamentos';
let textoBusqueda = '';
let limiteResultados = 40;
/** Preguntas ya reveladas (y contadas) en esta sesión de exploración. */
const reveladas = new Set();

/** Aviso discreto mientras dura la prueba gratis (no se muestra a pagado/cortesía/admin). */
function htmlAvisoPrueba() {
  if (!acceso.enPrueba() || acceso.agotado()) return '';
  return `<p class="indicador-prueba aviso-explorar" id="aviso-explorar">${icono('info', { tam: 16 })}<span>Cada respuesta que reveles cuenta para tu prueba gratis</span></p>`;
}

const ruta = (...partes) => `/explorar/${partes.map((p) => encodeURIComponent(p)).join('/')}`;

/** Ficha de estudio: se toca para revelar la respuesta correcta y la explicación. */
function htmlFicha(q, abierta = false) {
  const st = estado.p[q.id];
  const marcada = !!(st && st.m);
  return `<article class="ficha" data-id="${esc(q.id)}" data-abierta="${abierta ? 1 : 0}">
    <button type="button" class="ficha-cabeza" data-accion="revelar" aria-expanded="${abierta}">
      <span class="pregunta-meta">${chipFuente(q.fuente)}<span class="etiqueta">${esc(refCorta(q.referencia))}</span>
        ${st && st.n ? `<span class="etiqueta ${st.h.endsWith('1') ? 'etiqueta-ok' : 'etiqueta-mal'}">${st.h.endsWith('1') ? 'Acertada' : 'Fallada'}</span>` : ''}</span>
      <span class="ficha-pregunta">${esc(q.pregunta)}</span>
      <span class="ficha-pista">${icono('ojo', { tam: 16 })}Toca para ver la respuesta</span>
    </button>
    <div class="ficha-respuesta" ${abierta ? '' : 'hidden'}>
      <p class="ficha-correcta">${icono('check', { tam: 18 })}<span>${esc(q.opciones[q.correcta])}</span></p>
      <p class="explicacion">${esc(q.explicacion)}</p>
      <p class="referencia">${icono('libro', { tam: 16 })}<span>${esc(q.referencia)}<br>${esc(q.fuente_nombre || q.fuente)} (${esc(q.fuente)})</span></p>
      <div class="ficha-acciones">
        <button type="button" class="btn btn-borde btn-chico" data-accion="bandera" aria-pressed="${marcada}">${icono('bandera', { tam: 18 })}<span>${marcada ? 'Marcada' : 'Marcar para repaso'}</span></button>
      </div>
    </div>
  </article>`;
}

function filaGrupo(examen, f, g) {
  const qs = disponiblesGrupo(g.clave, estado.ajustes);
  if (!qs.length) return '';
  const r = resumen(qs, estado.p);
  const codigo = codigoGrupo(g);
  return `<li><a class="fila" href="#${ruta(examen, f.sigla, g.codigo)}">
    <span class="fila-cuerpo">
      <span class="fila-titulo">${codigo ? `<span class="etiqueta item-codigo">${esc(codigo)}</span> ` : ''}${esc(g.titulo)}</span>
      ${referenciaUtil(g) ? `<span class="fila-sub">${esc(referenciaUtil(g))}</span>` : ''}
      <span class="fila-sub">${plural(qs.length, 'pregunta', 'preguntas')}${r.vistas ? `, ${fmtNum(r.vistas)} ${r.vistas === 1 ? 'vista' : 'vistas'}` : ''}</span>
      ${medidor(r.dominio)}
    </span>${icono('chev-der', { clase: 'chev', tam: 20 })}</a></li>`;
}

function htmlResultados() {
  const { resultados, total } = buscar(textoBusqueda, estado.ajustes, limiteResultados);
  if (!total) return vacio({ icono: 'buscar', titulo: 'Sin resultados', texto: 'Prueba con otra palabra o revisa la ortografía; las tildes no importan.' });
  const grupos = new Map();
  for (const q of resultados) {
    if (!grupos.has(q.fuente)) grupos.set(q.fuente, []);
    grupos.get(q.fuente).push(q);
  }
  const orden = [...grupos.keys()].sort((a, b) => (D.fuentePorSigla.get(a)?.orden ?? 0) - (D.fuentePorSigla.get(b)?.orden ?? 0));
  return `<p class="mini" aria-live="polite">${plural(total, 'resultado', 'resultados')}${total > resultados.length ? `; se muestran ${resultados.length}` : ''}.</p>
    ${orden.map((s) => `<h3 class="grupo-resultados"><span class="etiqueta etiqueta-oro">${esc(siglaCorta(s))}</span><span>${esc(D.fuentePorSigla.get(s)?.nombre || s)}</span><span class="atenuado num">${grupos.get(s).length}</span></h3>
      ${grupos.get(s).map((q) => htmlFicha(q)).join('')}`).join('')}
    ${total > resultados.length ? '<button type="button" class="btn btn-secundario btn-bloque mt-m" data-accion="mas-resultados">Mostrar más resultados</button>' : ''}`;
}

/** Lista de la raíz: fuentes del examen (o sus temas si tiene una sola fuente). */
function htmlLista(examen) {
  const fuentes = fuentesDe(examen).filter((f) => disponiblesFuente(f.sigla, estado.ajustes).length);
  let lista;
  if (fuentes.length === 1) {
    const f = fuentes[0];
    lista = `<p class="sub mt-m">${esc(f.nombre)}: ${plural(f.grupos.length, etiquetaGrupos(f, false), etiquetaGrupos(f))}.</p>
      <ul class="lista">${f.grupos.map((g) => filaGrupo(examen, f, g)).join('')}</ul>`;
  } else {
    lista = `<ul class="lista mt-m">${fuentes.map((f) => {
      const qs = disponiblesFuente(f.sigla, estado.ajustes);
      const r = resumen(qs, estado.p);
      return `<li><a class="fila" href="#${ruta(examen, f.sigla)}">
        <span class="fila-cuerpo"><span class="fila-titulo">${esc(f.nombre)}</span>
        <span class="fila-sub">${esc(f.sigla)}: ${plural(f.grupos.filter((g) => g.tipo !== 'otros').length, etiquetaGrupos(f, false), etiquetaGrupos(f))}, ${fmtNum(qs.length)} preguntas${r.vistas ? `, ${fmtNum(r.vistas)} vistas` : ''}</span>
        ${medidor(r.dominio)}</span>${icono('chev-der', { clase: 'chev', tam: 20 })}</a></li>`;
    }).join('')}</ul>`;
  }
  return `<div class="campo mt-m">${segmentosExamen(examen)}</div>${lista}`;
}

/** Raíz: buscador y lista (o resultados de búsqueda). */
function pintarRaiz(raiz, examen) {
  raiz.innerHTML = `
    <h1>Explorar</h1>
    <p class="sub">Estudia por artículo con fichas y practica lo que acabas de leer.</p>
    ${htmlAvisoPrueba()}
    <div class="caja-buscar">${icono('buscar', { tam: 20 })}
      <input class="entrada entrada-buscar" type="search" id="buscar" placeholder="Buscar en preguntas, explicaciones y referencias"
        aria-label="Buscar" value="${esc(textoBusqueda)}" autocomplete="off" enterkeyhint="search"></div>
    <div id="zona-explorar">${textoBusqueda.trim().length >= 2 ? htmlResultados() : htmlLista(examen)}</div>`;
}

function pintarFuente(raiz, examen, f) {
  const qs = disponiblesFuente(f.sigla, estado.ajustes);
  const r = resumen(qs, estado.p);
  raiz.innerHTML = `
    ${cabecera({ volver: ruta(examen) })}
    <h1>${esc(siglaCorta(f.sigla))}</h1>
    <p class="sub">${esc(f.nombre)}</p>
    ${htmlAvisoPrueba()}
    <section class="tarjeta">
      <div class="fila-flex entre"><span>${fmtNum(r.vistas)} de ${fmtNum(qs.length)} preguntas vistas</span><span class="atenuado">${plural(f.grupos.length, etiquetaGrupos(f, false), etiquetaGrupos(f))}</span></div>
      <div class="mt-s">${medidor(r.dominio)}</div>
    </section>
    <h2>${esc(etiquetaGrupos(f).replace(/^./, (c) => c.toUpperCase()))}</h2>
    <ul class="lista">${f.grupos.map((g) => filaGrupo(examen, f, g)).join('')}</ul>`;
}

function pintarGrupo(raiz, examen, f, g) {
  const qs = disponiblesGrupo(g.clave, estado.ajustes);
  const r = resumen(qs, estado.p);
  const singular = etiquetaGrupos(f, false);
  const una = fuentesDe(examen).length === 1;
  const codigo = codigoGrupo(g);
  raiz.innerHTML = `
    ${cabecera({ volver: una ? ruta(examen) : ruta(examen, f.sigla) })}
    <div class="pregunta-meta">${chipFuente(f.sigla)}${codigo ? `<span class="etiqueta etiqueta-oro">${esc(codigo)}</span>` : ''}</div>
    <h1 style="font-size:1.4rem;margin-top:10px">${esc(g.titulo)}</h1>
    ${referenciaUtil(g) ? `<p class="sub">${esc(referenciaUtil(g))}</p>` : ''}
    ${htmlAvisoPrueba()}
    <section class="tarjeta">
      <div class="fila-flex entre"><span>${fmtNum(r.vistas)} de ${plural(qs.length, 'pregunta vista', 'preguntas vistas')}</span></div>
      <div class="mt-s">${medidor(r.dominio)}</div>
      <div class="botones">
        <button type="button" class="btn btn-primario btn-bloque" data-accion="practicar" ${qs.length ? '' : 'disabled'}>${icono('practica', { tam: 20 })}Practicar este ${esc(singular)}</button>
        <button type="button" class="btn btn-secundario btn-bloque" data-accion="marcar-todo" ${qs.length ? '' : 'disabled'}>${icono('bandera', { tam: 20 })}Marcar todo para repaso</button>
      </div>
    </section>
    <h2>Fichas</h2>
    ${qs.length ? qs.map((q) => htmlFicha(q)).join('') : vacio({ titulo: 'Sin preguntas disponibles', texto: 'Activa el modo ampliado en Ajustes para ver las preguntas fuera del temario.' })}`;
}

export function montar(raiz, params) {
  const examen = params.examen && D.examenPorId.has(params.examen) ? params.examen : examenActual;
  examenActual = examen;
  const f = params.fuente ? D.fuentePorSigla.get(params.fuente) : null;
  const g = f && params.grupo !== undefined ? D.grupoPorClave.get(`${f.sigla}|${params.grupo}`) : null;
  if (params.fuente && !f) { navegar(ruta(examen), { reemplazar: true }); return null; }

  if (g) pintarGrupo(raiz, examen, f, g);
  else if (f) pintarFuente(raiz, examen, f);
  else pintarRaiz(raiz, examen);

  // La búsqueda solo repinta la zona de resultados (no el campo de texto).
  const repintarBusqueda = debounce(() => {
    const zona = raiz.querySelector('#zona-explorar');
    if (!zona) return;
    limiteResultados = 40;
    zona.innerHTML = textoBusqueda.trim().length >= 2 ? htmlResultados() : htmlLista(examen);
  }, 220);

  function alEscribir(e) {
    if (e.target.id !== 'buscar') return;
    textoBusqueda = e.target.value;
    repintarBusqueda();
  }

  async function alClic(e) {
    const b = e.target.closest('[data-accion]');
    if (!b) return;
    const a = b.dataset.accion;
    if (a === 'examen') { navegar(ruta(b.dataset.valor), { reemplazar: true }); return; }
    if (a === 'revelar') {
      const ficha = b.closest('.ficha');
      const abierta = ficha.dataset.abierta === '1';
      ficha.dataset.abierta = abierta ? '0' : '1';
      b.setAttribute('aria-expanded', String(!abierta));
      const resp = ficha.querySelector('.ficha-respuesta');
      resp.hidden = abierta;
      if (!abierta) {
        resp.classList.remove('recien'); void resp.offsetWidth; resp.classList.add('recien');
        // Primera vez que se revela esta pregunta en la sesión: cuenta para la prueba gratis
        // (acceso.js ignora el evento en planes exentos: pagado, cortesía y admin).
        const id = ficha.dataset.id;
        if (!reveladas.has(id)) {
          reveladas.add(id);
          emitir('respuesta-registrada', { modo: 'explorar', id });
        }
      }
      return;
    }
    if (a === 'bandera') {
      const id = b.closest('.ficha').dataset.id;
      const st = statDe(id, true);
      if (st.m) desmarcar(st); else marcar(st, hoyISO());
      guardar();
      b.setAttribute('aria-pressed', String(!!st.m));
      b.querySelector('span').textContent = st.m ? 'Marcada' : 'Marcar para repaso';
      toast(st.m ? 'Marcada: aparecerá en tu repaso de hoy.' : 'Bandera quitada.', { icono: 'bandera', tipo: st.m ? 'oro' : 'info' });
      return;
    }
    if (a === 'mas-resultados') {
      limiteResultados += 60;
      const zona = raiz.querySelector('#zona-explorar');
      const y = window.scrollY;
      zona.innerHTML = htmlResultados();
      window.scrollTo(0, y);
      return;
    }
    if (a === 'practicar' && g) {
      const qs = disponiblesGrupo(g.clave, estado.ajustes);
      const ids = seleccionarPractica(qs, { cantidad: 0, orden: 'aleatorio' }).map((q) => q.id);
      const codigo = codigoGrupo(g);
      await arrancarPractica({
        tipo: 'practica', examen, ids,
        titulo: `${siglaCorta(f.sigla)} ${codigo || g.titulo}`.trim(),
      });
      return;
    }
    if (a === 'marcar-todo' && g) {
      const hoy = hoyISO();
      let n = 0;
      for (const q of disponiblesGrupo(g.clave, estado.ajustes)) {
        const st = statDe(q.id, true);
        if (!st.m) { marcar(st, hoy); n += 1; }
      }
      guardar();
      toast(n ? `${plural(n, 'pregunta marcada', 'preguntas marcadas')} para repaso.` : 'Todas ya estaban marcadas.', { icono: 'bandera', tipo: 'oro' });
      pintarGrupo(raiz, examen, f, g);
    }
  }

  raiz.addEventListener('click', alClic);
  raiz.addEventListener('input', alEscribir);
  return () => {
    repintarBusqueda.cancel();
    // Al salir de Explorar (no al moverse dentro) termina la sesión de exploración.
    setTimeout(() => { if (!/^#\/explorar(\/|$|\?)/.test(window.location.hash)) reveladas.clear(); }, 0);
    raiz.removeEventListener('click', alClic);
    raiz.removeEventListener('input', alEscribir);
  };
}
