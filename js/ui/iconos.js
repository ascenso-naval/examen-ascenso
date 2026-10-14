// iconos.js — Set propio de iconos SVG en línea (24×24, trazo). Sin recursos externos.

const P = {
  inicio: '<path d="M4 10.5 12 4l8 6.5"/><path d="M6 9v10.5h4.5V15h3v4.5H18V9"/>',
  practica: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.1" fill="currentColor"/>',
  simulacro: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V9.5"/><path d="M10 2.5h4"/><path d="M12 2.5V6"/><path d="M18.4 6.6l1.4-1.4"/>',
  progreso: '<rect x="4.5" y="11" width="3.4" height="8" rx="1"/><rect x="10.3" y="5" width="3.4" height="14" rx="1"/><rect x="16.1" y="8.5" width="3.4" height="10.5" rx="1"/>',
  mas: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8"/>',
  repaso: '<path d="M19.5 10.5A7.7 7.7 0 0 0 5.6 7.4L4.3 9"/><path d="M4 4.6V9h4.4"/><path d="M4.5 13.5a7.7 7.7 0 0 0 13.9 3.1l1.3-1.6"/><path d="M20 19.4V15h-4.4"/>',
  explorar: '<path d="M12 6.6C10.5 5.1 8 4.5 4 4.5v13c4 0 6.5.6 8 2.1 1.5-1.5 4-2.1 8-2.1v-13c-4 0-6.5.6-8 2.1z"/><path d="M12 6.6v13"/>',
  logros: '<path d="M8 4h8v5.2a4 4 0 0 1-8 0z"/><path d="M8 6.2H5.2a3 3 0 0 0 3.1 3.9"/><path d="M16 6.2h2.8a3 3 0 0 1-3.1 3.9"/><path d="M12 13.2v3.3"/><path d="M8.5 20h7"/><path d="M9.6 20c.2-2 1-3.5 2.4-3.5s2.2 1.5 2.4 3.5"/>',
  ajustes: '<path d="M4 7h9.5"/><path d="M17.5 7H20"/><circle cx="15.5" cy="7" r="2"/><path d="M4 17h2.5"/><path d="M10.5 17H20"/><circle cx="8.5" cy="17" r="2"/>',
  llama: '<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-2.6 1.4-4.4 2.9-6 .3 1.8 1.2 2.9 2.4 3.4-.4-3.5 1-6.4 3.7-8.2-.3 2.6.8 4.4 2.3 6 1.3 1.4 1.7 2.9 1.7 4.6 0 3.7-2.6 6.4-6.5 6.4z"/>',
  bandera: '<path d="M5.5 21V4"/><path d="M5.5 4.5h11.8l-2.3 4.1 2.3 4.1H5.5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  cerrar: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  'chev-der': '<path d="M9.5 6l6 6-6 6"/>',
  'chev-izq': '<path d="M14.5 6l-6 6 6 6"/>',
  'chev-abajo': '<path d="M6 9.5l6 6 6-6"/>',
  rejilla: '<rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M4 9.3h16M4 14.7h16M9.3 4v16M14.7 4v16"/>',
  buscar: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  descargar: '<path d="M12 4v11"/><path d="M7.5 10.5 12 15l4.5-4.5"/><path d="M5 19.5h14"/>',
  subir: '<path d="M12 15V4"/><path d="M7.5 8.5 12 4l4.5 4.5"/><path d="M5 19.5h14"/>',
  compartir: '<path d="M12 3.5v11"/><path d="M8 7.5l4-4 4 4"/><path d="M8 11H5.5v9h13v-9H16"/>',
  papelera: '<path d="M4.5 7h15"/><path d="M9.5 7V4.5h5V7"/><path d="M6.5 7l1 13h9l1-13"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><path d="M12 7.7v.1"/>',
  reloj: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  estrella: '<path d="M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.7L12 16.8l-5.1 2.7 1-5.7-4.1-4 5.7-.8z"/>',
  rayo: '<path d="M13 3 5.5 13.5H12L11 21l7.5-10.5H12z"/>',
  calendario: '<rect x="4" y="5.5" width="16" height="14.5" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  ancla: '<circle cx="12" cy="5.3" r="2"/><path d="M12 7.3V20"/><path d="M8.5 10.8h7"/><path d="M5 13.5a7 7 0 0 0 14 0"/><path d="M5 13.5 3.4 15M19 13.5l1.6 1.5"/>',
  timon: '<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="1.7"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4M5.3 5.3l2.8 2.8M15.9 15.9l2.8 2.8M18.7 5.3l-2.8 2.8M8.1 15.9l-2.8 2.8"/>',
  sol: '<path d="M3.5 17.5h17"/><path d="M7 17.5a5 5 0 0 1 10 0"/><path d="M12 6v2.6M5.4 10.2l1.7 1.7M18.6 10.2l-1.7 1.7"/><path d="M7 21h10"/>',
  luna: '<path d="M19 14.6A7.6 7.6 0 0 1 9.4 5a7.6 7.6 0 1 0 9.6 9.6z"/>',
  libro: '<path d="M5.5 5.2a2 2 0 0 1 2-2H19v14.6H7.5a2 2 0 0 0-2 2z"/><path d="M5.5 19.8a1.9 1.9 0 0 0 2 1.4H19v-3.4"/>',
  capas: '<path d="M12 4 3.5 8.5 12 13l8.5-4.5z"/><path d="M3.5 12.5 12 17l8.5-4.5"/><path d="M3.5 16.5 12 21l8.5-4.5"/>',
  diana: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.6"/>',
  mira: '<circle cx="12" cy="12" r="7"/><path d="M12 2.5V7M12 17v4.5M2.5 12H7M17 12h4.5"/>',
  cien: '<circle cx="12" cy="12" r="9"/><text x="12" y="15.2" text-anchor="middle" font-size="8.5" font-weight="800" fill="currentColor" stroke="none" font-family="system-ui, sans-serif">100</text>',
  tres: '<circle cx="9" cy="9.5" r="4.6"/><circle cx="15" cy="9.5" r="4.6"/><circle cx="12" cy="14.8" r="4.6"/>',
  banderas: '<path d="M4.5 20V5"/><path d="M4.5 5.5h7.5l-1.5 3 1.5 3H4.5"/><path d="M13.5 20V9.5"/><path d="M13.5 10h6.5l-1.5 3 1.5 3h-6.5"/>',
  play: '<path d="M8 5.5v13l10-6.5z"/>',
  alerta: '<path d="M12 4.2 2.9 19.5h18.2z"/><path d="M12 10v4.6"/><path d="M12 17.2v.1"/>',
  ojo: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
  arriba: '<path d="M12 19V5"/><path d="M6.5 10.5 12 5l5.5 5.5"/>',
  abajo: '<path d="M12 5v14"/><path d="M6.5 13.5 12 19l5.5-5.5"/>',
  menos: '<path d="M5.5 12h13"/>',
  mas2: '<path d="M12 5.5v13M5.5 12h13"/>',
  volver: '<path d="M10 6l-6 6 6 6"/><path d="M4.5 12H20"/>',
  copiar: '<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.2"/><path d="M15.5 8.5V6.2a2.2 2.2 0 0 0-2.2-2.2H6.2A2.2 2.2 0 0 0 4 6.2v7.1a2.2 2.2 0 0 0 2.2 2.2h2.3"/>',
  billete: '<rect x="2.5" y="6" width="19" height="12" rx="2.2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/>',
  candado: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  sonido: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  usuario: '<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20c.8-3.8 3.8-6 7.5-6s6.7 2.2 7.5 6"/>',
  nube: '<path d="M7 18.5h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7.1 9.6 4.5 4.5 0 0 0 7 18.5z"/>',
  'nube-ok': '<path d="M7 18.5h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7.1 9.6 4.5 4.5 0 0 0 7 18.5z"/><path d="M9.5 13.8l1.8 1.8 3.4-3.6"/>',
  'nube-off': '<path d="M7 18.5h10a4 4 0 0 0 1.7-.38M19.9 15.2A4 4 0 0 0 17.6 10.55 5.5 5.5 0 0 0 9.2 6.6M6.4 9.75A4.5 4.5 0 0 0 7 18.5"/><path d="M4 4l16 16"/>',
  podio: '<rect x="9" y="7.5" width="6" height="12.5" rx="1"/><rect x="3.5" y="12" width="5.5" height="8" rx="1"/><rect x="15" y="14.5" width="5.5" height="5.5" rx="1"/>',
  escudo: '<path d="M12 3.5 5 6v5.5c0 4.4 3 7.7 7 9 4-1.3 7-4.6 7-9V6z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
  salir: '<path d="M14 4.5h4.5v15H14"/><path d="M10 8l-4 4 4 4"/><path d="M6 12h9.5"/>',
  'ojo-no': '<path d="M2.5 12S6 5.5 12 5.5c1.7 0 3.2.5 4.5 1.2M21.5 12s-3.5 6.5-9.5 6.5c-1.7 0-3.2-.5-4.5-1.2"/><path d="M9.9 9.9a2.8 2.8 0 0 0 4 4"/><path d="M4 4l16 16"/>',
  correo: '<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="M4 7l8 6 8-6"/>',
  pulso: '<path d="M3 12h4l2.5-6 4 12 2.5-6H21"/>',
};

/**
 * Devuelve el SVG del icono como texto.
 * @param {string} nombre
 * @param {{clase?: string, titulo?: string, tam?: number}} op
 */
export function icono(nombre, op = {}) {
  const cuerpo = P[nombre] || P.info;
  const tam = op.tam || 24;
  const clase = op.clase ? ` class="${op.clase}"` : '';
  const a11y = op.titulo ? `role="img" aria-label="${op.titulo}"` : 'aria-hidden="true" focusable="false"';
  return `<svg${clase} width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${a11y}>${cuerpo}</svg>`;
}
