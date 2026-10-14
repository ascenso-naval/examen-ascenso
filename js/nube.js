// nube.js — Envoltorio del cliente de Supabase (vendor/supabase.js, cargado con <script>).
// Expone operaciones de cuenta, estado, eventos, ranking y administración con errores
// legibles en español (ErrorNube) y detección de «sin conexión».
//
// Tablas y funciones: ver backend/schema.sql.

import { configSupabase, VERSION_ESQUEMA } from './config-supabase.js';

/** Clave de localStorage donde supabase-js guarda la sesión. */
export const CLAVE_AUTH = 'ascenso2026:auth';

/** Error con mensaje para el usuario y un tipo para decidir qué hacer. */
export class ErrorNube extends Error {
  /**
   * @param {string} mensaje
   * @param {'red'|'credenciales'|'no_confirmado'|'bloqueado'|'permiso'|'sesion'|'validacion'|'conflicto'|'limite'|'config'|'servidor'} tipo
   * @param {{status?:number, codigo?:string}} extra
   */
  constructor(mensaje, tipo = 'servidor', extra = {}) {
    super(mensaje);
    this.name = 'ErrorNube';
    this.tipo = tipo;
    this.status = extra.status ?? null;
    this.codigo = extra.codigo ?? null;
  }
}

const MSJ_RED = 'Sin conexión con el servidor. Revisa tu internet e inténtalo de nuevo.';

/** ¿Hay red según el navegador? (si dice que no, no se intenta ninguna llamada). */
export const enLinea = () => typeof navigator === 'undefined' || navigator.onLine !== false;

let cli = null;

/** Cliente único de Supabase (se crea al primer uso). */
export function cliente() {
  if (cli) return cli;
  const sb = typeof window !== 'undefined' ? window.supabase : null;
  if (!sb || typeof sb.createClient !== 'function') {
    throw new ErrorNube('No se pudo cargar el componente de conexión (vendor/supabase.js). Recarga la app.', 'config');
  }
  const { url, key } = configSupabase();
  cli = sb.createClient(url, key, {
    auth: {
      storageKey: CLAVE_AUTH,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,   // enlaces de recuperación de contraseña / confirmación (?code=…)
      flowType: 'pkce',           // el código llega en la consulta (?code=), no en el hash del enrutador
    },
  });
  return cli;
}

/** Dirección de la app para los enlaces de los correos (funciona en GitHub Pages y en localhost). */
export const urlApp = () => new URL('./', window.location.href).href;

// ---------------------------------------------------------------------------
// Traducción de errores
// ---------------------------------------------------------------------------
function esFalloDeRed(e) {
  const m = String(e?.message || e || '');
  return !enLinea() || e?.name === 'AuthRetryableFetchError' || e?.status === 0
    || /Failed to fetch|NetworkError|Load failed|network|fetch failed|ERR_/i.test(m);
}

function traducirAuth(e) {
  if (!e) return new ErrorNube('Error desconocido.', 'servidor');
  if (e instanceof ErrorNube) return e;
  if (esFalloDeRed(e)) return new ErrorNube(MSJ_RED, 'red', { status: 0 });
  const codigo = e.code || e.error_code || '';
  const status = e.status || null;
  const m = String(e.message || '');
  const con = (msg, tipo) => new ErrorNube(msg, tipo, { status, codigo });
  if (codigo === 'invalid_credentials' || /invalid login credentials/i.test(m)) return con('Correo o contraseña incorrectos.', 'credenciales');
  if (codigo === 'email_not_confirmed' || /email not confirmed/i.test(m)) return con('Tu correo aún no está confirmado. Abre el enlace que te enviamos (revisa también la carpeta de spam).', 'no_confirmado');
  if (codigo === 'user_already_exists' || /already registered/i.test(m)) return con('Ya existe una cuenta con ese correo. Ingresa o recupera tu contraseña.', 'conflicto');
  if (codigo === 'weak_password' || /password should be/i.test(m)) return con('La contraseña es muy débil: usa al menos 8 caracteres.', 'validacion');
  if (codigo === 'over_email_send_rate_limit' || codigo === 'over_request_rate_limit' || status === 429) return con('Demasiados intentos o correos en poco tiempo. Espera unos minutos e inténtalo de nuevo.', 'limite');
  if (codigo === 'email_address_invalid' || codigo === 'validation_failed' || /invalid format|email address/i.test(m)) return con('El correo no es válido.', 'validacion');
  if (codigo === 'signup_disabled') return con('El registro de cuentas está desactivado.', 'permiso');
  if (codigo === 'refresh_token_not_found' || codigo === 'session_not_found' || codigo === 'bad_jwt' || e.name === 'AuthSessionMissingError') return con('Tu sesión expiró. Vuelve a ingresar.', 'sesion');
  return con(`No se pudo completar la operación${m ? `: ${m}` : '.'}`, 'servidor');
}

