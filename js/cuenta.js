// cuenta.js — Flujo de la cuenta: qué hacer tras ingresar (bloqueo, vínculo del dispositivo,
// «¿Conservar el progreso de este dispositivo?», apodo, ingreso), cerrar sesión, expulsar
// (cuenta bloqueada o sesión inválida), pedir apodo y nueva contraseña.

import { estado } from './estado.js';
import * as nube from './nube.js';
import * as sync from './sincronizacion.js';
import * as acceso from './acceso.js';
import { tieneProgreso, resumenProgreso } from './fusion.js';
import { esc, fmtNum } from './util.js';
import { abrirHoja, confirmar } from './ui/modal.js';
import { toast } from './ui/toast.js';
import { icono } from './ui/iconos.js';

export const CLAVE_MENSAJE = 'ascenso2026:mensajeAcceso';
const CLAVE_APODO_PENDIENTE = 'ascenso2026:apodoPendiente';
export const APODO_RE = /^[A-Za-z0-9 _.-]{3,20}$/;
export const AYUDA_APODO = 'De 3 a 20 caracteres: letras sin tilde, números, espacio, punto, guion o guion bajo.';

/** true mientras se cierra la sesión a propósito (para ignorar el SIGNED_OUT que provoca). */
export let saliendo = false;

export const MENSAJES = {
  bloqueada: 'Cuenta bloqueada; contacta al administrador.',
  sesion: 'Tu sesión expiró o fue cerrada. Vuelve a ingresar.',
};

/** Guarda el apodo elegido al registrarse cuando hay que confirmar el correo antes de ingresar. */
export function guardarApodoPendiente(correo, apodo) {
  try { window.localStorage.setItem(CLAVE_APODO_PENDIENTE, JSON.stringify({ correo: correo.trim().toLowerCase(), apodo })); } catch { /* sin almacenamiento */ }
}
function tomarApodoPendiente(correo) {
  try {
    const o = JSON.parse(window.localStorage.getItem(CLAVE_APODO_PENDIENTE) || 'null');
    if (o && o.correo === String(correo || '').trim().toLowerCase()) return o.apodo;
  } catch { /* sin almacenamiento */ }
  return null;
}
function olvidarApodoPendiente() {
  try { window.localStorage.removeItem(CLAVE_APODO_PENDIENTE); } catch { /* sin almacenamiento */ }
}

/** Mensaje que la pantalla de acceso debe mostrar (y se consume). */
export function tomarMensajeAcceso() {
  try {
    const m = window.sessionStorage.getItem(CLAVE_MENSAJE);
    window.sessionStorage.removeItem(CLAVE_MENSAJE);
    return m;
  } catch {
    return null;
  }
}

/** Pregunta qué hacer con el progreso que ya hay en el dispositivo. */
async function preguntarConservar() {
  const r = resumenProgreso(estado);
  const v = await abrirHoja({
    titulo: '¿Conservar el progreso de este dispositivo?',
    cerrable: false,
    html: `<p>Este dispositivo tiene progreso guardado: ${fmtNum(r.preguntas)} preguntas respondidas, ${fmtNum(r.xp)} XP y ${fmtNum(r.simulacros)} simulacros.</p>
      <p class="peq atenuado">Si lo conservas, se sube a tu cuenta (y se combina con lo que ya tengas en la nube). Si lo descartas, verás el progreso de tu cuenta.</p>`,
    acciones: [
      { texto: 'Conservar y subir', clase: 'btn-primario', valor: 'conservar' },
      { texto: 'Descartar el de este dispositivo', clase: 'btn-secundario', valor: 'descartar' },
    ],
  });
  return v !== 'descartar';
}

/**
 * Tras ingresar (o al abrir la app con una sesión aún no vinculada a este dispositivo).
 * Lanza ErrorNube('bloqueado') si la cuenta está bloqueada.
 * @param {{id:string, correo:string}} usuario
 * @param {{apodo?:string}} op apodo elegido en el registro
 */
