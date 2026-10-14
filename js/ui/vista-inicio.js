// vista-inicio.js — Inicio: cuenta regresiva, meta diaria (brújula), racha, nivel,
// accesos principales, exámenes con dominio, sesiones en curso y consejo del día.

import { estado, almacen } from '../estado.js';
import { D, disponibles, examenNombre } from '../datos.js';
import { esc, fmtNum, fmtFechaLarga, diasEntre, hoyISO, plural, fmtPct } from '../util.js';
import { infoHoy, nivelDe } from '../gamificacion.js';
import { pendientesHoy, resumenExamen } from '../consultas.js';
import { navegar } from '../router.js';
import { icono } from './iconos.js';
import { brujula } from './anillo.js';
import { insignia, barra } from './comun.js';
import { htmlContinuar, manejarContinuar } from './continuar.js';
import { abrirHoja } from './modal.js';
import { exportarProgreso } from './exportar.js';
import { toast } from './toast.js';
import * as sync from '../sincronizacion.js';
import { obtenerRanking } from './vista-ranking.js';

const TEXTO_SYNC = {
  ok: ['nube-ok', 'Sincronizado'],
  pendiente: ['repaso', 'Pendiente'],
  sincronizando: ['repaso', 'Sincronizando…'],
  offline: ['nube-off', 'Sin conexión'],
  error: ['alerta', 'Error al sincronizar'],
};

/** Indicador de sincronización (✓ sincronizado / ⟳ pendiente / sin conexión). */
export function htmlSync(s = sync.situacionSync()) {
  const [ic, texto] = TEXTO_SYNC[s.tipo] || TEXTO_SYNC.ok;
  return `${icono(ic, { tam: 16 })}<span>${esc(texto)}</span>`;
}

function htmlTarjetaRanking(datos) {
  const meta = sync.metaNube();
  const filas = datos && datos.filas;
  const yo = filas ? filas.find((r) => r.es_yo) : null;
  let sub = 'Compara tu XP y tu nota con la promoción';
  if (!meta.apodo) sub = 'Elige un apodo para aparecer en el ranking';
  else if (yo) sub = `Tu posición: ${yo.posicion}.º de ${filas.length > yo.posicion ? filas.length : yo.posicion} · ${fmtNum(yo.xp)} XP`;
  return `<span class="fila-icono">${icono('podio')}</span>
    <span class="fila-cuerpo"><span class="fila-titulo">Ranking</span><span class="fila-sub" data-ranking-sub>${esc(sub)}</span></span>
    ${yo ? `<span class="etiqueta etiqueta-oro">${yo.posicion}.º</span>` : ''}${icono('chev-der', { clase: 'chev', tam: 20 })}`;
}

const CONSEJOS = [
  'Lee el enunciado completo antes de mirar las alternativas: en el examen real muchas se diferencian por una sola palabra.',
  'Repasa a diario. La repetición espaciada te devuelve lo que fallaste justo antes de que lo olvides.',
  'Haz un simulacro cronometrado por semana: 40 preguntas en 60 minutos son 90 segundos por pregunta.',
  'En las preguntas de listas, busca el elemento que sobra o el que falta: ahí suele estar la trampa.',
  'Estudia un artículo en Explorar y luego practícalo. Leer y responder seguidos fija mejor el detalle.',
  'Plazos, porcentajes y autoridades son de los datos más preguntados. Vuelve a ellos cada semana.',
  'Si dudas entre dos alternativas, marca la pregunta con la bandera y consulta el reglamento.',
  'Dormir bien consolida la memoria: rinden más 30 preguntas diarias que 200 la noche anterior.',
  'Activa las MAYÚSCULAS en Ajustes para leer las preguntas tal como aparecen en el examen.',
  'El banco se generó a partir del temario oficial y se auditó; aun así, ante una duda manda el reglamento.',
];

function textoCuenta() {
  const f = estado.ajustes.fechaExamen;
  if (!f) {
    return { titulo: 'Ascenso 2026', sub: '<a href="#/ajustes">Configura la fecha del examen</a> para ver la cuenta regresiva.' };
  }
  const n = diasEntre(hoyISO(), f);
  if (n > 1) return { titulo: `Faltan ${fmtNum(n)} días`, sub: `Examen: ${esc(fmtFechaLarga(f))}` };
  if (n === 1) return { titulo: 'Falta 1 día', sub: `Examen: ${esc(fmtFechaLarga(f))}. Descansa bien.` };
  if (n === 0) return { titulo: 'Hoy es el examen', sub: 'Confía en tu preparación. ¡Éxitos!' };
  return { titulo: 'Examen rendido', sub: `Fue el ${esc(fmtFechaLarga(f))}. Actualiza la fecha en Ajustes si hay otro.` };
}

