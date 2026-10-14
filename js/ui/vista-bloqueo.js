// vista-bloqueo.js — Pantalla completa «Terminaste tu prueba gratis» (v1.3.0), no cerrable.
//
// Se muestra sobre la app (fuera de #app, que queda «inert») mientras acceso.agotado() sea
// verdadero, salvo en las rutas exentas: Ajustes (Mi cuenta), Diagnóstico y los resultados ya
// obtenidos (resumen de práctica, resultado y revisión de simulacro). El router además
// desvía a Inicio las rutas de estudio (ver main.js → definirGuardia).
//
// Estados: formulario de pago (monto, Yape/Plin con número grande, titular y «Copiar número»;
// voucher + número de operación) · «Pago en revisión» (con «Corregir») ·
// rechazo con motivo · agradecimiento al desbloquearse (→ Inicio).

import * as acceso from '../acceso.js';
import * as nube from '../nube.js';
import { escuchar } from '../bus.js';
import { caminoActual, navegar, refrescar } from '../router.js';
import { cerrarSesionUsuario, expulsar } from '../cuenta.js';
import { esc, fmtFechaHora, fmtNum } from '../util.js';
import { icono } from './iconos.js';
import { toast } from './toast.js';
import { hayModal, abrirHoja } from './modal.js';

const NOMBRE_MEDIO = { yape: 'Yape', plin: 'Plin' };
const VERBO_MEDIO = { yape: 'Yapea', plin: 'Plinea' };
const OPERACION_RE = /^[0-9]{6,12}$/;
const MAX_BYTES = 1000000;   // el bucket admite 1 MB (1 048 576 bytes): margen de seguridad
const LADO_MAX = 1280;
const RETARDO_EN_SESION = 1500;
const CIERRE_GRACIAS = 5000;

/** Rutas donde no se muestra el bloqueo (no permiten estudiar). */
export function rutaExenta(camino) {
  return camino === '/ajustes' || camino === '/diagnostico' || camino === '/practica/resumen'
    || camino.startsWith('/simulacro/resultado/') || camino.startsWith('/simulacro/revision/');
}

/** Rutas de estudio (el router las desvía a Inicio mientras la prueba está agotada). */
export function esRutaEstudio(camino) {
  if (rutaExenta(camino)) return false;
  return /^\/(practica|simulacro|repaso|explorar)(\/|$)/.test(camino);
}

const fmtTelefono = (n) => String(n || '').replace(/\D/g, '').replace(/^(\d{3})(\d{3})(\d{3})$/, '$1 $2 $3');
const fmtSoles = (m) => `S/ ${Number(m) % 1 ? Number(m).toFixed(2) : fmtNum(Number(m))}`;

// ---------------------------------------------------------------------------
// Imagen del voucher: compresión en el dispositivo (canvas → JPEG ≤ 1 MB, lado ≤ 1280 px)
// ---------------------------------------------------------------------------
async function cargarImagen(archivo) {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(archivo, { imageOrientation: 'from-image' }); } catch { /* respaldo abajo */ }
  }
  const url = URL.createObjectURL(archivo);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

const aBlob = (lienzo, tipo, calidad) => new Promise((res) => lienzo.toBlob(res, tipo, calidad));

/**
 * Reduce la captura a JPEG (≤ 1 MB, lado mayor ≤ 1280 px) y crea una miniatura para mostrarla
 * sin conexión. @returns {Promise<{blob:Blob, miniatura:string, ancho:number, alto:number}>}
 */
