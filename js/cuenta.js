// cuenta.js — Flujo de la cuenta: qué hacer tras ingresar (bloqueo, [1.5.0] papelera, vínculo
// del dispositivo, «¿Conservar el progreso de este dispositivo?», [1.5.0] «Completa tus datos»
// y «¿Quieres aparecer en el ranking?», apodo, ingreso), cerrar sesión, expulsar (cuenta
// bloqueada, eliminada o sesión inválida), pedir apodo y nueva contraseña.

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
/** [1.5.0] Nombre y apellido: 2 a 60 caracteres, sin los signos < ni > (como completar_datos). */
export const NOMBRE_RE = /^[^<>]{2,60}$/;
export const AYUDA_NOMBRE = 'De 2 a 60 caracteres, sin los signos < ni >.';
/** Texto de privacidad del registro y de la pantalla «Completa tus datos». */
export const PRIVACIDAD_DATOS = 'Tu nombre y apellido solo los ve el administrador para verificar tu pago. Los demás usuarios solo ven tu apodo.';
export const PREGUNTA_RANKING = '¿Quieres aparecer en el ranking?';
const TEXTO_RANKING = 'En el ranking los demás ven tu apodo, tu XP, tu nota promedio y tu racha. En modo oculto nadie te ve, pero tú sigues viendo tu posición. Puedes cambiarlo cuando quieras en Ajustes → Cuenta.';

/** true mientras se cierra la sesión a propósito (para ignorar el SIGNED_OUT que provoca). */
export let saliendo = false;

export const MENSAJES = {
  bloqueada: 'Cuenta bloqueada; contacta al administrador.',
  eliminada: 'Cuenta eliminada; contacta al administrador.',
  sesion: 'Tu sesión expiró o fue cerrada. Vuelve a ingresar.',
};

/**
 * Guarda los datos elegidos al registrarse cuando hay que confirmar el correo antes de
 * ingresar (apodo y, desde 1.5.0, nombre y apellido).
 * @param {string} correo
 * @param {string|{apodo?:string, nombre?:string, apellido?:string}} datos
 */