function consejoDelDia() {
  const sinExportar = !estado.ultimaExportacion
    || (Date.now() - new Date(estado.ultimaExportacion).getTime()) > 7 * 86400000;
  if (sinExportar && estado.cont.respondidas >= 30) {
    return `<section class="consejo" aria-label="Recordatorio">${icono('descargar', { tam: 22 })}<div>
      <p>Guarda una copia de tu progreso cada semana. Si cambias de celular o se borran los datos del navegador, podrás recuperarlo.</p>
      <button type="button" class="btn btn-secundario btn-chico" data-accion="exportar">Exportar progreso</button></div></section>`;
  }
  const inicio = new Date(new Date().getFullYear(), 0, 0);
  const diaDelAnio = Math.floor((Date.now() - inicio.getTime()) / 86400000);
  return `<section class="consejo" aria-label="Consejo del día">${icono('ancla', { tam: 22 })}<p>${esc(CONSEJOS[diaDelAnio % CONSEJOS.length])}</p></section>`;
}

function filaExamen(e) {
  const r = resumenExamen(e.id);
  const total = disponibles(e.id, estado.ajustes).length;
  const dom = r.dominio === null ? 'Sin datos' : fmtPct(r.dominio);
  return `<li><button type="button" class="fila examen-fila" data-accion="examen" data-valor="${esc(e.id)}">
    <div class="fila-cuerpo">
      <span class="fila-titulo">${esc(e.nombre)}</span>
      <span class="fila-sub">${fmtNum(r.vistas)} de ${fmtNum(total)} preguntas vistas</span>
      ${barra(total ? r.vistas / total : 0, `Preguntas vistas de ${e.nombre}`)}
    </div>
    <div class="fila-valor">${dom}<span class="mini" style="display:block;font-weight:600">dominio</span></div>
    ${icono('chev-der', { clase: 'chev', tam: 20 })}
  </button></li>`;
}

