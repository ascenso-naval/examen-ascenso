// vista-mas.js — Menú «Más»: Repaso, Explorar, Ranking, Logros, Ajustes, Administración
// (solo para el administrador, con el contador de pagos pendientes y el aviso de respaldo
// de más de 7 días; [1.5.0] el verificador la ve también, pero solo con la pestaña Pagos)
// y Acerca de.

import { estado } from '../estado.js';
import { LOGROS, nivelDe } from '../gamificacion.js';
import { pendientesHoy } from '../consultas.js';
import { esc, plural } from '../util.js';
import { icono } from './iconos.js';
import * as sync from '../sincronizacion.js';
import * as nube from '../nube.js';
import { respaldoVencido, anotarRespaldoServidor } from '../respaldo.js';

/** Último conteo de pagos pendientes (admin), para pintarlo al instante. */
let pagosPendientes = null;

const htmlConteoPagos = (n) => `<span class="etiqueta etiqueta-oro" id="pagos-pendientes" ${n ? '' : 'hidden'} aria-label="${n || 0} pagos pendientes">${n || 0}</span>`;

export function montar(raiz) {
  const pend = pendientesHoy().total;
  const obtenidos = LOGROS.filter((l) => estado.logros[l.id]).length;
  const niv = nivelDe(estado.xp);
  const rol = sync.metaNube().rol;
  const admin = rol === 'admin';
  const verificador = rol === 'verificador';
  let vivo = true;
  const fila = (href, ic, titulo, sub, valor = '') => `<li><a class="fila" href="#${href}">
    <span class="fila-icono">${icono(ic)}</span>
    <span class="fila-cuerpo"><span class="fila-titulo">${esc(titulo)}</span><span class="fila-sub">${esc(sub)}</span></span>
    ${valor}${icono('chev-der', { clase: 'chev', tam: 20 })}</a></li>`;
  raiz.innerHTML = `
    <h1>Más</h1>
    <p class="sub">Repaso, estudio por artículo, ranking, logros y ajustes.</p>
    <ul class="lista">
      ${fila('/repaso', 'repaso', 'Repaso', pend ? plural(pend, 'pregunta pendiente hoy', 'preguntas pendientes hoy') : 'Estás al día',
    pend ? `<span class="etiqueta etiqueta-oro">${pend}</span>` : '')}
      ${fila('/explorar', 'explorar', 'Explorar', 'Fichas por artículo y buscador')}
      ${fila('/ranking', 'podio', 'Ranking', sync.metaNube().apodo ? `Top 50 por XP y nota · tu apodo: ${sync.metaNube().apodo}` : 'Top 50 por XP y nota · elige tu apodo')}
      ${fila('/logros', 'logros', 'Logros', `Nivel ${niv.nivel}, ${niv.titulo}. ${obtenidos} de ${LOGROS.length} medallas`)}
      ${fila('/ajustes', 'ajustes', 'Ajustes', 'Cuenta, meta diaria, tema, exportar e importar')}
      ${admin ? fila(pagosPendientes ? '/admin?tab=pagos' : '/admin', 'escudo', 'Administración', respaldoVencido() ? 'Usuarios, pagos y respaldo · toca respaldar' : 'Usuarios, pagos, actividad, respaldo y CSV',
    `${respaldoVencido() ? '<span class="etiqueta etiqueta-ambar" id="respaldo-aviso" aria-label="Respaldo pendiente (más de 7 días)">Respaldo</span>' : ''}${htmlConteoPagos(pagosPendientes)}`) : ''}
      ${verificador ? fila('/admin?tab=pagos', 'escudo', 'Administración', 'Verificar los pagos pendientes', htmlConteoPagos(pagosPendientes)) : ''}
      ${fila('/ajustes?seccion=acerca', 'info', 'Acerca de', 'Versión y contenido del banco')}
    </ul>`;
  // Administración: contador de pagos pendientes de verificar (admin_pagos lo deja también al
  // verificador) y, para el administrador, el aviso de respaldo según el servidor.
  if ((admin || verificador) && nube.enLinea()) {
    nube.adminPagos('pendiente').then((filas) => {
      pagosPendientes = (filas || []).length;
      if (!vivo) return;
      const el = raiz.querySelector('#pagos-pendientes');
      if (el) {
        el.hidden = !pagosPendientes;
        el.textContent = String(pagosPendientes);
        el.setAttribute('aria-label', `${pagosPendientes} pagos pendientes`);
        const a = el.closest('a');
        if (a && admin) a.setAttribute('href', pagosPendientes ? '#/admin?tab=pagos' : '#/admin');
      }
    }).catch(() => {});
  }
  // [1.5.0] El aviso de los 7 días cuenta también el respaldo automático del Mac: se refresca
  // con admin_ultimo_respaldo() (solo admin) y se repinta la etiqueta si cambió.
  if (admin && nube.enLinea()) {
    nube.adminUltimoRespaldo().then((r) => {
      anotarRespaldoServidor(r);
      if (!vivo) return;
      const el = raiz.querySelector('#respaldo-aviso');
      if (el && !respaldoVencido()) el.remove();
    }).catch(() => {});
  }
  return () => { vivo = false; };
}
