// seleccion.js — Algoritmos de selección de preguntas (funciones puras, sin DOM):
//  · práctica ponderada (aleatorio / priorizar no vistas / priorizar débiles),
//  · composición del simulacro «como el examen» (reparto proporcional con mínimo por fuente,
//    mezcla de dificultad, origen MAPLO, máximo por ítem/tema, preferir no usadas),
//  · cola de repaso.
// En TODOS los casos se respetan las exclusiones mutuas `excluye` (una pregunta revela la otra).

import { barajar } from './util.js';
import { ordenarParaRepaso } from './srs.js';

/** Clave del grupo (ítem o tema) de una pregunta. */
export function claveGrupo(q) {
  if (q._g) return q._g.clave;
  return `${q.fuente}|${q.item && q.item !== '-' ? q.item : q.tema}`;
}

/** Acumulador de una selección que impide exclusiones mutuas y controla el máximo por grupo. */
export class Selector {
  constructor() {
    this.elegidas = [];
    this.ids = new Set();
    this.bloqueadas = new Set();
    this.porGrupo = new Map();
  }

  get total() { return this.elegidas.length; }

  puede(q, maxPorGrupo = 0) {
    if (this.ids.has(q.id) || this.bloqueadas.has(q.id)) return false;
    // Defensa ante datos asimétricos: la candidata no puede excluir a una ya elegida.
    if (q.excluye && q.excluye.some((id) => this.ids.has(id))) return false;
    if (maxPorGrupo > 0 && (this.porGrupo.get(claveGrupo(q)) || 0) >= maxPorGrupo) return false;
    return true;
  }

  agregar(q) {
    this.elegidas.push(q);
    this.ids.add(q.id);
    if (q.excluye) for (const id of q.excluye) this.bloqueadas.add(id);
    const g = claveGrupo(q);
    this.porGrupo.set(g, (this.porGrupo.get(g) || 0) + 1);
  }

  /** Toma hasta `k` candidatas en el orden dado. Devuelve cuántas tomó. */
  tomar(candidatas, k, maxPorGrupo = 0) {
    let n = 0;
    for (const q of candidatas) {
      if (n >= k) break;
      if (this.puede(q, maxPorGrupo)) { this.agregar(q); n += 1; }
    }
    return n;
  }
}

/** Muestreo ponderado sin reemplazo (Efraimidis–Spirakis): devuelve la lista reordenada. */
export function ordenarPonderado(lista, peso, rng = Math.random) {
  return lista
    .map((x) => ({ x, k: Math.pow(rng() || 1e-12, 1 / Math.max(peso(x), 1e-6)) }))
    .sort((a, b) => b.k - a.k)
    .map((o) => o.x);
}

/** Baraja y deja primero las preguntas que NO salieron en los últimos simulacros. */
export function preferirNoRecientes(lista, recientes, rng = Math.random) {
  const b = barajar(lista, rng);
  if (!recientes || !recientes.size) return b;
  return b.filter((q) => !recientes.has(q.id)).concat(b.filter((q) => recientes.has(q.id)));
}

// ---------------------------------------------------------------------------
// Práctica
// ---------------------------------------------------------------------------

const DIA_MS = 86400000;

/**
 * Peso de una pregunta para «priorizar débiles»:
 * no vista ×3 · fallada en su último intento ×4 · acertada hace ≤ 3 días ×0.5;
 * además, los ítems con poco dominio pesan un poco más (×1 a ×2).
 */
export function pesoDebil(st, ahora, dominioGrupo = null) {
  let w = 1;
  if (!st || !st.n) w *= 3;
  else if (st.h.endsWith('0')) w *= 4;
  else if (ahora - (st.u || 0) <= 3 * DIA_MS) w *= 0.5;
  if (dominioGrupo !== null && dominioGrupo !== undefined) w *= 1 + (1 - dominioGrupo);
  return w;
}

/**
 * Selecciona preguntas para una práctica.
 * @param {object[]} pool  preguntas candidatas (ya filtradas)
 * @param {object} op { cantidad, orden: 'aleatorio'|'no_vistas'|'debiles', stats, ahora, dominioGrupo(q), rng }
 */
export function seleccionarPractica(pool, op) {
  const { cantidad, orden = 'aleatorio', stats = {}, ahora = Date.now(), rng = Math.random } = op;
  const domG = op.dominioGrupo || (() => null);
  const peso = (q) => pesoDebil(stats[q.id], ahora, domG(q));
  let candidatas;
  if (orden === 'no_vistas') {
    // Primero todas las no vistas (al azar); luego el resto, ponderado.
    const noVistas = barajar(pool.filter((q) => !(stats[q.id] && stats[q.id].n)), rng);
    const vistas = ordenarPonderado(pool.filter((q) => stats[q.id] && stats[q.id].n), peso, rng);
    candidatas = noVistas.concat(vistas);
  } else if (orden === 'debiles') {
    candidatas = ordenarPonderado(pool, peso, rng);
  } else {
    candidatas = barajar(pool, rng);
  }
  const sel = new Selector();
  sel.tomar(candidatas, cantidad > 0 ? cantidad : pool.length);
  return sel.elegidas;
}