export async function comprimirImagen(archivo) {
  if (!archivo || !/^image\//.test(archivo.type || '')) throw new Error('El voucher debe ser una imagen (captura de pantalla o foto).');
  let img;
  try { img = await cargarImagen(archivo); } catch { throw new Error('No se pudo leer la imagen. Prueba con otra captura.'); }
  const w0 = img.width || img.naturalWidth;
  const h0 = img.height || img.naturalHeight;
  if (!w0 || !h0) throw new Error('No se pudo leer la imagen. Prueba con otra captura.');
  const lienzo = document.createElement('canvas');
  const ctx = lienzo.getContext('2d');
  let escala = Math.min(1, LADO_MAX / Math.max(w0, h0));
  let blob = null;
  for (let intento = 0; intento < 6 && !blob; intento++) {
    lienzo.width = Math.max(1, Math.round(w0 * escala));
    lienzo.height = Math.max(1, Math.round(h0 * escala));
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, lienzo.width, lienzo.height);
    ctx.drawImage(img, 0, 0, lienzo.width, lienzo.height);
    for (const calidad of [0.86, 0.76, 0.66, 0.56]) {
      const b = await aBlob(lienzo, 'image/jpeg', calidad);
      if (b && b.size <= MAX_BYTES) { blob = b; break; }
    }
    escala *= 0.75;
  }
  if (!blob) throw new Error('No se pudo reducir la imagen a 1 MB. Recorta la captura e inténtalo de nuevo.');
  const ancho = lienzo.width;
  const alto = lienzo.height;
  const k = Math.min(1, 240 / Math.max(ancho, alto));
  const mini = document.createElement('canvas');
  mini.width = Math.max(1, Math.round(ancho * k));
  mini.height = Math.max(1, Math.round(alto * k));
  mini.getContext('2d').drawImage(lienzo, 0, 0, mini.width, mini.height);
  if (typeof img.close === 'function') img.close();
  return { blob, miniatura: mini.toDataURL('image/jpeg', 0.7), ancho, alto };
}

// ---------------------------------------------------------------------------
// Pantalla
// ---------------------------------------------------------------------------
let cont = null;           // <div id="bloqueo">
let modo = null;           // 'pago' | 'gracias'
let firma = '';
let medio = null;          // medio elegido ('yape'|'plin')
let imagen = null;         // {blob, url, miniatura, ruta?}
let operacion = '';
let corrigiendo = false;
let enviando = false;
let error = '';
let temporizador = null;
let cierreGracias = null;
let planGracias = null;

function medios(st) { return st.config.medios || []; }

function medioActual(st) {
  const ms = medios(st);
  if (!ms.length) return null;
  if (!medio || !ms.some((m) => m.medio === medio)) {
    const previo = st.pago && st.pago.medio;
    medio = ms.some((m) => m.medio === previo) ? previo : ms[0].medio;
  }
  return ms.find((m) => m.medio === medio);
}

function enRevision(st) { return st.pendiente && !corrigiendo; }

function htmlCabeza(titulo, sub) {
  return `<header class="bloqueo-cabeza">
    <svg class="bloqueo-marca" width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="1.7"/>
      <path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4M5.3 5.3l2.8 2.8M15.9 15.9l2.8 2.8M18.7 5.3l-2.8 2.8M8.1 15.9l-2.8 2.8"/></svg>
    <h1 id="bloqueo-titulo" tabindex="-1">${esc(titulo)}</h1>
    <p class="bloqueo-sub">${sub}</p>
  </header>`;
}

function htmlSinRed() {
  return `<p class="aviso-acceso" id="bloqueo-sin-red" role="status" ${nube.enLinea() ? 'hidden' : ''}>${icono('nube-off', { tam: 20 })}<span>Sin conexión. Puedes revisar los datos de pago, pero para enviar el comprobante necesitas internet.</span></p>`;
}

function htmlPie() {
  return `<div class="bloqueo-pie">
    <a class="btn btn-borde btn-chico" href="#/ajustes" data-accion="mi-cuenta">${icono('usuario', { tam: 18 })}Mi cuenta</a>
    <button type="button" class="btn btn-fantasma btn-chico" data-accion="cerrar-sesion">${icono('salir', { tam: 18 })}Cerrar sesión</button>
  </div>`;
}

function htmlMedio(m, monto) {
  return `<div class="bloqueo-medio" data-medio="${esc(m.medio)}">
    <div class="bloqueo-medio-datos">
      <p class="bloqueo-medio-rotulo">${esc(VERBO_MEDIO[m.medio])} ${esc(fmtSoles(monto))} al número</p>
      <p class="bloqueo-numero num" id="bloqueo-numero">${esc(fmtTelefono(m.numero))}</p>
      ${m.titular ? `<p class="bloqueo-titular">A nombre de <strong>${esc(m.titular)}</strong></p>` : ''}
      <button type="button" class="btn btn-secundario btn-chico" data-accion="copiar" data-numero="${esc(String(m.numero).replace(/\D/g, ''))}">${icono('copiar', { tam: 18 })}Copiar número</button>
    </div>
  </div>`;
}

