// apariencia.js — Aplica tema (claro/oscuro/automático), tamaño de letra y MAYÚSCULAS.

import { estado } from '../estado.js';

const consultaOscuro = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

export function aplicarApariencia() {
  const aj = estado.ajustes;
  const raiz = document.documentElement;
  const oscuro = aj.tema === 'oscuro' || (aj.tema === 'auto' && (!consultaOscuro || consultaOscuro.matches));
  raiz.dataset.theme = oscuro ? 'dark' : 'light';
  raiz.dataset.letra = String(aj.letra ?? 1);
  raiz.dataset.mayus = aj.mayusculas ? '1' : '0';
}

/** Reaplica el tema si cambia la preferencia del sistema y el usuario eligió «Automático». */
export function vigilarTemaSistema() {
  if (!consultaOscuro) return;
  const alCambiar = () => { if (estado.ajustes.tema === 'auto') aplicarApariencia(); };
  if (consultaOscuro.addEventListener) consultaOscuro.addEventListener('change', alCambiar);
  else if (consultaOscuro.addListener) consultaOscuro.addListener(alCambiar);
}
