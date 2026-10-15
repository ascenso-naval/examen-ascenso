// acceso.js — Prueba gratis y pago único (v1.3.0). La fuente de verdad es Supabase
// (estado_acceso / registrar_consumo / registrar_pago, esquema 1.2.0); aquí se guarda el
// último estado conocido y el consumo local aún no enviado, para decidir sin red.
//
// · Consumo: cada respuesta de práctica/repaso (evento 'respuesta-registrada' de
//   gamificacion.js) y cada ficha revelada por primera vez en Explorar (vista-explorar.js)
//   suma 1 pregunta; cada simulacro entregado ('sesion-terminada' con
//   tipo 'simulacro') suma 1 simulacro. Se envía en lotes con registrar_consumo: al llegar a
//   10 preguntas pendientes, al terminar un simulacro, al agotarse la prueba, al ocultar la
//   app, al reconectar y al cerrar sesión.
// · Consulta estado_acceso: al iniciar sesión / abrir la app, al reconectar, al volver al
//   primer plano y tras cada simulacro; con el plan «pendiente», además cada 60 s.
// · «Agotado» local = último estado conocido en prueba y (contadores del servidor + consumo
//   local pendiente) ≥ límites conocidos; también bloquea sin conexión. Plan «pendiente»
//   bloquea siempre. Admin, «pagado» y «cortesia» nunca se bloquean.
//
// [1.5.1 · seguridad] QUIÉN DECIDE EL ACCESO. Con red lo decide SIEMPRE la respuesta fresca de
// estado_acceso() del servidor (se consulta al arrancar, al reconectar y al volver a primer
// plano). Lo guardado en el dispositivo es solo una CACHÉ para el modo sin conexión.
//
// [1.5.1 · ronda 2] MIENTRAS NO HAY RESPUESTA FRESCA NO HAY ACCESO. La caché NO se usa si se
// puede preguntar al servidor: con red y sin respuesta todavía, agotado() es verdadero y la
// pantalla de bloqueo muestra «Comprobando tu acceso…» (main.js tampoco monta el enrutador hasta
// que la consulta termina, así que ninguna ruta de estudio se abre con la caché). La caché solo
// decide cuando NO hay forma de preguntar (sin red, o la consulta falló por red) y además:
//   · la respuesta la confirmó el servidor para ESTA cuenta (marca «confirmado» {uid, fecha}),
//   · la marca pertenece al INICIO DE SESIÓN actual (nube.selloSesion(): «sub» y «session_id»
//     del token firmado por el servidor; otra cuenta, otro dispositivo o una sesión anterior →
//     no vale), y
//   · no tiene más de 30 días (pasado ese plazo hay que volver a conectarse).
// Sin eso → se trata como agotado y la pantalla avisa «sin conexión: no se pudo verificar tu
// acceso». Lo mismo con el rol: la exención de administrador exige que el rol venga del servidor
// en esta ejecución (sincronizacion.rolFresco()) o una marca «rolConfirmado» válida sin red.
// LÍMITE CONOCIDO (deuda registrada): el dueño del dispositivo puede leer su token y fabricar
// una marca con DevTools; sin firma del servidor en la respuesta (cambiaría backend/) no hay
// forma de impedirlo desde el navegador. Por eso el consumo se registra y se envía SIEMPRE que
// haya red aunque el cliente se crea exento: quien decide si cuenta es el servidor
// (registrar_consumo ya ignora admin, pagado y cortesía) y todo lo sensible lo niega RLS.
// · Avisos por bus.js: 'acceso-cambio' (snapshot) y 'acceso-desbloqueado' ({plan}).
//
// Persistencia: localStorage['ascenso2026:acceso'] = {usuario, servidor, actualizado,
// confirmado:{uid,fecha,sesion}, pend:{p,s}, miniatura}.
// [Auditoría H2] El consumo pendiente se copia además, por cuenta, en
// localStorage['ascenso2026:acceso:pend:<uid>'] = {p,s}; limpiar() (cerrar sesión) NO la borra,
// de modo que si se cierra sesión sin conexión el consumo no se pierde: al volver a ingresar
// con la MISMA cuenta se recupera y se envía con registrar_consumo. Con otra cuenta se
// conserva intacto el de la anterior (nunca se mezclan). Se borra al quedar en cero.