export async function trasIngresar(usuario, op = {}) {
  let bloqueado = false;
  try { bloqueado = await nube.estaBloqueado(); } catch (e) { if (e.tipo !== 'red') console.warn(e); }
  if (bloqueado) {
    await nube.cerrarSesion();
    throw new nube.ErrorNube(MENSAJES.bloqueada, 'bloqueado');
  }
  const vinculado = sync.usuarioVinculado();
  if (vinculado !== usuario.id) {
    // [Auditoría] El dispositivo tiene cambios SIN SUBIR de otra cuenta (p. ej. su sesión expiró
    // sin conexión). Ingresar con otra cuenta los borraría: se pide confirmación explícita.
    const m = sync.metaNube();
    if (vinculado && (m.pendiente || (m.cola && m.cola.length))) {
      const ok = await confirmar({
        titulo: 'Hay cambios sin sincronizar de otra cuenta',
        texto: `Este dispositivo tiene progreso sin subir de ${m.correo || 'otra cuenta'}. Si continúas con ${usuario.correo || 'esta cuenta'}, ese progreso se perderá. Para conservarlo, cancela e ingresa con la otra cuenta (con internet) para que se sincronice.`,
        aceptar: 'Continuar y descartarlo',
        cancelar: 'Cancelar',
        peligro: true,
      });
      if (!ok) {
        await nube.cerrarSesion();
        throw new nube.ErrorNube(`Ingreso cancelado: primero ingresa con ${m.correo || 'la otra cuenta'} para sincronizar su progreso.`, 'cancelado');
      }
    }
    let conservar = false;
    if (!vinculado && tieneProgreso(estado)) conservar = await preguntarConservar();
    // Si el progreso local era de OTRA cuenta, nunca se mezcla con esta.
    sync.vincular(usuario, { conservarLocal: conservar });
  }
  // Perfil y apodo
  try {
    let perfil = await nube.miPerfil();
    const apodo = op.apodo || tomarApodoPendiente(usuario.correo);
    if (perfil && !perfil.apodo && apodo) {
      try {
        perfil = { ...perfil, apodo: await nube.cambiarApodo(apodo) };
        olvidarApodoPendiente();
      } catch (e) {
        toast(`No se pudo guardar el apodo: ${e.message}`, { tipo: 'error', duracion: 6000 });
      }
    } else if (perfil && perfil.apodo) {
      olvidarApodoPendiente();
    }
    if (perfil) sync.actualizarMeta({ apodo: perfil.apodo || null, rol: perfil.rol || 'usuario', correo: perfil.correo || usuario.correo });
  } catch (e) {
    if (e.tipo !== 'red') console.warn('Perfil no disponible:', e);
  }
  try { await nube.registrarIngreso(); } catch { /* no es crítico */ }
}

/** Comprobaciones en segundo plano al abrir la app con sesión (si hay red). */
export async function revisarAlAbrir(usuario, expulsar) {
  if (!nube.enLinea()) return;
  const v = await nube.verificarSesion();
  if (v === 'invalida') { expulsar('sesion'); return; }
  if (v === 'red') return;
  try {
    if (await nube.estaBloqueado()) { expulsar('bloqueada'); return; }
    const perfil = await nube.miPerfil();
    if (perfil) sync.actualizarMeta({ apodo: perfil.apodo || null, rol: perfil.rol || 'usuario', correo: perfil.correo || usuario.correo });
    await nube.registrarIngreso();
  } catch (e) {
    if (e.tipo === 'bloqueado') expulsar('bloqueada');
    else if (e.tipo !== 'red') console.warn(e);
  }
}

/** Cierra la sesión: intenta subir lo pendiente, borra el progreso local y recarga. */
export async function cerrarSesionUsuario() {
  // [1.3.0] El consumo de la prueba gratis aún no enviado se envía antes de salir.
  try { await acceso.enviarConsumo(); } catch { /* sin red: queda en ascenso2026:acceso:pend:<uid> y se envía al volver a ingresar (H2) */ }
  let s = sync.situacionSync();
  if ((s.pendiente || s.cola) && nube.enLinea()) {
    await sync.sincronizar();
    s = sync.situacionSync();
  }
  if (s.pendiente || s.cola) {
    const ok = await confirmar({
      titulo: 'Hay cambios sin sincronizar',
      texto: nube.enLinea()
        ? 'No se pudieron subir tus últimos cambios. Si cierras sesión ahora, se perderán en este dispositivo.'
        : 'Estás sin conexión: tus últimos cambios aún no se subieron a la nube. Si cierras sesión ahora, se perderán.',
      aceptar: 'Cerrar sesión igual',
      cancelar: 'Cancelar',
      peligro: true,
    });
    if (!ok) return false;
  }
  saliendo = true;
  sync.limpiarDispositivo();
  acceso.limpiar();
  await nube.cerrarSesion();
  try { history.replaceState(null, '', `${window.location.pathname}#/inicio`); } catch { /* sin historial */ }
  window.location.reload();
  return true;
}

