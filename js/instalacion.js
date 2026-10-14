// instalacion.js — Lógica de «Instalar con un toque»: ¿la app ya está instalada?, ¿qué
// plataforma y navegador?, captura temprana de `beforeinstallprompt` (Android/Chrome, Edge,
// Samsung Internet) y la preferencia «Seguir en el navegador» (7 días, en localStorage).
// La interfaz está en ui/instalar.js.

const CLAVE = 'ascenso2026:instalar';
export const DIAS_POSPUESTO = 7;
const DIA_MS = 86400000;

let eventoInstalar = null;          // BeforeInstallPromptEvent guardado (o null)
const oyentes = new Set();

function avisar(tipo) {
  for (const fn of oyentes) {
    try { fn(tipo); } catch (e) { console.warn('instalacion:', e); }
  }
}

// Se escucha desde la carga del módulo (main.js lo importa primero) para no perder el evento.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  eventoInstalar = e;
  avisar('disponible');
});
window.addEventListener('appinstalled', () => {
  eventoInstalar = null;
  posponer();                       // en el navegador ya no hace falta insistir
  avisar('instalada');
});

/** Suscribe a 'disponible' | 'instalada'. Devuelve la función para desuscribirse. */
export function alCambiar(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

export const hayEvento = () => !!eventoInstalar;

/** ¿Se está ejecutando como app instalada (pantalla de inicio)? */
export function estaInstalada() {
  try {
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
  } catch { /* sin matchMedia */ }
  return window.navigator.standalone === true;
}

/**
 * Plataforma y navegador.
 * @returns {{so:'ios'|'android'|'escritorio', navegador:string, ipad:boolean, enApp:boolean}}
 */
export function plataforma(ua = navigator.userAgent || '') {
  const ipadOS = /Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1;
  const ios = /iPhone|iPad|iPod/.test(ua) || ipadOS;
  const ipad = /iPad/.test(ua) || ipadOS;
  const enApp = /FBAN|FBAV|FB_IAB|Instagram|Line\/|; wv\)/.test(ua);
  if (ios) {
    let navegador = 'safari';
    if (/CriOS/.test(ua)) navegador = 'chrome';
    else if (/FxiOS/.test(ua)) navegador = 'firefox';
    else if (/EdgiOS/.test(ua)) navegador = 'edge';
    else if (enApp || !/Safari\//.test(ua)) navegador = 'otro';
    return { so: 'ios', navegador, ipad, enApp };
  }
  if (/Android|Mobi/.test(ua)) {
    let navegador = 'chrome';
    if (/SamsungBrowser/.test(ua)) navegador = 'samsung';
    else if (/EdgA/.test(ua)) navegador = 'edge';
    else if (/Firefox/.test(ua)) navegador = 'firefox';
    else if (/OPR\//.test(ua)) navegador = 'opera';
    return { so: 'android', navegador, ipad: false, enApp };
  }
  return { so: 'escritorio', navegador: /Edg\//.test(ua) ? 'edge' : 'otro', ipad: false, enApp: false };
}

function leer() {
  try { return JSON.parse(localStorage.getItem(CLAVE) || 'null') || {}; } catch { return {}; }
}

/** «Seguir en el navegador»: no volver a mostrar la pantalla durante 7 días. */
export function posponer(ahora = Date.now()) {
  try { localStorage.setItem(CLAVE, JSON.stringify({ hasta: ahora + DIAS_POSPUESTO * DIA_MS })); } catch { /* sin almacenamiento */ }
}

export function pospuestaHasta() {
  const h = Number(leer().hasta);
  return Number.isFinite(h) ? h : 0;
}

/** ¿Mostrar la pantalla de instalación al abrir? */
export function debeMostrar(ahora = Date.now()) {
  return !estaInstalada() && pospuestaHasta() <= ahora;
}

/**
 * Abre el diálogo nativo de instalación (solo si llegó `beforeinstallprompt`).
 * @returns {Promise<'accepted'|'dismissed'|'sin-evento'>}
 */
export async function instalar() {
  const e = eventoInstalar;
  if (!e) return 'sin-evento';
  eventoInstalar = null;            // el evento solo se puede usar una vez
  await e.prompt();
  let eleccion = null;
  try { eleccion = await e.userChoice; } catch { /* sin respuesta */ }
  return eleccion && eleccion.outcome === 'accepted' ? 'accepted' : 'dismissed';
}

/** Dirección de la app (sin parámetros ni hash), para abrirla en el celular. */
export function enlaceApp() {
  return `${location.origin}${location.pathname.replace(/index\.html$/, '')}`;
}