import * as nube from './nube.js';
import { metaNube, rolFresco } from './sincronizacion.js';
import { emitir, escuchar } from './bus.js';

export const CLAVE_ACCESO = 'ascenso2026:acceso';
const LOTE_PREGUNTAS = 10;
const SONDEO_MS = 60000;
const MAX_P = 200;   // por llamada a registrar_consumo (contrato del servidor)
const MAX_S = 5;
/** [1.5.1 · ronda 2] Caducidad de la caché sin conexión: pasado el plazo hay que reconectarse. */
const MAX_EDAD_CONFIRMACION_MS = 30 * 86400000;          // 30 días
const MARGEN_FUTURO_MS = 86400000;                       // tolerancia de reloj (1 día)

const base = (usuario = null) => ({ usuario, servidor: null, actualizado: null, confirmado: null, pend: { p: 0, s: 0 }, miniatura: null });

let datos = leer();
let activo = false;
let cadena = Promise.resolve();      // las llamadas al servidor se hacen de una en una
let sondeo = null;
let ultimoAgotado = null;
let alExpulsar = null;
/** true si la última llamada al servidor falló por red (no se pudo verificar el acceso). */
let falloDeRed = false;
/**
 * [1.5.1 · ronda 2] true si el servidor respondió estado_acceso() en ESTA ejecución de la app.
 * Vive solo en memoria: no hay forma de escribirlo desde DevTools, así que es lo único que
 * concede acceso mientras haya red.
 */
let respuestaFresca = false;

/**
 * ¿No hay forma de preguntarle al servidor? (sin red, o la última consulta falló por red).
 * Solo en ese caso la caché del dispositivo decide algo.
 */
const sinPoderPreguntar = () => !nube.enLinea() || falloDeRed;

/**
 * Marca de confirmación del servidor: {uid, fecha, sesion}. Vale si es de esta cuenta, del inicio
 * de sesión actual (sello del token del servidor) y de hace menos de 30 días.
 */
function marcaValida(c, uid) {
  if (!(c && typeof c === 'object' && typeof c.uid === 'string' && c.uid && c.uid === uid && typeof c.fecha === 'string')) return false;
  const t = Date.parse(c.fecha);
  if (Number.isNaN(t) || Date.now() - t > MAX_EDAD_CONFIRMACION_MS || t - Date.now() > MARGEN_FUTURO_MS) return false;
  const sello = nube.selloSesion();
  if (!sello || sello.uid !== uid) return false;            // sin sesión del servidor no vale nada
  if (sello.sesion && c.sesion !== sello.sesion) return false;   // marca de otra sesión o dispositivo
  return true;
}

/** Sello que se guarda con cada respuesta del servidor (ata la marca a esta sesión). */
function selloActual() {
  const s = nube.selloSesion();
  return s && datos.usuario && s.uid === datos.usuario ? s.sesion : null;
}

function leer() {
  try {
    const o = JSON.parse(window.localStorage.getItem(CLAVE_ACCESO) || 'null');
    if (o && typeof o === 'object') {
      const usuario = o.usuario || null;
      return {
        ...base(usuario),
        servidor: o.servidor && typeof o.servidor === 'object' ? o.servidor : null,
        actualizado: o.actualizado || null,
        // La marca se guarda tal cual (su validez se comprueba al usarla, con marcaValida).
        confirmado: o.confirmado && typeof o.confirmado === 'object'
          ? { uid: o.confirmado.uid, fecha: o.confirmado.fecha, sesion: o.confirmado.sesion ?? null } : null,
        pend: { p: Math.max(0, Number(o.pend?.p) || 0), s: Math.max(0, Number(o.pend?.s) || 0) },
        miniatura: o.miniatura && typeof o.miniatura.dataUrl === 'string' ? o.miniatura : null,
      };
    }
  } catch { /* sin almacenamiento */ }
  return base();
}