function traducirRest(e, status) {
  if (e instanceof ErrorNube) return e;
  if (esFalloDeRed(e) && !e.code) return new ErrorNube(MSJ_RED, 'red', { status: 0 });
  const codigo = String(e?.code || '');
  const m = String(e?.message || '');
  const con = (msg, tipo) => new ErrorNube(msg, tipo, { status, codigo });
  if (codigo === 'PGRST301' || codigo === 'PGRST303' || /JWT/i.test(m)) return con('Tu sesión expiró. Vuelve a ingresar.', 'sesion');
  if (/bloquead/i.test(m)) return con('Cuenta bloqueada; contacta al administrador.', 'bloqueado');
  if (codigo === '42501') {
    if (/row-level security/i.test(m)) return con('El servidor rechazó la operación (permisos). Si tu cuenta fue bloqueada, contacta al administrador.', 'permiso');
    if (/administrador|inicia sesión/i.test(m)) return con(m, 'permiso');
    return con('No tienes permiso para esta operación.', 'permiso');
  }
  if (codigo === '23505') return con(/[áéíóúñ«]/i.test(m) ? m : 'Ese valor ya está en uso.', 'conflicto');
  if (codigo === '22023' || codigo === '23514' || codigo === 'P0002') return con(/[áéíóúñ«]/i.test(m) || codigo === '22023' ? m : 'Datos no válidos.', 'validacion');
  if (codigo === 'PGRST202' || codigo === 'PGRST205' || codigo === '42883' || codigo === '42P01') {
    return con('Falta configurar la base de datos (ejecuta backend/schema.sql en Supabase).', 'config');
  }
  if (status === 401) return con('Tu sesión expiró. Vuelve a ingresar.', 'sesion');
  if (status === 403) return con('No tienes permiso para esta operación.', 'permiso');
  return con(`Error del servidor${m ? `: ${m}` : ''}.`, 'servidor');
}

function exigirRed() {
  if (!enLinea()) throw new ErrorNube(MSJ_RED, 'red', { status: 0 });
}

async function rest(promesa) {
  let r;
  try {
    r = await promesa;
  } catch (e) {
    throw traducirRest(e, 0);
  }
  if (r.error) throw traducirRest(r.error, r.status);
  return r.data;
}

async function rpc(nombre, args = {}) {
  exigirRed();
  return rest(cliente().rpc(nombre, args));
}

// ---------------------------------------------------------------------------
// Sesión
// ---------------------------------------------------------------------------

/** Sesión guardada en el dispositivo (sin red): {id, correo, expira} o null. */
export function sesionLocal() {
  try {
    const s = JSON.parse(window.localStorage.getItem(CLAVE_AUTH) || 'null');
    const u = s && (s.user || s.currentSession?.user);
    if (u && u.id) return { id: u.id, correo: u.email || '', expira: s.expires_at || null };
  } catch { /* sin almacenamiento */ }
  return null;
}

/** Sesión vigente según supabase-js (puede refrescar el token si hay red). */
export async function sesionActual() {
  const { data, error } = await cliente().auth.getSession();
  if (error) throw traducirAuth(error);
  const s = data && data.session;
  return s ? { id: s.user.id, correo: s.user.email || '' } : null;
}

/** Comprueba en el servidor que la sesión sigue siendo válida: 'ok' | 'invalida' | 'red'. */
export async function verificarSesion() {
  if (!enLinea()) return 'red';
  try {
    const { data, error } = await cliente().auth.getUser();
    if (error) {
      const e = traducirAuth(error);
      if (e.tipo === 'red') return 'red';
      return (e.tipo === 'sesion' || error.status === 401 || error.status === 403) ? 'invalida' : 'red';
    }
    return data && data.user ? 'ok' : 'invalida';
  } catch (e) {
    return traducirAuth(e).tipo === 'red' ? 'red' : 'invalida';
  }
}

/** Escucha cambios de sesión (SIGNED_IN, SIGNED_OUT, PASSWORD_RECOVERY, TOKEN_REFRESHED…). */
export function onAuthStateChange(fn) {
  const { data } = cliente().auth.onAuthStateChange((evento, sesion) => {
    // supabase-js recomienda no llamar a otros métodos dentro del callback: se difiere.
    setTimeout(() => fn(evento, sesion), 0);
  });
  return () => data?.subscription?.unsubscribe();
}

