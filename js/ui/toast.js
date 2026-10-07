// toast.js — Avisos breves («toasts») anunciados por lectores de pantalla.

import { esc } from '../util.js';
import { icono } from './iconos.js';

const MAX_VISIBLES = 3;

/**
 * Muestra un aviso.
 * @param {string} texto
 * @param {{tipo?: 'info'|'exito'|'error'|'oro', icono?: string, duracion?: number,
 *          accion?: {texto: string, fn: Function}, silencioso?: boolean}} op
 */
export function toast(texto, op = {}) {
  const cont = document.getElementById('toasts');
  if (!cont) return;
  const { tipo = 'info', duracion = 2800, accion } = op;
  const nombreIcono = op.icono || ({ exito: 'check', error: 'alerta', oro: 'estrella' }[tipo] || 'info');
  const el = document.createElement('div');
  el.className = `toast toast-${tipo}`;
  // «silencioso»: ya se anunció por otra región aria-live (evita la doble lectura).
  if (op.silencioso) el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `${icono(nombreIcono, { tam: 22 })}<span class="toast-texto">${esc(texto)}</span>${
    accion ? `<button type="button" class="toast-accion">${esc(accion.texto)}</button>` : ''}`;
  cont.appendChild(el);
  while (cont.children.length > MAX_VISIBLES) cont.firstElementChild.remove();

  let t = null;
  const quitar = () => {
    clearTimeout(t);
    el.classList.add('saliendo');
    setTimeout(() => el.remove(), 180);
  };
  if (accion) {
    el.querySelector('.toast-accion').addEventListener('click', () => { quitar(); accion.fn(); });
  }
  t = setTimeout(quitar, accion ? Math.max(duracion, 5000) : duracion);
  return quitar;
}
