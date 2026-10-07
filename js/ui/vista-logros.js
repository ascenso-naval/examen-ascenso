// vista-logros.js — Nivel y rango (insignia con galones), racha, cifras y logros
// (obtenidos con fecha; bloqueados en gris con su avance).

import { estado } from '../estado.js';
import { esc, fmtNum, fmtFechaCorta, siglaCorta } from '../util.js';
import { nivelDe, LOGROS, progresoLogro, rachaActual, mejorRacha, umbralNivel } from '../gamificacion.js';
import { icono } from './iconos.js';
import { insignia, barra } from './comun.js';

const RANGOS = [
  [1, 3, 'Grumete'], [4, 6, 'Marinero'], [7, 9, 'Cabo'], [10, 12, 'Oficial de Mar'], [13, 15, 'Oficial de Guardia'],
  [16, 18, 'Jefe de Departamento'], [19, 21, 'Segundo Comandante'], [22, 24, 'Comandante'], [25, null, 'Almirante'],
];

function tarjetaLogro(l) {
  const fecha = estado.logros[l.id];
  const obtenido = !!fecha;
  const prog = progresoLogro(l);
  let extra = '';
  if (l.multiple) {
    const n = Object.keys(estado.fuentesDominadas).length;
    const nombres = Object.keys(estado.fuentesDominadas).map(siglaCorta).join(', ');
    extra = `<span class="etiqueta ${n ? 'etiqueta-oro' : ''} multiplo">${n} de ${prog.meta}</span>${nombres ? `<p class="mini">${esc(nombres)}</p>` : ''}`;
  } else if (!obtenido && prog) {
    extra = `${barra(prog.actual / prog.meta, `Avance de ${l.nombre}`)}<p class="mini num">${fmtNum(prog.actual)} de ${fmtNum(prog.meta)}</p>`;
  }
  return `<article class="logro ${obtenido ? '' : 'bloqueado'}">
    <span class="logro-medalla">${icono(obtenido ? l.icono : (l.multiple ? l.icono : 'candado'), { tam: 24 })}</span>
    <strong>${esc(l.nombre)}</strong>
    <p>${esc(l.desc)}</p>
    ${obtenido ? `<span class="fecha">Obtenido el ${esc(fmtFechaCorta(fecha))}</span>` : ''}
    ${extra}
    <span class="sr-only">${obtenido ? 'Obtenido' : 'Bloqueado'}</span>
  </article>`;
}

export function montar(raiz) {
  const niv = nivelDe(estado.xp);
  const obtenidos = LOGROS.filter((l) => estado.logros[l.id]).length;
  const proximoRango = RANGOS.find(([desde]) => desde > niv.nivel);
  const racha = rachaActual();
  const mejor = mejorRacha();
  raiz.innerHTML = `
    <h1>Logros</h1>
    <p class="sub">${obtenidos} de ${LOGROS.length} logros obtenidos.</p>

    <section class="tarjeta">
      <div class="nivel-tarjeta">
        ${insignia(niv.nivel, 76)}
        <div style="flex:1;min-width:0">
          <h2>Nivel ${niv.nivel}</h2>
          <p style="margin:2px 0 0;font-weight:650">${esc(niv.titulo)}</p>
          ${barra(niv.progreso, 'Experiencia hacia el siguiente nivel')}
          <p class="mini num mt-s">${fmtNum(estado.xp)} XP en total. Te faltan ${fmtNum(niv.hasta - estado.xp)} XP para el nivel ${niv.nivel + 1}.</p>
        </div>
      </div>
      ${proximoRango ? `<p class="mini mt-s">Próximo rango: ${esc(proximoRango[2])} (nivel ${proximoRango[0]}, ${fmtNum(umbralNivel(proximoRango[0]))} XP).</p>` : ''}
    </section>

    <div class="cifras-fila">
      <div class="tesela"><span class="etq">Racha actual</span><span class="val">${racha} <small>${racha === 1 ? 'día' : 'días'}</small></span></div>
      <div class="tesela"><span class="etq">Mejor racha</span><span class="val">${mejor} <small>${mejor === 1 ? 'día' : 'días'}</small></span></div>
      <div class="tesela"><span class="etq">Respondidas</span><span class="val">${fmtNum(estado.cont.respondidas)}</span></div>
      <div class="tesela"><span class="etq">Aciertos seguidos</span><span class="val">${fmtNum(estado.cont.mejorSeguidas)} <small>récord</small></span></div>
    </div>

    <h2>Medallas</h2>
    <div class="logros-rejilla">${LOGROS.map(tarjetaLogro).join('')}</div>

    <h2>Rangos</h2>
    <section class="lista"><ul class="tramos">${RANGOS.map(([desde, hasta, nombre]) => `<li class="${nombre === niv.titulo ? 'actual' : ''}">
      <span>${esc(nombre)}</span><span class="atenuado num">${hasta ? `Niveles ${desde} a ${hasta}` : `Nivel ${desde} o más`}</span></li>`).join('')}</ul></section>
    <p class="mini mt-s">XP: práctica +10/+15/+20 por acierto según dificultad y +2 por intento; repaso +12; simulacro ×1.5 más 100 por aprobar y 100 por 18 o más; meta diaria +50; cada 7 días de racha +150.</p>`;
  return null;
}