function htmlFormulario(st) {
  const c = st.consumo;
  const m = medioActual(st);
  const ms = medios(st);
  const pago = st.pago;
  const rechazado = pago && pago.estado === 'rechazado' && !st.pendiente;
  const capturaPrevia = corrigiendo && pago && pago.captura_path;
  const tieneVoucher = !!imagen || !!capturaPrevia;
  const listo = tieneVoucher && operacion.length > 0 && !!m && !enviando && nube.enLinea();
  const miniPrevia = capturaPrevia && st.miniatura && st.miniatura.path === pago.captura_path ? st.miniatura.dataUrl : null;
  const sub = corrigiendo
    ? 'Corrige los datos de tu comprobante: el nuevo reemplaza al anterior.'
    : `Usaste ${fmtNum(Math.min(c.preguntas, c.limitePreguntas || c.preguntas))} de ${fmtNum(c.limitePreguntas || 0)} preguntas y ${fmtNum(Math.min(c.simulacros, c.limiteSimulacros || c.simulacros))} de ${fmtNum(c.limiteSimulacros || 0)} simulacro${c.limiteSimulacros === 1 ? '' : 's'}. Un pago único la desbloquea de por vida.`;
  return `${htmlCabeza(corrigiendo ? 'Corregir comprobante' : 'Terminaste tu prueba gratis', esc(sub))}
    <div class="bloqueo-cuerpo">
      ${htmlSinRed()}
      ${rechazado ? `<div class="aviso-acceso aviso-acceso-error" role="alert" id="bloqueo-rechazo">${icono('alerta', { tam: 20 })}<span><strong>Tu comprobante fue rechazado.</strong> Motivo: «${esc(pago.motivo_rechazo || 'sin detalle')}». Revisa los datos y vuelve a enviarlo.</span></div>` : ''}
      <section class="tarjeta bloqueo-monto" aria-label="Monto a pagar">
        <span class="bloqueo-monto-valor num">${esc(fmtSoles(st.config.monto))}</span>
        <span class="bloqueo-monto-texto"><strong>Pago único</strong><span>Acceso completo y de por vida: práctica, simulacros, repaso y ranking sin límites.</span></span>
      </section>

      <h2 class="bloqueo-paso"><span class="bloqueo-num" aria-hidden="true">1</span>Paga por Yape o Plin</h2>
      ${!m ? `<div class="aviso-acceso" role="status">${icono('info', { tam: 20 })}<span>El administrador aún no configuró los números de pago. Inténtalo más tarde o comunícate con él.</span></div>` : `
      ${ms.length > 1 ? `<div class="segmentos" role="group" aria-label="Medio de pago">${ms.map((x) => `<button type="button" data-accion="medio" data-valor="${esc(x.medio)}" aria-pressed="${x.medio === m.medio}">${esc(NOMBRE_MEDIO[x.medio])}</button>`).join('')}</div>` : ''}
      <section class="tarjeta mt-s">${htmlMedio(m, st.config.monto)}</section>
      ${st.config.texto_ayuda ? `<p class="bloqueo-ayuda texto-largo">${esc(st.config.texto_ayuda)}</p>` : ''}`}

      <form class="bloqueo-form" novalidate>
        <h2 class="bloqueo-paso"><span class="bloqueo-num" aria-hidden="true">2</span>Sube la captura del voucher</h2>
        <div class="bloqueo-voucher">
          ${imagen ? `<img class="bloqueo-mini" id="bloqueo-mini" src="${esc(imagen.url)}" alt="Vista previa del voucher">`
    : miniPrevia ? `<img class="bloqueo-mini" id="bloqueo-mini" src="${esc(miniPrevia)}" alt="Voucher enviado antes">`
      : capturaPrevia ? `<img class="bloqueo-mini" id="bloqueo-mini" alt="Voucher enviado antes" data-ruta="${esc(pago.captura_path)}">`
        : `<span class="bloqueo-mini bloqueo-mini-vacia" aria-hidden="true">${icono('subir', { tam: 28 })}</span>`}
          <div class="bloqueo-voucher-texto">
            <label class="btn btn-secundario btn-chico bloqueo-elegir" for="bloqueo-archivo">${icono('subir', { tam: 18 })}${tieneVoucher ? 'Cambiar imagen' : 'Elegir imagen'}</label>
            <input class="sr-only" type="file" id="bloqueo-archivo" name="voucher" accept="image/*" aria-describedby="bloqueo-voucher-ayuda">
            <span class="ayuda-campo" id="bloqueo-voucher-ayuda">${imagen ? 'Imagen lista (se envía reducida, máx. 1 MB).' : capturaPrevia ? 'Se usará la captura que ya enviaste, salvo que elijas otra.' : 'Captura de pantalla de Yape o Plin donde se vea el monto y el número de operación.'}</span>
          </div>
        </div>

        <h2 class="bloqueo-paso"><span class="bloqueo-num" aria-hidden="true">3</span>Escribe el número de operación</h2>
        <label class="rotulo" for="bloqueo-operacion">Número de operación</label>
        <input class="entrada num" id="bloqueo-operacion" name="operacion" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="12" placeholder="Ej.: 01234567" value="${esc(operacion)}" aria-describedby="bloqueo-op-ayuda bloqueo-error">
        <p class="ayuda-campo" id="bloqueo-op-ayuda">Figura en el voucher: de 6 a 12 dígitos, solo números.</p>
        <p class="error-campo" id="bloqueo-error" role="alert" ${error ? '' : 'hidden'}>${esc(error)}</p>
        <button type="submit" class="btn btn-primario btn-bloque mt-m" data-accion="enviar" ${listo ? '' : 'disabled'}>${enviando ? 'Enviando…' : `${icono('check', { tam: 20 })}Enviar comprobante`}</button>
        ${corrigiendo ? '<button type="button" class="btn btn-fantasma btn-bloque mt-s" data-accion="cancelar-correccion">Cancelar corrección</button>' : ''}
      </form>
      ${htmlPie()}
    </div>`;
}