// ---------------------------------------------------------------------------
// Simulacro
// ---------------------------------------------------------------------------

/** Ids usados en los últimos `k` simulacros de un examen. */
export function idsRecientes(sims, examen, k = 2) {
  const set = new Set();
  const delExamen = (sims || []).filter((s) => s.ex === examen && Array.isArray(s.ids));
  for (const s of delExamen.slice(-k)) for (const id of s.ids) set.add(id);
  return set;
}

/**
 * Reparto proporcional al peso con mínimo 1 por fuente y método de restos mayores.
 * Si n es menor que el número de fuentes, se eligen n fuentes al azar ponderado.
 * Respeta la capacidad (preguntas disponibles) de cada fuente redistribuyendo el exceso.
 * @param {Map<string, number>} pesos
 * @param {number} n
 * @param {Map<string, number>} capacidad
 */
export function repartirProporcional(pesos, n, capacidad, rng = Math.random) {
  const activos = [...pesos.keys()].filter((s) => pesos.get(s) > 0 && (capacidad.get(s) || 0) > 0);
  const asign = new Map(activos.map((s) => [s, 0]));
  if (!activos.length || n <= 0) return asign;
  const suma = (lista) => lista.reduce((t, s) => t + pesos.get(s), 0);

  if (n < activos.length) {
    ordenarPonderado(activos, (s) => pesos.get(s), rng).slice(0, n).forEach((s) => asign.set(s, 1));
    return asign;
  }

  // 1) Cota inferior: las fuentes cuya cuota sea < 1 reciben 1 y salen del reparto.
  let restantes = activos.slice();
  let N = n;
  for (;;) {
    const W = suma(restantes);
    const bajo = restantes.filter((s) => (N * pesos.get(s)) / W < 1 - 1e-9);
    if (!bajo.length) break;
    for (const s of bajo) { asign.set(s, 1); N -= 1; }
    restantes = restantes.filter((s) => !bajo.includes(s));
    if (!restantes.length) break;
  }

  // 2) Restos mayores entre las demás (todas con cuota ≥ 1).
  if (restantes.length && N > 0) {
    const W = suma(restantes);
    const cuotas = restantes.map((s) => ({ s, q: (N * pesos.get(s)) / W }));
    let usados = 0;
    for (const c of cuotas) {
      const f = Math.floor(c.q + 1e-9);
      asign.set(c.s, f);
      usados += f;
    }
    cuotas.sort((a, b) => ((b.q - Math.floor(b.q + 1e-9)) - (a.q - Math.floor(a.q + 1e-9))) || (pesos.get(b.s) - pesos.get(a.s)));
    for (let i = 0; i < N - usados; i++) {
      const s = cuotas[i % cuotas.length].s;
      asign.set(s, asign.get(s) + 1);
    }
  }

  // 3) Tope por capacidad: el exceso pasa a las fuentes con más peso por plaza (D'Hondt).
  let exceso = 0;
  for (const s of activos) {
    const cap = capacidad.get(s) || 0;
    if (asign.get(s) > cap) { exceso += asign.get(s) - cap; asign.set(s, cap); }
  }
  while (exceso > 0) {
    let mejor = null;
    let mejorCoc = -1;
    for (const s of activos) {
      if (asign.get(s) >= (capacidad.get(s) || 0)) continue;
      const coc = pesos.get(s) / (asign.get(s) + 1);
      if (coc > mejorCoc) { mejorCoc = coc; mejor = s; }
    }
    if (!mejor) break;
    asign.set(mejor, asign.get(mejor) + 1);
    exceso -= 1;
  }
  return asign;
}

/** Cuotas por dificultad [fácil, media, difícil] con redondeo aleatorio de los restos. */
export function cuotasDificultad(k, mezcla, rng = Math.random) {
  const base = mezcla.map((p) => Math.floor(k * p + 1e-9));
  const fr = mezcla.map((p, i) => k * p - base[i]);
  let resto = k - base.reduce((a, b) => a + b, 0);
  while (resto > 0) {
    const tot = fr.reduce((a, b) => a + b, 0);
    let r = rng() * (tot > 1e-9 ? tot : fr.length);
    let idx = 0;
    for (; idx < fr.length - 1; idx++) {
      r -= tot > 1e-9 ? fr[idx] : 1;
      if (r <= 0) break;
    }
    base[idx] += 1;
    fr[idx] = 0;
    resto -= 1;
  }
  return base;
}

