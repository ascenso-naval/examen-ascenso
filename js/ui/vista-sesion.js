// vista-sesion.js — Sesión de práctica o repaso con feedback inmediato:
// barra de progreso, marcador, alternativas A-E, explicación, «Marcar para repaso» y «Siguiente».

import { estado, statDe, guardar, guardarYa } from '../estado.js';
import { D, permutacion } from '../datos.js';
import { esc, hoyISO } from '../util.js';
import { registrarRespuesta, cerrarSesionEstudio } from '../gamificacion.js';
import { marcar, desmarcar } from '../srs.js';
import { sesionEnCurso } from '../sesion.js';
import { navegar } from '../router.js';
import { icono } from './iconos.js';
import { barra } from './comun.js';
import { htmlPregunta, htmlRetro, LETRAS } from './pregunta.js';
import { procesarEventos } from './celebracion.js';
import { abrirHoja } from './modal.js';
import { sonar } from './sonido.js';
import { toast } from './toast.js';

export function montar(raiz) {
  const ses = sesionEnCurso('practica');
  if (!ses) { navegar('/practica', { reemplazar: true }); return null; }
  const modo = ses.tipo === 'repaso' ? 'repaso' : 'practica';
  let t0 = performance.now();
  let saliendo = false;
  let ultimoXp = 0;

  const actual = () => D.porId.get(ses.ids[ses.idx]);
  const aciertos = () => Object.values(ses.ok).filter(Boolean).length;
  const respondida = (q) => ses.resp[q.id] !== undefined;

  function acumularTiempo() {
    const ahora = performance.now();
    ses.activoMs += ahora - t0;
    t0 = ahora;
  }

  function pintar(recien = false) {
    const q = actual();
    const hecha = respondida(q);
    const st = statDe(q.id);
    const marcada = !!(st && st.m);
    const ultima = ses.idx === ses.ids.length - 1;
    raiz.innerHTML = `
      <header class="cabecera-sesion">
        <button type="button" class="btn-icono" data-accion="salir" aria-label="Salir de la sesión">${icono('cerrar')}</button>
        <div class="cab-progreso">
          ${barra((ses.idx + (hecha ? 1 : 0)) / ses.ids.length, 'Avance de la sesión')}
          <span class="mini num">${ses.idx + 1}/${ses.ids.length}</span>
        </div>
        <span class="marcador" aria-label="${aciertos()} aciertos">${icono('check', { tam: 18 })}${aciertos()}</span>
      </header>
      <h1 class="sr-only">${esc(modo === 'repaso' ? 'Repaso' : 'Práctica')}: pregunta ${ses.idx + 1} de ${ses.ids.length}</h1>
      ${htmlPregunta(q, { idSesion: ses.id, modo: 'practica', elegido: ses.resp[q.id], resuelta: hecha, recien })}
      <div id="retro">${hecha ? htmlRetro(q, { correcta: ses.ok[q.id], xp: recien ? ultimoXp : 0, idSesion: ses.id, recien }) : ''}</div>
      <p class="sr-only" aria-live="polite" id="anuncio"></p>
      <div class="barra-acciones"><div class="barra-acciones-interior">
        <button type="button" class="btn btn-borde" data-accion="marcar" aria-pressed="${marcada}" aria-label="Marcar para repaso">
          ${icono('bandera', { tam: 20 })}<span>${marcada ? 'Marcada' : 'Marcar'}</span></button>
        <button type="button" class="btn btn-primario crecer" data-accion="siguiente" ${hecha ? '' : 'disabled'}>
          ${ultima ? 'Ver resumen' : 'Siguiente'}${icono('chev-der', { tam: 20 })}</button>
      </div></div>`;
    if (recien) {
      const q2 = actual();
      const ok = ses.ok[q2.id];
      const letra = LETRAS[permutacion(q2, ses.id).indexOf(q2.correcta)];
      raiz.querySelector('#anuncio').textContent = ok
        ? `Correcto. +${ultimoXp} XP.`
        : `Incorrecto. La respuesta correcta es la ${letra}: ${q2.opciones[q2.correcta]}.`;
      // Desplaza para que se vea la explicación sin perder de vista las alternativas.
      const retro = raiz.querySelector('#retro .retro');
      const opciones = raiz.querySelector('.opciones');
      if (retro && opciones) {
        const barraInf = raiz.querySelector('.barra-acciones');
        const cabecera = raiz.querySelector('.cabecera-sesion');
        const limite = window.innerHeight - (barraInf ? barraInf.offsetHeight : 80) - 12;
        const tope = (cabecera ? cabecera.getBoundingClientRect().bottom : 60) + 12;
        const exceso = retro.getBoundingClientRect().bottom - limite;
        const margen = opciones.getBoundingClientRect().top - tope;
        const desplazar = Math.min(exceso, margen);
        if (desplazar > 8) {
          const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          window.scrollBy({ top: desplazar, behavior: reducir ? 'auto' : 'smooth' });
        }
      }
    }
  }

  function responder(original) {
    const q = actual();
    if (respondida(q)) return;
    const ok = original === q.correcta;
    ses.resp[q.id] = original;
    ses.ok[q.id] = ok;
    const { xp, eventos } = registrarRespuesta(q, ok, modo);
    ses.xp += xp;
    ultimoXp = xp;
    acumularTiempo();
    guardar();
    sonar(ok ? 'acierto' : 'fallo');
    if (!ok && navigator.vibrate && estado.ajustes.sonidos) { try { navigator.vibrate(30); } catch { /* sin vibración */ } }
    pintar(true);
    // El foco pasa a «Siguiente» (teclado y lectores de pantalla) sin mover la vista.
    const sig = raiz.querySelector('[data-accion="siguiente"]');
    if (sig) { try { sig.focus({ preventScroll: true }); } catch { /* sin foco */ } }
    procesarEventos(eventos);
  }

  function terminar() {
    acumularTiempo();
    const respondidas = ses.ids.filter((id) => ses.resp[id] !== undefined);
    const eventos = respondidas.length ? cerrarSesionEstudio(ses) : [];
    estado.ultimoResumen = {
      tipo: ses.tipo,
      examen: ses.examen,
      titulo: ses.titulo,
      total: respondidas.length,
      planificadas: ses.ids.length,
      aciertos: respondidas.filter((id) => ses.ok[id]).length,
      xp: ses.xp,
      seg: Math.round(ses.activoMs / 1000),
      falladas: respondidas.filter((id) => !ses.ok[id]),
      resp: { ...ses.resp },
      semilla: ses.id,
      config: ses.config,
      fin: Date.now(),
    };
    estado.sesiones.practica = null;
    saliendo = true;
    guardarYa();
    navegar('/practica/resumen', { reemplazar: true });
    procesarEventos(eventos);
  }

  function siguiente() {
    const q = actual();
    if (!respondida(q)) return;
    if (ses.idx >= ses.ids.length - 1) { terminar(); return; }
    ses.idx += 1;
    guardar();
    pintar();
    window.scrollTo(0, 0);
    const h1 = raiz.querySelector('h1');
    if (h1) { h1.setAttribute('tabindex', '-1'); try { h1.focus({ preventScroll: true }); } catch { /* sin foco */ } }
  }

  function alternarMarca() {
    const q = actual();
    const st = statDe(q.id, true);
    if (st.m) { desmarcar(st); toast('Bandera quitada.', { icono: 'bandera' }); }
    else { marcar(st, hoyISO()); toast('Marcada: aparecerá en tu repaso de hoy.', { icono: 'bandera', tipo: 'oro' }); }
    guardar();
    const b = raiz.querySelector('[data-accion="marcar"]');
    if (b) {
      b.setAttribute('aria-pressed', String(!!st.m));
      b.querySelector('span').textContent = st.m ? 'Marcada' : 'Marcar';
    }
  }

  async function salir() {
    const hechas = ses.ids.filter((id) => ses.resp[id] !== undefined).length;
    const v = await abrirHoja({
      titulo: '¿Salir de la sesión?',
      html: `<p>Tu avance se guarda y puedes continuar desde Inicio. ${hechas ? `Llevas ${hechas} de ${ses.ids.length}.` : ''}</p>`,
      acciones: [
        { texto: 'Guardar y salir', clase: 'btn-primario', valor: 'salir' },
        ...(hechas ? [{ texto: 'Terminar y ver resumen', clase: 'btn-secundario', valor: 'terminar' }] : []),
        { texto: 'Seguir', clase: 'btn-fantasma', valor: null },
      ],
    });
    if (v === 'salir') { saliendo = true; acumularTiempo(); guardarYa(); navegar('/inicio'); }
    if (v === 'terminar') terminar();
  }

  function alClic(e) {
    const op = e.target.closest('[data-opcion]');
    if (op && !op.disabled) { responder(Number(op.dataset.opcion)); return; }
    const b = e.target.closest('[data-accion]');
    if (!b) return;
    const a = b.dataset.accion;
    if (a === 'siguiente') siguiente();
    else if (a === 'marcar') alternarMarca();
    else if (a === 'salir') salir();
  }

  function alTeclear(e) {
    if (e.altKey || e.ctrlKey || e.metaKey || document.body.classList.contains('con-modal')) return;
    if (e.target.closest && e.target.closest('input, textarea')) return;
    const q = actual();
    const tecla = e.key.toUpperCase();
    const idx = '12345'.indexOf(tecla) >= 0 ? '12345'.indexOf(tecla) : LETRAS.indexOf(tecla);
    if (idx >= 0 && !respondida(q)) { responder(permutacion(q, ses.id)[idx]); e.preventDefault(); return; }
    // Enter sobre un botón ya lo activa el navegador: aquí solo se atiende fuera de botones.
    if (e.key === 'Enter' && e.target.closest && e.target.closest('button, a')) return;
    if ((e.key === 'Enter' || e.key === 'ArrowRight') && respondida(q)) { siguiente(); e.preventDefault(); }
  }

  function alVisibilidad() {
    if (document.visibilityState === 'hidden') { acumularTiempo(); guardarYa(); } else { t0 = performance.now(); }
  }

  pintar();
  raiz.addEventListener('click', alClic);
  document.addEventListener('keydown', alTeclear);
  document.addEventListener('visibilitychange', alVisibilidad);
  return () => {
    raiz.removeEventListener('click', alClic);
    document.removeEventListener('keydown', alTeclear);
    document.removeEventListener('visibilitychange', alVisibilidad);
    if (!saliendo && estado.sesiones.practica === ses) {
      acumularTiempo();
      guardarYa();
      toast('Sesión guardada. Puedes continuarla desde Inicio.', { icono: 'check' });
    }
  };
}
