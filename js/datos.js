// datos.js — Carga del banco y de meta.json, índices en memoria (por examen, fuente y grupo),
// filtro base (modo ampliado / no verificadas), barajado estable de alternativas y búsqueda.
//
// Grupos («ítems»): si meta.fuentes[].items trae datos, se usan tal cual y en su orden
// (Reglamentos: «1.01», «1.02»…; MAPLO final: «Cap. 1»…; Inglés final: «01»…«29»).
// Si una fuente no trae ítems en meta, se agrupa por el campo `item` de cada pregunta
// o, cuando item es «-», por su `tema`. Así la app funciona con el banco preliminar y el final.

import { barajar, hashTexto, mulberry32, normalizar } from './util.js';

/** Contenedor único de datos en memoria (se rellena una sola vez). */
export const D = {
  meta: null,
  banco: [],
  porId: new Map(),
  examenes: [],              // [{id, nombre, preguntas_examen, minutos}]
  examenPorId: new Map(),
  fuentes: [],               // fuentes en el orden de meta (orden del temario)
  fuentePorSigla: new Map(),
  grupoPorClave: new Map(),
  porExamen: {},             // examen → [preguntas]
};

const EXAMENES_POR_DEFECTO = [
  { id: 'reglamentos', nombre: 'Reglamentos', preguntas_examen: 40, minutos: 60 },
  { id: 'maplo', nombre: 'MAPLO', preguntas_examen: 40, minutos: 60 },
  { id: 'ingles', nombre: 'Inglés', preguntas_examen: 40, minutos: 60 },
];

/** Descarga banco.json y meta.json (en paralelo) y construye los índices. */
export async function cargarDatos() {
  const [rb, rm] = await Promise.all([fetch('./data/banco.json'), fetch('./data/meta.json')]);
  if (!rb.ok || !rm.ok) throw new Error(`No se pudo descargar el banco (HTTP ${rb.status}/${rm.status})`);
  const [banco, meta] = await Promise.all([rb.json(), rm.json()]);
  indexarDatos(banco, meta);
  return D;
}

/** Orden natural para códigos de ítem: «Cap. 2» < «Cap. 10» < «Anexo A»; «01» < «29». */
function compararCodigos(a, b) {
  const clase = (s) => (/^anexo/i.test(s) ? 1 : 0);
  if (clase(a) !== clase(b)) return clase(a) - clase(b);
  return a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' });
}

/** Construye todos los índices a partir de los JSON ya parseados (también se usa desde Node). */
export function indexarDatos(banco, meta) {
  D.meta = meta || { version: '?', fuentes: [], examenes: EXAMENES_POR_DEFECTO };
  D.banco = Array.isArray(banco) ? banco : [];
  D.examenes = (D.meta.examenes && D.meta.examenes.length) ? D.meta.examenes : EXAMENES_POR_DEFECTO;
  D.examenPorId = new Map(D.examenes.map((e) => [e.id, e]));
  D.porId = new Map();
  D.fuentes = [];
  D.fuentePorSigla = new Map();
  D.grupoPorClave = new Map();
  D.porExamen = {};
  for (const e of D.examenes) D.porExamen[e.id] = [];

  // 1) Fuentes declaradas en meta (en su orden).
  for (const fm of (D.meta.fuentes || [])) {
    crearFuente(fm.sigla, fm.nombre, fm.examen, fm.items || []);
  }

  // 2) Preguntas: índice por id, por examen y por fuente (fuentes no declaradas se crean al vuelo).
  D.banco.forEach((q, i) => {
    q._i = i;
    D.porId.set(q.id, q);
    if (!D.porExamen[q.examen]) D.porExamen[q.examen] = [];
    D.porExamen[q.examen].push(q);
    let f = D.fuentePorSigla.get(q.fuente);
    if (!f) f = crearFuente(q.fuente, q.fuente_nombre || q.fuente, q.examen, []);
    f.preguntas.push(q);
    q._f = f;
  });

  // 3) Grupos de cada fuente.
  for (const f of D.fuentes) construirGrupos(f);
  memo = { clave: '', porExamen: null, porFuente: null, porGrupo: null };
  return D;
}

