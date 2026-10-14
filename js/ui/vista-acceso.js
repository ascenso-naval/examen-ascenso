// vista-acceso.js — Pantalla de acceso (sin sesión): Ingresar / Registrarse con correo y
// contraseña, «¿Olvidaste tu contraseña?», aviso de privacidad y mensaje sin conexión.

import * as nube from '../nube.js';
import { APODO_RE, AYUDA_APODO, guardarApodoPendiente, tomarMensajeAcceso } from '../cuenta.js';
import { esc } from '../util.js';
import { icono } from './iconos.js';
import { segmentos } from './comun.js';
import { abrirHoja } from './modal.js';

const CORREO_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MSJ_SIN_RED = 'Sin conexión. Para ingresar o crear tu cuenta necesitas internet. Después de ingresar una vez, la app funciona sin conexión en este dispositivo.';

const MARCA = `<svg class="acceso-marca" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
  <circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="1.7"/>
  <path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4M5.3 5.3l2.8 2.8M15.9 15.9l2.8 2.8M18.7 5.3l-2.8 2.8M8.1 15.9l-2.8 2.8"/></svg>`;

/**
 * @param {HTMLElement} raiz
 * @param {{alIngresar:(usuario:{id:string,correo:string}, op:{apodo?:string})=>Promise<void>}} op
 */