export const clavePend = (uid) => `${CLAVE_ACCESO}:pend:${uid}`;

/** Consumo pendiente guardado fuera de la sesión para esa cuenta ({p,s}; ceros si no hay). */
function leerPend(uid) {
  try {
    const o = JSON.parse(window.localStorage.getItem(clavePend(uid)) || 'null');
    if (o && typeof o === 'object') return { p: Math.max(0, Math.trunc(Number(o.p)) || 0), s: Math.max(0, Math.trunc(Number(o.s)) || 0) };
  } catch { /* sin almacenamiento */ }
  return { p: 0, s: 0 };
}

function guardarPend() {
  if (!datos.usuario) return;
  try {
    if (datos.pend.p > 0 || datos.pend.s > 0) window.localStorage.setItem(clavePend(datos.usuario), JSON.stringify(datos.pend));
    else window.localStorage.removeItem(clavePend(datos.usuario));
  } catch { /* sin almacenamiento */ }
}

function guardar() {
  try { window.localStorage.setItem(CLAVE_ACCESO, JSON.stringify(datos)); } catch { /* sin almacenamiento */ }
  guardarPend();
}

const ent = (v, d = 0) => (Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : d);

/** Normaliza la respuesta de estado_acceso() / registrar_consumo() / registrar_pago(). */
function normalizar(r) {
  const o = r && typeof r === 'object' ? r : {};
  const c = o.config && typeof o.config === 'object' ? o.config : {};
  return {
    plan: typeof o.plan === 'string' ? o.plan : 'prueba',
    preguntas_prueba: Math.max(0, ent(o.preguntas_prueba)),
    simulacros_prueba: Math.max(0, ent(o.simulacros_prueba)),
    limite_preguntas: Math.max(1, ent(o.limite_preguntas, 50)),
    limite_simulacros: Math.max(1, ent(o.limite_simulacros, 1)),
    agotado: !!o.agotado,
    pago_pendiente: o.pago_pendiente && typeof o.pago_pendiente === 'object' ? o.pago_pendiente : null,
    config: {
      medios: Array.isArray(c.medios) ? c.medios.filter((m) => m && (m.medio === 'yape' || m.medio === 'plin') && m.numero) : [],
      monto: Number(c.monto) > 0 ? Number(c.monto) : 20,
      texto_ayuda: typeof c.texto_ayuda === 'string' ? c.texto_ayuda : '',
    },
  };
}

// ---------------------------------------------------------------------------
// Consultas (síncronas) para la interfaz
// ---------------------------------------------------------------------------

/**
 * Rol guardado al ingresar. Sirve para mostrar el panel de administración (el servidor niega
 * igual cada función), NO para decidir el acceso al estudio: para eso hace falta
 * `rolConfirmado` (la marca que deja cuenta.js cuando el rol viene del servidor).
 */
export const esAdmin = () => metaNube().rol === 'admin';

/**
 * Administrador según el servidor: o lo dijo en esta ejecución de la app (rolFresco), o no hay
 * forma de preguntar y la marca «rolConfirmado» de este inicio de sesión lo respalda.
 */
function adminConfirmado() {
  const m = metaNube();
  if (m.rol !== 'admin') return false;
  if (rolFresco()) return true;
  return sinPoderPreguntar() && marcaValida(m.rolConfirmado, datos.usuario);
}

/**
 * ¿Hay un estado de acceso en el que se pueda confiar? Con red, solo la respuesta fresca del
 * servidor de esta ejecución; sin poder preguntar, la caché que el servidor confirmó para esta
 * cuenta en este inicio de sesión (ver marcaValida).
 */