function crearFuente(sigla, nombre, examen, itemsMeta) {
  const f = {
    sigla,
    nombre: nombre || sigla,
    examen,
    orden: D.fuentes.length,
    itemsMeta,
    peso: itemsMeta.length,     // n.º de ítems del temario (composición «como el examen»)
    preguntas: [],
    grupos: [],
    tipoGrupos: 'tema',         // 'articulo' | 'capitulo' | 'tema'
  };
  D.fuentes.push(f);
  D.fuentePorSigla.set(sigla, f);
  return f;
}

function nuevoGrupo(f, codigo, datos) {
  const g = {
    clave: `${f.sigla}|${codigo}`,
    fuente: f.sigla,
    examen: f.examen,
    codigo,
    titulo: datos.titulo || codigo,
    referencia: datos.referencia || '',
    tipo: datos.tipo,          // 'item' | 'tema' | 'otros'
    orden: f.grupos.length,
    preguntas: [],
  };
  f.grupos.push(g);
  D.grupoPorClave.set(g.clave, g);
  return g;
}

function construirGrupos(f) {
  f.grupos = [];
  if (f.itemsMeta.length) {
    // Ítems oficiales de meta.json, en su orden.
    const porCodigo = new Map();
    for (const it of f.itemsMeta) {
      porCodigo.set(String(it.item), nuevoGrupo(f, String(it.item), { titulo: it.titulo, referencia: it.referencia, tipo: 'item' }));
    }
    let otros = null;
    for (const q of f.preguntas) {
      let g = porCodigo.get(String(q.item));
      if (!g) {
        otros = otros || nuevoGrupo(f, '-', {
          titulo: 'Otras preguntas de la fuente', referencia: 'Sin ítem del temario asignado', tipo: 'otros',
        });
        g = otros;
      }
      g.preguntas.push(q);
      q._g = g;
    }
    f.tipoGrupos = f.examen === 'reglamentos' ? 'articulo' : (f.examen === 'maplo' ? 'capitulo' : 'tema');
  } else {
    // Sin ítems en meta: por `item` (si no es «-») o por `tema`, en orden de aparición.
    const porCodigo = new Map();
    let hayItems = false;
    for (const q of f.preguntas) {
      const conItem = q.item && q.item !== '-';
      const codigo = conItem ? `i:${q.item}` : `t:${q.tema || 'General'}`;
      let g = porCodigo.get(codigo);
      if (!g) {
        g = nuevoGrupo(f, codigo, conItem
          ? { titulo: q.item, referencia: '', tipo: 'item' }
          : { titulo: q.tema || 'General', referencia: '', tipo: 'tema' });
        porCodigo.set(codigo, g);
      }
      if (conItem) hayItems = true;
      g.preguntas.push(q);
      q._g = g;
    }
    if (hayItems) {
      // Ordenar los grupos por código natural; los temas sueltos van al final.
      f.grupos.sort((a, b) => {
        if (a.tipo !== b.tipo) return a.tipo === 'item' ? -1 : 1;
        return a.tipo === 'item' ? compararCodigos(a.codigo.slice(2), b.codigo.slice(2)) : a.orden - b.orden;
      });
      f.grupos.forEach((g, i) => { g.orden = i; });
    }
    f.tipoGrupos = hayItems && f.examen === 'maplo' ? 'capitulo' : 'tema';
    // Sin ítems oficiales, el peso de la fuente es su número de grupos.
    f.peso = f.grupos.length;
  }
}

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

export const examenNombre = (id) => D.examenPorId.get(id)?.nombre || id;
export const fuentesDe = (examen) => D.fuentes.filter((f) => f.examen === examen);

/** Etiqueta en plural para los grupos de una fuente: «artículos», «capítulos» o «temas». */
export function etiquetaGrupos(fuente, plural = true) {
  const t = fuente?.tipoGrupos;
  if (t === 'articulo') return plural ? 'artículos' : 'artículo';
  if (t === 'capitulo') {
    const anexos = fuente.grupos.some((g) => /anexo/i.test(g.codigo));
    return plural ? (anexos ? 'capítulos y anexos' : 'capítulos') : 'capítulo';
  }
  return plural ? 'temas' : 'tema';
}

