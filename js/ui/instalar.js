// instalar.js — Pantalla «Instalar con un toque». Se muestra como primera pantalla (sobre la
// de carga y la de acceso) cuando la app NO se abre instalada:
//   · Android (Chrome, Edge, Samsung Internet): botón «Instalar la app» con el diálogo nativo
//     (`beforeinstallprompt`); si el evento no llega en 4 s, guía manual del menú del navegador.
//   · iPhone/iPad: guía animada de 3 pasos (Compartir → Añadir a pantalla de inicio → Añadir),
//     adaptada a Chrome/Firefox/Edge en iOS.
//   · Escritorio: tarjeta breve «abre este enlace en tu teléfono».
// «Seguir en el navegador» la cierra y no vuelve a aparecer en 7 días; Ajustes → «Instalar en
// el celular» la vuelve a abrir.

import * as inst from '../instalacion.js';
import { esc } from '../util.js';
import { icono } from './iconos.js';

const ESPERA_EVENTO_MS = 4000;

// ---- Iconos propios de la guía (24×24, trazo, mismo estilo que iconos.js) ----
const svg = (cuerpo, tam = 28) => `<svg width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${cuerpo}</svg>`;
const IC = {
  compartir: () => svg('<path d="M12 3.2v11.3"/><path d="M8.2 7 12 3.2 15.8 7"/><path d="M8.5 10.2H6.8a1.6 1.6 0 0 0-1.6 1.6v7.4a1.6 1.6 0 0 0 1.6 1.6h10.4a1.6 1.6 0 0 0 1.6-1.6v-7.4a1.6 1.6 0 0 0-1.6-1.6h-1.7"/>'),
  anadirInicio: () => svg('<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8.3v7.4M8.3 12h7.4"/>'),
  anadir: () => '<span class="inst-pastilla" aria-hidden="true">Añadir</span>',
  menuPuntos: () => svg('<circle cx="12" cy="5.5" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="18.5" r="1.3" fill="currentColor"/>'),
  menuPuntosH: () => svg('<circle cx="5.5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="18.5" cy="12" r="1.3" fill="currentColor"/>'),
  menuRayas: () => svg('<path d="M5 7h14M5 12h14M5 17h14"/>'),
  telefono: () => svg('<rect x="6.5" y="2.8" width="11" height="18.4" rx="2.4"/><path d="M12 7.5v6.3"/><path d="M9.4 11.4 12 14l2.6-2.6"/><path d="M10.6 18.2h2.8"/>'),
  flechaAbajo: () => svg('<path d="M12 4v15"/><path d="M6.5 13.5 12 19l5.5-5.5"/>', 30),
  flechaArriba: () => svg('<path d="M12 20V5"/><path d="M6.5 10.5 12 5l5.5 5.5"/>', 30),
};

/** Guía de pasos (lista ordenada, entrada escalonada). */
function htmlPasos(pasos, etiqueta) {
  return `<ol class="inst-pasos" aria-label="${esc(etiqueta)}">${pasos.map((p, i) => `
    <li class="inst-paso" style="--i:${i}">
      <span class="inst-paso-num" aria-hidden="true">${i + 1}</span>
      <span class="inst-paso-ico">${p.ico}</span>
      <span class="inst-paso-texto">${p.html}</span>
    </li>`).join('')}</ol>`;
}

function pasosIOS({ navegador, ipad }) {
  if (navegador === 'chrome') {
    return [
      { ico: IC.compartir(), html: 'En Chrome, toca <strong>Compartir</strong> junto a la barra de direcciones (o el menú <strong>⋯</strong> → Compartir).' },
      { ico: IC.anadirInicio(), html: 'Desplázate y toca <strong>Añadir a pantalla de inicio</strong>.' },
      { ico: IC.anadir(), html: 'Toca <strong>Añadir</strong> (arriba a la derecha).' },
    ];
  }
  if (navegador === 'firefox' || navegador === 'edge') {
    const menu = navegador === 'firefox' ? '<strong>☰</strong>' : '<strong>⋯</strong>';
    return [
      { ico: navegador === 'firefox' ? IC.menuRayas() : IC.menuPuntosH(), html: `En ${navegador === 'firefox' ? 'Firefox' : 'Edge'}, toca el menú ${menu} y luego <strong>Compartir</strong>.` },
      { ico: IC.anadirInicio(), html: 'Desplázate y toca <strong>Añadir a pantalla de inicio</strong>.' },
      { ico: IC.anadir(), html: 'Toca <strong>Añadir</strong> (arriba a la derecha).' },
    ];
  }
  return [
    { ico: IC.compartir(), html: `Toca el botón <strong>Compartir</strong> (el cuadrado con la flecha hacia arriba) ${ipad ? 'en la barra superior de Safari' : 'en la barra inferior de Safari'}. <span class="inst-nota">Si no lo ves, toca <strong>⋯</strong> y luego Compartir.</span>` },
    { ico: IC.anadirInicio(), html: 'Desplázate hacia abajo y toca <strong>Añadir a pantalla de inicio</strong>.' },
    { ico: IC.anadir(), html: 'Toca <strong>Añadir</strong> (arriba a la derecha). El icono del timón aparecerá en tu pantalla de inicio.' },
  ];
}

