// sw-registro.js — Registro del service worker y aviso «Nueva versión disponible · Actualizar».

import { guardarYa } from './estado.js';
import { toast } from './ui/toast.js';
import { icono } from './ui/iconos.js';

let actualizando = false;

function mostrarAviso(reg) {
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
    // Al volver a la app, buscar una versión nueva (como mucho una vez por hora).
    let ultima = Date.now();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && Date.now() - ultima > 3600 * 1000) {
        ultima = Date.now();
        reg.update().catch(() => {});
      }
    });
  }).catch((err) => console.warn('No se pudo registrar el service worker:', err));
}