export function guardarApodoPendiente(correo, datos) {
  const d = typeof datos === 'string' ? { apodo: datos } : (datos || {});
  try { window.localStorage.setItem(CLAVE_APODO_PENDIENTE, JSON.stringify({ correo: correo.trim().toLowerCase(), ...d })); } catch { /* sin almacenamiento */ }
}
function tomarApodoPendiente(correo) {
  try {
    const o = JSON.parse(window.localStorage.getItem(CLAVE_APODO_PENDIENTE) || 'null');
    if (o && o.correo === String(correo || '').trim().toLowerCase()) return { apodo: o.apodo || null, nombre: o.nombre || null, apellido: o.apellido || null };
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
 * Lanza ErrorNube('bloqueado') si la cuenta está bloqueada y [1.5.0] ErrorNube('eliminado')
 * si está en la papelera (deja de existir para su dueño aunque su sesión siga válida).
 * @param {{id:string, correo:string}} usuario
 * @param {{apodo?:string, nombre?:string, apellido?:string}} op datos elegidos en el registro
 */
export async function trasIngresar(usuario, op = {}) {
  let bloqueado = false;
  try { bloqueado = await nube.estaBloqueado(); } catch (e) { if (e.tipo !== 'red') console.warn(e); }
  if (bloqueado) {
    await nube.cerrarSesion();
    throw new nube.ErrorNube(MENSAJES.bloqueada, 'bloqueado');
  }
  let eliminado = false;
  try { eliminado = await nube.estaEliminado(); } catch (e) { if (e.tipo !== 'red') console.warn(e); }
  if (eliminado) {
    await nube.cerrarSesion();
    throw new nube.ErrorNube(MENSAJES.eliminada, 'eliminado');
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
  // Perfil, datos obligatorios (nombre y apellido), apodo y pregunta del ranking
  try {
    let perfil = await nube.miPerfil();
    const pend = tomarApodoPendiente(usuario.correo);
    const apodo = op.apodo || (pend && pend.apodo);
    // [1.5.0] Nombre y apellido del registro: el trigger de alta los toma de los metadatos;
    // si no lo hizo (metadato malformado o cuenta creada antes), se guardan aquí.
    const nombre = op.nombre || (pend && pend.nombre);
    const apellido = op.apellido || (pend && pend.apellido);
    if (perfil && (!perfil.nombre || !perfil.apellido) && nombre && apellido) {
      try {
        const r = await nube.completarDatos(nombre, apellido);
        perfil = { ...perfil, nombre: r.nombre, apellido: r.apellido };
      } catch (e) {
        if (e.tipo !== 'red') console.warn('No se pudieron guardar el nombre y el apellido:', e);
      }
    }
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
    if (perfil) {
      guardarPerfilEnMeta(perfil, usuario);
      // Las pantallas obligatorias (datos y ranking) se abren DESPUÉS de entrar a la app, con
      // revisarDatosCuenta(): así la app queda montada detrás de la hoja (que la deja inerte)
      // y no se bloquea el ingreso esperando una respuesta.
      perfilReciente = perfil;
    }
  } catch (e) {
    if (e.tipo !== 'red') console.warn('Perfil no disponible:', e);
  }
  try { await nube.registrarIngreso(); } catch { /* no es crítico */ }
}

/** Perfil leído en el último trasIngresar(), para no volver a pedirlo al entrar. */
let perfilReciente = null;

/**
 * Pantallas obligatorias de la cuenta justo después de entrar a la app (lo llama main.js).
 * Usa el perfil que ya leyó trasIngresar() o lo vuelve a pedir.
 */
export async function revisarDatosCuenta() {
  if (!nube.enLinea()) return exigirDatosSinRed();
  let perfil = perfilReciente;
  perfilReciente = null;
  if (!perfil) {
    try { perfil = await nube.miPerfil(); } catch (e) {
      if (e.tipo !== 'red') console.warn('Perfil no disponible:', e);
      return exigirDatosSinRed();
    }
  }
  if (!perfil) return null;
  guardarPerfilEnMeta(perfil);
  return exigirDatosCuenta(perfil);
}

/**
 * Guarda en el dispositivo lo que la interfaz necesita del perfil (sin datos de otros).
 * [1.5.1 · seguridad] `rolConfirmado` deja constancia de que este rol lo dijo el SERVIDOR para
 * esta cuenta: acceso.js solo concede la exención de administrador con esa marca (y, si hay red,
 * solo si el rol llegó en esta ejecución: por eso `marcarRolFresco`). [1.5.1 · ronda 2] La marca
 * se ata al inicio de sesión actual con el sello del token del servidor (nube.selloSesion).
 */
function guardarPerfilEnMeta(perfil, usuario = null) {
  const uid = perfil.id || (usuario && usuario.id) || sync.metaNube().usuario || null;
  const sello = nube.selloSesion();
  sync.marcarRolFresco();
  sync.actualizarMeta({
    apodo: perfil.apodo || null,
    rol: perfil.rol || 'usuario',
    rolConfirmado: uid ? { uid, fecha: new Date().toISOString(), sesion: sello && sello.uid === uid ? sello.sesion : null } : null,
    correo: perfil.correo || (usuario ? usuario.correo : '') || sync.metaNube().correo || '',
    nombre: perfil.nombre || null,
    apellido: perfil.apellido || null,
    rankingVisible: perfil.ranking_visible === true || perfil.ranking_visible === false ? perfil.ranking_visible : null,
    // [1.5.0 · ronda 2] Marca de que al servidor le faltan el nombre o el apellido de esta
    // cuenta: así la pantalla obligatoria se exige también cuando la app abre sin conexión
    // (sin esta marca no se exige: no se puede saber si faltan).
    datosPendientes: !(perfil.nombre && perfil.apellido),
  });
}

/** Comprobaciones en segundo plano al abrir la app con sesión (si hay red). */
export async function revisarAlAbrir(usuario, expulsar) {
  if (!nube.enLinea()) { await exigirDatosSinRed(); return; }
  const v = await nube.verificarSesion();
  if (v === 'invalida') { expulsar('sesion'); return; }
  if (v === 'red') return;
  try {
    if (await nube.estaBloqueado()) { expulsar('bloqueada'); return; }
    if (await nube.estaEliminado()) { expulsar('eliminada'); return; }
    const perfil = await nube.miPerfil();
    if (perfil) {
      guardarPerfilEnMeta(perfil, usuario);
      await exigirDatosCuenta(perfil);
    }
    await nube.registrarIngreso();
  } catch (e) {
    if (e.tipo === 'bloqueado') expulsar('bloqueada');
    else if (e.tipo === 'eliminado') expulsar('eliminada');
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

/**
 * Expulsa al usuario (cuenta bloqueada, [1.5.0] eliminada o sesión inválida) y muestra la
 * pantalla de acceso con el mensaje correspondiente.
 */
export async function expulsar(motivo) {
  if (saliendo) return;
  saliendo = true;
  sync.detener();
  acceso.detener();
  // Con la cuenta bloqueada o eliminada se borra el progreso local; si solo expiró la sesión se
  // conserva (al volver a ingresar con la misma cuenta se sube lo pendiente).
  if (motivo === 'bloqueada' || motivo === 'eliminada') { sync.limpiarDispositivo(); acceso.limpiar(); }
  await nube.cerrarSesion();
  try { window.sessionStorage.setItem(CLAVE_MENSAJE, MENSAJES[motivo] || MENSAJES.sesion); } catch { /* sin almacenamiento */ }
  window.location.reload();
}

/**
 * [1.5.0] Pantallas obligatorias de la cuenta, en orden: «Completa tus datos» (si falta el
 * nombre o el apellido) y la pregunta del ranking (si `ranking_visible` es null): junto con el
 * apodo cuando aún no hay apodo, o en una pantalla breve propia si ya lo tenía.
 * «Completa tus datos» se exige siempre (también sin conexión: se queda abierta hasta que el
 * servidor confirme los datos). La pregunta del ranking, en cambio, solo se hace con red: no
 * tiene respuesta por defecto y se vuelve a preguntar al siguiente ingreso.
 * @param {object} perfil fila de `perfiles` de la cuenta propia
 * @returns {Promise<object>} el perfil con lo que se haya guardado
 */
let pidiendoDatos = false;
export async function exigirDatosCuenta(perfil) {
  if (!perfil || pidiendoDatos) return perfil;
  pidiendoDatos = true;
  let p = perfil;
  try {
    if (!p.nombre || !p.apellido) {
      const r = await pedirDatos(p);
      if (r) p = { ...p, nombre: r.nombre, apellido: r.apellido };
    }
    if (nube.enLinea() && p.ranking_visible !== true && p.ranking_visible !== false) {
      if (!p.apodo) {
        const r = await pedirApodo({ conRanking: true });
        if (r) p = { ...p, apodo: r.apodo, ranking_visible: r.visible };
      } else {
        const v = await pedirRanking();
        if (v === true || v === false) p = { ...p, ranking_visible: v };
      }
    }
  } finally {
    pidiendoDatos = false;
  }
  guardarPerfilEnMeta(p);
  return p;
}

/**
 * [1.5.0 · ronda 2] Lo mismo sin conexión, cuando no se puede leer el perfil: si la última vez
 * que se habló con el servidor faltaban el nombre o el apellido (`datosPendientes` en los
 * metadatos del dispositivo), la pantalla obligatoria se abre igual y NO se puede saltar; se
 * cierra cuando vuelva la conexión y `completar_datos` confirme los datos.
 * Sin esa marca no se exige nada: no habría forma de saber si faltan.
 * @returns {Promise<{nombre:string, apellido:string}|null>}
 */
export async function exigirDatosSinRed() {
  if (pidiendoDatos || !sync.metaNube().datosPendientes) return null;
  pidiendoDatos = true;
  let guardado = null;
  try {
    const m = sync.metaNube();
    guardado = await pedirDatos({ nombre: m.nombre || '', apellido: m.apellido || '' });
  } finally {
    pidiendoDatos = false;
  }
  // Si se guardaron (porque volvió la conexión), se siguen las demás pantallas obligatorias con
  // el perfil al día: la pregunta del ranking.
  if (guardado && nube.enLinea()) {
    try {
      const perfil = await nube.miPerfil();
      if (perfil) {
        guardarPerfilEnMeta(perfil);
        await exigirDatosCuenta(perfil);
      }
    } catch (e) {
      if (e.tipo !== 'red') console.warn('Perfil no disponible:', e);
    }
  }
  return guardado;
}

/**
 * Pantalla obligatoria «Completa tus datos»: no se puede saltar ni cerrar (sin nombre y
 * apellido guardados en el servidor no se usa la app). Solo se cierra cuando `completar_datos`
 * los confirma; sin conexión se avisa y se espera a que vuelva la red.
 * @returns {Promise<{nombre:string, apellido:string}|null>}
 */
export function pedirDatos({ nombre = '', apellido = '' } = {}) {
  return new Promise((resolve) => {
    let guardado = null;
    let quitarEscuchas = null;
    abrirHoja({
      titulo: 'Completa tus datos',
      clase: 'hoja-datos',
      cerrable: false,
      html: `<form class="form-datos" id="form-datos" novalidate>
        <p class="peq atenuado" style="margin-top:0">Para verificar tu pago necesitamos tu nombre y tu apellido.</p>
        <label class="rotulo" for="datos-nombre"><strong>Nombre</strong></label>
        <input class="entrada mt-s" id="datos-nombre" name="nombre" maxlength="60" autocomplete="given-name" value="${esc(nombre || '')}" autofocus>
        <label class="rotulo mt-s" for="datos-apellido"><strong>Apellido</strong></label>
        <input class="entrada mt-s" id="datos-apellido" name="apellido" maxlength="60" autocomplete="family-name" value="${esc(apellido || '')}">
        <p class="ayuda-campo">${esc(AYUDA_NOMBRE)}</p>
        <p class="error-campo" id="datos-error" role="alert" hidden></p>
        <p class="peq atenuado" id="datos-sin-red" hidden>Estás sin conexión: tus datos se guardan en el servidor, así que esta pantalla se cerrará en cuanto vuelva el internet y se guarden.</p>
        <p class="peq atenuado" id="datos-privacidad">${esc(PRIVACIDAD_DATOS)}</p>
        <div class="botones">
          <button type="submit" class="btn btn-primario btn-bloque">${icono('check', { tam: 20 })}Guardar y continuar</button>
        </div>
      </form>`,
      alAbrir: (hoja, cerrar) => {
        const form = hoja.querySelector('form');
        const error = hoja.querySelector('#datos-error');
        const boton = form.querySelector('[type="submit"]');
        const sinRed = hoja.querySelector('#datos-sin-red');
        // Aviso de «sin conexión» (no hay botón para saltar: los datos son obligatorios).
        const revisarRed = () => { sinRed.hidden = nube.enLinea(); };
        revisarRed();
        window.addEventListener('online', revisarRed);
        window.addEventListener('offline', revisarRed);
        quitarEscuchas = () => {
          window.removeEventListener('online', revisarRed);
          window.removeEventListener('offline', revisarRed);
        };
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const n = form.nombre.value.trim();
          const a = form.apellido.value.trim();
          error.hidden = true;
          if (!NOMBRE_RE.test(n)) { error.textContent = `Escribe tu nombre. ${AYUDA_NOMBRE}`; error.hidden = false; form.nombre.focus(); return; }
          if (!NOMBRE_RE.test(a)) { error.textContent = `Escribe tu apellido. ${AYUDA_NOMBRE}`; error.hidden = false; form.apellido.focus(); return; }
          boton.disabled = true;
          try {
            const r = await nube.completarDatos(n, a);
            guardado = { nombre: r.nombre, apellido: r.apellido };
            sync.actualizarMeta({ nombre: guardado.nombre, apellido: guardado.apellido, datosPendientes: false });
            toast('Datos guardados.', { tipo: 'exito' });
            cerrar(guardado);
          } catch (err) {
            // Sin conexión la pantalla se queda abierta: no hay forma de guardarlos y tampoco
            // de seguir sin ellos (criterio 1 del encargo).
            error.textContent = err.tipo === 'red'
              ? `${err.message} Tus datos se guardan en el servidor: vuelve a intentarlo cuando tengas internet.`
              : err.message;
            error.hidden = false;
            revisarRed();
          } finally {
            boton.disabled = false;
          }
        });
      },
    }).then(() => { if (quitarEscuchas) quitarEscuchas(); resolve(guardado); });
  });
}

/**
 * Pantalla breve «¿Quieres aparecer en el ranking?» para las cuentas que ya tienen apodo y
 * aún no respondieron (`ranking_visible` null).
 * @returns {Promise<boolean|null>} lo guardado, o null si no se pudo guardar
 */
export function pedirRanking() {
  return new Promise((resolve) => {
    let guardado = null;
    abrirHoja({
      titulo: PREGUNTA_RANKING,
      clase: 'hoja-ranking',
      cerrable: false,
      html: `<div id="pregunta-ranking">
        <p class="peq atenuado" style="margin-top:0">${esc(TEXTO_RANKING)}</p>
        <p class="error-campo" id="ranking-error" role="alert" hidden></p>
        <div class="botones">
          <button type="button" class="btn btn-primario btn-bloque" data-accion="ranking-si">${icono('podio', { tam: 20 })}Sí, aparecer</button>
          <button type="button" class="btn btn-secundario btn-bloque" data-accion="ranking-no">${icono('ojo-no', { tam: 20 })}No, permanecer oculto</button>
        </div>
      </div>`,
      alAbrir: (hoja, cerrar) => {
        const error = hoja.querySelector('#ranking-error');
        const botones = [...hoja.querySelectorAll('[data-accion^="ranking-"]')];
        for (const b of botones) {
          b.addEventListener('click', async () => {
            const visible = b.dataset.accion === 'ranking-si';
            error.hidden = true;
            for (const x of botones) x.disabled = true;
            try {
              guardado = await nube.cambiarRankingVisible(visible);
              sync.actualizarMeta({ rankingVisible: guardado });
              toast(guardado ? 'Apareces en el ranking.' : 'Estás en modo oculto: los demás no te ven.', { tipo: 'exito' });
              cerrar(guardado);
            } catch (err) {
              error.textContent = err.message;
              error.hidden = false;
              for (const x of botones) x.disabled = false;
              // Sin red se cierra para no bloquear la app: se vuelve a preguntar al reingresar.
              if (err.tipo === 'red') cerrar(null);
            }
          });
        }
      },
    }).then(() => resolve(guardado));
  });
}

/**
 * Hoja para elegir o cambiar el apodo (valida en el dispositivo y en el servidor).
 * [1.5.0] Con `conRanking` incluye la pregunta «¿Quieres aparecer en el ranking?» en el mismo
 * paso (es lo que se hace cuando la cuenta aún no tiene apodo ni respondió la pregunta).
 * @returns {Promise<{apodo:string, visible:boolean|null}|null>} lo guardado o null si se cancela
 */
export function pedirApodo({
  titulo = 'Elige tu apodo',
  texto = 'Es el nombre con el que apareces en el ranking. Tu correo nunca se muestra.',
  conRanking = false,
} = {}) {
  return new Promise((resolve) => {
    let guardado = null;
    let visible = true;
    abrirHoja({
      titulo,
      html: `<form class="form-apodo" novalidate>
        <p class="peq atenuado" style="margin-top:0">${esc(texto)}</p>
        <label class="rotulo" for="apodo-hoja"><strong>Apodo</strong></label>
        <input class="entrada mt-s" id="apodo-hoja" name="apodo" maxlength="20" autocomplete="nickname" autocapitalize="off" spellcheck="false" value="${esc(sync.metaNube().apodo || '')}" autofocus>
        <p class="ayuda-campo">${esc(AYUDA_APODO)}</p>
        ${conRanking ? `<div id="apodo-ranking" class="mt-m">
          <p class="rotulo" id="apodo-ranking-et"><strong>${esc(PREGUNTA_RANKING)}</strong></p>
          <div class="segmentos" role="group" aria-labelledby="apodo-ranking-et">
            <button type="button" data-accion="ranking-op" data-valor="si" aria-pressed="true">Sí, aparecer</button>
            <button type="button" data-accion="ranking-op" data-valor="no" aria-pressed="false">No, permanecer oculto</button>
          </div>
          <p class="ayuda-campo">${esc(TEXTO_RANKING)}</p>
        </div>` : ''}
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
        if (conRanking) {
          for (const b of hoja.querySelectorAll('[data-accion="ranking-op"]')) {
            b.addEventListener('click', () => {
              visible = b.dataset.valor === 'si';
              for (const x of hoja.querySelectorAll('[data-accion="ranking-op"]')) x.setAttribute('aria-pressed', String(x === b));
            });
          }
        }
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const apodo = form.apodo.value.trim();
          error.hidden = true;
          if (!APODO_RE.test(apodo)) { error.textContent = AYUDA_APODO; error.hidden = false; return; }
          boton.disabled = true;
          try {
            const nuevo = await nube.cambiarApodo(apodo, conRanking ? visible : null);
            guardado = { apodo: nuevo, visible: conRanking ? visible : null };
            sync.actualizarMeta(conRanking ? { apodo: nuevo, rankingVisible: visible } : { apodo: nuevo });
            toast(`Apodo guardado: ${nuevo}`, { tipo: 'exito' });
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
