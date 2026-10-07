// vista-examen.js — Simulacro en curso: temporizador (ámbar a 10 min, rojo a 5 min),
// navegación libre, rejilla 1-N, «marcar para revisar», sin feedback hasta entregar,
// entrega automática al agotarse el tiempo y guardado continuo del tiempo restante.

import { estado, guardar, guardarYa } from '../estado.js';
import { D, examenNombre, permutacion } from '../datos.js';
import { esc, fmtReloj, plural } from '../util.js';
import { entregarSimulacro } from '../gamificacion.js';
import { sesionEnCurso, respondidasDe } from '../sesion.js';
import { navegar } from '../router.js';
import { icono } from './iconos.js';
import { htmlPregunta, LETRAS } from './pregunta.js';
import { abrirHoja, confirmar, cerrarTodas } from './modal.js';
import { procesarEventos } from './celebracion.js';
import { toast } from './toast.js';

const AVISOS = [
  { seg: 600, texto: 'Quedan 10 minutos.' },
  { seg: 300, texto: 'Quedan 5 minutos.' },
  { seg: 60, texto: 'Queda 1 minuto.' },
];

export function montar(raiz) {
  const ses = sesionEnCurso('simulacro');
  if (!ses) { navegar('/simulacro', { reemplazar: true }); return null; }
  let entregado = false;
  let saliendo = false;
  let ultimo = performance.now();
  let textoReloj = '';
  let ultimoGuardado = 0;

  const q = () => D.porId.get(ses.ids[ses.idx]);

  function claseReloj() {
    if (!ses.limite) return '';
    if (ses.restante <= 300) return 'rojo';
    if (ses.restante <= 600) return 'ambar';
    return '';
  }
  const valorReloj = () => fmtReloj(ses.limite ? ses.restante : ses.usado);

  function pintar() {
    const p = q();
    const n = ses.ids.length;
    const resp = respondidasDe(ses);
    const marcada = !!ses.marcadas[p.id];
    const ultima = ses.idx === n - 1;
    raiz.innerHTML = `
      <header class="cabecera-sesion">
        <button type="button" class="btn-icono" data-accion="salir" aria-label="Salir del simulacro">${icono('cerrar')}</button>
        <div class="cab-centro"><strong>Simulacro</strong><span>${esc(examenNombre(ses.examen))}</span></div>
        <div class="reloj ${claseReloj()}" id="reloj" role="timer" aria-label="${ses.limite ? 'Tiempo restante' : 'Tiempo transcurrido'}">
          ${icono('reloj', { tam: 18 })}<span id="reloj-valor">${valorReloj()}</span></div>
      </header>
      <h1 class="sr-only">Simulacro de ${esc(examenNombre(ses.examen))}: pregunta ${ses.idx + 1} de ${n}</h1>
      <div class="examen-info">
        <span>Pregunta <strong>${ses.idx + 1}</strong> de ${n}</span>
        <span id="cuenta-resp">${plural(resp, 'respondida', 'respondidas')}</span>
        <button type="button" class="btn btn-fantasma btn-chico marcar-revisar" data-accion="marcar" aria-pressed="${marcada}" aria-label="Marcar para revisar">
          ${icono('bandera', { tam: 18 })}${marcada ? 'Marcada' : 'Marcar'}</button>
      </div>
      ${htmlPregunta(p, { idSesion: ses.id, modo: 'examen', elegido: ses.resp[p.id] })}
      <p class="sr-only" aria-live="assertive" id="aviso-tiempo"></p>
      <div class="barra-acciones"><div class="barra-acciones-interior">
        <button type="button" class="btn btn-secundario" data-accion="anterior" aria-label="Pregunta anterior" ${ses.idx === 0 ? 'disabled' : ''}>${icono('chev-izq', { tam: 22 })}</button>
        <button type="button" class="btn btn-borde crecer" data-accion="rejilla">${icono('rejilla', { tam: 20 })}<span class="num">${resp}/${n}</span></button>
        ${ultima
    ? `<button type="button" class="btn btn-primario" data-accion="entregar">Entregar</button>`
    : `<button type="button" class="btn btn-primario" data-accion="siguiente" aria-label="Pregunta siguiente">Siguiente${icono('chev-der', { tam: 20 })}</button>`}
      </div></div>`;
    textoReloj = valorReloj();
  }

  function actualizarReloj() {
    const r = raiz.querySelector('#reloj');
    if (!r) return;
    const t = valorReloj();
    if (t !== textoReloj) {
      textoReloj = t;
      raiz.querySelector('#reloj-valor').textContent = t;
    }
    r.className = `reloj ${claseReloj()}`;
  }

  function anunciar(texto) {
    const a = raiz.querySelector('#aviso-tiempo');
    if (a) a.textContent = texto;
    toast(texto, { icono: 'reloj', tipo: 'info', silencioso: true });
  }

  function tick() {
    const ahora = performance.now();
    if (document.hidden || entregado) { ultimo = ahora; return; }
    const delta = Math.min(2, (ahora - ultimo) / 1000); // tolera congelamientos
    ultimo = ahora;
    ses.usado += delta;
    if (ses.limite) {
      const antes = ses.restante;
      ses.restante = Math.max(0, ses.restante - delta);
      for (const a of AVISOS) if (antes > a.seg && ses.restante <= a.seg && ses.limite > a.seg) anunciar(a.texto);
      if (ses.restante <= 0) { entregar(true); return; }
    }
    actualizarReloj();
    if (ahora - ultimoGuardado > 5000) { ultimoGuardado = ahora; guardarYa(); }
  }
  const intervalo = setInterval(tick, 250);

  function elegir(original) {
    const p = q();
    ses.resp[p.id] = original;
    guardar();
    raiz.querySelectorAll('.opcion').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.opcion) === original)));
    const resp = respondidasDe(ses);
    const c = raiz.querySelector('#cuenta-resp');
    if (c) c.textContent = plural(resp, 'respondida', 'respondidas');
    const rj = raiz.querySelector('[data-accion="rejilla"] .num');
    if (rj) rj.textContent = `${resp}/${ses.ids.length}`;
  }

  function ir(i) {
    if (i < 0 || i >= ses.ids.length) return;
    ses.idx = i;
    guardar();
    pintar();
    window.scrollTo(0, 0);
    const h1 = raiz.querySelector('h1');
    if (h1) { h1.setAttribute('tabindex', '-1'); try { h1.focus({ preventScroll: true }); } catch { /* sin foco */ } }
  }

  function alternarMarca() {
    const p = q();
    if (ses.marcadas[p.id]) delete ses.marcadas[p.id]; else ses.marcadas[p.id] = true;
    guardar();
    const b = raiz.querySelector('[data-accion="marcar"]');
    const m = !!ses.marcadas[p.id];
    b.setAttribute('aria-pressed', String(m));
    b.innerHTML = `${icono('bandera', { tam: 18 })}${m ? 'Marcada' : 'Marcar'}`;
  }

  function rejilla() {
    const n = ses.ids.length;
    const celdas = ses.ids.map((id, i) => {
      const r = ses.resp[id] !== undefined && ses.resp[id] !== null;
      const m = !!ses.marcadas[id];
      const clases = ['celda', r ? 'respondida' : '', m ? 'marcada' : '', i === ses.idx ? 'actual' : ''].join(' ');
      const etq = `Pregunta ${i + 1}: ${r ? 'respondida' : 'sin responder'}${m ? ', marcada' : ''}`;
      return `<button type="button" class="${clases}" data-ir="${i}" aria-label="${etq}">${i + 1}</button>`;
    }).join('');
    const resp = respondidasDe(ses);
    abrirHoja({
      titulo: `Preguntas: ${resp} de ${n} respondidas`,
      html: `<div class="rejilla">${celdas}</div>
        <div class="leyenda"><span><i></i>Sin responder</span><span><i class="respondida"></i>Respondida</span><span><i class="marcada"></i>Marcada</span></div>`,
      acciones: [
        { texto: 'Entregar simulacro', clase: 'btn-primario', valor: 'entregar' },
        { texto: 'Seguir respondiendo', clase: 'btn-secundario', valor: null },
      ],
      alAbrir(hoja, cerrar) {
        hoja.addEventListener('click', (e) => {
          const c = e.target.closest('[data-ir]');
          if (c) { cerrar(null); ir(Number(c.dataset.ir)); }
        });
      },
    }).then((v) => { if (v === 'entregar') entregar(false); });
  }

  async function entregar(auto) {
    if (entregado) return;
    if (!auto) {
      const sin = ses.ids.length - respondidasDe(ses);
      const marcadas = Object.keys(ses.marcadas).length;
      const ok = await confirmar({
        titulo: '¿Entregar el simulacro?',
        texto: sin
          ? `Te ${sin === 1 ? 'queda 1 pregunta' : `quedan ${sin} preguntas`} sin responder; ${sin === 1 ? 'contará' : 'contarán'} como incorrecta${sin === 1 ? '' : 's'}.`
          : (marcadas ? `Respondiste todas. Tienes ${plural(marcadas, 'pregunta marcada', 'preguntas marcadas')} para revisar.` : 'Respondiste todas las preguntas.'),
        aceptar: 'Entregar',
        cancelar: 'Seguir respondiendo',
      });
      if (!ok || entregado) return;
    }
    entregado = true;
    clearInterval(intervalo);
    cerrarTodas();
    ses.auto = !!auto;
    const { sim, eventos } = entregarSimulacro(ses);
    saliendo = true;
    navegar(`/simulacro/resultado/${encodeURIComponent(sim.id)}`, { reemplazar: true });
    if (auto) toast('Se acabó el tiempo: el simulacro se entregó automáticamente.', { icono: 'reloj' });
    procesarEventos(eventos);
  }

  async function salir() {
    const v = await abrirHoja({
      titulo: '¿Salir del simulacro?',
      html: `<p>El tiempo se detiene y puedes continuar desde Inicio con ${ses.limite ? `${fmtReloj(ses.restante)} restantes` : 'tus respuestas guardadas'}.</p>`,
      acciones: [
        { texto: 'Guardar y salir', clase: 'btn-primario', valor: 'salir' },
        { texto: 'Entregar ahora', clase: 'btn-secundario', valor: 'entregar' },
        { texto: 'Seguir', clase: 'btn-fantasma', valor: null },
      ],
    });
    if (v === 'salir') { saliendo = true; guardarYa(); navegar('/inicio'); }
    if (v === 'entregar') entregar(false);
  }

  function alClic(e) {
    const op = e.target.closest('[data-opcion]');
    if (op) { elegir(Number(op.dataset.opcion)); return; }
    const b = e.target.closest('[data-accion]');
    if (!b) return;
    switch (b.dataset.accion) {
      case 'anterior': ir(ses.idx - 1); break;
      case 'siguiente': ir(ses.idx + 1); break;
      case 'rejilla': rejilla(); break;
      case 'marcar': alternarMarca(); break;
      case 'entregar': entregar(false); break;
      case 'salir': salir(); break;
      default:
    }
  }

  function alTeclear(e) {
    if (e.altKey || e.ctrlKey || e.metaKey || document.body.classList.contains('con-modal')) return;
    const tecla = e.key.toUpperCase();
    const idx = '12345'.indexOf(tecla) >= 0 ? '12345'.indexOf(tecla) : LETRAS.indexOf(tecla);
    if (idx >= 0) { elegir(permutacion(q(), ses.id)[idx]); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { ir(ses.idx + 1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { ir(ses.idx - 1); e.preventDefault(); }
  }

  function alVisibilidad() {
    if (document.visibilityState === 'hidden') guardarYa();
    else ultimo = performance.now();
  }

  pintar();
  raiz.addEventListener('click', alClic);
  document.addEventListener('keydown', alTeclear);
  document.addEventListener('visibilitychange', alVisibilidad);
  return () => {
    clearInterval(intervalo);
    raiz.removeEventListener('click', alClic);
    document.removeEventListener('keydown', alTeclear);
    document.removeEventListener('visibilitychange', alVisibilidad);
    if (!entregado && estado.sesiones.simulacro === ses) {
      guardarYa();
      if (!saliendo) toast('Simulacro en pausa. Continúalo desde Inicio.', { icono: 'reloj' });
    }
  };
}
