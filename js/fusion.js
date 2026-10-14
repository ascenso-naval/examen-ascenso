// fusion.js — Fusión por secciones del estado local con el de la nube (sin DOM ni red).
//
// Se usa cuando el estado remoto es más nuevo que la última sincronización y el
// dispositivo tiene cambios sin subir (ver README, «Cuenta y sincronización»):
//   · p (progreso por pregunta): por cada id gana como base el registro con el intento
//     más reciente (u); los historiales se unen: parte común + intentos propios de cada
//     lado (n y a se suman sin contar dos veces la parte común). Si algún historial ya
//     está recortado a 10, n y a = máximo y h = el del registro más reciente.
//   · sims (simulacros): unión por id, ordenados por fecha.
//   · dias: unión por fecha; el mismo día → máximo de r, a y xp; meta si cualquiera la cumplió.
//   · xp → máximo; cont (contadores) → máximo de cada campo.
//   · logros y fuentesDominadas → unión, con la fecha más antigua.
//   · ajustes, config, sesiones en curso, ultimoResumen, ultimaExportacion → los locales.
//   · creado → el más antiguo.

const MAX_H = 10;

const esObjeto = (x) => x && typeof x === 'object' && !Array.isArray(x);
const clonar = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));

function prefijoComun(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

/** Fusiona las estadísticas de una pregunta. */
export function fusionarPregunta(l, r) {
  if (!l) return clonar(r);
  if (!r) return clonar(l);
  const lMasNuevo = (Number(l.u) || 0) >= (Number(r.u) || 0);
  const nuevo = lMasNuevo ? l : r;
  const viejo = lMasNuevo ? r : l;
  const res = clonar(nuevo);
  const hn = String(nuevo.h || '');
  const hv = String(viejo.h || '');
  if (hn.length < MAX_H && hv.length < MAX_H) {
    const c = prefijoComun(hv, hn);
    const comun = hn.slice(0, c);
    const soloViejo = hv.slice(c);
    const soloNuevo = hn.slice(c);
    // Intentos de la parte común (anteriores a la divergencia).
    const nComun = Math.max(0, Math.min((Number(nuevo.n) || 0) - soloNuevo.length, (Number(viejo.n) || 0) - soloViejo.length));
    const aComun = Math.max(0, Math.min(
      (Number(nuevo.a) || 0) - [...soloNuevo].filter((x) => x === '1').length,
      (Number(viejo.a) || 0) - [...soloViejo].filter((x) => x === '1').length));
    res.h = (comun + soloViejo + soloNuevo).slice(-MAX_H);
    res.n = nComun + soloViejo.length + soloNuevo.length;
    res.a = aComun + [...soloViejo, ...soloNuevo].filter((x) => x === '1').length;
    res.n = Math.max(res.n, Number(l.n) || 0, Number(r.n) || 0);
    res.a = Math.min(res.n, Math.max(res.a, Number(l.a) || 0, Number(r.a) || 0));
  } else {
    res.n = Math.max(Number(l.n) || 0, Number(r.n) || 0);
    res.a = Math.max(Number(l.a) || 0, Number(r.a) || 0);
    res.h = hn;
  }
  return res;
}

function unirFechas(a = {}, b = {}) {
  const r = { ...(esObjeto(b) ? b : {}) };
  for (const [k, v] of Object.entries(esObjeto(a) ? a : {})) {
    r[k] = r[k] && r[k] < v ? r[k] : v;
  }
  return r;
}

/**
 * @param {object} local  estado local (ya migrado)
 * @param {object} remoto estado remoto (ya migrado)
 * @returns {object} estado fusionado (nuevo objeto; conserva por referencia las sesiones locales)
 */
export function fusionar(local, remoto) {
  if (!remoto) return local;
  if (!local) return remoto;
  const res = clonar(local);

  // Progreso por pregunta
  const p = {};
  const ids = new Set([...Object.keys(local.p || {}), ...Object.keys(remoto.p || {})]);
  for (const id of ids) p[id] = fusionarPregunta((local.p || {})[id], (remoto.p || {})[id]);
  res.p = p;

  // Simulacros: unión por id
  const porId = new Map();
  for (const s of [...(remoto.sims || []), ...(local.sims || [])]) {
    if (!s || !s.id) continue;
    const previo = porId.get(s.id);
    // Si ambos lo tienen, se conserva el que guarda más detalle (ids/r).
    if (!previo || (!previo.ids && s.ids)) porId.set(s.id, clonar(s));
  }
  res.sims = [...porId.values()].sort((a, b) => String(a.f || '').localeCompare(String(b.f || '')));

  // Días: unión con máximos
  const dias = clonar(remoto.dias || {});
  for (const [d, v] of Object.entries(local.dias || {})) {
    const o = dias[d];
    if (!o) { dias[d] = clonar(v); continue; }
    const m = {
      r: Math.max(Number(o.r) || 0, Number(v.r) || 0),
      a: Math.max(Number(o.a) || 0, Number(v.a) || 0),
      xp: Math.max(Number(o.xp) || 0, Number(v.xp) || 0),
    };
    if (o.meta || v.meta) m.meta = 1;
    dias[d] = m;
  }
  res.dias = dias;

  // XP y contadores: máximo
  res.xp = Math.max(Number(local.xp) || 0, Number(remoto.xp) || 0);
  const cont = { ...(remoto.cont || {}) };
  for (const [k, v] of Object.entries(local.cont || {})) cont[k] = Math.max(Number(cont[k]) || 0, Number(v) || 0);
  res.cont = cont;

  // Logros: unión con la fecha más antigua
  res.logros = unirFechas(local.logros, remoto.logros);
  res.fuentesDominadas = unirFechas(local.fuentesDominadas, remoto.fuentesDominadas);

  // Locales: ajustes, config, sesiones en curso, último resumen, exportación
  res.sesiones = local.sesiones;
  if (local.creado && remoto.creado) res.creado = local.creado < remoto.creado ? local.creado : remoto.creado;
  return res;
}

/** ¿El estado tiene progreso que valga la pena conservar? */
export function tieneProgreso(e) {
  if (!e) return false;
  return (Number(e.xp) || 0) > 0
    || Object.keys(e.p || {}).length > 0
    || (e.sims || []).length > 0
    || (Number(e.cont?.respondidas) || 0) > 0;
}

/** Resumen corto para mensajes: {preguntas, xp, simulacros}. */
export function resumenProgreso(e) {
  return {
    preguntas: Object.values(e?.p || {}).filter((s) => s && s.n).length,
    xp: Number(e?.xp) || 0,
    simulacros: (e?.sims || []).length,
  };
}
