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
   * @param {'red'|'credenciales'|'no_confirmado'|'bloqueado'|'eliminado'|'permiso'|'sesion'|'validacion'|'conflicto'|'limite'|'config'|'servidor'} tipo
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
  // [1.4.0] Papelera: la cuenta deja de existir para su dueño aunque su sesión siga válida.
  if (/cuenta eliminada/i.test(m)) return con('Cuenta eliminada; contacta al administrador.', 'eliminado');
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

/**
 * Crea la cuenta. Devuelve {sesion, requiereConfirmacion}.
 * El apodo y [1.4.0] el nombre y el apellido van en los metadatos del registro (el trigger
 * manejar_nuevo_usuario los toma de raw_user_meta_data); tras el alta la app los confirma
 * con completar_datos() por si el trigger no los hubiera tomado.
 * @param {{apodo?:string, nombre?:string, apellido?:string}} datos
 */
export async function registrarse(correo, clave, datos = {}) {
  exigirRed();
  const meta = {};
  for (const k of ['apodo', 'nombre', 'apellido']) if (datos[k]) meta[k] = datos[k];
  try {
    const { data, error } = await cliente().auth.signUp({
      email: correo.trim(),
      password: clave,
      options: { data: meta, emailRedirectTo: urlApp() },
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

/**
 * Perfil propio (RLS solo deja ver el propio): {id, correo, apodo, rol, bloqueado,
 * [1.4.0] nombre, apellido, ranking_visible…} o null. Una cuenta en la papelera no ve su
 * fila (la política añade «eliminado_en is null»), así que devuelve null.
 */
export async function miPerfil() {
  exigirRed();
  const filas = await rest(cliente().from('perfiles').select('*').eq('id', uid()));
  return (filas && filas[0]) || null;
}

export const esAdmin = () => rpc('es_admin');
/** [1.4.0] ¿Administrador o verificador? (el verificador solo abre la pestaña Pagos). */
export const esVerificador = () => rpc('es_verificador');
export const estaBloqueado = () => rpc('esta_bloqueado');
/** [1.4.0] ¿La cuenta está en la papelera? (deja de entrar a la app aunque su sesión valga). */
export const estaEliminado = () => rpc('esta_eliminado');
export const registrarIngreso = () => rpc('registrar_ingreso', { p_agente: (navigator.userAgent || '').slice(0, 300) });
/** [1.4.0] p_visible null deja ranking_visible como está; true/false lo fija en el mismo paso. */
export const cambiarApodo = (apodo, visible = null) => rpc('cambiar_apodo', { p_apodo: apodo, p_visible: visible });
/** [1.4.0] «¿Quieres aparecer en el ranking?» (cuenta propia). Devuelve el valor guardado. */
export const cambiarRankingVisible = (visible) => rpc('cambiar_ranking_visible', { p_visible: visible });
/** [1.4.0] Nombre y apellido de la cuenta propia: {usuario_id, nombre, apellido}. */
export const completarDatos = (nombre, apellido) => rpc('completar_datos', { p_nombre: nombre, p_apellido: apellido });

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
// [1.5.0] Roles, papelera de cuentas y bitácora de respaldos (esquema 1.4.0, §6.d)
// ---------------------------------------------------------------------------

/** Cambia el rol de una cuenta (usuario / verificador / admin): {usuario_id, rol, rol_anterior}. */
export const adminAsignarRol = (usuario, rol) => rpc('admin_asignar_rol', { p_usuario: usuario, p_rol: rol });
/** Manda una cuenta a la papelera (no borra nada): {usuario_id, eliminado_en, purga_en}. */
export const adminEliminarCuenta = (usuario, motivo) => rpc('admin_eliminar_cuenta', { p_usuario: usuario, p_motivo: motivo });
/** Saca una cuenta de la papelera: {usuario_id, restaurada}. */
export const adminRestaurarCuenta = (usuario) => rpc('admin_restaurar_cuenta', { p_usuario: usuario });
/** Purga definitiva de lo que lleva más de 30 días en la papelera: {purgadas, pendientes_auth, dias}. */
export const adminPurgarPapelera = () => rpc('admin_purgar_papelera', {});
/** Deja constancia de un respaldo descargado: {id, origen, generado_en, bytes}. */
export const adminRegistrarRespaldo = (origen, generadoEn = null, bytes = null, resumen = null) => rpc('admin_registrar_respaldo', {
  p_origen: origen, p_generado_en: generadoEn, p_bytes: bytes, p_resumen: resumen,
});
/** El respaldo más reciente registrado: {origen, generado_en, bytes} o null. */
export const adminUltimoRespaldo = () => rpc('admin_ultimo_respaldo');

// ---------------------------------------------------------------------------
// [1.3.0] Prueba gratis y pago (esquema 1.2.0, ver backend/schema.sql §6.b y §7.b)
// ---------------------------------------------------------------------------

/** Estado de acceso de la cuenta: {plan, preguntas_prueba, …, agotado, pago_pendiente, config}. */
export const estadoAcceso = () => rpc('estado_acceso');
/** Suma consumo de la prueba (≤ 200 preguntas y ≤ 5 simulacros por llamada); devuelve el estado. */
export const registrarConsumo = (preguntas, simulacros) => rpc('registrar_consumo', { p_preguntas: preguntas, p_simulacros: simulacros });
/** Registra (o corrige) el comprobante ya subido a Storage; devuelve el estado de acceso. */
export const registrarPago = (medio, operacion, capturaPath) => rpc('registrar_pago', { p_medio: medio, p_operacion: operacion, p_captura_path: capturaPath });
export const adminPagos = (estadoPago = null) => rpc('admin_pagos', { p_estado: estadoPago });
export const adminResolverPago = (id, aprobar, motivo = null) => rpc('admin_resolver_pago', { p_pago_id: id, p_aprobar: aprobar, p_motivo: motivo });
export const adminMarcarPlan = (usuario, plan) => rpc('admin_marcar_plan', { p_usuario_id: usuario, p_plan: plan });
/** Con {} devuelve la configuración actual sin cambiarla; con claves, la actualiza (parcial). */
export const adminConfigurarPago = (config = {}) => rpc('admin_configurar_pago', { p_config: config });

// ---------------------------------------------------------------------------
// [1.4.0] Respaldo y restauración (esquema 1.3.0, ver backend/schema.sql §6.c)
// ---------------------------------------------------------------------------

/** Totales por tabla antes de descargar: {version_esquema, generado_en, tablas:{…}, bytes_estimados, vouchers}. */
export const adminRespaldoResumen = () => rpc('admin_respaldo_resumen');
/**
 * Una página del respaldo de una tabla: {tabla, desde, limite, total, filas:[…]}.
 * «limite» es el efectivo (máx. 500; 50 en estado_progreso). Filas ordenadas por clave primaria.
 */
export const adminRespaldo = (tabla, desde = 0, limite = 200) => rpc('admin_respaldo', { p_tabla: tabla, p_desde: desde, p_limite: limite });
/** Reemplaza el estado de progreso de una cuenta (guarda antes una copia para deshacer): {usuario_id, actualizado, tamano}. */
export const adminRestaurarEstado = (usuario, estado, versionEstado, versionApp) => rpc('admin_restaurar_estado', {
  p_usuario: usuario, p_estado: estado, p_version_estado: versionEstado ?? null, p_version_app: versionApp ?? null,
});
/** Vuelve a la copia previa a la última restauración: {usuario_id, copia_id, copia_guardada_en, actualizado, tamano, sin_estado}. */
export const adminDeshacerRestauracion = (usuario) => rpc('admin_deshacer_restauracion', { p_usuario: usuario });
/** Restaura apodo, plan y contadores de la prueba (null deja el dato igual). */
export const adminRestaurarPerfil = (usuario, { apodo = null, plan = null, preguntas = null, simulacros = null } = {}) => rpc('admin_restaurar_perfil', {
  p_usuario: usuario, p_apodo: apodo, p_plan: plan, p_preguntas: preguntas, p_simulacros: simulacros,
});

export const BUCKET_COMPROBANTES = 'comprobantes';

/**
 * Traduce un error de Storage. `accion` ('subir' o 'abrir') solo cambia el texto del caso
 * genérico: el mismo bucket se usa para subir el voucher y para volver a verlo.
 */
function traducirStorage(e, accion = 'subir') {
  if (e instanceof ErrorNube) return e;
  const status = Number(e?.statusCode || e?.status || 0) || null;
  const m = String(e?.message || '');
  if (e?.name === 'StorageUnknownError' || esFalloDeRed(e)) return new ErrorNube(MSJ_RED, 'red', { status: 0 });
  const con = (msg, tipo) => new ErrorNube(msg, tipo, { status, codigo: String(e?.code || e?.error || '') });
  if (status === 413 || /maximum allowed size|too large|payload/i.test(m)) return con('La imagen supera 1 MB. Elige otra captura o recórtala.', 'validacion');
  if (/mime|content type|invalid_mime/i.test(m)) return con('El voucher debe ser una imagen (JPG, PNG o WEBP).', 'validacion');
  if (/bloquead/i.test(m)) return con('Cuenta bloqueada; contacta al administrador.', 'bloqueado');
  if (status === 401 || /jwt|token/i.test(m)) return con('Tu sesión expiró. Vuelve a ingresar.', 'sesion');
  if (status === 403 || /row-level security|unauthorized/i.test(m)) return con(`El servidor no permitió ${accion} la imagen (permisos).`, 'permiso');
  if (/bucket not found/i.test(m)) return con('Falta crear el almacenamiento de comprobantes en el servidor (bucket «comprobantes»).', 'config');
  // [1.5.0 · ronda 2] Storage responde «Object not found» tanto si el objeto no existe como si la
  // política de lectura no deja verlo (es lo que le pasa al VERIFICADOR: la política
  // «comprobantes_select_dueno_o_admin» de schema.sql solo admite al dueño y a es_admin()).
  if (status === 404 || /not.?found/i.test(m)) {
    return con('El servidor no entregó la imagen del voucher: tu rol no tiene permiso para abrirla o el archivo ya no está.', 'permiso');
  }
  return con(`No se pudo ${accion} la imagen${m ? `: ${m}` : '.'}`, 'servidor');
}

/**
 * Sube la captura del voucher a Storage en «<uid>/<marca de tiempo>.jpg» (bucket privado).
 * @param {Blob} imagen JPEG ya comprimida (≤ 1 MB)
 * @returns {Promise<string>} ruta del objeto dentro del bucket
 */
export async function subirComprobante(imagen) {
  exigirRed();
  const ruta = `${uid()}/${Date.now()}.jpg`;
  let r;
  try {
    r = await cliente().storage.from(BUCKET_COMPROBANTES).upload(ruta, imagen, { contentType: 'image/jpeg', upsert: true, cacheControl: '3600' });
  } catch (e) {
    throw traducirStorage(e);
  }
  if (r.error) throw traducirStorage(r.error);
  return (r.data && r.data.path) || ruta;
}

/**
 * URL firmada (10 min) para ver un voucher.
 * La política de Storage del esquema 1.4.0 (`comprobantes_select_dueno_o_admin`) solo deja al
 * dueño del archivo y a `es_admin()`: con una sesión de VERIFICADOR el servidor responde
 * «Object not found» y esto lanza ErrorNube de tipo 'permiso'. El panel lo trata como un fallo
 * esperado y lo explica en pantalla (no da por supuesto un privilegio que el servidor niega).
 */
export async function urlComprobante(ruta, segundos = 600) {
  exigirRed();
  let r;
  try {
    r = await cliente().storage.from(BUCKET_COMPROBANTES).createSignedUrl(ruta, segundos);
  } catch (e) {
    throw traducirStorage(e, 'abrir');
  }
  if (r.error) throw traducirStorage(r.error, 'abrir');
  return r.data.signedUrl;
}

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
  await paso('Prueba gratis y pagos (esquema 1.2.0)', async () => {
    if (!diag || !('pagos_ok' in diag)) return { ok: false, detalle: 'El esquema no tiene la parte de pagos: ejecuta de nuevo backend/schema.sql.' };
    const b = diag.pagos && diag.pagos.bucket_comprobantes;
    if (diag.pagos_ok) return { ok: true, detalle: 'Tablas, funciones y almacenamiento privado de comprobantes en orden.' };
    return { ok: false, detalle: b && b.existe === false ? 'Falta el bucket privado «comprobantes» en Storage.' : 'Revisa diagnostico_esquema() → pagos en el SQL Editor.' };
  });
  await paso('Respaldo y restauración (esquema 1.3.0)', async () => {
    if (!diag || !('respaldo_ok' in diag)) return { ok: false, detalle: 'El esquema no tiene la parte de respaldo: ejecuta de nuevo backend/schema.sql (1.3.0).' };
    if (diag.respaldo_ok) return { ok: true, detalle: 'Funciones de respaldo y restauración e historial de copias en orden.' };
    const r = diag.respaldo || {};
    const faltan = Object.entries(r.funciones || {}).filter(([, v]) => v !== true).map(([k]) => k);
    const partes = [];
    if (faltan.length) partes.push(`faltan funciones: ${faltan.join(', ')}`);
    if (r.historial_ok === false) partes.push('la tabla estado_progreso_historial no está protegida o falta');
    return { ok: false, detalle: partes.length ? `Respaldo: ${partes.join('; ')}.` : 'Revisa diagnostico_esquema() → respaldo en el SQL Editor.' };
  });
  await paso('Cuenta y roles (esquema 1.4.0)', async () => {
    if (!diag || !('cuenta_ok' in diag)) return { ok: false, detalle: 'El esquema no tiene la parte de roles y papelera: ejecuta de nuevo backend/schema.sql (1.4.0).' };
    if (diag.cuenta_ok) return { ok: true, detalle: 'Roles (verificador), nombre y apellido, papelera de 30 días y bitácora de respaldos en orden.' };
    const c = diag.cuenta || {};
    const faltan = Object.entries(c.funciones || {}).filter(([, v]) => v !== true).map(([k]) => k);
    const partes = [];
    if (faltan.length) partes.push(`faltan funciones: ${faltan.join(', ')}`);
    if (c.roles_ok === false) partes.push('los roles o los permisos de las funciones no son los de 1.4.0');
    if (c.columnas_ok === false) partes.push('faltan columnas de perfiles (nombre, apellido, ranking_visible, papelera) o sus privilegios no son los correctos');
    if (c.papelera_ok === false) partes.push('la papelera no está protegida (cuentas_purgadas, políticas o eventos)');
    if (c.respaldos_ok === false) partes.push('la tabla respaldos no está protegida o falta');
    return { ok: false, detalle: partes.length ? `Cuenta y roles: ${partes.join('; ')}.` : 'Revisa diagnostico_esquema() → cuenta en el SQL Editor.' };
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
