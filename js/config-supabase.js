// config-supabase.js — Datos públicos del backend (copiados de backend/supabase.config.json).
// La «publishable key» está pensada para el navegador: la seguridad la dan las políticas RLS
// y las funciones del esquema (backend/schema.sql). La secret key NUNCA va en la app.
//
// Para pruebas con el servidor simulado (pruebas/mock-supabase.mjs) se puede sustituir con
//   localStorage['ascenso2026:supabase'] = '{"url":"<url del mock>","key":"…"}'
// [1.5.1 · seguridad] La sustitución SOLO se acepta hacia el servidor simulado local
// (esquema http y máquina localhost o 127.0.0.1, con cualquier puerto) o hacia un proyecto de
// Supabase (esquema https y máquina *.supabase.co). Otra dirección se ignora con aviso en consola:
// así, un localStorage manipulado no puede desviar el correo, la contraseña ni la sesión a un
// servidor ajeno.

export const SUPABASE_URL = 'https://gdjskhcbnjtpqjtmmzjx.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_yTLwdeFKulcZxTL5QLpMOQ_uAFcrZWG';
export const CLAVE_SUSTITUCION = 'ascenso2026:supabase';
/** Versión del esquema SQL que espera esta versión de la app (ver public.version_esquema()). */
export const VERSION_ESQUEMA = 'ascenso2026-esquema 1.4.0';

/**
 * ¿La dirección está permitida para sustituir el backend?
 * Solo «http» con localhost o 127.0.0.1 (cualquier puerto) y «https» con *.supabase.co.
 */
export function urlPermitida(url) {
  let u;
  try { u = new URL(url); } catch { return false; }
  if (u.username || u.password) return false;
  if (u.protocol === 'http:') return u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  if (u.protocol === 'https:') return /^[a-z0-9][a-z0-9-]*\.supabase\.co$/i.test(u.hostname);
  return false;
}

/** Configuración efectiva: la sustitución de localStorage (si es válida) o la de producción. */
export function configSupabase() {
  try {
    const o = JSON.parse(window.localStorage.getItem(CLAVE_SUSTITUCION) || 'null');
    if (o && typeof o.url === 'string' && typeof o.key === 'string' && o.key) {
      if (urlPermitida(o.url)) return { url: o.url.replace(/\/+$/, ''), key: o.key, sustituida: true };
      console.warn(`Se ignora ${CLAVE_SUSTITUCION}: «${o.url}» no es una dirección permitida (solo localhost, 127.0.0.1 o *.supabase.co).`);
    }
  } catch { /* sin almacenamiento */ }
  return { url: SUPABASE_URL, key: SUPABASE_KEY, sustituida: false };
}