function htmlRevision(st) {
  const p = st.pago || {};
  const mini = st.miniatura && st.miniatura.path === p.captura_path ? st.miniatura.dataUrl : null;
  return `${htmlCabeza('Pago en revisión', 'Recibimos tu comprobante. El administrador lo verificará pronto y la app se desbloqueará sola.')}
    <div class="bloqueo-cuerpo">
      ${htmlSinRed()}
      <section class="tarjeta bloqueo-revision" aria-label="Comprobante enviado">
        ${mini ? `<img class="bloqueo-mini" id="bloqueo-mini" src="${esc(mini)}" alt="Voucher enviado">`
    : `<img class="bloqueo-mini" id="bloqueo-mini" alt="Voucher enviado" data-ruta="${esc(p.captura_path || '')}">`}
        <dl class="bloqueo-datos">
          <div><dt>Medio</dt><dd>${esc(NOMBRE_MEDIO[p.medio] || p.medio || '—')}</dd></div>
          <div><dt>N.º de operación</dt><dd class="num" id="bloqueo-op-enviada">${esc(p.operacion || '—')}</dd></div>
          <div><dt>Monto</dt><dd>${esc(fmtSoles(st.config.monto))}</dd></div>
          <div><dt>Enviado</dt><dd>${p.creado_en ? esc(fmtFechaHora(p.creado_en)) : '—'}</dd></div>
        </dl>
      </section>
      <p class="peq atenuado mt-m" role="status">${icono('reloj', { tam: 16, clase: 'en-linea' })} Revisamos el estado cada minuto mientras la app está abierta. También puedes cerrarla: al volver se desbloqueará si ya fue verificado.</p>
      <div class="botones">
        <button type="button" class="btn btn-secundario btn-bloque" data-accion="actualizar">${icono('repaso', { tam: 20 })}Actualizar estado</button>
        <button type="button" class="btn btn-borde btn-bloque" data-accion="corregir">Corregir comprobante</button>
      </div>
      ${htmlPie()}
    </div>`;
}