/** Expulsa al usuario (cuenta bloqueada o sesión inválida) y muestra la pantalla de acceso. */
export async function expulsar(motivo) {
  if (saliendo) return;
  saliendo = true;
  sync.detener();
  acceso.detener();
  // Con la cuenta bloqueada se borra el progreso local; si solo expiró la sesión se conserva
  // (al volver a ingresar con la misma cuenta se sube lo pendiente).
  if (motivo === 'bloqueada') { sync.limpiarDispositivo(); acceso.limpiar(); }
  await nube.cerrarSesion();
  try { window.sessionStorage.setItem(CLAVE_MENSAJE, MENSAJES[motivo] || MENSAJES.sesion); } catch { /* sin almacenamiento */ }
  window.location.reload();
}

/**
 * Hoja para elegir o cambiar el apodo (valida en el dispositivo y en el servidor).
 * @returns {Promise<string|null>} apodo guardado o null si se cancela
 */
export function pedirApodo({ titulo = 'Elige tu apodo', texto = 'Es el nombre con el que apareces en el ranking. Tu correo nunca se muestra.' } = {}) {
  return new Promise((resolve) => {
    let guardado = null;
    abrirHoja({
      titulo,
      html: `<form class="form-apodo" novalidate>
        <p class="peq atenuado" style="margin-top:0">${esc(texto)}</p>
        <label class="rotulo" for="apodo-hoja"><strong>Apodo</strong></label>
        <input class="entrada mt-s" id="apodo-hoja" name="apodo" maxlength="20" autocomplete="nickname" autocapitalize="off" spellcheck="false" value="${esc(sync.metaNube().apodo || '')}" autofocus>
        <p class="ayuda-campo">${esc(AYUDA_APODO)}</p>
        <p class="error-campo" role="alert" hidden></p>
        <div class="botones">
          <button type="submit" class="btn btn-primario btn-bloque">${icono('check', { tam: 20 })}Guardar apodo</button>
          <button type="button" class="btn btn-fantasma btn-bloque" data-cancelar>Más tarde</button>
        </div>
      </form>`,
      alAbrir: (hoja, cerrar) => {
        const form = hoja.querySelector('form');
        const error = hoja.querySelector('.error-campo');
        const boton = form.querySelector('[type="submit"]');
        hoja.querySelector('[data-cancelar]').addEventListener('click', () => cerrar(null));
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const apodo = form.apodo.value.trim();
          error.hidden = true;
          if (!APODO_RE.test(apodo)) { error.textContent = AYUDA_APODO; error.hidden = false; return; }
          boton.disabled = true;
          try {
            guardado = await nube.cambiarApodo(apodo);
            sync.actualizarMeta({ apodo: guardado });
            toast(`Apodo guardado: ${guardado}`, { tipo: 'exito' });
            cerrar(guardado);
          } catch (err) {
            error.textContent = err.message;
            error.hidden = false;
          } finally {
            boton.disabled = false;
          }
        });
      },
    }).then(() => resolve(guardado));
  });
}

/** Hoja para fijar una contraseña nueva (tras abrir el enlace de recuperación). */
export function pedirNuevaContrasena() {
  return abrirHoja({
    titulo: 'Crea una contraseña nueva',
    cerrable: false,
    html: `<form class="form-clave" novalidate>
      <label class="rotulo" for="clave-nueva"><strong>Contraseña nueva</strong></label>
      <input class="entrada mt-s" id="clave-nueva" type="password" minlength="8" autocomplete="new-password" autofocus>
      <p class="ayuda-campo">Al menos 8 caracteres.</p>
      <p class="error-campo" role="alert" hidden></p>
      <div class="botones"><button type="submit" class="btn btn-primario btn-bloque">Guardar contraseña</button></div>
    </form>`,
    alAbrir: (hoja, cerrar) => {
      const form = hoja.querySelector('form');
      const error = hoja.querySelector('.error-campo');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const clave = hoja.querySelector('#clave-nueva').value;
        if (clave.length < 8) { error.textContent = 'La contraseña debe tener al menos 8 caracteres.'; error.hidden = false; return; }
        try {
          await nube.actualizarContrasena(clave);
          toast('Contraseña actualizada.', { tipo: 'exito' });
          cerrar(true);
        } catch (err) {
          error.textContent = err.message;
          error.hidden = false;
        }
      });
    },
  });
}
