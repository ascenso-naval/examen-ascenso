// config-supabase.js — Datos públicos del backend (copiados de backend/supabase.config.json).
// La «publishable key» está pensada para el navegador: la seguridad la dan las políticas RLS
// y las funciones del esquema (backend/schema.sql). La secret key NUNCA va en la app.
//
// Para pruebas con el servidor simulado (pruebas/mock-supabase.mjs) se puede sustituir con
//   localStorage['ascenso2026:supabase'] = '{"url":"<url del mock>","key":"…"}'

export const SUPABASE_URL = 'https://gdjskhcbnjtpqjtmmzjx.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_yTLwdeFKulcZxTL5QLpMOQ_uAFcrZWG';
export const CLAVE_SUSTITUCION = 'ascenso2026:supabase';
/** Versión del esquema SQL que espera esta versión de la app (ver public.version_esquema()). */
export const VERSION_ESQUEMA = 'ascenso2026-esquema 1.3.0';

/** Configuración efectiva: la sustitución de localStorage (si es válida) o la de producción. */
export function configSupabase() {
  try {
    const o = JSON.parse(window.localStorage.getItem(CLAVE_SUSTITUCION) || 'null');
    if (o && typeof o.url === 'string' && /^https?:\/\//.test(o.url) && typeof o.key === 'string' && o.key) {
      return { url: o.url.replace(/\/+$/, ''), key: o.key, sustituida: true };
    }
  } catch { /* sin almacenamiento */ }
  return { url: SUPABASE_URL, key: SUPABASE_KEY, sustituida: false };
}