function htmlGracias() {
  const cortesia = planGracias === 'cortesia';
  return `<div class="bloqueo-gracias" role="status">
    <span class="bloqueo-gracias-icono" aria-hidden="true">${icono('check', { tam: 44 })}</span>
    <h1 id="bloqueo-titulo" tabindex="-1">${cortesia ? '¡Acceso completo activado!' : '¡Pago verificado, gracias!'}</h1>
    <p class="texto-largo">${cortesia ? 'El administrador te dio acceso de cortesía.' : 'Tu cuenta ya tiene acceso completo.'} Disfruta Ascenso 2026 de por vida, sin límites. ¡Éxitos en tu examen!</p>
    <button type="button" class="btn btn-primario btn-bloque" data-accion="entrar">Empezar a estudiar</button>
  </div>`;
}

function firmaDe(st) {
  if (modo === 'gracias') return `gracias|${planGracias}`;
  const p = st.pago || {};
  return [enRevision(st) ? 'revision' : 'form', st.plan, p.id, p.estado, p.operacion, p.captura_path, p.motivo_rechazo,
    JSON.stringify(st.config), st.consumo.preguntas, st.consumo.simulacros, st.consumo.limitePreguntas, st.consumo.limiteSimulacros].join('|');
}

function pintar(forzar = false) {
  if (!cont) return;
  const st = acceso.estadoAcceso();
  const f = firmaDe(st);
  if (!forzar && f === firma) { actualizarRed(); return; }
  firma = f;
  const y = cont.scrollTop;
  cont.innerHTML = `<section class="bloqueo-panel" role="dialog" aria-modal="true" aria-labelledby="bloqueo-titulo">${
    modo === 'gracias' ? htmlGracias() : enRevision(st) ? htmlRevision(st) : htmlFormulario(st)}</section>`;
  cont.scrollTop = y;
  cargarMiniaturaRemota();
}

/** Voucher que solo está en el servidor: URL firmada (dueño) si hay red. */
async function cargarMiniaturaRemota() {
  const img = cont && cont.querySelector('img.bloqueo-mini[data-ruta]:not([src])');
  if (!img || !img.dataset.ruta || !nube.enLinea()) return;
  try {
    const url = await nube.urlComprobante(img.dataset.ruta);
    if (img.isConnected) img.src = url;
  } catch { /* se queda sin miniatura */ }
}

function actualizarRed() {
  if (!cont) return;
  const aviso = cont.querySelector('#bloqueo-sin-red');
  if (aviso) aviso.hidden = nube.enLinea();
  actualizarBoton();
}

function actualizarBoton() {
  const b = cont && cont.querySelector('[data-accion="enviar"]');
  if (!b) return;
  const st = acceso.estadoAcceso();
  const tieneVoucher = !!imagen || !!(corrigiendo && st.pago && st.pago.captura_path);
  b.disabled = !(tieneVoucher && operacion.length > 0 && medioActual(st) && !enviando && nube.enLinea());
}

function mostrarError(texto) {
  error = texto || '';
  const el = cont && cont.querySelector('#bloqueo-error');
  if (el) { el.textContent = error; el.hidden = !error; }
}

function enfocarTitulo() {
  const h = cont && cont.querySelector('#bloqueo-titulo');
  if (h) { try { h.focus({ preventScroll: true }); } catch { /* sin foco */ } }
}

function abrir() {
  if (!cont) {
    cont = document.createElement('div');
    cont.id = 'bloqueo';
    cont.className = 'bloqueo';
    document.body.appendChild(cont);
    cont.addEventListener('click', alClic);
    cont.addEventListener('submit', alEnviar);
    cont.addEventListener('input', alEscribir);
    cont.addEventListener('change', alCambiar);
    firma = '';
    pintar(true);
    enfocarTitulo();
  } else {
    pintar(true);
  }
  document.body.classList.add('con-bloqueo');
  const app = document.getElementById('app');
  if (app) app.inert = true;
}

