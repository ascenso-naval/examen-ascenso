// vista-mas.js — Menú «Más»: Repaso, Explorar, Logros, Ajustes y Acerca de.

import { estado } from '../estado.js';
import { LOGROS, nivelDe } from '../gamificacion.js';
import { pendientesHoy } from '../consultas.js';
import { esc, plural } from '../util.js';
import { icono } from './iconos.js';

export function montar(raiz) {
  const pend = pendientesHoy().total;
  const obtenidos = LOGROS.filter((l) => estado.logros[l.id]).length;
  const niv = nivelDe(estado.xp);
  const fila = (href, ic, titulo, sub, valor = '') => `<li><a class="fila" href="#${href}">
    <span class="fila-icono">${icono(ic)}</span>
    <span class="fila-cuerpo"><span class="fila-titulo">${esc(titulo)}</span><span class="fila-sub">${esc(sub)}</span></span>
    ${valor}${icono('chev-der', { clase: 'chev', tam: 20 })}</a></li>`;
  raiz.innerHTML = `
    <h1>Más</h1>
    <p class="sub">Repaso, estudio por artículo, logros y ajustes.</p>
    <ul class="lista">
      ${fila('/repaso', 'repaso', 'Repaso', pend ? plural(pend, 'pregunta pendiente hoy', 'preguntas pendientes hoy') : 'Estás al día',
    pend ? `<span class="etiqueta etiqueta-oro">${pend}</span>` : '')}
      ${fila('/explorar', 'explorar', 'Explorar', 'Fichas por artículo y buscador')}
      ${fila('/logros', 'logros', 'Logros', `Nivel ${niv.nivel}, ${niv.titulo}. ${obtenidos} de ${LOGROS.length} medallas`)}
      ${fila('/ajustes', 'ajustes', 'Ajustes', 'Meta diaria, tema, exportar e importar')}
      ${fila('/ajustes?seccion=acerca', 'info', 'Acerca de', 'Versión y contenido del banco')}
    </ul>`;
  return null;
}
