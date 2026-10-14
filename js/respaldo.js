// respaldo.js — Lógica del respaldo completo (solo administrador, v1.4.0; esquema 1.3.0):
// · descarga paginada de las 6 tablas con admin_respaldo(), con reintento por página ante
//   errores de red, deduplicación por clave primaria y verificación «filas = total»;
// · armado del archivo {formato:'ascenso2026-respaldo', version:1, …};
// · validación de un archivo de respaldo para restaurar el progreso de un usuario;
// · fecha de la última descarga (localStorage del administrador) y aviso de 7 días.
// Sin DOM: la interfaz está en js/ui/admin-respaldo.js.

export const FORMATO = 'ascenso2026-respaldo';
export const VERSION_FORMATO = 1;
export const CLAVE_ULTIMO = 'ascenso2026:admin:ultimo-respaldo';
export const DIAS_AVISO = 7;

/** Tablas del respaldo, su clave primaria y el tamaño de página que se pide. */
export const TABLAS = [
  { nombre: 'perfiles', clave: 'id', limite: 200, titulo: 'Perfiles' },
  { nombre: 'estado_progreso', clave: 'usuario_id', limite: 50, titulo: 'Progreso' },
  { nombre: 'eventos_sesion', clave: 'id', limite: 200, titulo: 'Sesiones' },
  { nombre: 'ingresos', clave: 'id', limite: 200, titulo: 'Ingresos' },
  { nombre: 'pagos', clave: 'id', limite: 200, titulo: 'Pagos' },
  { nombre: 'configuracion_pago', clave: 'id', limite: 200, titulo: 'Configuración de pago' },
];

const DIA_MS = 86400000;

// ---------------------------------------------------------------------------
// Última descarga
// ---------------------------------------------------------------------------

/** Fecha ISO de la última descarga completa en este dispositivo, o null. */
export function ultimoRespaldo() {
  try {
    const v = window.localStorage.getItem(CLAVE_ULTIMO);
    return v && !Number.isNaN(new Date(v).getTime()) ? v : null;
  } catch {
    return null;
  }
}

export function anotarRespaldo(fecha = new Date()) {
  try { window.localStorage.setItem(CLAVE_ULTIMO, new Date(fecha).toISOString()); } catch { /* sin almacenamiento */ }
}

/** ¿Toca respaldar? (nunca se descargó o pasaron más de 7 días). */
export function respaldoVencido(ahora = Date.now()) {
  const u = ultimoRespaldo();
  if (!u) return true;
  return ahora - new Date(u).getTime() > DIAS_AVISO * DIA_MS;
}

// ---------------------------------------------------------------------------
// Descarga
// ---------------------------------------------------------------------------
const dos = (n) => String(n).padStart(2, '0');

/** «ascenso2026-respaldo-AAAA-MM-DD-HHMM.json» con la hora local del dispositivo. */
export function nombreArchivo(fecha = new Date()) {
  const f = new Date(fecha);
  return `ascenso2026-respaldo-${f.getFullYear()}-${dos(f.getMonth() + 1)}-${dos(f.getDate())}-${dos(f.getHours())}${dos(f.getMinutes())}.json`;
}

const esperarMs = (ms) => new Promise((r) => setTimeout(r, ms));
/** Errores con los que vale la pena reintentar la misma página. */
const reintentable = (e) => e && (e.tipo === 'red' || e.tipo === 'servidor');

/**
 * Pide una página con reintentos (errores de red o del servidor; los de permiso o validación
 * se propagan de inmediato).
 */
async function paginaConReintento(pedir, tabla, desde, limite, { reintentos, espera, alReintento }) {
  for (let intento = 0; ; intento++) {
    try {
      return await pedir(tabla, desde, limite);
    } catch (e) {
      if (!reintentable(e) || intento >= reintentos) throw e;
      if (alReintento) alReintento({ tabla, desde, intento: intento + 1, error: e });
      await esperarMs(espera * (intento + 1));
    }
  }
}