function cerrar() {
  clearTimeout(cierreGracias);
  if (cont) { cont.remove(); cont = null; }
  modo = null;
  firma = '';
  document.body.classList.remove('con-bloqueo');
  const app = document.getElementById('app');
  if (app) app.inert = hayModal();
}

/** Decide si mostrar u ocultar según el estado de acceso y la ruta actual. */
function actualizar() {
  clearTimeout(temporizador);
  if (modo === 'gracias') return;
  const debe = acceso.agotado() && !document.body.classList.contains('sin-sesion') && !rutaExenta(caminoActual());
  if (!debe) {
    if (cont) cerrar();
    corrigiendo = false;
    return;
  }
  if (cont) { pintar(); return; }
  const mostrar = () => {
    if (!(acceso.agotado() && !rutaExenta(caminoActual()))) return;
    modo = 'pago';
    abrir();
    // Debajo no queda abierta una ruta de estudio (sesión guardada, simulacro en pausa).
    if (esRutaEstudio(caminoActual())) refrescar();
  };
  // Si se agotó a mitad de una práctica, se deja ver la explicación de la última respuesta.
  if (document.body.classList.contains('en-sesion')) temporizador = setTimeout(mostrar, RETARDO_EN_SESION);
  else mostrar();
}

function gracias(plan) {
  clearTimeout(temporizador);
  planGracias = plan;
  modo = 'gracias';
  corrigiendo = false;
  imagen = null;
  operacion = '';
  error = '';
  firma = '';
  abrir();
  enfocarTitulo();
  clearTimeout(cierreGracias);
  cierreGracias = setTimeout(entrar, CIERRE_GRACIAS);
}

function entrar() {
  cerrar();
  navegar('/inicio', { reemplazar: true });
}

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------
async function copiar(numero, boton) {
  let ok = false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(numero); ok = true; }
  } catch { /* respaldo abajo */ }
  if (!ok) {
    const t = document.createElement('textarea');
    t.value = numero;
    t.setAttribute('readonly', '');
    t.style.position = 'fixed';
    t.style.opacity = '0';
    cont.appendChild(t);
    t.select();
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    t.remove();
  }
  toast(ok ? `Número copiado: ${fmtTelefono(numero)}` : `Copia el número a mano: ${fmtTelefono(numero)}`, { tipo: ok ? 'exito' : 'info' });
  // Confirmación visual en el propio botón (2 s), además del aviso.
  if (ok && boton && boton.isConnected) {
    clearTimeout(boton._tCopia);
    boton.classList.add('copiado');
    boton.innerHTML = `${icono('check', { tam: 18 })}¡Copiado!`;
    boton._tCopia = setTimeout(() => {
      if (!boton.isConnected) return;
      boton.classList.remove('copiado');
      boton.innerHTML = `${icono('copiar', { tam: 18 })}Copiar número`;
    }, 2000);
  }
}

function ampliar(src) {
  abrirHoja({
    titulo: 'Voucher',
    html: `<img class="voucher-grande" src="${esc(src)}" alt="Voucher enviado">`,
    acciones: [{ texto: 'Cerrar', clase: 'btn-secundario', valor: null }],
  });
}

async function alClic(e) {
  const b = e.target.closest('[data-accion]');
  if (!b) {
    const img = e.target.closest('img.bloqueo-mini[src]');
    if (img) ampliar(img.src);
    return;
  }
  const a = b.dataset.accion;
  if (a === 'medio') { medio = b.dataset.valor; firma = ''; pintar(true); cont.querySelector(`[data-accion="medio"][data-valor="${medio}"]`)?.focus(); }
  else if (a === 'copiar') copiar(b.dataset.numero, b);
  else if (a === 'mi-cuenta') { e.preventDefault(); navegar('/ajustes'); }
  else if (a === 'cerrar-sesion') await cerrarSesionUsuario();
  else if (a === 'corregir') {
    const st = acceso.estadoAcceso();
    corrigiendo = true;
    operacion = (st.pago && st.pago.operacion) || '';
    medio = (st.pago && st.pago.medio) || medio;
    imagen = null;
    error = '';
    pintar(true);
    enfocarTitulo();
  } else if (a === 'cancelar-correccion') {
    corrigiendo = false;
    imagen = null;
    error = '';
    pintar(true);
    enfocarTitulo();
  } else if (a === 'actualizar') {
    b.disabled = true;
    const r = await acceso.consultar();
    if (b.isConnected) b.disabled = false;
    if (!r) toast(nube.enLinea() ? 'No se pudo consultar el estado. Inténtalo en un momento.' : 'Sin conexión: se revisará al volver la red.', { icono: 'nube-off' });
    else if (r.pendiente) toast('Tu pago sigue en revisión.', { icono: 'reloj' });
  } else if (a === 'entrar') entrar();
}

