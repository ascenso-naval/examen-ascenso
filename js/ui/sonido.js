// sonido.js — Sonidos sintetizados con Web Audio (sin archivos). Se respetan los ajustes.

import { estado } from '../estado.js';

let ctx = null;

function contexto() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    try { ctx = new C(); } catch { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

/** Secuencia de notas: [[frecuencia, inicio(s), duración(s)], …] */
function tocar(notas, { tipo = 'sine', volumen = 0.08 } = {}) {
  const c = contexto();
  if (!c) return;
  const t0 = c.currentTime + 0.01;
  for (const [f, ini, dur] of notas) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(f, t0 + ini);
    g.gain.setValueAtTime(0.0001, t0 + ini);
    g.gain.exponentialRampToValueAtTime(volumen, t0 + ini + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + ini + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t0 + ini);
    osc.stop(t0 + ini + dur + 0.02);
  }
}

/** Reproduce un efecto: 'acierto' | 'fallo' | 'nivel' | 'logro'. */
export function sonar(nombre) {
  if (!estado.ajustes.sonidos) return;
  try {
    if (nombre === 'acierto') tocar([[880, 0, 0.09], [1318.5, 0.07, 0.16]]);
    else if (nombre === 'fallo') tocar([[220, 0, 0.12], [174.6, 0.09, 0.2]], { tipo: 'triangle', volumen: 0.09 });
    else if (nombre === 'nivel') tocar([[523.3, 0, 0.14], [659.3, 0.11, 0.14], [784, 0.22, 0.14], [1046.5, 0.33, 0.3]], { volumen: 0.07 });
    else if (nombre === 'logro') tocar([[784, 0, 0.12], [1174.7, 0.1, 0.24]], { volumen: 0.06 });
  } catch { /* audio no disponible */ }
}