/** Referencia de un grupo solo si aporta algo distinto del título. */
export const referenciaUtil = (g) => (g.referencia && g.referencia !== g.titulo ? g.referencia : '');

/** Filtro base que se aplica en todos los modos. */
export function pasaFiltroBase(q, ajustes) {
  if (!ajustes.modoAmpliado && q.en_temario === false) return false;
  if (!ajustes.incluirNoVerificadas && q.verificacion === 'no_verificable') return false;
  return true;
}

// Memo de preguntas disponibles según los dos interruptores del filtro base.
let memo = { clave: '', porExamen: null, porFuente: null, porGrupo: null };

function claveFiltro(aj) { return `${aj.modoAmpliado ? 1 : 0}${aj.incluirNoVerificadas ? 1 : 0}${D.banco.length}`; }

function asegurarMemo(aj) {
  const clave = claveFiltro(aj);
  if (memo.clave === clave) return;
  const porExamen = {};
  const porFuente = new Map();
  const porGrupo = new Map();
  for (const e of Object.keys(D.porExamen)) porExamen[e] = [];
  for (const q of D.banco) {
    if (!pasaFiltroBase(q, aj)) continue;
    porExamen[q.examen].push(q);
    if (!porFuente.has(q.fuente)) porFuente.set(q.fuente, []);
    porFuente.get(q.fuente).push(q);
    if (!porGrupo.has(q._g.clave)) porGrupo.set(q._g.clave, []);
    porGrupo.get(q._g.clave).push(q);
  }
  memo = { clave, porExamen, porFuente, porGrupo };
}

/** Preguntas disponibles (filtro base aplicado) de un examen. */
export function disponibles(examen, aj) {
  asegurarMemo(aj);
  return memo.porExamen[examen] || [];
}
export function disponiblesFuente(sigla, aj) {
  asegurarMemo(aj);
  return memo.porFuente.get(sigla) || [];
}
export function disponiblesGrupo(clave, aj) {
  asegurarMemo(aj);
  return memo.porGrupo.get(clave) || [];
}
/** Total disponible con la configuración actual, y desglose por examen. */
export function conteoDisponible(aj) {
  asegurarMemo(aj);
  const porExamen = {};
  let total = 0;
  for (const [e, lista] of Object.entries(memo.porExamen)) { porExamen[e] = lista.length; total += lista.length; }
  return { total, porExamen };
}

// ---------------------------------------------------------------------------
// Alternativas barajadas con semilla: mulberry32(hash(id + idSesion))
// ---------------------------------------------------------------------------

/** Devuelve la permutación de índices ORIGINALES en el orden en que se muestran. */
export function permutacion(q, idSesion) {
  const rng = mulberry32(hashTexto(`${q.id}${idSesion}`));
  return barajar(q.opciones.map((_, i) => i), rng);
}

// ---------------------------------------------------------------------------
// Búsqueda de texto (pregunta, explicación, referencia, sigla)
// ---------------------------------------------------------------------------

function textoBusqueda(q) {
  if (q._n === undefined) {
    q._n = normalizar(`${q.pregunta} ${q.explicacion} ${q.referencia} ${q.fuente} ${q.tema || ''}`);
  }
  return q._n;
}

/** Busca todas las palabras (sin tildes) en las preguntas disponibles. */
export function buscar(texto, aj, limite = 200) {
  const terminos = normalizar(texto).split(/\s+/).filter((t) => t.length > 0);
  if (!terminos.length || normalizar(texto).trim().length < 2) return { resultados: [], total: 0 };
  asegurarMemo(aj);
  const resultados = [];
  let total = 0;
  for (const e of Object.keys(memo.porExamen)) {
    for (const q of memo.porExamen[e]) {
      const t = textoBusqueda(q);
      if (terminos.every((w) => t.includes(w))) {
        total += 1;
        if (resultados.length < limite) resultados.push(q);
      }
    }
  }
  return { resultados, total };
}