export function verificado() {
  if (!datos.servidor) return false;
  if (respuestaFresca) return true;
  return sinPoderPreguntar() && marcaValida(datos.confirmado, datos.usuario);
}

/**
 * ¿Se está esperando la respuesta del servidor? (hay red y aún no contestó). Mientras tanto no
 * hay acceso: la pantalla de bloqueo lo explica con «Comprobando tu acceso…».
 */
export const verificando = () => !!datos.usuario && !verificado() && nube.enLinea() && !falloDeRed;

/** Sin límites: admin, plan pagado o cortesía, según lo que haya confirmado el servidor. */
export function esExento() {
  if (!verificado()) return false;
  if (adminConfirmado()) return true;
  const s = datos.servidor;
  return s.plan === 'pagado' || s.plan === 'cortesia';
}

export const enPendiente = () => !adminConfirmado() && verificado() && datos.servidor.plan === 'pendiente';
export const enPrueba = () => !esExento() && verificado() && datos.servidor.plan !== 'pendiente';
export const conocido = () => verificado();

/** Preguntas y simulacros consumidos (servidor confirmado + pendientes de enviar). */
export function consumo() {
  const s = verificado() ? datos.servidor : null;
  return {
    preguntas: (s ? s.preguntas_prueba : 0) + datos.pend.p,
    simulacros: (s ? s.simulacros_prueba : 0) + datos.pend.s,
    limitePreguntas: s ? s.limite_preguntas : null,
    limiteSimulacros: s ? s.limite_simulacros : null,
  };
}

/**
 * ¿Debe bloquearse la app? Con un estado en el que se puede confiar manda lo que dijo el servidor
 * (más el consumo local pendiente). Sin él se bloquea SIEMPRE: mientras se espera la respuesta
 * («Comprobando tu acceso…») y también si no hay forma de preguntar («no se pudo verificar tu
 * acceso»). Criterio: nunca se concede acceso que el servidor no haya confirmado.
 */
export function agotado() {
  if (!datos.usuario) return false;
  if (esExento()) return false;
  if (!verificado()) return true;
  const s = datos.servidor;
  if (s.plan === 'pendiente') return true;
  if (s.agotado) return true;
  const c = consumo();
  return c.preguntas >= s.limite_preguntas || c.simulacros >= s.limite_simulacros;
}

/** Fotografía del estado para las vistas. */
export function estadoAcceso() {
  const s = verificado() ? datos.servidor : null;
  return {
    conocido: !!s,
    verificado: verificado(),
    verificando: verificando(),
    plan: s ? s.plan : null,
    exento: esExento(),
    admin: esAdmin(),
    agotado: agotado(),
    pendiente: enPendiente(),
    consumo: consumo(),
    pago: s ? s.pago_pendiente : null,
    config: s ? s.config : { medios: [], monto: 20, texto_ayuda: '' },
    actualizado: datos.actualizado,
    miniatura: datos.miniatura,
  };
}

// ---------------------------------------------------------------------------
// Avisos
// ---------------------------------------------------------------------------
function notificar() {
  const ahora = agotado();
  const snap = estadoAcceso();
  if (ultimoAgotado === true && !ahora && (snap.plan === 'pagado' || snap.plan === 'cortesia')) {
    emitir('acceso-desbloqueado', { plan: snap.plan });
  }
  // [1.5.1 · ronda 2] Solo un bloqueo VERIFICADO cuenta como «estaba bloqueado»: mientras se
  // espera la respuesta del servidor no se sabe nada, y pasar de «esperando» a «con acceso» no
  // es un desbloqueo (si no, el agradecimiento del pago saldría en cada arranque).
  ultimoAgotado = snap.verificado ? ahora : null;
  emitir('acceso-cambio', snap);
  programarSondeo();
}

