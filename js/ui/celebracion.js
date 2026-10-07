// celebracion.js — Convierte los eventos de gamificación en avisos y celebraciones:
// meta diaria, racha, logros (toasts) y subida de nivel (hoja con confeti CSS ligero).

import { esc, siglaCorta } from '../util.js';
import { LOGRO_POR_ID } from '../gamificacion.js';
import { navegar } from '../router.js';
import { toast } from './toast.js';
import { abrirHoja } from './modal.js';
import { insignia } from './comun.js';
import { sonar } from './sonido.js';

const COLORES = ['#D4AF37', '#E9C759', '#F1ECE2', '#2FB37A', '#7FA7E0'];

function confeti(n = 30) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return '';
  let html = '';
  for (let i = 0; i < n; i++) {
    const x = Math.round(Math.random() * 100);
    const d = (Math.random() * 0.35).toFixed(2);
    const t = (1.1 + Math.random() * 0.9).toFixed(2);
    const r = Math.round(180 + Math.random() * 540) * (Math.random() < 0.5 ? -1 : 1);
    const dx = Math.round((Math.random() - 0.5) * 80);
    const c = COLORES[i % COLORES.length];
    html += `<i style="--x:${x}%;--d:${d}s;--t:${t}s;--r:${r}deg;--dx:${dx}px;--c:${c}"></i>`;
  }
  return `<div class="confeti" aria-hidden="true">${html}</div>`;
}

/** Modal de celebración al subir de nivel. */
export function celebrarNivel(ev) {
  sonar('nivel');
  const texto = ev.ascenso
    ? `Ascendiste al rango de ${ev.titulo}. Sigue así.`
    : `Sumas experiencia como ${ev.titulo}. Cada pregunta cuenta.`;
  return abrirHoja({
    clase: 'hoja-celebracion',
    etiqueta: `Subiste al nivel ${ev.nivel}`,
    html: `${confeti()}${insignia(ev.nivel, 84)}<h2>¡Nivel ${ev.nivel}!</h2><p>${esc(texto)}</p>`,
    acciones: [{ texto: 'Continuar', clase: 'btn-primario', valor: true }],
  });
}

/** Muestra los avisos correspondientes a una lista de eventos. */
export function procesarEventos(eventos) {
  if (!eventos || !eventos.length) return;
  const logros = [];
  for (const e of eventos) {
    if (e.tipo === 'meta') {
      toast(`Meta diaria cumplida. +${e.xp} XP`, { tipo: 'exito', icono: 'check' });
    } else if (e.tipo === 'racha') {
      toast(`¡${e.dias} días de racha! +${e.xp} XP`, { tipo: 'oro', icono: 'llama' });
    } else if (e.tipo === 'logro') {
      const l = LOGRO_POR_ID.get(e.id);
      if (l) logros.push(e.fuente ? `${l.nombre}: ${siglaCorta(e.fuente)}` : l.nombre);
    }
  }
  // Varios logros a la vez se agrupan en un solo aviso para no tapar la pantalla.
  if (logros.length) {
    const texto = logros.length === 1
      ? `Logro desbloqueado: ${logros[0]}`
      : `${logros.length} logros desbloqueados: ${logros.slice(0, -1).join(', ')} y ${logros[logros.length - 1]}`;
    toast(texto, { tipo: 'oro', icono: 'logros', accion: { texto: 'Ver', fn: () => navegar('/logros') } });
    sonar('logro');
  }
  const nivel = eventos.filter((e) => e.tipo === 'nivel').pop();
  if (nivel) setTimeout(() => celebrarNivel(nivel), 250);
}
