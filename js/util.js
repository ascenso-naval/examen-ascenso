// util.js — Utilidades generales sin dependencias del DOM:
// fechas locales (AAAA-MM-DD), azar con semilla, barajado, formato de números y texto.

/** Escapa texto para insertarlo con seguridad en plantillas HTML. */
export function esc(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// ---------------------------------------------------------------------------
// Fechas (siempre en hora local del dispositivo)
// ---------------------------------------------------------------------------

/** Fecha local en formato ISO corto «AAAA-MM-DD». */
export function hoyISO(fecha = new Date()) {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Convierte «AAAA-MM-DD» en un Date a medianoche local. */
export function deISO(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Suma (o resta) días a una fecha ISO corta. */
export function sumarDias(iso, n) {
  const f = deISO(iso);
  f.setDate(f.getDate() + n);
  return hoyISO(f);
}

/** Días enteros entre dos fechas ISO cortas (b − a). Redondea para tolerar cambios de horario. */
export function diasEntre(a, b) {
  return Math.round((deISO(b) - deISO(a)) / 86400000);
}

/** Lunes (ISO corto) de la semana que contiene la fecha dada. */
export function lunesDe(iso) {
  const f = deISO(iso);
  const dia = (f.getDay() + 6) % 7; // 0 = lunes … 6 = domingo
  f.setDate(f.getDate() - dia);
  return hoyISO(f);
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'setiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export const nombreMes = (i) => MESES[i];

/** «5 oct» */
export function fmtFechaCorta(isoOFecha) {
  const f = isoOFecha instanceof Date ? isoOFecha
    : (String(isoOFecha).length > 10 ? new Date(isoOFecha) : deISO(isoOFecha));
  return `${f.getDate()} ${MESES[f.getMonth()]}`;
}

/** «domingo 5 de octubre» */
export function fmtFechaLarga(iso) {
  const f = deISO(iso);
  return `${DIAS[f.getDay()]} ${f.getDate()} de ${MESES_LARGOS[f.getMonth()]}`;
}

/** «5 oct, 18:42» a partir de milisegundos o ISO completo. */
export function fmtFechaHora(valor) {
  const f = new Date(valor);
  const hh = String(f.getHours()).padStart(2, '0');
  const mm = String(f.getMinutes()).padStart(2, '0');
  return `${f.getDate()} ${MESES[f.getMonth()]}, ${hh}:${mm}`;
}

// ---------------------------------------------------------------------------
// Azar reproducible
// ---------------------------------------------------------------------------

/** Hash FNV-1a de 32 bits de un texto (semilla para mulberry32). */
export function hashTexto(texto) {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Generador pseudoaleatorio mulberry32: devuelve una función que produce [0, 1). */
export function mulberry32(semilla) {
  let a = semilla >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Copia barajada (Fisher-Yates) de un arreglo. */
export function barajar(arreglo, rng = Math.random) {
  const a = arreglo.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Identificador corto y único (sesiones, simulacros). */
export function nuevoId(prefijo = '') {
  return prefijo + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
}

// ---------------------------------------------------------------------------
// Control de frecuencia
// ---------------------------------------------------------------------------

/** Debounce con métodos flush() y cancel(). */
export function debounce(fn, ms) {
  let t = null;
  const envuelta = (...args) => {
    clearTimeout(t);
    t = setTimeout(() => { t = null; fn(...args); }, ms);
  };
  envuelta.flush = () => { if (t !== null) { clearTimeout(t); t = null; fn(); } };
  envuelta.cancel = () => { clearTimeout(t); t = null; };
  envuelta.pendiente = () => t !== null;
  return envuelta;
}

// ---------------------------------------------------------------------------
// Formato
// ---------------------------------------------------------------------------

const formatoNumero = new Intl.NumberFormat('es-PE');
const formatoDecimal = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const fmtNum = (n) => formatoNumero.format(n);
/** Nota vigesimal con un decimal. */
export const fmtNota = (n) => formatoDecimal.format(n);
/** Porcentaje entero «78 %». */
export const fmtPct = (x) => `${Math.round(x * 100)} %`;

/** Reloj «mm:ss» o «h:mm:ss». */
export function fmtReloj(segundos) {
  const s = Math.max(0, Math.ceil(segundos));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${String(m).padStart(2, '0')}:${ss}`;
}

/** Duración legible «4 min 12 s», «1 h 05 min». */
export function fmtDuracion(segundos) {
  const s = Math.max(0, Math.round(segundos));
  if (s < 60) return `${s} s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h} h ${String(m).padStart(2, '0')} min`;
  return `${m} min ${String(s % 60).padStart(2, '0')} s`;
}

/** «1 pregunta» / «3 preguntas» */
export function plural(n, uno, varios) {
  return `${fmtNum(n)} ${n === 1 ? uno : varios}`;
}

/** Minúsculas sin tildes ni signos, para búsquedas. */
export function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** Sigla abreviada para chips: «PERMAR-13016» → «PERMAR»; «INGLES» → «Inglés». */
export function siglaCorta(sigla) {
  if (sigla === 'INGLES') return 'Inglés';
  return String(sigla).replace(/-\d+$/, '');
}

/** Referencia corta para el chip de la pregunta: «Art. 201», «Anexo E» o el inicio del texto. */
export function refCorta(referencia) {
  const r = String(referencia || '');
  const art = r.match(/\bart(?:[íi]culo|\.)?\s*([\dIVXLC]+)/i);
  if (art) return `Art. ${art[1]}`;
  const anexo = r.match(/Anexo\s*«?([A-Z])»?/);
  if (anexo) return `Anexo ${anexo[1]}`;
  const primero = r.split(',')[0].trim();
  return primero.length > 30 ? `${primero.slice(0, 28)}…` : primero;
}

/** Limita un número a un rango. */
export const limitar = (x, min, max) => Math.min(max, Math.max(min, x));

/** Hora local (0-23) de una marca de tiempo. */
export const horaDe = (ms) => new Date(ms).getHours();