/**
 * Cuotas de dificultad por fuente coordinadas para que el TOTAL del simulacro también
 * respete la mezcla (p. ej. 12/18/10 en 40): cada fuente recibe los pisos de k·p y los
 * restos se reparten entre fuentes según la necesidad global, con algo de azar.
 * @param {Map<string, number>} asign fuente → n.º de preguntas
 * @returns {Map<string, number[]>} fuente → [fáciles, medias, difíciles]
 */
export function cuotasDificultadCoordinadas(asign, mezcla, rng = Math.random) {
  const n = [...asign.values()].reduce((a, b) => a + b, 0);
  // Objetivo global por restos mayores (determinista).
  const global = mezcla.map((p) => Math.floor(n * p + 1e-9));
  const ordenRestos = mezcla.map((p, i) => ({ i, r: n * p - global[i] })).sort((a, b) => b.r - a.r);
  for (let j = 0; j < n - global.reduce((a, b) => a + b, 0); j++) global[ordenRestos[j % 3].i] += 1;

  const res = new Map();
  const necesidad = global.slice();
  const pendientes = [];
  for (const [f, k] of asign) {
    const base = mezcla.map((p) => Math.floor(k * p + 1e-9));
    base.forEach((x, i) => { necesidad[i] -= x; });
    res.set(f, base);
    const fr = mezcla.map((p, i) => k * p - base[i]);
    const resto = k - base.reduce((a, b) => a + b, 0);
    if (resto > 0) pendientes.push({ f, fr, resto });
  }
  for (const it of barajar(pendientes, rng)) {
    for (let s = 0; s < it.resto; s++) {
      let mejor = -1;
      let mejorPunt = -Infinity;
      for (let d = 0; d < 3; d++) {
        if (it.fr[d] <= 1e-9) continue;
        const punt = (necesidad[d] > 0 ? 10 : 0) + it.fr[d] + rng() * 0.5;
        if (punt > mejorPunt) { mejorPunt = punt; mejor = d; }
      }
      if (mejor < 0) mejor = necesidad.indexOf(Math.max(...necesidad));
      res.get(it.f)[mejor] += 1;
      necesidad[mejor] -= 1;
      it.fr[mejor] = 0;
    }
  }
  return res;
}

const VECINAS = { 1: [2, 3], 2: [1, 3], 3: [2, 1] };

/**
 * Elige preguntas de un conjunto según cuotas de dificultad [fácil, media, difícil].
 * Prioridad: 1) no usadas en los últimos simulacros con la dificultad pedida; 2) no usadas
 * de una dificultad vecina; 3) usadas de la dificultad pedida; 4) usadas de una vecina.
 */
function elegirConMezcla(cands, objetivo, sel, recientes, rng, maxPorGrupo = 0) {
  const nuevas = { 1: [], 2: [], 3: [] };
  const usadas = { 1: [], 2: [], 3: [] };
  for (const q of barajar(cands, rng)) {
    const d = nuevas[q.dificultad] ? q.dificultad : 2;
    (recientes && recientes.has(q.id) ? usadas : nuevas)[d].push(q);
  }
  const falta = { 1: objetivo[0] || 0, 2: objetivo[1] || 0, 3: objetivo[2] || 0 };
  let tomadas = 0;
  const pasada = (grupos, vecinas) => {
    for (const d of [1, 2, 3]) {
      for (const v of vecinas ? VECINAS[d] : [d]) {
        if (falta[d] <= 0) break;
        const t = sel.tomar(grupos[v], falta[d], maxPorGrupo);
        falta[d] -= t;
        tomadas += t;
      }
    }
  };
  pasada(nuevas, false);
  pasada(nuevas, true);
  pasada(usadas, false);
  pasada(usadas, true);
  return tomadas;
}

/** Ordena la selección como un examen: por fuente (orden del temario) y luego por ítem. */
export function ordenarComoExamen(preguntas) {
  return preguntas.slice().sort((a, b) => {
    const fa = a._f ? a._f.orden : 0;
    const fb = b._f ? b._f.orden : 0;
    if (fa !== fb) return fa - fb;
    const ga = a._g ? a._g.orden : 0;
    const gb = b._g ? b._g.orden : 0;
    if (ga !== gb) return ga - gb;
    return (a._i || 0) - (b._i || 0);
  });
}

/** Completa una selección corta con cualquier candidata válida (último recurso). */
function completar(sel, n, pool, recientes, rng, maxPorGrupo) {
  if (sel.total >= n) return;
  sel.tomar(preferirNoRecientes(pool, recientes, rng), n - sel.total, maxPorGrupo);
  if (sel.total < n && maxPorGrupo) sel.tomar(preferirNoRecientes(pool, recientes, rng), n - sel.total, 0);
}