function pasosAndroid(navegador) {
  if (navegador === 'samsung') {
    return [
      { ico: IC.menuRayas(), html: 'Toca el menú <strong>≡</strong> (abajo a la derecha).' },
      { ico: IC.anadirInicio(), html: 'Toca <strong>Añadir página a</strong> → <strong>Pantalla de inicio</strong>.' },
      { ico: IC.anadir(), html: 'Confirma con <strong>Añadir</strong>.' },
    ];
  }
  const nombre = { edge: 'Edge', firefox: 'Firefox', opera: 'Opera' }[navegador] || 'Chrome';
  const menu = navegador === 'edge' ? '<strong>⋯</strong> (abajo)' : '<strong>⋮</strong> (arriba a la derecha)';
  return [
    { ico: navegador === 'edge' ? IC.menuPuntosH() : IC.menuPuntos(), html: `En ${nombre}, toca el menú ${menu}.` },
    { ico: IC.telefono(), html: 'Toca <strong>Instalar app</strong> o <strong>Añadir a pantalla de inicio</strong>.' },
    { ico: IC.anadir(), html: 'Confirma con <strong>Instalar</strong> (o <strong>Añadir</strong>).' },
  ];
}

const VENTAJAS = `<ul class="inst-ventajas">
  <li>${icono('rayo', { tam: 20 })}<span>Se abre con un toque desde tu pantalla de inicio</span></li>
  <li>${icono('nube-off', { tam: 20 })}<span>Funciona sin conexión, también en el buque</span></li>
  <li>${icono('ancla', { tam: 20 })}<span>Pantalla completa, sin barras del navegador</span></li>
</ul>`;

let abierta = null;   // { cerrar } de la pantalla abierta

/**
 * Muestra la pantalla de instalación si corresponde (o siempre, con `forzar`).
 * @param {{forzar?: boolean}} op
 * @returns {boolean} si se mostró
 */