export function montar(raiz) {
  let vivo = true;
  let rankingCache = sync.metaNube().ranking?.xp || null;
  function pintar() {
    const hoy = infoHoy();
    const niv = nivelDe(estado.xp);
    const pend = pendientesHoy();
    const cuenta = textoCuenta();
    const progresoMeta = hoy.meta ? Math.min(1, hoy.respondidas / hoy.meta) : 0;
    const nombre = estado.ajustes.nombre.trim() || 'Comandante';

    raiz.innerHTML = `
    <section class="portada">
      <div class="portada-cabeza">
        <div>
          <p class="saludo">Hola, ${esc(nombre)}</p>
          <h1 class="cuenta">${esc(cuenta.titulo)}</h1>
          <p class="cuenta-sub">${cuenta.sub}</p>
        </div>
        <div class="portada-botones">
          <button type="button" class="chip-sync" data-accion="sincronizar" data-sync="${sync.situacionSync().tipo}" aria-live="polite" aria-label="Estado de sincronización">${htmlSync()}</button>
          <a class="btn-icono" href="#/ajustes" aria-label="Ajustes">${icono('ajustes')}</a>
        </div>
      </div>
      <div class="portada-panel">
        <div class="brujula" role="img" aria-label="Meta diaria: ${hoy.respondidas} de ${hoy.meta} preguntas hoy">
          ${brujula(progresoMeta)}
          <div class="brujula-centro" aria-hidden="true">
            <strong>${fmtNum(hoy.respondidas)}</strong>
            <span>de ${fmtNum(hoy.meta)} hoy</span>
          </div>
        </div>
        <div class="portada-datos">
          <div class="dato-racha">${icono('llama')}<strong>${hoy.racha}</strong><span>${hoy.racha === 1 ? 'día de racha' : 'días de racha'}</span></div>
          ${hoy.enRiesgo ? `<p class="riesgo">${icono('alerta', { tam: 16 })}Racha en riesgo: faltan ${hoy.faltan}</p>` : ''}
          ${hoy.hoyCumplida ? `<p class="hecho">${icono('check', { tam: 16 })}Meta de hoy cumplida</p>` : ''}
          <div class="nivel-mini">${insignia(niv.nivel, 44)}<div><strong>Nivel ${niv.nivel}</strong><span>${esc(niv.titulo)}</span></div></div>
          <div>
            ${barra(niv.progreso, 'Experiencia del nivel')}
            <p class="mini num">${fmtNum(niv.enNivel)} de ${fmtNum(niv.necesario)} XP</p>
          </div>
        </div>
      </div>
    </section>

    ${!almacen.disponible ? `<p class="aviso-almacen">${icono('alerta', { tam: 20 })}<span>Este navegador no permite guardar datos (¿modo privado?). Tu progreso vive solo en memoria: expórtalo antes de cerrar.</span></p>` : ''}

    ${htmlContinuar()}

    <nav class="acciones-principales" aria-label="Modos de estudio">
      <a class="accion accion-principal" href="#/practica">
        <span class="accion-icono">${icono('practica')}</span>
        <strong>Práctica</strong><span class="mini">Con explicación inmediata</span>
      </a>
      <a class="accion" href="#/simulacro">
        <span class="accion-icono">${icono('simulacro')}</span>
        <strong>Simulacro</strong><span class="mini">Como el examen real</span>
      </a>
      <a class="accion" href="#/repaso">
        <span class="accion-icono">${icono('repaso')}</span>
        <strong>Repaso</strong><span class="mini">${pend.total ? plural(pend.total, 'pendiente hoy', 'pendientes hoy') : 'Al día'}</span>
        ${pend.total ? `<span class="contador" aria-hidden="true">${pend.total > 999 ? '999+' : pend.total}</span>` : ''}
      </a>
      <a class="accion" href="#/explorar">
        <span class="accion-icono">${icono('explorar')}</span>
        <strong>Explorar</strong><span class="mini">Estudia por artículo</span>
      </a>
    </nav>

    <ul class="lista mt-m"><li><a class="fila tarjeta-ranking" href="#/ranking" id="tarjeta-ranking">${htmlTarjetaRanking(rankingCache)}</a></li></ul>

    <h2>Tus exámenes</h2>
    <ul class="lista">${D.examenes.map(filaExamen).join('')}</ul>

    ${consejoDelDia()}
    `;
  }

  async function alClic(e) {
    const b = e.target.closest('[data-accion]');
    if (!b) return;
    if (await manejarContinuar(b, pintar)) return;
    const accion = b.dataset.accion;
    if (accion === 'exportar') { exportarProgreso(); pintar(); return; }
    if (accion === 'sincronizar') {
      const r = await sync.sincronizar();
      if (r.ok) toast(r.resultado === 'fusion' ? 'Progreso combinado con el de tu cuenta.' : 'Progreso sincronizado.', { tipo: 'exito', icono: 'nube-ok' });
      else if (r.motivo === 'offline' || r.motivo === 'red') toast('Sin conexión: se sincronizará al volver la red.', { icono: 'nube-off' });
      else if (r.mensaje) toast(r.mensaje, { tipo: 'error' });
      return;
    }
    if (accion === 'examen') {
      const ex = b.dataset.valor;
      const elegido = await abrirHoja({
        titulo: examenNombre(ex),
        acciones: [
          { texto: 'Practicar', clase: 'btn-primario', valor: 'practica' },
          { texto: 'Hacer un simulacro', clase: 'btn-secundario', valor: 'simulacro' },
          { texto: 'Explorar por artículo', clase: 'btn-secundario', valor: 'explorar' },
          { texto: 'Ver progreso', clase: 'btn-secundario', valor: 'progreso' },
        ],
      });
      if (!elegido) return;
      if (elegido === 'practica') { estado.config.practica.examen = ex; navegar('/practica'); }
      if (elegido === 'simulacro') { estado.config.simulacro.examen = ex; navegar('/simulacro'); }
      if (elegido === 'explorar') navegar(`/explorar/${ex}`);
      if (elegido === 'progreso') navegar(`/progreso?examen=${ex}`);
    }
  }

  pintar();
  raiz.addEventListener('click', alClic);
  const quitarSync = sync.alCambiarSync((s) => {
    const chip = raiz.querySelector('.chip-sync');
    if (chip) { chip.dataset.sync = s.tipo; chip.innerHTML = htmlSync(s); }
  });
  // Ranking: se muestra la caché y se refresca en segundo plano (como mucho cada 5 min).
  obtenerRanking('xp', 300000).then((r) => {
    if (!vivo || !r) return;
    rankingCache = r;
    const t = raiz.querySelector('#tarjeta-ranking');
    if (t) t.innerHTML = htmlTarjetaRanking(r);
  });
  return () => {
    vivo = false;
    quitarSync();
    raiz.removeEventListener('click', alClic);
  };
}