export const MEZCLA_REGLAMENTOS = [0.30, 0.45, 0.25];
export const MEZCLA_INGLES = [0.35, 0.40, 0.25];

/**
 * Composición del simulacro.
 * @param {object} op
 *   examen, n, pool (preguntas disponibles del examen, ya restringidas a las fuentes elegidas),
 *   fuentes (objetos fuente con sigla/peso/orden), recientes (Set de ids), rng
 * @returns {object[]} preguntas en orden de examen
 */
export function componerSimulacro(op) {
  const { examen, n, pool, recientes = new Set(), rng = Math.random } = op;
  const sel = new Selector();

  if (examen === 'maplo') {
    // 60 % oficial-maplo, 40 % generadas; máximo 3 por ítem (o tema).
    const oficiales = pool.filter((q) => q.origen === 'oficial-maplo');
    const otras = pool.filter((q) => q.origen !== 'oficial-maplo');
    const nOficiales = Math.min(Math.round(n * 0.6), oficiales.length);
    sel.tomar(preferirNoRecientes(oficiales, recientes, rng), nOficiales, 3);
    sel.tomar(preferirNoRecientes(otras, recientes, rng), n - sel.total, 3);
    completar(sel, n, pool, recientes, rng, 3);
    return ordenarComoExamen(sel.elegidas);
  }

  if (examen === 'ingles') {
    // Mezcla 35/40/25 y máximo 3 por tema.
    elegirConMezcla(pool, cuotasDificultad(n, MEZCLA_INGLES, rng), sel, recientes, rng, 3);
    completar(sel, n, pool, recientes, rng, 3);
    return ordenarComoExamen(sel.elegidas);
  }

  // Reglamentos (y cualquier examen con varias fuentes): reparto proporcional al n.º de ítems.
  const fuentes = op.fuentes || [];
  const porFuente = new Map();
  for (const q of pool) {
    if (!porFuente.has(q.fuente)) porFuente.set(q.fuente, []);
    porFuente.get(q.fuente).push(q);
  }
  const pesos = new Map();
  const capacidad = new Map();
  for (const f of fuentes) {
    pesos.set(f.sigla, f.peso > 0 ? f.peso : 1);
    capacidad.set(f.sigla, (porFuente.get(f.sigla) || []).length);
  }
  const asign = repartirProporcional(pesos, n, capacidad, rng);
  const cuotas = cuotasDificultadCoordinadas(asign, MEZCLA_REGLAMENTOS, rng);
  for (const f of fuentes) {
    const k = asign.get(f.sigla) || 0;
    if (k > 0) elegirConMezcla(porFuente.get(f.sigla), cuotas.get(f.sigla), sel, recientes, rng);
  }
  // Si alguna fuente no llegó a su cuota (exclusiones), se completa en orden de peso.
  if (sel.total < n) {
    const orden = fuentes.slice().sort((a, b) => (pesos.get(b.sigla) || 0) - (pesos.get(a.sigla) || 0));
    for (const f of orden) {
      if (sel.total >= n) break;
      sel.tomar(preferirNoRecientes(porFuente.get(f.sigla) || [], recientes, rng), n - sel.total);
    }
  }
  return ordenarComoExamen(sel.elegidas);
}

/** Reparto que se aplicaría (para mostrarlo en la configuración del simulacro). */
export function repartoPrevisto(fuentes, pool, n) {
  const pesos = new Map();
  const capacidad = new Map();
  for (const f of fuentes) {
    pesos.set(f.sigla, f.peso > 0 ? f.peso : 1);
    capacidad.set(f.sigla, pool.filter((q) => q.fuente === f.sigla).length);
  }
  // Sin azar: con n ≥ n.º de fuentes el reparto es determinista.
  return repartirProporcional(pesos, n, capacidad, () => 0.5);
}

// ---------------------------------------------------------------------------
// Repaso
// ---------------------------------------------------------------------------

/**
 * Cola de una sesión de repaso: pendientes (o las próximas, si se adelanta),
 * primero las más atrasadas, sin exclusiones mutuas, y presentadas en orden aleatorio.
 * @param {{q, caja, proxima}[]} enRepaso
 */
export function seleccionarRepaso(enRepaso, hoy, { max = 20, adelantar = false, rng = Math.random } = {}) {
  const base = adelantar ? enRepaso.filter((x) => x.proxima > hoy) : enRepaso.filter((x) => x.proxima <= hoy);
  const sel = new Selector();
  for (const x of ordenarParaRepaso(base)) {
    if (sel.total >= max) break;
    if (sel.puede(x.q)) sel.agregar(x.q);
  }
  return barajar(sel.elegidas, rng);
}
