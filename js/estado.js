// estado.js — Estado persistente del usuario en localStorage bajo UNA sola clave
// («ascenso2026:estado»), con escritura diferida (debounce), migraciones de versión,
// exportación/importación como JSON y modo «solo memoria» si localStorage falla.
//
// Forma del estado (v1):
// {
//   app: 'ascenso2026', v: 1, creado, actualizado,
//   ajustes: {...},                       // ver AJUSTES_POR_DEFECTO
//   xp: 0,
//   p: { [idPregunta]: { n, a, h, u, s?, m?, sm? } }
//        n intentos · a aciertos · h historial «0101» (más reciente al final, máx. 10)
//        u último intento (ms) · s SRS [caja 0-5, próxima AAAA-MM-DD] · m marcada · sm SRS previo a marcar
//   dias: { 'AAAA-MM-DD': { r respondidas, a aciertos, xp, meta: 1 si se cumplió } },
//   sims: [ historial de simulacros (el más reciente al final) ],
//   logros: { [id]: fechaISO }, fuentesDominadas: { [sigla]: fechaISO },
//   cont: { sesiones, respondidas, aciertos, seguidas, mejorSeguidas, repasosAcertados, marcadasRepasadas },
//   sesiones: { practica: null|{...}, simulacro: null|{...} },  // sesiones en curso
//   ultimoResumen: null|{...}, config: { practica, simulacro }, ultimaExportacion
// }

import { debounce } from './util.js';

export const CLAVE = 'ascenso2026:estado';
export const VERSION_ESTADO = 1;

export const AJUSTES_POR_DEFECTO = Object.freeze({
  nombre: '',
  fechaExamen: '',
  metaDiaria: 30,
  notaMinima: 14,
  simMinutos: 60,
  simPreguntas: 40,
  modoAmpliado: false,
  incluirNoVerificadas: false,
  mayusculas: false,
  tema: 'auto',          // 'auto' | 'claro' | 'oscuro'
  letra: 1,              // 0 pequeña · 1 normal · 2 grande
  sonidos: true,
});

export function estadoInicial() {
  return {
    app: 'ascenso2026',
    v: VERSION_ESTADO,
    creado: new Date().toISOString(),
    actualizado: null,
    ajustes: { ...AJUSTES_POR_DEFECTO },
    xp: 0,
    p: {},
    dias: {},
    sims: [],
    logros: {},
    fuentesDominadas: {},
    cont: {
      sesiones: 0, respondidas: 0, aciertos: 0, seguidas: 0, mejorSeguidas: 0,
      repasosAcertados: 0, marcadasRepasadas: 0,
    },
    sesiones: { practica: null, simulacro: null },
    ultimoResumen: null,
    config: {
      practica: { examen: 'reglamentos', fuentes: [], grupos: [], dificultad: 0, cantidad: 10, orden: 'aleatorio' },
      simulacro: { examen: 'reglamentos', composicion: 'examen', fuentes: [] },
    },
    ultimaExportacion: null,
  };
}

/** Estado vivo. Se exporta como «live binding»: acceder siempre como `estado.x`. */
export let estado = estadoInicial();

/** Información del almacenamiento para avisar en la interfaz. */
export const almacen = { disponible: false, error: null, avisado: false, alFallar: null };

/**
 * Ganchos para la sincronización con la nube (sincronizacion.js):
 *   alEscribir(origen) se llama tras cada escritura en localStorage. origen = 'local' para
 *   los cambios del usuario y 'nube' cuando el estado viene del servidor (no marca pendiente).
 */
export const ganchos = { alEscribir: null };

