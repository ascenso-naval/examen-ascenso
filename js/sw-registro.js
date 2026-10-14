// sw-registro.js — Registro del service worker, aviso «Nueva versión disponible · Actualizar»
// y búsqueda manual de actualizaciones (Ajustes → Aplicación → «Buscar actualización»).

import { guardarYa } from './estado.js';
import { toast } from './ui/toast.js';
import { icono } from './ui/iconos.js';
import { APP_VERSION } from './version.js';

let actualizando = false;

/** Cada cuánto, como mucho, se busca una versión nueva al volver a la app o recuperar la red. */
export const INTERVALO_COMPROBACION_MS = 5 * 60 * 1000;

export function mostrarAviso(reg) {
  if (document.querySelector('.aviso-version')) return;
  const aviso = document.createElement('div');
  aviso.className = 'aviso-version';
  aviso.setAttribute('role', 'status');
  aviso.innerHTML = `${icono('ancla', { tam: 22 })}<span>Nueva versión disponible</span>
    <button type="button" class="btn btn-chico">Actualizar</button>`;
  aviso.querySelector('button').addEventListener('click', () => {
    actualizando = true;
    guardarYa();
    const espera = reg.waiting;
    if (espera) espera.postMessage({ tipo: 'SKIP_WAITING' });
    else location.reload();
  });
  document.body.appendChild(aviso);
}

export function registrarSW() {
  if (!('serviceWorker' in navigator)) return;

  // Solo se recarga cuando el usuario pidió actualizar (no en la primera instalación).
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!actualizando) return;
    actualizando = false;
    location.reload();
  });

  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data && e.data.tipo === 'datos-actualizados') {
      toast('El banco de preguntas se actualizó.', { accion: { texto: 'Recargar', fn: () => { guardarYa(); location.reload(); } } });
    }
  });

  navigator.serviceWorker.register('./sw.js', { scope: './' }).then((reg) => {
    if (reg.waiting && navigator.serviceWorker.controller) mostrarAviso(reg);
    reg.addEventListener('updatefound', () => {
      const nuevo = reg.installing;
      if (!nuevo) return;
      nuevo.addEventListener('statechange', () => {
        if (nuevo.state === 'installed' && navigator.serviceWorker.controller) mostrarAviso(reg);
      });
    });
    // Al volver a la app (o al recuperar la red), buscar una versión nueva
    // (como mucho una vez cada 5 minutos).
    let ultima = Date.now();
    const comprobar = () => {
      if (Date.now() - ultima < INTERVALO_COMPROBACION_MS) return;
      ultima = Date.now();
      reg.update().catch(() => {});
    };
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') comprobar();
    });
    window.addEventListener('online', comprobar);
  }).catch((err) => console.warn('No se pudo registrar el service worker:', err));
}

/** Espera a que un SW en instalación termine (installed/activated/redundant), con tope de tiempo. */
function esperarInstalacion(sw, ms = 20000) {
  return new Promise((resolver) => {
    if (!sw || sw.state !== 'installing') { resolver(); return; }
    const t = setTimeout(resolver, ms);
    sw.addEventListener('statechange', function alCambiar() {
      if (sw.state === 'installing') return;
      sw.removeEventListener('statechange', alCambiar);
      clearTimeout(t);
      resolver();
    });
  });
}

/**
 * Búsqueda manual de una versión nueva (botón «Buscar actualización» de Ajustes).
 * No toca el progreso: solo pide al navegador que compare sw.js con el instalado.
 * @returns {Promise<'nueva'|'al-dia'|'sin-conexion'|'sin-sw'|'error'>}
 */
export async function buscarActualizacion() {
  if (!('serviceWorker' in navigator)) {
    toast('Este navegador no admite actualizaciones automáticas: recarga la página para obtener la última versión.', { icono: 'info' });
    return 'sin-sw';
  }
  if (navigator.onLine === false) {
    toast('Sin conexión: no se puede buscar una actualización ahora.', { icono: 'nube-off' });
    return 'sin-conexion';
  }
  let reg = null;
  try { reg = await navigator.serviceWorker.getRegistration(); } catch { reg = null; }
  if (!reg) {
    toast('Este navegador no admite actualizaciones automáticas: recarga la página para obtener la última versión.', { icono: 'info' });
    return 'sin-sw';
  }
  try {
    await reg.update();
  } catch (e) {
    if (navigator.onLine === false || /fetch|network|red/i.test(String(e && e.message))) {
      toast('Sin conexión: no se puede buscar una actualización ahora.', { icono: 'nube-off' });
      return 'sin-conexion';
    }
    toast('No se pudo buscar una actualización. Inténtalo más tarde.', { tipo: 'error' });
    return 'error';
  }
  await esperarInstalacion(reg.installing);
  if (reg.waiting && navigator.serviceWorker.controller) {
    mostrarAviso(reg);
    return 'nueva';
  }
  toast(`Ya tienes la última versión (${APP_VERSION})`, { tipo: 'exito' });
  return 'al-dia';
}