export async function iniciarSesion(correo, clave) {
  exigirRed();
  try {
    const { data, error } = await cliente().auth.signInWithPassword({ email: correo.trim(), password: clave });
    if (error) throw error;
    return { id: data.user.id, correo: data.user.email || correo };
  } catch (e) {
    throw traducirAuth(e);
  }
}

/** Crea la cuenta. Devuelve {sesion, requiereConfirmacion}. El apodo va en los metadatos. */
export async function registrarse(correo, clave, apodo) {
  exigirRed();
  try {
    const { data, error } = await cliente().auth.signUp({
      email: correo.trim(),
      password: clave,
      options: { data: apodo ? { apodo } : {}, emailRedirectTo: urlApp() },
    });
    if (error) throw error;
    if (data.session) return { sesion: { id: data.user.id, correo: data.user.email || correo }, requiereConfirmacion: false };
    return { sesion: null, requiereConfirmacion: true };
  } catch (e) {
    throw traducirAuth(e);
  }
}

/** Cierra la sesión. Sin red, borra la sesión local igualmente. */
export async function cerrarSesion() {
  if (enLinea()) {
    try { await cliente().auth.signOut({ scope: 'local' }); } catch { /* se borra abajo */ }
  }
  try {
    for (const k of [CLAVE_AUTH, `${CLAVE_AUTH}-code-verifier`, `${CLAVE_AUTH}-user`]) window.localStorage.removeItem(k);
  } catch { /* sin almacenamiento */ }
}

export async function recuperarContrasena(correo) {
  exigirRed();
  try {
    const { error } = await cliente().auth.resetPasswordForEmail(correo.trim(), { redirectTo: urlApp() });
    if (error) throw error;
  } catch (e) {
    throw traducirAuth(e);
  }
}

export async function actualizarContrasena(clave) {
  exigirRed();
  try {
    const { error } = await cliente().auth.updateUser({ password: clave });
    if (error) throw error;
  } catch (e) {
    throw traducirAuth(e);
  }
}

const uid = () => {
  const s = sesionLocal();
  if (!s) throw new ErrorNube('No hay sesión iniciada.', 'sesion');
  return s.id;
};

// ---------------------------------------------------------------------------
// Perfil, estado y eventos
// ---------------------------------------------------------------------------

/** Perfil propio (RLS solo deja ver el propio): {id, correo, apodo, rol, bloqueado…} o null. */
export async function miPerfil() {
  exigirRed();
  const filas = await rest(cliente().from('perfiles').select('*').eq('id', uid()));
  return (filas && filas[0]) || null;
}

export const esAdmin = () => rpc('es_admin');
export const estaBloqueado = () => rpc('esta_bloqueado');
export const registrarIngreso = () => rpc('registrar_ingreso', { p_agente: (navigator.userAgent || '').slice(0, 300) });
export const cambiarApodo = (apodo) => rpc('cambiar_apodo', { p_apodo: apodo });

/** Solo la fecha del estado remoto (consulta liviana): texto ISO o null si no hay estado. */
export async function fechaEstadoRemoto() {
  exigirRed();
  const filas = await rest(cliente().from('estado_progreso').select('actualizado').eq('usuario_id', uid()));
  return filas && filas[0] ? filas[0].actualizado : null;
}

/** Estado remoto completo: {estado, actualizado, version_app, version_estado} o null. */
export async function bajarEstado() {
  exigirRed();
  const filas = await rest(cliente().from('estado_progreso')
    .select('estado,actualizado,version_app,version_estado').eq('usuario_id', uid()));
  return filas && filas[0] ? filas[0] : null;
}

/** Sube (upsert) el estado completo. Devuelve la fecha «actualizado» que puso el servidor. */
export async function subirEstado(estado, versionApp) {
  exigirRed();
  const filas = await rest(cliente().from('estado_progreso')
    .upsert({ usuario_id: uid(), estado, version_app: versionApp, version_estado: Number(estado.v) || 1 }, { onConflict: 'usuario_id' })
    .select('actualizado'));
  return filas && filas[0] ? filas[0].actualizado : new Date().toISOString();
}

/**
 * Envía eventos de sesión; los repetidos (mismo usuario + id_cliente) se ignoran en el servidor.
 * La clave única es (usuario_id, id_cliente): un id_cliente ajeno no puede «ocupar» el propio.
 */
export async function registrarEventos(lista) {
  exigirRed();
  if (!lista.length) return;
  const yo = uid();
  const filas = lista.map((e) => ({ ...e, usuario_id: yo }));
  await rest(cliente().from('eventos_sesion').upsert(filas, { onConflict: 'usuario_id,id_cliente', ignoreDuplicates: true }));
}
export const registrarEvento = (ev) => registrarEventos([ev]);