export function montarAcceso(raiz, { alIngresar }) {
  let modo = 'ingresar';            // 'ingresar' | 'registro' | 'revisa'
  let mensaje = tomarMensajeAcceso();
  let ocupado = false;
  let correoGuardado = '';

  function pintar() {
    const registro = modo === 'registro';
    raiz.innerHTML = `
      <section class="acceso" aria-labelledby="acceso-titulo">
        <div class="acceso-cabeza">
          ${MARCA}
          <h1 id="acceso-titulo">Ascensos 2027</h1>
          <p class="acceso-sub">Simulador de los exámenes de ascenso: Reglamentos, MAPLO e Inglés.</p>
        </div>
        ${mensaje ? `<p class="aviso-acceso aviso-acceso-error" role="alert">${icono('alerta', { tam: 20 })}<span>${esc(mensaje)}</span></p>` : ''}
        <p class="aviso-acceso" id="sin-red" role="status" ${nube.enLinea() ? 'hidden' : ''}>${icono('nube-off', { tam: 20 })}<span>${esc(MSJ_SIN_RED)}</span></p>
        ${modo === 'revisa' ? htmlRevisa() : `
        ${segmentos([{ valor: 'ingresar', texto: 'Ingresar' }, { valor: 'registro', texto: 'Registrarse' }], modo, 'modo', 'Acceso')}
        <form class="acceso-form" novalidate>
          <div class="campo">
            <label class="rotulo" for="correo">Correo</label>
            <input class="entrada" id="correo" name="correo" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" required value="${esc(correoGuardado)}">
          </div>
          <div class="campo">
            <label class="rotulo" for="clave">Contraseña</label>
            <div class="clave-caja">
              <input class="entrada" id="clave" name="clave" type="password" autocomplete="${registro ? 'new-password' : 'current-password'}" required ${registro ? 'minlength="8"' : ''}>
              <button type="button" class="btn-icono clave-ver" data-accion="ver-clave" aria-label="Mostrar contraseña" aria-pressed="false">${icono('ojo', { tam: 22 })}</button>
            </div>
            ${registro ? '<span class="ayuda">Al menos 8 caracteres.</span>' : ''}
          </div>
          ${registro ? `<div class="campo">
            <label class="rotulo" for="apodo">Apodo para el ranking</label>
            <input class="entrada" id="apodo" name="apodo" maxlength="20" autocomplete="nickname" autocapitalize="off" spellcheck="false" required>
            <span class="ayuda">${esc(AYUDA_APODO)} Tu correo nunca se muestra.</span>
          </div>` : ''}
          <p class="error-campo" id="acceso-error" role="alert" hidden></p>
          <button type="submit" class="btn btn-primario btn-bloque" data-accion="enviar">${registro ? 'Crear cuenta' : 'Ingresar'}</button>
          ${registro ? '' : '<button type="button" class="btn btn-fantasma btn-bloque mt-s" data-accion="olvide">¿Olvidaste tu contraseña?</button>'}
        </form>`}
        <details class="desplegable privacidad mt-l">
          <summary><span class="fila-cuerpo">${icono('candado', { tam: 20 })} Privacidad: qué se guarda y quién lo ve</span>${icono('chev-abajo', { clase: 'chev', tam: 20 })}</summary>
          <div class="desplegable-cuerpo texto-largo">
            <p><strong>Qué se guarda:</strong> tu correo, tu apodo, tu progreso de estudio (respuestas, XP, logros y simulacros), las sesiones que terminas y la fecha de tus ingresos. La contraseña la gestiona el servicio de autenticación (Supabase) y nadie puede leerla.</p>
            <p><strong>Quién lo ve:</strong> tú, desde cualquier dispositivo con tu cuenta, y el administrador de la app (para seguimiento del estudio). En el ranking solo aparecen tu apodo, XP, nota promedio y racha.</p>
            <p>No se comparte con terceros. Para borrar tu cuenta, pídelo al administrador.</p>
          </div>
        </details>
      </section>`;
  }

  function htmlRevisa() {
    return `<div class="tarjeta centro revisa-correo">
      ${icono('correo', { tam: 40 })}
      <h2>Revisa tu correo</h2>
      <p class="texto-largo">Te enviamos un enlace para confirmar <strong>${esc(correoGuardado)}</strong>. Ábrelo en este dispositivo (revisa también la carpeta de spam) y luego ingresa con tu contraseña.</p>
      <button type="button" class="btn btn-primario btn-bloque" data-accion="ya-confirme">Ya confirmé: ingresar</button>
    </div>`;
  }

  function mostrarError(texto) {
    const el = raiz.querySelector('#acceso-error');
    if (!el) return;
    el.textContent = texto;
    el.hidden = !texto;
  }

  function ocupar(si, texto) {
    ocupado = si;
    const b = raiz.querySelector('[data-accion="enviar"]');
    if (b) {
      b.disabled = si;
      b.textContent = si ? texto : (modo === 'registro' ? 'Crear cuenta' : 'Ingresar');
    }
  }

  async function enviar(form) {
    if (ocupado) return;
    const correo = form.correo.value.trim();
    const clave = form.clave.value;
    const apodo = form.apodo ? form.apodo.value.trim() : '';
    correoGuardado = correo;
    mostrarError('');
    if (!CORREO_RE.test(correo)) { mostrarError('Escribe un correo válido.'); form.correo.focus(); return; }
    if (!clave) { mostrarError('Escribe tu contraseña.'); form.clave.focus(); return; }
    if (modo === 'registro') {
      if (clave.length < 8) { mostrarError('La contraseña debe tener al menos 8 caracteres.'); form.clave.focus(); return; }
      if (!APODO_RE.test(apodo)) { mostrarError(`Apodo no válido. ${AYUDA_APODO}`); form.apodo.focus(); return; }
    }
    if (!nube.enLinea()) { mostrarError(MSJ_SIN_RED); return; }
    try {
      if (modo === 'registro') {
        ocupar(true, 'Creando cuenta…');
        const r = await nube.registrarse(correo, clave, apodo);
        if (r.requiereConfirmacion) {
          guardarApodoPendiente(correo, apodo);
          ocupar(false);
          modo = 'revisa';
          mensaje = null;
          pintar();
          return;
        }
        await alIngresar(r.sesion, { apodo });
      } else {
        ocupar(true, 'Ingresando…');
        const u = await nube.iniciarSesion(correo, clave);
        await alIngresar(u, {});
      }
    } catch (e) {
      ocupar(false);
      mostrarError(e && e.message ? e.message : 'No se pudo ingresar.');
    }
  }

  async function olvide() {
    const correoInicial = raiz.querySelector('#correo')?.value.trim() || correoGuardado;
    await abrirHoja({
      titulo: 'Recuperar contraseña',
      html: `<form class="form-recuperar" novalidate>
        <p class="peq atenuado" style="margin-top:0">Te enviaremos un enlace para crear una contraseña nueva. Ábrelo en este mismo dispositivo.</p>
        <label class="rotulo" for="correo-rec"><strong>Correo</strong></label>
        <input class="entrada mt-s" id="correo-rec" type="email" inputmode="email" autocomplete="email" value="${esc(correoInicial)}" autofocus>
        <p class="error-campo" role="alert" hidden></p>
        <p class="ok-campo" role="status" hidden></p>
        <div class="botones">
          <button type="submit" class="btn btn-primario btn-bloque">Enviar enlace</button>
          <button type="button" class="btn btn-fantasma btn-bloque" data-cerrar-hoja>Cerrar</button>
        </div>
      </form>`,
      alAbrir: (hoja, cerrar) => {
        const form = hoja.querySelector('form');
        const error = hoja.querySelector('.error-campo');
        const ok = hoja.querySelector('.ok-campo');
        hoja.querySelector('[data-cerrar-hoja]').addEventListener('click', () => cerrar(null));
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const correo = hoja.querySelector('#correo-rec').value.trim();
          error.hidden = true;
          ok.hidden = true;
          if (!CORREO_RE.test(correo)) { error.textContent = 'Escribe un correo válido.'; error.hidden = false; return; }
          try {
            await nube.recuperarContrasena(correo);
            ok.textContent = 'Si el correo está registrado, te llegará un enlace en unos minutos (revisa también spam).';
            ok.hidden = false;
          } catch (err) {
            error.textContent = err.message;
            error.hidden = false;
          }
        });
      },
    });
  }

  function alClic(e) {
    const b = e.target.closest('[data-accion]');
    if (!b) return;
    const accion = b.dataset.accion;
    if (accion === 'modo') {
      const correo = raiz.querySelector('#correo');
      if (correo) correoGuardado = correo.value.trim();
      modo = b.dataset.valor;
      pintar();
      raiz.querySelector('#correo')?.focus();
    } else if (accion === 'ver-clave') {
      const campo = raiz.querySelector('#clave');
      const ver = campo.type === 'password';
      campo.type = ver ? 'text' : 'password';
      b.setAttribute('aria-pressed', String(ver));
      b.setAttribute('aria-label', ver ? 'Ocultar contraseña' : 'Mostrar contraseña');
      b.innerHTML = icono(ver ? 'ojo-no' : 'ojo', { tam: 22 });
    } else if (accion === 'olvide') {
      olvide();
    } else if (accion === 'ya-confirme') {
      modo = 'ingresar';
      pintar();
      raiz.querySelector('#clave')?.focus();
    }
  }
  function alEnviar(e) {
    if (!e.target.matches('.acceso-form')) return;
    e.preventDefault();
    enviar(e.target);
  }
  const alRed = () => {
    const aviso = raiz.querySelector('#sin-red');
    if (aviso) aviso.hidden = nube.enLinea();
  };

  pintar();
  raiz.addEventListener('click', alClic);
  raiz.addEventListener('submit', alEnviar);
  window.addEventListener('online', alRed);
  window.addEventListener('offline', alRed);
  return () => {
    raiz.removeEventListener('click', alClic);
    raiz.removeEventListener('submit', alEnviar);
    window.removeEventListener('online', alRed);
    window.removeEventListener('offline', alRed);
  };
}