function alEscribir(e) {
  if (e.target.id !== 'bloqueo-operacion') return;
  const limpio = e.target.value.replace(/\D/g, '').slice(0, 12);
  if (limpio !== e.target.value) e.target.value = limpio;
  operacion = limpio;
  if (error) mostrarError('');
  actualizarBoton();
}

async function alCambiar(e) {
  if (e.target.id !== 'bloqueo-archivo') return;
  const archivo = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!archivo) return;
  mostrarError('');
  try {
    const r = await comprimirImagen(archivo);
    if (imagen && imagen.url) URL.revokeObjectURL(imagen.url);
    imagen = { ...r, url: URL.createObjectURL(r.blob) };
    firma = '';
    pintar(true);
    cont.querySelector('#bloqueo-operacion')?.focus();
  } catch (err) {
    mostrarError(err.message || 'No se pudo usar esa imagen.');
  }
}

async function alEnviar(e) {
  if (!e.target.matches('.bloqueo-form')) return;
  e.preventDefault();
  if (enviando) return;
  const st = acceso.estadoAcceso();
  const m = medioActual(st);
  const capturaPrevia = corrigiendo && st.pago ? st.pago.captura_path : null;
  if (!imagen && !capturaPrevia) { mostrarError('Sube la captura del voucher (imagen) para continuar.'); return; }
  if (!OPERACION_RE.test(operacion)) { mostrarError('El número de operación debe tener de 6 a 12 dígitos (solo números).'); cont.querySelector('#bloqueo-operacion')?.focus(); return; }
  if (!m) { mostrarError('Aún no hay un medio de pago configurado.'); return; }
  if (!nube.enLinea()) { mostrarError('Sin conexión: para enviar el comprobante necesitas internet.'); return; }
  enviando = true;
  const boton = cont.querySelector('[data-accion="enviar"]');
  if (boton) { boton.disabled = true; boton.textContent = 'Enviando…'; }
  try {
    if (imagen && !imagen.ruta) imagen.ruta = await nube.subirComprobante(imagen.blob);
    await acceso.enviarComprobante({ medio: m.medio, operacion, capturaPath: imagen ? imagen.ruta : capturaPrevia, miniatura: imagen ? imagen.miniatura : null });
    enviando = false;
    corrigiendo = false;
    if (imagen && imagen.url) URL.revokeObjectURL(imagen.url);
    imagen = null;
    operacion = '';
    error = '';
    toast('Comprobante enviado. Te avisaremos aquí apenas se verifique.', { tipo: 'exito' });
    pintar(true);
    enfocarTitulo();
  } catch (err) {
    enviando = false;
    error = err && err.message ? err.message : 'No se pudo enviar el comprobante.';
    pintar(true);
    if (err && err.tipo === 'bloqueado') expulsar('bloqueada');
  }
}

let montado = false;

/** Engancha la pantalla de bloqueo (lo llama main.js al entrar con sesión). */
export function montarBloqueo() {
  if (!montado) {
    montado = true;
    escuchar('acceso-cambio', actualizar);
    escuchar('acceso-desbloqueado', (d) => gracias(d && d.plan));
    window.addEventListener('hashchange', actualizar);
    window.addEventListener('online', actualizarRed);
    window.addEventListener('offline', actualizarRed);
  }
  actualizar();
}
