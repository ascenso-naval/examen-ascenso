// sincronizacion.js — Sincronización offline-first del progreso con Supabase.
//
// · El estado local (estado.js) es la fuente de verdad. Cada cambio marca «pendiente» y
//   programa una subida con retardo de 20 s; también se sincroniza al terminar una sesión,
//   al ocultar la app (visibilitychange) y al recuperar la conexión (online).
// · Antes de subir se consulta la fecha del estado remoto: si es más nueva que la última
//   sincronización y hay cambios locales → fusión por secciones (fusion.js) y se sube el
//   resultado; si no hay cambios locales → se adopta el remoto.
// · Los eventos de sesión (práctica, simulacro, repaso) van a una cola persistente y se
//   envían con id_cliente único (el servidor ignora los repetidos).
// · Reintentos exponenciales (5 s, 10 s, 20 s… hasta 5 min). Nunca bloquea el estudio.
//
// Metadatos en localStorage['ascenso2026:nube'].

import { estado, ganchos, migrar, reemplazarEstado, estadoInicial } from './estado.js';
import { APP_VERSION } from './version.js';
import { fusionar, tieneProgreso } from './fusion.js';
import { escuchar } from './bus.js';
import * as nube from './nube.js';

export const CLAVE_META = 'ascenso2026:nube';
const RETARDO_SUBIDA = 20000;
const BASE = {
  usuario: null, correo: '', apodo: null, rol: null,
  pendiente: false, ultimaSync: null, ultimaSubida: null, ultimoIntento: null,
  cola: [], error: null, ranking: null,
};

let meta = leerMeta();
let activo = false;
let cambios = 0;           // contador de escrituras locales (para no perder cambios hechos durante una subida)
let temporizador = null;
let reintentos = 0;
let enCurso = null;
let repetir = false;
let situacion = 'ok';      // 'ok' | 'pendiente' | 'offline' | 'sincronizando' | 'error'
const oyentes = new Set();
let alExpulsar = null;     // lo define main.js: (motivo) => void
let alAplicarRemoto = null; // lo define main.js: () => void (repintar)

function leerMeta() {
  try {
    const o = JSON.parse(window.localStorage.getItem(CLAVE_META) || 'null');
    return { ...BASE, ...(o || {}), cola: Array.isArray(o?.cola) ? o.cola : [] };
  } catch {
    return { ...BASE, cola: [] };
  }
}
function guardarMeta() {
  try { window.localStorage.setItem(CLAVE_META, JSON.stringify(meta)); } catch { /* sin almacenamiento */ }
}

/** Metadatos actuales (solo lectura). */
export const metaNube = () => meta;

/** Cambia datos de la cuenta guardados en el dispositivo (apodo, rol, ranking en caché…). */
export function actualizarMeta(cambiosMeta) {
  Object.assign(meta, cambiosMeta);
  guardarMeta();
  notificar();
}

/** Situación para la interfaz. */
export function situacionSync() {
  const offline = !nube.enLinea();
  const tipo = situacion === 'sincronizando' ? 'sincronizando'
    : offline ? 'offline'
      : situacion === 'error' ? 'error'
        : (meta.pendiente || meta.cola.length) ? 'pendiente' : 'ok';
  return { tipo, pendiente: meta.pendiente, cola: meta.cola.length, ultimaSync: meta.ultimaSubida || meta.ultimaSync, error: meta.error };
}

export function alCambiarSync(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}
function notificar() {
  const s = situacionSync();
  for (const fn of oyentes) { try { fn(s); } catch (e) { console.warn(e); } }
}

function programar(ms) {
  clearTimeout(temporizador);
  if (!activo) return;
  temporizador = setTimeout(() => { temporizador = null; sincronizar(); }, ms);
}

/** Marca el estado local como pendiente de subir (cambio del usuario). */
function marcarPendiente() {
  cambios += 1;
  if (!meta.pendiente) {
    meta.pendiente = true;
    guardarMeta();
    notificar();
  }
  programar(RETARDO_SUBIDA);
}

