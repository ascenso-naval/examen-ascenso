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
//   bloquea siempre. Admin, «pagado» y «cortesia» nunca se bloquean. Sin estado conocido
//   (nunca se pudo consultar) no se bloquea.
// · Avisos por bus.js: 'acceso-cambio' (snapshot) y 'acceso-desbloqueado' ({plan}).
//
// Persistencia: localStorage['ascenso2026:acceso'] = {usuario, servidor, actualizado, pend:{p,s}, miniatura}.
// [Auditoría H2] El consumo pendiente se copia además, por cuenta, en
// localStorage['ascenso2026:acceso:pend:<uid>'] = {p,s}; limpiar() (cerrar sesión) NO la borra,
// de modo que si se cierra sesión sin conexión el consumo no se pierde: al volver a ingresar
// con la MISMA cuenta se recupera y se envía con registrar_consumo. Con otra cuenta se
// conserva intacto el de la anterior (nunca se mezclan). Se borra al quedar en cero.

import * as nube from './nube.js';
import { metaNube } from './sincronizacion.js';
import { emitir, escuchar } from './bus.js';

export const CLAVE_ACCESO = 'ascenso2026:acceso';
const LOTE_PREGUNTAS = 10;
const SONDEO_MS = 60000;
const MAX_P = 200;   // por llamada a registrar_consumo (contrato del servidor)
const MAX_S = 5;

const base = (usuario = null) => ({ usuario, servidor: null, actualizado: null, pend: { p: 0, s: 0 }, miniatura: null });

let datos = leer();
let activo = false;
let cadena = Promise.resolve();      // las llamadas al servidor se hacen de una en una
let sondeo = null;
let ultimoAgotado = null;
let alExpulsar = null;

function leer() {
  try {
    const o = JSON.parse(window.localStorage.getItem(CLAVE_ACCESO) || 'null');
    if (o && typeof o === 'object') {
      return {
        ...base(o.usuario || null),
        servidor: o.servidor && typeof o.servidor === 'object' ? o.servidor : null,
        actualizado: o.actualizado || null,
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

/** Cuenta administradora (rol guardado al ingresar): nunca se bloquea ni cuenta consumo. */
export const esAdmin = () => metaNube().rol === 'admin';

/** Sin límites: admin, plan pagado o cortesía. */
export function esExento() {
  if (esAdmin()) return true;
  const s = datos.servidor;
  return !!s && (s.plan === 'pagado' || s.plan === 'cortesia');
}

export const enPendiente = () => !esAdmin() && datos.servidor?.plan === 'pendiente';
export const enPrueba = () => !esExento() && !!datos.servidor && datos.servidor.plan !== 'pendiente';
export const conocido = () => !!datos.servidor;

/** Preguntas y simulacros consumidos (servidor + pendientes de enviar). */
export function consumo() {
  const s = datos.servidor;
  return {
    preguntas: (s ? s.preguntas_prueba : 0) + datos.pend.p,
    simulacros: (s ? s.simulacros_prueba : 0) + datos.pend.s,
    limitePreguntas: s ? s.limite_preguntas : null,
    limiteSimulacros: s ? s.limite_simulacros : null,
  };
}

/** ¿Debe bloquearse la app? (también sin conexión, con el último estado conocido). */
export function agotado() {
  if (esExento()) return false;
  const s = datos.servidor;
  if (!s) return false;
  if (s.plan === 'pendiente') return true;
  if (s.agotado) return true;
  const c = consumo();
  return c.preguntas >= s.limite_preguntas || c.simulacros >= s.limite_simulacros;
}

/** Fotografía del estado para las vistas. */
export function estadoAcceso() {
  const s = datos.servidor;
  return {
    conocido: !!s,
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
  ultimoAgotado = ahora;
  emitir('acceso-cambio', snap);
  programarSondeo();
}

function aplicarServidor(r) {
  datos.servidor = normalizar(r);
  datos.actualizado = new Date().toISOString();
  guardar();
  notificar();
}

function programarSondeo() {
  const debe = activo && datos.servidor?.plan === 'pendiente' && !esAdmin();
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
  if (e && e.tipo === 'bloqueado' && alExpulsar) { alExpulsar('bloqueada'); return; }
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
        datos.servidor = normalizar(r);
        datos.actualizado = new Date().toISOString();
        guardar();
      }
    } catch (e) {
      await manejarError(e);
    }
    if (ultimo) notificar();
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

function sumar(tipo) {
  if (!activo || esExento()) return;
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
 * Arranca con la sesión activa (lo llama main.js al entrar).
 * @param {{id:string}} usuario
 * @param {{alExpulsar?:(motivo:string)=>void}} op
 */
export function iniciar(usuario, op = {}) {
  alExpulsar = op.alExpulsar || alExpulsar;
  if (!usuario || datos.usuario !== usuario.id) {
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
  ultimoAgotado = agotado();
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
  try { window.localStorage.removeItem(CLAVE_ACCESO); } catch { /* sin almacenamiento */ }
}