/**
 * Descarga una tabla completa: pagina hasta «total» avanzando el límite efectivo que
 * devuelve el servidor y deduplica por clave primaria.
 * @returns {Promise<{filas: object[], total: number, paginas: number}>}
 */
export async function descargarTabla(pedir, def, op = {}) {
  const { reintentos = 3, espera = 500, alProgreso, alReintento } = op;
  const porClave = new Map();
  let desde = 0;
  let total = null;
  let paginas = 0;
  // Tope de seguridad: nunca más de 10 000 páginas por tabla.
  while (paginas < 10000) {
    const r = await paginaConReintento(pedir, def.nombre, desde, def.limite, { reintentos, espera, alReintento });
    paginas += 1;
    total = Number(r && r.total) || 0;
    const filas = Array.isArray(r && r.filas) ? r.filas : [];
    for (const f of filas) {
      const k = f && f[def.clave];
      if (k === undefined || k === null) continue;
      porClave.set(String(k), f);
    }
    const paso = Math.max(1, Number(r && r.limite) || def.limite);
    desde += paso;
    if (alProgreso) alProgreso({ tabla: def.nombre, hechas: Math.min(porClave.size, total), total });
    if (desde >= total || !filas.length) break;
  }
  return { filas: [...porClave.values()], total: total || 0, paginas };
}

/**
 * Descarga todas las tablas y arma el respaldo. Si las filas de una tabla no coinciden con su
 * total, la vuelve a pedir una vez; si sigue sin coincidir, lo anota en «diferencias».
 * @param {{pedir:(tabla,desde,limite)=>Promise, resumen:object, versionApp:string,
 *          alProgreso?:Function, alReintento?:Function, reintentos?:number, espera?:number}} op
 * @returns {Promise<{respaldo:object, filas:number, diferencias:{tabla,filas,total}[]}>}
 */
export async function armarRespaldo(op) {
  const { pedir, resumen, versionApp, versionEsquema = null, alProgreso, alReintento, reintentos, espera } = op;
  const tablas = {};
  const verificacion = {};
  const diferencias = [];
  for (const def of TABLAS) {
    if (alProgreso) alProgreso({ tabla: def.nombre, hechas: 0, total: resumen?.tablas?.[def.nombre] ?? null, inicio: true });
    let r = await descargarTabla(pedir, def, { alProgreso, alReintento, reintentos, espera });
    if (r.filas.length !== r.total) {
      if (alReintento) alReintento({ tabla: def.nombre, tablaCompleta: true });
      r = await descargarTabla(pedir, def, { alProgreso, alReintento, reintentos, espera });
    }
    tablas[def.nombre] = r.filas;
    verificacion[def.nombre] = { filas: r.filas.length, total: r.total, ok: r.filas.length === r.total };
    if (r.filas.length !== r.total) diferencias.push({ tabla: def.nombre, filas: r.filas.length, total: r.total });
    if (alProgreso) alProgreso({ tabla: def.nombre, hechas: r.filas.length, total: r.total, fin: true });
  }
  const vouchers = [...new Set((tablas.pagos || []).map((g) => g && g.captura_path).filter((x) => typeof x === 'string' && x))].sort();
  const respaldo = {
    formato: FORMATO,
    version: VERSION_FORMATO,
    version_esquema: resumen?.version_esquema ?? versionEsquema,
    version_app: versionApp,
    generado_en: new Date().toISOString(),
    resumen: resumen ?? null,
    verificacion,
    tablas,
    vouchers,
  };
  const filas = Object.values(tablas).reduce((t, a) => t + a.length, 0);
  return { respaldo, filas, diferencias };
}

// ---------------------------------------------------------------------------
// Restauración: validar el archivo y listar sus perfiles
// ---------------------------------------------------------------------------
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const esObjeto = (x) => !!x && typeof x === 'object' && !Array.isArray(x);

