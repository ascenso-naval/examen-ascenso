// sesion.js — Ciclo de vida de las sesiones en curso (persisten en el estado):
//   estado.sesiones.practica  → práctica o repaso (una a la vez)
//   estado.sesiones.simulacro → simulacro (guarda el tiempo restante)

import { estado, guardarYa } from './estado.js';
import { D } from './datos.js';
import { nuevoId } from './util.js';

/** Crea (y guarda) una sesión de práctica o repaso. */
export function iniciarPractica({ tipo = 'practica', examen = 'mixto', ids, titulo, config = null }) {
  estado.sesiones.practica = {
    id: nuevoId('p'),
    tipo,
    examen,
    titulo,
    ids: ids.slice(),
    idx: 0,
    resp: {},      // id → índice ORIGINAL elegido
    ok: {},        // id → true/false
    xp: 0,
    inicio: Date.now(),
    activoMs: 0,
    config,
  };
  guardarYa();
  return estado.sesiones.practica;
}

/** Crea (y guarda) un simulacro. `limiteSeg` null = sin tiempo. */
export function iniciarSimulacro({ examen, ids, limiteSeg, composicion = 'examen' }) {
  estado.sesiones.simulacro = {
    id: nuevoId('s'),
    tipo: 'simulacro',
    examen,
    ids: ids.slice(),
    idx: 0,
    resp: {},        // id → índice ORIGINAL elegido (se puede cambiar hasta entregar)
    marcadas: {},    // id → true («marcar para revisar» dentro del examen)
    inicio: Date.now(),
    limite: limiteSeg || null,
    restante: limiteSeg || null,
    usado: 0,
    composicion,
  };
  guardarYa();
  return estado.sesiones.simulacro;
}

/**
 * Devuelve la sesión del espacio indicado si sigue siendo válida
 * (descarta ids que ya no existan en el banco; si no queda ninguna, la elimina).
 */
export function sesionEnCurso(espacio) {
  const s = estado.sesiones[espacio];
  if (!s) return null;
  const validos = s.ids.filter((id) => D.porId.has(id));
  if (!validos.length) {
    estado.sesiones[espacio] = null;
    guardarYa();
    return null;
  }
  if (validos.length !== s.ids.length) {
    s.ids = validos;
    s.idx = Math.min(s.idx, validos.length - 1);
  }
  return s;
}

export function descartarSesion(espacio) {
  estado.sesiones[espacio] = null;
  guardarYa();
}

/** Respondidas de una sesión (práctica: con feedback; simulacro: con alternativa elegida). */
export function respondidasDe(s) {
  return s ? Object.keys(s.resp).filter((id) => s.resp[id] !== null && s.resp[id] !== undefined).length : 0;
}
