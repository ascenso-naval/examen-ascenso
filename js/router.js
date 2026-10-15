// router.js — Enrutador por hash (#/inicio, #/practica, …) compatible con GitHub Pages.
// Cada ruta define `montar(raiz, params)` y puede devolver una función de limpieza.

import { esc } from './util.js';
import { cerrarTodas } from './ui/modal.js';

const rutas = [];
let raiz = null;
let guardia = null;
let actual = { limpiar: null, ruta: null, camino: '' };

/**
 * @param {{patron:string, montar:Function, nav?:string, sesion?:boolean}[]} lista
 *   patron admite parámetros «:nombre», p. ej. '/explorar/:examen/:fuente'.
 */
export function definirRutas(lista) {
  rutas.length = 0;
  rutas.push(...lista);
}

function coincidir(camino) {
  const partes = camino.split('/').filter(Boolean);
  for (const r of rutas) {
    const pp = r.patron.split('/').filter(Boolean);
    if (pp.length !== partes.length) continue;
    const params = {};
    let ok = true;
    for (let i = 0; i < pp.length; i++) {
      if (pp[i].startsWith(':')) {
        try { params[pp[i].slice(1)] = decodeURIComponent(partes[i]); } catch { ok = false; break; }
      } else if (pp[i] !== partes[i]) { ok = false; break; }
    }
    if (ok) return { ruta: r, params };
  }
  return null;
}

/**
 * Guardia de navegación: fn(camino, ruta) devuelve otro camino para desviar (p. ej. '/inicio'
 * cuando la prueba gratis está agotada y la ruta es de estudio) o null para seguir.
 */
export function definirGuardia(fn) { guardia = typeof fn === 'function' ? fn : null; }

/** Camino actual sin «#», p. ej. «/practica/sesion». */
export const caminoActual = () => (location.hash.replace(/^#/, '') || '/inicio').split('?')[0];

/** Navega a un camino; con `reemplazar` no crea entrada en el historial. */
export function navegar(camino, { reemplazar = false } = {}) {
  const hash = `#${camino}`;
  if (location.hash === hash) { resolver(); return; }
  if (reemplazar) {
    history.replaceState(history.state, '', hash);
    resolver();
  } else {
    location.hash = hash;
  }
}

/** Vuelve a pintar la vista actual (p. ej. tras importar progreso). */
export function refrescar() { resolver(); }

function marcarNav(nav) {
  document.querySelectorAll('.nav a[data-nav]').forEach((a) => {
    if (a.dataset.nav === nav) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

function resolver() {
  // [1.5.1 · ronda 2] El enrutador aún no se montó (main.js espera la verificación del acceso
  // antes de montarlo): nada que pintar todavía; al montarlo se resuelve la ruta actual.
  if (!raiz) return;
  const completo = location.hash.replace(/^#/, '') || '/inicio';
  const [camino, consulta] = completo.split('?');
  const m = coincidir(camino);
  if (!m) { navegar('/inicio', { reemplazar: true }); return; }
  if (guardia) {
    let desvio = null;
    try { desvio = guardia(camino, m.ruta); } catch (e) { console.error(e); }
    if (desvio && desvio !== camino) { navegar(desvio, { reemplazar: true }); return; }
  }
  cerrarTodas();
  if (actual.limpiar) {
    try { actual.limpiar(); } catch (e) { console.error(e); }
  }
  actual = { limpiar: null, ruta: m.ruta, camino };
  document.body.classList.toggle('en-sesion', !!m.ruta.sesion);
  marcarNav(m.ruta.nav);
  raiz.innerHTML = '';
  window.scrollTo(0, 0);
  const params = { ...m.params, ...Object.fromEntries(new URLSearchParams(consulta || '')) };
  try {
    actual.limpiar = m.ruta.montar(raiz, params) || null;
  } catch (e) {
    console.error(e);
    raiz.innerHTML = `<div class="vacio"><h3>Algo salió mal al abrir esta pantalla</h3><p>${esc(e.message || e)}</p><a class="btn btn-primario" href="#/inicio">Ir a Inicio</a></div>`;
  }
  const h1 = raiz.querySelector('h1');
  if (h1) {
    h1.setAttribute('tabindex', '-1');
    try { h1.focus({ preventScroll: true }); } catch { /* sin foco */ }
  }
}

export function iniciarRouter(contenedor) {
  raiz = contenedor;
  window.addEventListener('hashchange', resolver);
  resolver();
}