// ---------------------------------------------------------------------------
// Vínculo del dispositivo con la cuenta
// ---------------------------------------------------------------------------

/** Usuario al que pertenece el progreso local (null si aún no se vinculó). */
export const usuarioVinculado = () => meta.usuario;

/**
 * Vincula el dispositivo a una cuenta.
 * @param {{id:string, correo:string}} usuario
 * @param {{conservarLocal:boolean}} op  true → el progreso local se sube (o se fusiona)
 */
export function vincular(usuario, { conservarLocal }) {
  meta = { ...BASE, cola: [], usuario: usuario.id, correo: usuario.correo || '' };
  if (conservarLocal) {
    meta.pendiente = true;
  } else {
    const limpio = estadoInicial();
    limpio.ajustes = { ...estado.ajustes };
    reemplazarEstado(limpio, { origen: 'nube' });
  }
  guardarMeta();
}

/** Borra el progreso y los metadatos de la nube del dispositivo (al cerrar sesión). */
export function limpiarDispositivo() {
  detener();
  const limpio = estadoInicial();
  const a = estado.ajustes || {};
  // Se conservan solo las preferencias de apariencia del dispositivo.
  limpio.ajustes = { ...limpio.ajustes, tema: a.tema, letra: a.letra, mayusculas: a.mayusculas, sonidos: a.sonidos };
  reemplazarEstado(limpio, { origen: 'nube' });
  meta = { ...BASE, cola: [] };
  try { window.localStorage.removeItem(CLAVE_META); } catch { /* sin almacenamiento */ }
}

// ---------------------------------------------------------------------------
// Ciclo de sincronización
// ---------------------------------------------------------------------------

/**
 * Arranca la sincronización para la sesión activa.
 * @param {{alExpulsar:(motivo:string)=>void, alAplicarRemoto:()=>void}} op
 */
export function iniciar(op = {}) {
  alExpulsar = op.alExpulsar || null;
  alAplicarRemoto = op.alAplicarRemoto || null;
  if (activo) return;
  activo = true;
  ganchos.alEscribir = (origen) => { if (origen !== 'nube') marcarPendiente(); };
  escuchar('sesion-terminada', (ev) => {
    meta.cola.push(ev);
    if (meta.cola.length > 500) meta.cola.splice(0, meta.cola.length - 500);
    guardarMeta();
    notificar();
    programar(1200);
  });
  window.addEventListener('online', () => { reintentos = 0; notificar(); programar(800); });
  window.addEventListener('offline', () => { situacion = 'offline'; notificar(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && (meta.pendiente || meta.cola.length)) sincronizar();
  });
  notificar();
}

/** Detiene la sincronización (cerrar sesión). */
export function detener() {
  activo = false;
  clearTimeout(temporizador);
  ganchos.alEscribir = null;
}

/** Sincroniza ahora (una sola a la vez). Devuelve {ok, resultado|motivo}. */
export function sincronizar() {
  if (!activo) return Promise.resolve({ ok: false, motivo: 'inactivo' });
  if (enCurso) { repetir = true; return enCurso; }
  clearTimeout(temporizador);
  enCurso = ejecutar().finally(() => {
    enCurso = null;
    if (repetir) { repetir = false; programar(300); }
  });
  return enCurso;
}

async function enviarCola() {
  while (meta.cola.length) {
    const lote = meta.cola.slice(0, 100);
    try {
      await nube.registrarEventos(lote);
    } catch (e) {
      // Un evento que el servidor rechaza por datos no válidos (CHECK) no debe atascar la cola
      // para siempre (ni la subida del estado, que va después): se envían uno a uno y se
      // descartan solo los rechazados por validación. Otros errores se propagan (reintento).
      if (!(e instanceof nube.ErrorNube) || e.tipo !== 'validacion') throw e;
      for (const ev of lote) {
        try { await nube.registrarEventos([ev]); } catch (e2) {
          if (!(e2 instanceof nube.ErrorNube) || e2.tipo !== 'validacion') throw e2;
          console.warn('Evento descartado por el servidor:', e2.message, ev);
        }
      }
    }
    const enviados = new Set(lote.map((e) => e.id_cliente));
    meta.cola = meta.cola.filter((e) => !enviados.has(e.id_cliente));
    guardarMeta();
  }
}