export function montarInstalacion({ forzar = false } = {}) {
  if (abierta) return true;
  if (inst.estaInstalada()) return false;
  if (!forzar && !inst.debeMostrar()) return false;

  const pl = inst.plataforma();
  const previo = document.activeElement;
  const capa = document.createElement('div');
  capa.className = `instalar instalar-${pl.so}`;
  capa.setAttribute('role', 'dialog');
  capa.setAttribute('aria-modal', 'true');
  capa.setAttribute('aria-labelledby', 'inst-titulo');
  capa.dataset.plataforma = pl.so;

  let estadoAndroid = inst.hayEvento() ? 'listo' : 'esperando';   // esperando | listo | instalando | exito | manual | cancelado
  let temporizador = null;

  // ---------- Contenido por plataforma ----------
  function htmlCuerpoAndroid() {
    const manual = htmlPasos(pasosAndroid(pl.navegador), 'Instalar desde el menú del navegador');
    switch (estadoAndroid) {
      case 'exito':
        return `<div class="inst-exito" role="status" tabindex="-1">
          <span class="inst-exito-ico">${icono('check', { tam: 30 })}</span>
          <strong>Lista: ábrela desde tu pantalla de inicio</strong>
          <span>Busca el icono del timón «Ascensos 2027».</span>
        </div>`;
      case 'manual':
        return `<p class="inst-guia-titulo">Instálala desde el menú del navegador:</p>${manual}`;
      case 'cancelado':
        return `<p class="inst-aviso" role="status">No se instaló. Cuando quieras, hazlo desde el menú del navegador:</p>${manual}`;
      default: {
        const listo = estadoAndroid === 'listo';
        const texto = { esperando: 'Preparando instalación…', listo: 'Instalar la app', instalando: 'Instalando…' }[estadoAndroid];
        return `<button type="button" class="btn btn-primario btn-bloque inst-boton" data-inst="instalar" ${listo ? '' : 'disabled aria-disabled="true"'}>
          ${listo ? icono('descargar', { tam: 22 }) : '<span class="inst-girador" aria-hidden="true"></span>'}${texto}</button>
          <p class="mini centro inst-ayuda">${listo ? 'Se abrirá el aviso de tu navegador: toca «Instalar».' : 'Un momento: tu navegador está preparando la instalación.'}</p>`;
      }
    }
  }

  function htmlCuerpoIOS() {
    const titulo = pl.navegador === 'safari' ? 'Instálala en 3 pasos desde Safari:' : 'Instálala en 3 pasos:';
    const enOtra = pl.enApp || pl.navegador === 'otro'
      ? `<p class="inst-aviso">Estás en el navegador de otra aplicación. Si no ves «Añadir a pantalla de inicio», toca <strong>⋯</strong> → <strong>Abrir en Safari</strong> o copia el enlace y ábrelo en Safari.</p>
         <button type="button" class="btn btn-secundario btn-bloque" data-inst="copiar">${icono('compartir', { tam: 20 })}Copiar enlace</button>
         <p class="mini centro inst-copiado" role="status" aria-live="polite"></p>`
      : '';
    return `<p class="inst-guia-titulo">${titulo}</p>${htmlPasos(pasosIOS(pl), 'Pasos para instalar en iPhone o iPad')}${enOtra}`;
  }

  function htmlMovil() {
    return `<div class="instalar-panel">
      <header class="inst-cabeza">
        <img class="inst-icono" src="./iconos/icon-192.png" width="84" height="84" alt="">
        <h1 id="inst-titulo" tabindex="-1">Instala Ascensos 2027</h1>
        <p class="inst-sub">Tenla en tu celular como una app más: un toque y a estudiar.</p>
      </header>
      ${VENTAJAS}
      <div class="inst-cuerpo" aria-live="polite">${pl.so === 'ios' ? htmlCuerpoIOS() : htmlCuerpoAndroid()}</div>
      <div class="inst-pie">
        <button type="button" class="btn btn-borde btn-bloque" data-inst="seguir">Seguir en el navegador</button>
        <p class="mini centro">Te lo recordaremos en ${inst.DIAS_POSPUESTO} días. También puedes instalarla desde Ajustes → Instalar en el celular.</p>
      </div>
    </div>
    ${pl.so === 'ios' && pl.navegador === 'safari' ? `<div class="inst-flecha ${pl.ipad ? 'inst-flecha-arriba' : ''}" aria-hidden="true">
      ${pl.ipad ? IC.flechaArriba() : ''}<span>Compartir está ${pl.ipad ? 'aquí arriba' : 'aquí abajo'}</span>${pl.ipad ? '' : IC.flechaAbajo()}
    </div>` : ''}`;
  }

  function htmlEscritorio() {
    const enlace = inst.enlaceApp();
    return `<div class="inst-tarjeta">
      <span class="inst-tarjeta-ico">${icono('timon', { tam: 34 })}</span>
      <h1 id="inst-titulo" tabindex="-1">Esta app está pensada para el celular</h1>
      <p class="texto-largo">Abre este enlace en tu teléfono para instalarla y estudiar sin conexión:</p>
      <div class="inst-enlace">
        <a href="${esc(enlace)}" class="inst-enlace-url">${esc(enlace)}</a>
        <button type="button" class="btn btn-secundario btn-chico" data-inst="copiar">Copiar</button>
      </div>
      <p class="mini inst-copiado" role="status" aria-live="polite"></p>
      <div class="botones">
        <button type="button" class="btn btn-secundario btn-bloque" data-inst="instalar" ${inst.hayEvento() ? '' : 'hidden'}>${icono('descargar', { tam: 20 })}Instalar en esta computadora</button>
        <button type="button" class="btn btn-primario btn-bloque" data-inst="seguir">Seguir en el navegador</button>
      </div>
    </div>`;
  }

  function pintarCuerpoAndroid(enfocar = false) {
    const cuerpo = capa.querySelector('.inst-cuerpo');
    if (!cuerpo) return;
    cuerpo.innerHTML = htmlCuerpoAndroid();
    if (enfocar) (cuerpo.querySelector('.inst-exito') || cuerpo.querySelector('button:not([disabled])') || capa.querySelector('#inst-titulo'))?.focus();
  }

  function cambiarAndroid(nuevo, enfocar = false) {
    estadoAndroid = nuevo;
    if (nuevo !== 'esperando') clearTimeout(temporizador);
    pintarCuerpoAndroid(enfocar);
  }

  // ---------- Acciones ----------
  async function copiar() {
    const salida = capa.querySelector('.inst-copiado');
    const enlace = inst.enlaceApp();
    let ok = false;
    try { await navigator.clipboard.writeText(enlace); ok = true; } catch { /* sin portapapeles */ }
    if (salida) salida.textContent = ok ? 'Enlace copiado.' : `Copia este enlace: ${enlace}`;
  }

  async function instalarAhora(boton) {
    if (!inst.hayEvento()) return;
    if (pl.so === 'escritorio') {
      boton.disabled = true;
      const r = await inst.instalar();
      boton.hidden = true;
      const salida = capa.querySelector('.inst-copiado');
      if (salida) salida.textContent = r === 'accepted' ? 'Lista: ábrela desde el menú de aplicaciones de tu computadora.' : 'No se instaló.';
      return;
    }
    cambiarAndroid('instalando');
    const r = await inst.instalar();
    if (r === 'accepted') cambiarAndroid('exito', true);
    else cambiarAndroid('cancelado', true);
  }

  function alClic(e) {
    const b = e.target.closest('[data-inst]');
    if (!b) return;
    const accion = b.dataset.inst;
    if (accion === 'seguir') { inst.posponer(); cerrar(); } else if (accion === 'instalar') instalarAhora(b);
    else if (accion === 'copiar') copiar();
  }

  function alTecla(e) {
    if (e.key === 'Escape') { inst.posponer(); cerrar(); return; }
    if (e.key !== 'Tab') return;
    // Foco atrapado dentro del diálogo.
    const enfocables = [...capa.querySelectorAll('button:not([disabled]):not([hidden]), a[href]')];
    if (!enfocables.length) { e.preventDefault(); return; }
    const primero = enfocables[0];
    const ultimo = enfocables[enfocables.length - 1];
    if (e.shiftKey && (document.activeElement === primero || !capa.contains(document.activeElement))) { e.preventDefault(); ultimo.focus(); } else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
  }

  const quitarOyente = inst.alCambiar((tipo) => {
    if (tipo === 'instalada') {
      if (pl.so === 'android') cambiarAndroid('exito', true);
      else if (pl.so === 'escritorio') {
        const salida = capa.querySelector('.inst-copiado');
        if (salida) salida.textContent = 'Lista: ábrela desde el menú de aplicaciones de tu computadora.';
      }
      return;
    }
    if (tipo === 'disponible') {
      if (pl.so === 'android' && ['esperando', 'manual', 'cancelado'].includes(estadoAndroid)) cambiarAndroid('listo');
      if (pl.so === 'escritorio') { const b = capa.querySelector('[data-inst="instalar"]'); if (b) b.hidden = false; }
    }
  });

  // ---------- Montaje ----------
  capa.innerHTML = pl.so === 'escritorio' ? htmlEscritorio() : htmlMovil();
  const fondo = ['app', 'carga', 'toasts', 'capa-modal'].map((id) => document.getElementById(id)).filter(Boolean);
  for (const el of fondo) el.setAttribute('inert', '');
  document.body.classList.add('con-instalar');
  document.body.appendChild(capa);
  capa.addEventListener('click', alClic);
  capa.addEventListener('keydown', alTecla);
  requestAnimationFrame(() => capa.querySelector('#inst-titulo')?.focus());

  if (pl.so === 'android' && estadoAndroid === 'esperando') {
    temporizador = setTimeout(() => { if (estadoAndroid === 'esperando') cambiarAndroid('manual'); }, ESPERA_EVENTO_MS);
  }

  function cerrar() {
    clearTimeout(temporizador);
    quitarOyente();
    capa.removeEventListener('click', alClic);
    capa.removeEventListener('keydown', alTecla);
    capa.remove();
    for (const el of fondo) el.removeAttribute('inert');
    document.body.classList.remove('con-instalar');
    abierta = null;
    const destino = previo && previo.isConnected && previo !== document.body ? previo : document.querySelector('#vista h1, #vista [tabindex="-1"]');
    try { destino?.focus({ preventScroll: true }); } catch { /* sin foco */ }
  }

  abierta = { cerrar };
  return true;
}

/** Desde Ajustes: vuelve a abrir la pantalla aunque se haya pospuesto. */
export function abrirInstalacion() {
  return montarInstalacion({ forzar: true });
}