/**
 * Guarda una respuesta FRESCA del servidor y deja la marca de confirmación de esta cuenta en
 * este dispositivo (atada a este inicio de sesión): a partir de aquí la caché sirve también sin
 * conexión. Que la respuesta sea de esta ejecución es lo que concede el acceso con red.
 */
function guardarServidor(r) {
  datos.servidor = normalizar(r);
  datos.actualizado = new Date().toISOString();
  datos.confirmado = datos.usuario ? { uid: datos.usuario, fecha: datos.actualizado, sesion: selloActual() } : null;
  respuestaFresca = !!datos.usuario;
  falloDeRed = false;
  guardar();
}

function aplicarServidor(r) {
  guardarServidor(r);
  notificar();
}

function programarSondeo() {
  const debe = activo && verificado() && datos.servidor.plan === 'pendiente' && !adminConfirmado();
  if (debe && !sondeo) {
    sondeo = setInterval(() => {
      if (document.visibilityState !== 'hidden') consultar();
    }, SONDEO_MS);
  } else if (!debe && sondeo) {
    clearInterval(sondeo);
    sondeo = null;
  }
}

/** Encola una operación con el servidor (una a la vez). */
function enCola(fn) {
  const p = cadena.then(fn, fn);
  cadena = p.catch(() => {});
  return p;
}

async function manejarError(e) {
  // Sin respuesta por red no se puede verificar el acceso: si no había confirmación previa,
  // agotado() pasa a bloquear (con el aviso «no se pudo verificar tu acceso»).
  if (e && e.tipo === 'red') falloDeRed = true;
  if (e && e.tipo === 'bloqueado' && alExpulsar) { alExpulsar('bloqueada'); return; }
  // [1.5.0] La cuenta se fue a la papelera: deja de existir para su dueño al instante.
  if (e && e.tipo === 'eliminado' && alExpulsar) { alExpulsar('eliminada'); return; }
  if (e && e.tipo !== 'red') console.warn('Acceso:', e.message || e);
}

// ---------------------------------------------------------------------------
// Servidor
// ---------------------------------------------------------------------------

/** Envía el consumo pendiente (todo, en tramos de ≤ 200 / ≤ 5). Devuelve el estado o null. */
export function enviarConsumo() {
  return enCola(async () => {
    if (!activo || !nube.enLinea()) return null;
    let ultimo = null;
    try {
      while (datos.pend.p > 0 || datos.pend.s > 0) {
        const p = Math.min(datos.pend.p, MAX_P);
        const s = Math.min(datos.pend.s, MAX_S);
        const r = await nube.registrarConsumo(p, s);
        datos.pend.p = Math.max(0, datos.pend.p - p);
        datos.pend.s = Math.max(0, datos.pend.s - s);
        ultimo = r;
        guardarServidor(r);
      }
    } catch (e) {
      await manejarError(e);
    }
    notificar();   // también sin respuesta: un fallo de red puede cambiar agotado()
    return ultimo ? estadoAcceso() : null;
  });
}

/** Consulta el estado en el servidor (si hay consumo pendiente, lo envía y usa la respuesta). */
export function consultar() {
  if (datos.pend.p > 0 || datos.pend.s > 0) {
    return enviarConsumo().then((r) => r || (datos.pend.p || datos.pend.s ? null : consultar()));
  }
  return enCola(async () => {
    if (!activo || !nube.enLinea()) return null;
    try {
      aplicarServidor(await nube.estadoAcceso());
      return estadoAcceso();
    } catch (e) {
      await manejarError(e);
      return null;
    }
  });
}

/**
 * Suma consumo de la prueba. Se cuenta SIEMPRE (aunque el cliente se crea exento): quien decide
 * si cuenta es el servidor, que ignora el consumo de admin, pagado y cortesía. Así un
 * localStorage manipulado no sirve para estudiar sin registrar nada.
 */