const sinFecha = (e) => JSON.stringify({ ...e, actualizado: null });

function aplicar(nuevo) {
  // Si hay una práctica o un simulacro abierto en pantalla, se conservan las sesiones locales.
  if (document.body.classList.contains('en-sesion')) nuevo.sesiones = estado.sesiones;
  // Sin diferencias reales no se reemplaza ni se repinta la pantalla.
  if (sinFecha(nuevo) === sinFecha(estado)) return;
  reemplazarEstado(nuevo, { origen: 'nube' });
  if (alAplicarRemoto) { try { alAplicarRemoto(); } catch (e) { console.warn(e); } }
}

async function ejecutar() {
  if (!nube.enLinea()) {
    situacion = 'offline';
    notificar();
    return { ok: false, motivo: 'offline' };
  }
  situacion = 'sincronizando';
  meta.ultimoIntento = new Date().toISOString();
  notificar();
  try {
    await enviarCola();
    let resultado = 'sin-cambios';
    const fechaRemota = await nube.fechaEstadoRemoto();
    const tsRemoto = fechaRemota ? Date.parse(fechaRemota) : 0;
    const tsLocal = meta.ultimaSync ? Date.parse(meta.ultimaSync) : 0;
    if (fechaRemota && tsRemoto > tsLocal) {
      const remoto = await nube.bajarEstado();
      let rem = null;
      try { rem = remoto ? migrar(remoto.estado) : null; } catch (e) { console.warn('Estado remoto no utilizable:', e); }
      if (rem) {
        if (meta.pendiente) {
          aplicar(fusionar(estado, rem));
          resultado = 'fusion';
        } else {
          aplicar(rem);
          meta.ultimaSync = remoto.actualizado;
          resultado = 'adoptado';
        }
      }
    }
    if (meta.pendiente || (!fechaRemota && tieneProgreso(estado))) {
      const foto = cambios;
      const copia = JSON.parse(JSON.stringify(estado));
      const act = await nube.subirEstado(copia, APP_VERSION);
      meta.ultimaSync = act;
      meta.ultimaSubida = new Date().toISOString();
      if (cambios === foto) meta.pendiente = false;
      if (resultado === 'sin-cambios') resultado = 'subido';
    }
    meta.error = null;
    reintentos = 0;
    situacion = 'ok';
    guardarMeta();
    notificar();
    if (meta.pendiente) programar(RETARDO_SUBIDA);
    return { ok: true, resultado };
  } catch (e) {
    const err = e instanceof nube.ErrorNube ? e : new nube.ErrorNube(String(e?.message || e), 'servidor');
    if (err.tipo === 'bloqueado' || err.tipo === 'permiso') {
      // ¿La cuenta fue bloqueada? (las políticas RLS rechazan sus escrituras)
      let bloqueado = err.tipo === 'bloqueado';
      if (!bloqueado) { try { bloqueado = await nube.estaBloqueado(); } catch { /* se reintenta luego */ } }
      if (bloqueado && alExpulsar) { situacion = 'error'; alExpulsar('bloqueada'); return { ok: false, motivo: 'bloqueada' }; }
    }
    if (err.tipo === 'sesion' && alExpulsar) {
      if ((await nube.verificarSesion()) === 'invalida') { alExpulsar('sesion'); return { ok: false, motivo: 'sesion' }; }
    }
    situacion = err.tipo === 'red' ? 'offline' : 'error';
    meta.error = err.tipo === 'red' ? null : err.message;
    guardarMeta();
    notificar();
    const espera = Math.min(300000, 5000 * 2 ** reintentos);
    reintentos += 1;
    if (nube.enLinea()) programar(espera);
    return { ok: false, motivo: err.tipo, mensaje: err.message };
  }
}