function probarAlmacenamiento() {
  try {
    const k = '__ascenso2026_prueba__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

// Oyentes de cambios de estado completos (importar / reiniciar).
const oyentes = new Set();
export function alReemplazarEstado(fn) { oyentes.add(fn); return () => oyentes.delete(fn); }

/** Combina un estado leído (posiblemente antiguo o parcial) con los valores por defecto. */
export function migrar(obj) {
  if (!obj || typeof obj !== 'object' || obj.app !== 'ascenso2026') {
    throw new Error('El archivo no contiene un progreso de Ascensos 2027.');
  }
  const base = estadoInicial();
  const v = Number(obj.v) || 1;
  if (v > VERSION_ESTADO) {
    throw new Error('El progreso fue creado con una versión más nueva de la app. Actualiza la app e inténtalo de nuevo.');
  }
  // Futuras migraciones: if (v < 2) { ... }
  const r = {
    ...base,
    ...obj,
    ajustes: { ...base.ajustes, ...(obj.ajustes || {}) },
    cont: { ...base.cont, ...(obj.cont || {}) },
    sesiones: { ...base.sesiones, ...(obj.sesiones || {}) },
    config: {
      practica: { ...base.config.practica, ...(obj.config?.practica || {}) },
      simulacro: { ...base.config.simulacro, ...(obj.config?.simulacro || {}) },
    },
    p: (obj.p && typeof obj.p === 'object') ? obj.p : {},
    dias: (obj.dias && typeof obj.dias === 'object') ? obj.dias : {},
    sims: Array.isArray(obj.sims) ? obj.sims : [],
    logros: (obj.logros && typeof obj.logros === 'object') ? obj.logros : {},
    fuentesDominadas: (obj.fuentesDominadas && typeof obj.fuentesDominadas === 'object') ? obj.fuentesDominadas : {},
    xp: Number(obj.xp) || 0,
  };
  r.v = VERSION_ESTADO;
  return r;
}

/** Lee el estado guardado. Devuelve true si había datos. */
export function cargarEstado() {
  almacen.disponible = probarAlmacenamiento();
  if (!almacen.disponible) return false;
  try {
    const txt = window.localStorage.getItem(CLAVE);
    if (!txt) return false;
    estado = migrar(JSON.parse(txt));
    ultimoTexto = JSON.stringify(estado);
    return true;
  } catch (e) {
    console.warn('Estado guardado ilegible; se empieza de cero.', e);
    almacen.error = e;
    return false;
  }
}

// Último texto escrito: si el estado no cambió, no se reescribe ni se marca pendiente
// (guardarYa() se llama también al ocultar la app aunque no haya cambios).
let ultimoTexto = null;

function escribir(origen = 'local') {
  const deNube = origen === 'nube';
  let texto = JSON.stringify(estado);
  if (!deNube) {
    if (texto === ultimoTexto) return;
    estado.actualizado = new Date().toISOString();
    texto = JSON.stringify(estado);
  }
  ultimoTexto = texto;
  if (almacen.disponible) {
    try {
      window.localStorage.setItem(CLAVE, texto);
      almacen.error = null;
    } catch (e) {
      almacen.error = e;
      console.warn('No se pudo guardar el progreso', e);
      if (typeof almacen.alFallar === 'function') almacen.alFallar(e);
    }
  }
  // Aunque no haya localStorage, el cambio debe llegar a la nube.
  if (typeof ganchos.alEscribir === 'function') {
    try { ganchos.alEscribir(deNube ? 'nube' : 'local'); } catch (e) { console.warn(e); }
  }
}

/** Guarda con retardo (agrupa ráfagas de cambios). */
export const guardar = debounce(() => escribir('local'), 400);

/** Guarda inmediatamente (al ocultar la app, entregar un simulacro, importar…). */
export function guardarYa(origen = 'local') {
  const habia = guardar.pendiente();
  guardar.cancel();
  // Si había un guardado local en espera, ese cambio sigue siendo del usuario.
  escribir(habia ? 'local' : origen);
}

/**
 * Sustituye el estado completo (importar / reiniciar / sincronizar) y avisa a los oyentes.
 * Con { origen: 'nube' } no se marca como cambio pendiente de subir.
 */
export function reemplazarEstado(nuevo, { origen = 'local' } = {}) {
  estado = nuevo;
  guardar.cancel();
  escribir(origen);
  for (const fn of oyentes) fn(estado);
}

/** Texto JSON para exportar el progreso. */
export function exportarTexto(versionApp, versionBanco) {
  return JSON.stringify({
    app: 'ascenso2026',
    tipo: 'progreso',
    version_app: versionApp,
    version_banco: versionBanco,
    exportado: new Date().toISOString(),
    estado,
  });
}

/** Valida y convierte el texto de un archivo exportado en un estado listo para usar. */
export function leerExportacion(texto) {
  let obj;
  try {
    obj = JSON.parse(texto);
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }
  const candidato = obj && obj.estado ? obj.estado : obj;
  return migrar(candidato);
}

/** Borra el progreso conservando los ajustes. */
export function reiniciarProgreso() {
  const nuevo = estadoInicial();
  nuevo.ajustes = { ...estado.ajustes };
  reemplazarEstado(nuevo);
}

/** Estadística de una pregunta (la crea si no existe). */
export function statDe(id, crear = false) {
  let s = estado.p[id];
  if (!s && crear) {
    s = { n: 0, a: 0, h: '', u: 0 };
    estado.p[id] = s;
  }
  return s;
}