// ---------------------------------------------------------------------------
// Ranking y administración
// ---------------------------------------------------------------------------
export const ranking = (limite = 50, orden = 'xp') => rpc('ranking', { p_limite: limite, p_orden: orden });
export const adminUsuarios = () => rpc('admin_usuarios');
export const adminActividadDiaria = (dias = 30) => rpc('admin_actividad_diaria', { p_dias: dias });
export const adminEventos = (usuario = null, limite = 200) => rpc('admin_eventos', { p_usuario: usuario, p_limite: limite });
export const adminBloquear = (usuario, bloqueado) => rpc('admin_bloquear', { p_usuario: usuario, p_bloqueado: bloqueado });

// ---------------------------------------------------------------------------
// Diagnóstico de conexión
// ---------------------------------------------------------------------------

/**
 * Ejecuta las comprobaciones y devuelve una lista de pasos
 * {nombre, ok: true|false|null (aviso), detalle, ms}.
 */
export async function diagnostico() {
  const pasos = [];
  const paso = async (nombre, fn) => {
    const t0 = performance.now();
    try {
      const r = await fn();
      pasos.push({ nombre, ok: r.ok, detalle: r.detalle, ms: Math.round(performance.now() - t0) });
    } catch (e) {
      const err = e instanceof ErrorNube ? e : traducirRest(e, 0);
      pasos.push({ nombre, ok: false, detalle: err.message, ms: Math.round(performance.now() - t0) });
    }
  };
  const { url, key, sustituida } = configSupabase();
  pasos.push({
    nombre: 'Configuración',
    ok: !!(url && key),
    detalle: `${new URL(url).host}${sustituida ? ' (sustituida para pruebas)' : ''} · clave ${key.slice(0, 15)}…`,
    ms: 0,
  });
  pasos.push({ nombre: 'Red del dispositivo', ok: enLinea(), detalle: enLinea() ? 'El navegador indica conexión.' : 'El navegador indica que no hay conexión.', ms: 0 });
  if (!enLinea()) return pasos;

  await paso('Servicio de autenticación (Auth)', async () => {
    const r = await fetch(`${url}/auth/v1/health`, { headers: { apikey: key }, cache: 'no-store' });
    if (!r.ok) return { ok: false, detalle: `Respondió ${r.status}. ${r.status === 401 ? 'La clave publicable no es válida.' : ''}` };
    return { ok: true, detalle: `Responde (${r.status}).` };
  });
  await paso('Sesión', async () => {
    const v = await verificarSesion();
    const s = sesionLocal();
    if (v === 'ok') return { ok: true, detalle: `Sesión válida: ${s ? s.correo : ''}` };
    return { ok: false, detalle: v === 'red' ? MSJ_RED : 'La sesión no es válida: cierra sesión y vuelve a ingresar.' };
  });
  await paso('Base de datos (REST) y versión del esquema', async () => {
    const v = await rpc('version_esquema');
    return { ok: v === VERSION_ESQUEMA ? true : null, detalle: v === VERSION_ESQUEMA ? `Esquema instalado: ${v}` : `Esquema «${v}»; se esperaba «${VERSION_ESQUEMA}». Ejecuta de nuevo backend/schema.sql.` };
  });
  let diag = null;
  await paso('Seguridad (RLS) en las tablas', async () => {
    diag = await rpc('diagnostico_esquema');
    const rls = diag && diag.rls ? diag.rls : {};
    const tablas = ['perfiles', 'estado_progreso', 'eventos_sesion', 'ingresos'];
    const faltan = tablas.filter((t) => rls[t] !== true);
    return { ok: !faltan.length, detalle: faltan.length ? `RLS desactivado en: ${faltan.join(', ')}` : 'RLS activado en las 4 tablas.' };
  });
  await paso('Aislamiento de datos', async () => {
    const filas = await rest(cliente().from('perfiles').select('id'));
    const ok = Array.isArray(filas) && filas.length <= 1;
    return { ok, detalle: ok ? 'Solo se ve el perfil propio.' : `Se ven ${filas.length} perfiles: revisa las políticas.` };
  });
  await paso('Funciones de administración', async () => {
    const admin = diag ? diag.es_admin : await rpc('es_admin');
    if (admin) {
      const u = await rpc('admin_usuarios');
      return { ok: true, detalle: `Eres administrador: ${u.length} cuentas registradas.` };
    }
    try {
      await rpc('admin_usuarios');
      return { ok: false, detalle: '¡admin_usuarios() respondió a una cuenta que no es administradora!' };
    } catch (e) {
      if (e.tipo === 'permiso') return { ok: true, detalle: 'Rechazadas para tu cuenta (correcto: no eres administrador).' };
      throw e;
    }
  });
  return pasos;
}