function sumar(tipo) {
  if (!activo) return;
  datos.pend[tipo] += 1;
  guardar();
  notificar();
  // Lote de 10 preguntas, simulacro terminado o prueba recién agotada: se avisa al servidor.
  if (tipo === 's' || datos.pend.p >= LOTE_PREGUNTAS || agotado()) enviarConsumo();
}

/**
 * Sube la captura (ya comprimida) y registra el comprobante. Reemplaza el pendiente si lo había.
 * @param {{medio:'yape'|'plin', operacion:string, imagen?:Blob, capturaPath?:string, miniatura?:string}} p
 *   imagen nueva, o capturaPath de la ya subida (al corregir solo la operación).
 */
export function enviarComprobante({ medio, operacion, imagen = null, capturaPath = null, miniatura = null }) {
  return enCola(async () => {
    let ruta = capturaPath;
    if (imagen) ruta = await nube.subirComprobante(imagen);
    if (!ruta) throw new nube.ErrorNube('Sube la captura del voucher (imagen) para continuar.', 'validacion');
    const r = await nube.registrarPago(medio, operacion, ruta);
    if (miniatura) datos.miniatura = { path: ruta, dataUrl: miniatura };
    aplicarServidor(r);
    return estadoAcceso();
  });
}

// ---------------------------------------------------------------------------
// Ciclo de vida
// ---------------------------------------------------------------------------
let oyentesListos = false;

/**
 * Arranca con la sesión activa (lo llama main.js al entrar). Devuelve la promesa de la PRIMERA
 * consulta al servidor: main.js la espera antes de montar el enrutador, de modo que ninguna ruta
 * de estudio se abra con la caché del dispositivo.
 * @param {{id:string}} usuario
 * @param {{alExpulsar?:(motivo:string)=>void}} op
 */
export function iniciar(usuario, op = {}) {
  alExpulsar = op.alExpulsar || alExpulsar;
  if (!usuario || datos.usuario !== usuario.id) {
    // Otra cuenta: lo confirmado para la anterior no vale para esta.
    respuestaFresca = false;
    // Otra cuenta (o sesión nueva tras cerrar): el consumo pendiente de la anterior queda en su
    // propia clave; el de ESTA cuenta (si lo dejó al cerrar sesión sin conexión) se recupera.
    datos = base(usuario ? usuario.id : null);
    if (usuario) datos.pend = leerPend(usuario.id);
    guardar();
  } else {
    const g = leerPend(usuario.id);
    datos.pend = { p: Math.max(datos.pend.p, g.p), s: Math.max(datos.pend.s, g.s) };
    guardar();
  }
  activo = true;
  if (!oyentesListos) {
    oyentesListos = true;
    escuchar('respuesta-registrada', () => sumar('p'));
    escuchar('sesion-terminada', (ev) => { if (ev && ev.tipo === 'simulacro') sumar('s'); });
    window.addEventListener('online', () => { consultar(); });
    window.addEventListener('offline', () => notificar());
    document.addEventListener('visibilitychange', () => {
      if (!activo) return;
      if (document.visibilityState === 'hidden') { if (datos.pend.p || datos.pend.s) enviarConsumo(); } else consultar();
    });
  }
  ultimoAgotado = verificado() ? agotado() : null;
  notificar();
  return consultar();
}

/** Detiene el sondeo (cerrar sesión, expulsión). */
export function detener() {
  activo = false;
  programarSondeo();
}

/**
 * Borra el estado de acceso del dispositivo (al cerrar sesión). El consumo pendiente de la
 * cuenta se conserva en su clave propia (clavePend) para enviarlo al volver a ingresar.
 */
export function limpiar() {
  detener();
  guardarPend();
  datos = base();
  ultimoAgotado = null;
  respuestaFresca = false;
  falloDeRed = false;
  try { window.localStorage.removeItem(CLAVE_ACCESO); } catch { /* sin almacenamiento */ }
}
