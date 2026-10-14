// gamificacion.js — XP, niveles, meta diaria, racha y logros.
// Todas las funciones que registran actividad devuelven una lista de «eventos»
// ({tipo:'nivel'|'logro'|'meta'|'racha', …}) que la interfaz convierte en avisos.

import { estado, statDe, guardar, guardarYa } from './estado.js';
import { D, disponiblesFuente } from './datos.js';
import { hoyISO, sumarDias, horaDe } from './util.js';
import { aplicarResultado } from './srs.js';
import { resumen } from './estadisticas.js';
import { emitir } from './bus.js';

const EXAMENES_VALIDOS = new Set(['reglamentos', 'maplo', 'ingles']);

/** Aviso de fin de sesión para el registro de eventos en la nube (ver sincronizacion.js). */
function avisarFin(tipo, examen, inicioMs, finMs, n, aciertos, nota, duracionS, idSesion) {
  emitir('sesion-terminada', {
    tipo,
    examen: EXAMENES_VALIDOS.has(examen) ? examen : null,   // repasos/prácticas mixtas → null
    inicio: new Date(inicioMs || finMs).toISOString(),
    fin: new Date(finMs).toISOString(),
    n,
    aciertos,
    nota,
    duracion_s: Math.max(0, Math.round(duracionS || 0)),
    id_cliente: `${idSesion || 'x'}-${finMs.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  });
}

// ---------------------------------------------------------------------------
// Niveles
// ---------------------------------------------------------------------------

/** XP por acierto en práctica según dificultad 1/2/3. */
export const XP_PRACTICA = { 1: 10, 2: 15, 3: 20 };
export const XP_FALLO = 2;
export const XP_REPASO = 12;
export const XP_META_DIARIA = 50;
export const XP_RACHA_7 = 150;
export const XP_APROBAR = 100;
export const XP_SOBRESALIENTE = 100;

const TRAMOS = [
  [1, 'Grumete'], [4, 'Marinero'], [7, 'Cabo'], [10, 'Oficial de Mar'], [13, 'Oficial de Guardia'],
  [16, 'Jefe de Departamento'], [19, 'Segundo Comandante'], [22, 'Comandante'], [25, 'Almirante'],
];

/** XP acumulado necesario para alcanzar el nivel n: 120·(n−1)·n/2 (nivel 1 = 0, nivel 2 = 120…). */
export const umbralNivel = (n) => 60 * (n - 1) * n;

export function tituloNivel(n) {
  let t = TRAMOS[0][1];
  for (const [desde, nombre] of TRAMOS) if (n >= desde) t = nombre;
  return t;
}

/** Índice de tramo (0 = Grumete … 8 = Almirante) y posición dentro del tramo (1-3). */
export function tramoNivel(n) {
  let i = 0;
  for (let k = 0; k < TRAMOS.length; k++) if (n >= TRAMOS[k][0]) i = k;
  return { indice: i, posicion: i === TRAMOS.length - 1 ? 3 : n - TRAMOS[i][0] + 1 };
}

export function nivelDe(xp) {
  let n = 1;
  while (umbralNivel(n + 1) <= xp) n += 1;
  const desde = umbralNivel(n);
  const hasta = umbralNivel(n + 1);
  return {
    nivel: n,
    titulo: tituloNivel(n),
    desde,
    hasta,
    enNivel: xp - desde,
    necesario: hasta - desde,
    progreso: (xp - desde) / (hasta - desde),
    siguienteTitulo: tituloNivel(TRAMOS.find(([d]) => d > n)?.[0] || n),
  };
}

// ---------------------------------------------------------------------------
// Logros
// ---------------------------------------------------------------------------

export const LOGROS = [
  { id: 'primer_paso', nombre: 'Primer paso', desc: 'Completa tu primera sesión.', icono: 'bandera' },
  { id: 'centenario', nombre: 'Centenario', desc: 'Responde 100 preguntas.', icono: 'cien', meta: 100, cont: 'respondidas' },
  { id: 'quinientas', nombre: 'Quinientas', desc: 'Responde 500 preguntas.', icono: 'capas', meta: 500, cont: 'respondidas' },
  { id: 'millar', nombre: 'Millar', desc: 'Responde 1 000 preguntas.', icono: 'capas', meta: 1000, cont: 'respondidas' },
  { id: 'dos_mil', nombre: 'Dos mil', desc: 'Responde 2 000 preguntas.', icono: 'capas', meta: 2000, cont: 'respondidas' },
  { id: 'racha_3', nombre: 'Racha de 3 días', desc: 'Cumple la meta diaria 3 días seguidos.', icono: 'llama', meta: 3, racha: true },
  { id: 'racha_7', nombre: 'Racha de 7 días', desc: 'Cumple la meta diaria 7 días seguidos.', icono: 'llama', meta: 7, racha: true },
  { id: 'racha_14', nombre: 'Racha de 14 días', desc: 'Cumple la meta diaria 14 días seguidos.', icono: 'llama', meta: 14, racha: true },
  { id: 'racha_30', nombre: 'Racha de 30 días', desc: 'Cumple la meta diaria 30 días seguidos.', icono: 'llama', meta: 30, racha: true },
  { id: 'primer_simulacro', nombre: 'Primer simulacro', desc: 'Entrega tu primer simulacro.', icono: 'reloj' },
  { id: 'aprobado', nombre: 'Aprobado', desc: 'Aprueba un simulacro (nota mínima, 14 por defecto).', icono: 'check' },
  { id: 'sobresaliente', nombre: 'Sobresaliente', desc: 'Obtén 18 o más en un simulacro.', icono: 'estrella' },
  { id: 'pleno', nombre: 'Pleno', desc: 'Acierta 40 de 40 en un simulacro.', icono: 'diana' },
  { id: 'francotirador', nombre: 'Francotirador', desc: 'Encadena 20 aciertos seguidos.', icono: 'mira', meta: 20, cont: 'mejorSeguidas' },
  { id: 'fuente_dominada', nombre: 'Fuente dominada', desc: '90 % de dominio con el 80 % de las preguntas de una fuente vistas.', icono: 'libro', multiple: true },
  { id: 'trilingue', nombre: 'Trilingüe', desc: 'Aprueba un simulacro de cada examen.', icono: 'tres' },
  { id: 'madrugador', nombre: 'Madrugador', desc: 'Estudia antes de las 7:00.', icono: 'sol' },
  { id: 'noctambulo', nombre: 'Noctámbulo', desc: 'Estudia después de las 23:00.', icono: 'luna' },
  { id: 'coleccionista', nombre: 'Coleccionista', desc: 'Repasa 50 preguntas que marcaste con bandera.', icono: 'banderas', meta: 50, cont: 'marcadasRepasadas' },
  { id: 'repasador', nombre: 'Repasador', desc: 'Acierta 100 preguntas en repaso.', icono: 'repaso', meta: 100, cont: 'repasosAcertados' },
];
export const LOGRO_POR_ID = new Map(LOGROS.map((l) => [l.id, l]));

function otorgar(id, eventos, extra = {}) {
  if (estado.logros[id]) return;
  estado.logros[id] = new Date().toISOString();
  eventos.push({ tipo: 'logro', id, ...extra });
}

/** Progreso hacia un logro aún bloqueado: {actual, meta} o null si no aplica. */
export function progresoLogro(l) {
  if (l.cont) return { actual: Math.min(estado.cont[l.cont] || 0, l.meta), meta: l.meta };
  if (l.racha) return { actual: Math.min(mejorRacha(), l.meta), meta: l.meta };
  if (l.id === 'fuente_dominada') {
    return { actual: Object.keys(estado.fuentesDominadas).length, meta: D.fuentes.filter((f) => f.preguntas.length).length };
  }
  if (l.id === 'trilingue') return { actual: examenesAprobados().size, meta: D.examenes.length || 3 };
  return null;
}

function examenesAprobados() {
  return new Set(estado.sims.filter((s) => s.aprobado).map((s) => s.ex));
}

// ---------------------------------------------------------------------------
// Día, meta diaria y racha
// ---------------------------------------------------------------------------

function registroDia(hoy) {
  if (!estado.dias[hoy]) estado.dias[hoy] = { r: 0, a: 0, xp: 0 };
  return estado.dias[hoy];
}

/** Racha vigente: días consecutivos con meta cumplida que terminan hoy (si ya se cumplió) o ayer. */
export function rachaActual(hoy = hoyISO()) {
  let f = estado.dias[hoy]?.meta ? hoy : sumarDias(hoy, -1);
  let n = 0;
  while (estado.dias[f]?.meta) { n += 1; f = sumarDias(f, -1); }
  return n;
}

/** La racha más larga registrada. */
export function mejorRacha() {
  const dias = Object.keys(estado.dias).filter((d) => estado.dias[d].meta).sort();
  let mejor = 0;
  let actual = 0;
  let previo = null;
  for (const d of dias) {
    actual = previo && sumarDias(previo, 1) === d ? actual + 1 : 1;
    mejor = Math.max(mejor, actual);
    previo = d;
  }
  return mejor;
}

/** Estado de hoy para la cabecera de Inicio. */
export function infoHoy(ahora = new Date()) {
  const hoy = hoyISO(ahora);
  const d = estado.dias[hoy];
  const meta = estado.ajustes.metaDiaria;
  const respondidas = d?.r || 0;
  const hoyCumplida = !!d?.meta;
  const racha = rachaActual(hoy);
  return {
    hoy,
    respondidas,
    meta,
    faltan: Math.max(0, meta - respondidas),
    hoyCumplida,
    racha,
    enRiesgo: !hoyCumplida && racha > 0 && ahora.getHours() >= 18,
  };
}

function ganarXP(cantidad, eventos, hoy) {
  if (cantidad <= 0) return;
  const antes = nivelDe(estado.xp);
  estado.xp += cantidad;
  registroDia(hoy).xp += cantidad;
  const despues = nivelDe(estado.xp);
  if (despues.nivel > antes.nivel) {
    eventos.push({ tipo: 'nivel', nivel: despues.nivel, titulo: despues.titulo, ascenso: despues.titulo !== antes.titulo });
  }
}

/** Suma respuestas al día; si se alcanza la meta: +50 XP, racha (+150 cada 7 días) y logros. */
function registrarActividad(respondidas, aciertos, eventos, hoy) {
  const d = registroDia(hoy);
  d.r += respondidas;
  d.a += aciertos;
  if (!d.meta && d.r >= estado.ajustes.metaDiaria) {
    d.meta = 1;
    eventos.push({ tipo: 'meta', xp: XP_META_DIARIA });
    ganarXP(XP_META_DIARIA, eventos, hoy);
    const racha = rachaActual(hoy);
    if (racha > 0 && racha % 7 === 0) {
      eventos.push({ tipo: 'racha', dias: racha, xp: XP_RACHA_7 });
      ganarXP(XP_RACHA_7, eventos, hoy);
    }
    for (const n of [3, 7, 14, 30]) if (racha >= n) otorgar(`racha_${n}`, eventos);
  }
}

function revisarConteos(eventos) {
  const r = estado.cont.respondidas;
  if (r >= 100) otorgar('centenario', eventos);
  if (r >= 500) otorgar('quinientas', eventos);
  if (r >= 1000) otorgar('millar', eventos);
  if (r >= 2000) otorgar('dos_mil', eventos);
  if (estado.cont.mejorSeguidas >= 20) otorgar('francotirador', eventos);
  if (estado.cont.repasosAcertados >= 100) otorgar('repasador', eventos);
  if (estado.cont.marcadasRepasadas >= 50) otorgar('coleccionista', eventos);
}

/** Fuente dominada: ≥ 90 % de dominio con ≥ 80 % de sus preguntas (disponibles) vistas. */
function revisarFuente(sigla, eventos) {
  if (estado.fuentesDominadas[sigla]) return;
  const qs = disponiblesFuente(sigla, estado.ajustes);
  if (!qs.length) return;
  const r = resumen(qs, estado.p);
  if (r.dominio !== null && r.dominio >= 0.9 && r.vistas / r.total >= 0.8) {
    const fecha = new Date().toISOString();
    estado.fuentesDominadas[sigla] = fecha;
    if (!estado.logros.fuente_dominada) estado.logros.fuente_dominada = fecha;
    eventos.push({ tipo: 'logro', id: 'fuente_dominada', fuente: sigla });
  }
}

function revisarHorario(inicioMs, finMs, eventos) {
  const h1 = horaDe(inicioMs);
  const h2 = horaDe(finMs);
  if (h1 < 7 || h2 < 7) otorgar('madrugador', eventos);
  if (h1 >= 23 || h2 >= 23) otorgar('noctambulo', eventos);
}

/** Actualiza intentos, historial y racha de aciertos de una pregunta. */
function anotarIntento(q, correcta, modo, hoy, ahora) {
  const st = statDe(q.id, true);
  st.n += 1;
  if (correcta) st.a += 1;
  st.h = (st.h + (correcta ? '1' : '0')).slice(-10);
  st.u = ahora;
  aplicarResultado(st, correcta, modo, hoy);
  const c = estado.cont;
  if (correcta) {
    c.seguidas += 1;
    if (c.seguidas > c.mejorSeguidas) c.mejorSeguidas = c.seguidas;
  } else {
    c.seguidas = 0;
  }
  return st;
}

// ---------------------------------------------------------------------------
// Registro de respuestas (práctica y repaso)
// ---------------------------------------------------------------------------

/**
 * Registra una respuesta de práctica o repaso.
 * @returns {{xp:number, eventos:object[]}}
 */
export function registrarRespuesta(q, correcta, modo = 'practica') {
  const eventos = [];
  const ahora = Date.now();
  const hoy = hoyISO();
  const st = statDe(q.id, true);
  const estabaMarcada = !!st.m;
  anotarIntento(q, correcta, modo, hoy, ahora);
  const c = estado.cont;
  c.respondidas += 1;
  if (correcta) c.aciertos += 1;
  if (modo === 'repaso') {
    if (correcta) c.repasosAcertados += 1;
    if (estabaMarcada) {
      // La bandera cumplió su función: la pregunta ya se repasó.
      delete st.m; delete st.sm; delete st.mn;
      c.marcadasRepasadas += 1;
    }
  }
  let xp;
  if (modo === 'repaso') xp = correcta ? XP_REPASO : XP_FALLO;
  else xp = correcta ? (XP_PRACTICA[q.dificultad] || 15) : XP_FALLO;
  ganarXP(xp, eventos, hoy);
  registrarActividad(1, correcta ? 1 : 0, eventos, hoy);
  revisarConteos(eventos);
  revisarFuente(q.fuente, eventos);
  guardar();
  // [1.3.0] Consumo de la prueba gratis (acceso.js lo acumula y lo envía en lotes).
  emitir('respuesta-registrada', { modo, id: q.id });
  return { xp, eventos };
}

/** Cierre de una sesión de práctica o repaso: cuenta la sesión y revisa logros de horario. */
export function cerrarSesionEstudio(ses) {
  const eventos = [];
  estado.cont.sesiones += 1;
  otorgar('primer_paso', eventos);
  const fin = Date.now();
  revisarHorario(ses.inicio || fin, fin, eventos);
  guardarYa();
  const ids = Object.keys(ses.resp || {}).filter((id) => ses.resp[id] !== null && ses.resp[id] !== undefined);
  avisarFin(ses.tipo === 'repaso' ? 'repaso' : 'practica', ses.examen, ses.inicio, fin, ids.length,
    ids.filter((id) => ses.ok && ses.ok[id]).length, null, (ses.activoMs || 0) / 1000, ses.id);
  return eventos;
}

// ---------------------------------------------------------------------------
// Simulacro
// ---------------------------------------------------------------------------

/** Nota vigesimal (0-20) con un decimal. */
export const notaVigesimal = (aciertos, total) => (total > 0 ? Math.round((aciertos / total) * 200) / 10 : 0);

/**
 * Entrega un simulacro: califica, actualiza estadísticas/SRS/XP/logros y lo guarda en el historial.
 * @returns {{sim, anterior, eventos}}
 */
export function entregarSimulacro(ses) {
  const eventos = [];
  const ahora = Date.now();
  const hoy = hoyISO();
  const preguntas = ses.ids.map((id) => D.porId.get(id)).filter(Boolean);
  const porFuente = {};
  const porDif = { 1: { a: 0, t: 0 }, 2: { a: 0, t: 0 }, 3: { a: 0, t: 0 } };
  let aciertos = 0;
  let respondidas = 0;
  let xpBase = 0;

  for (const q of preguntas) {
    const elegido = ses.resp[q.id];
    const respondida = elegido !== undefined && elegido !== null;
    const ok = respondida && elegido === q.correcta;
    if (respondida) respondidas += 1;
    if (ok) { aciertos += 1; xpBase += (XP_PRACTICA[q.dificultad] || 15) * 1.5; }
    // Las no respondidas cuentan como fallo (también para el repaso).
    anotarIntento(q, ok, 'simulacro', hoy, ahora);
    if (!porFuente[q.fuente]) porFuente[q.fuente] = { a: 0, t: 0 };
    porFuente[q.fuente].t += 1;
    if (ok) porFuente[q.fuente].a += 1;
    const d = porDif[q.dificultad] || porDif[2];
    d.t += 1;
    if (ok) d.a += 1;
  }

  const total = preguntas.length;
  const nota = notaVigesimal(aciertos, total);
  const minima = estado.ajustes.notaMinima;
  const aprobado = nota >= minima;
  const xpAciertos = Math.round(xpBase);
  const bonus = (aprobado ? XP_APROBAR : 0) + (nota >= 18 ? XP_SOBRESALIENTE : 0);
  const anterior = [...estado.sims].reverse().find((s) => s.ex === ses.examen) || null;

  estado.cont.respondidas += respondidas;
  estado.cont.aciertos += aciertos;
  estado.cont.sesiones += 1;
  ganarXP(xpAciertos + bonus, eventos, hoy);
  registrarActividad(respondidas, aciertos, eventos, hoy);

  const sim = {
    id: ses.id,
    ex: ses.examen,
    f: new Date(ahora).toISOString(),
    nota,
    ac: aciertos,
    tot: total,
    respondidas,
    seg: Math.round(ses.usado || 0),
    limite: ses.limite || null,
    xp: xpAciertos + bonus,
    xpAciertos,
    bonus,
    aprobado,
    minima,
    composicion: ses.composicion || 'examen',
    porFuente,
    porDif,
    ids: ses.ids.slice(),
    r: { ...ses.resp },
    auto: !!ses.auto,
  };
  estado.sims.push(sim);
  podarHistorial();

  otorgar('primer_paso', eventos);
  otorgar('primer_simulacro', eventos);
  if (aprobado) otorgar('aprobado', eventos);
  if (nota >= 18) otorgar('sobresaliente', eventos);
  if (total >= 40 && aciertos === total) otorgar('pleno', eventos);
  if (D.examenes.every((e) => examenesAprobados().has(e.id))) otorgar('trilingue', eventos);
  revisarConteos(eventos);
  for (const sigla of Object.keys(porFuente)) revisarFuente(sigla, eventos);
  revisarHorario(ses.inicio || ahora, ahora, eventos);

  estado.sesiones.simulacro = null;
  guardarYa();
  avisarFin('simulacro', ses.examen, ses.inicio, ahora, total, aciertos, nota, ses.usado || 0, ses.id);
  return { sim, anterior, eventos };
}

/** Conserva el detalle (ids y respuestas) solo de los 10 últimos simulacros de cada examen. */
function podarHistorial() {
  const porExamen = {};
  for (let i = estado.sims.length - 1; i >= 0; i--) {
    const s = estado.sims[i];
    porExamen[s.ex] = (porExamen[s.ex] || 0) + 1;
    if (porExamen[s.ex] > 10) { delete s.ids; delete s.r; }
  }
}