/**
 * Valida un respaldo ya interpretado como JSON.
 * @returns {{ok:true}|{ok:false, error:string}}
 */
export function validarRespaldo(obj) {
  const mal = (error) => ({ ok: false, error });
  if (!esObjeto(obj)) return mal('El archivo no es un respaldo de Ascenso 2026 (no es un objeto JSON).');
  if (obj.formato !== FORMATO) return mal('El archivo no es un respaldo de Ascenso 2026 (falta «formato: ascenso2026-respaldo»). Si es un progreso exportado desde Ajustes, impórtalo allí.');
  if (obj.version !== VERSION_FORMATO) return mal(`Versión de respaldo no compatible (${String(obj.version).slice(0, 10)}); esta app lee la versión ${VERSION_FORMATO}.`);
  if (!esObjeto(obj.tablas)) return mal('El respaldo no tiene la sección «tablas».');
  for (const def of TABLAS) {
    if (def.nombre in obj.tablas && !Array.isArray(obj.tablas[def.nombre])) return mal(`La tabla «${def.nombre}» del respaldo no es una lista.`);
  }
  const perfiles = obj.tablas.perfiles;
  if (!Array.isArray(perfiles)) return mal('El respaldo no tiene la tabla de perfiles.');
  if (perfiles.some((p) => !esObjeto(p) || typeof p.id !== 'string' || !UUID_RE.test(p.id))) return mal('Hay perfiles sin un id válido en el respaldo.');
  const estados = obj.tablas.estado_progreso || [];
  if (estados.some((e) => !esObjeto(e) || typeof e.usuario_id !== 'string' || !esObjeto(e.estado))) return mal('Hay estados de progreso incompletos en el respaldo.');
  return { ok: true };
}

/** Cifras de un estado de progreso: XP y preguntas respondidas. */
export function cifrasEstado(estado) {
  const n = (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : 0);
  return { xp: n(estado && estado.xp), preguntas: n(estado && estado.cont && estado.cont.respondidas) };
}

/**
 * Perfiles del respaldo cruzados con las cuentas actuales (admin_usuarios) por id.
 * @returns {{id, correo, apodo, plan, preguntas_prueba, simulacros_prueba, rol, ep, xp, preguntas, fecha, actual}[]}
 */
export function perfilesDelRespaldo(obj, actuales = []) {
  const estados = new Map((obj.tablas.estado_progreso || []).map((e) => [e.usuario_id, e]));
  const hoy = new Map((actuales || []).map((u) => [u.id, u]));
  return obj.tablas.perfiles.map((p) => {
    const ep = estados.get(p.id) || null;
    const c = ep ? cifrasEstado(ep.estado) : { xp: null, preguntas: null };
    return {
      id: p.id, correo: p.correo ?? null, apodo: p.apodo ?? null, rol: p.rol ?? null,
      plan: p.plan ?? null, preguntas_prueba: p.preguntas_prueba ?? null, simulacros_prueba: p.simulacros_prueba ?? null,
      ep, xp: c.xp, preguntas: c.preguntas, fecha: ep ? ep.actualizado ?? null : null,
      actual: hoy.get(p.id) || null,
    };
  }).sort((a, b) => String(a.correo || a.apodo || a.id).localeCompare(String(b.correo || b.apodo || b.id)));
}

/**
 * Datos de perfil a restaurar con admin_restaurar_perfil. El plan «pendiente» no se envía
 * (exige un pago pendiente actual; se resuelve en Pagos).
 */
export function perfilARestaurar(p) {
  const entero = (v) => (Number.isInteger(v) && v >= 0 ? v : null);
  return {
    apodo: typeof p.apodo === 'string' && p.apodo.trim() ? p.apodo.trim() : null,
    plan: ['prueba', 'pagado', 'cortesia'].includes(p.plan) ? p.plan : null,
    preguntas: entero(p.preguntas_prueba),
    simulacros: entero(p.simulacros_prueba),
  };
}
