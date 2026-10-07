// continuar.js — Tarjetas «Continuar sesión» para prácticas/repasos y simulacros interrumpidos.

import { esc, fmtReloj } from '../util.js';
import { examenNombre } from '../datos.js';
import { sesionEnCurso, descartarSesion, respondidasDe } from '../sesion.js';
import { navegar } from '../router.js';
import { confirmar } from './modal.js';
import { icono } from './iconos.js';

/** HTML de las tarjetas (vacío si no hay sesiones en curso). `solo` limita a un espacio. */
export function htmlContinuar(solo = null) {
  let html = '';
  const p = (!solo || solo === 'practica') ? sesionEnCurso('practica') : null;
  if (p) {
    const hechas = respondidasDe(p);
    const nombre = p.tipo === 'repaso' ? 'Repaso en curso' : 'Práctica en curso';
    html += `<div class="continuar" data-espacio="practica">
      <span class="fila-icono">${icono(p.tipo === 'repaso' ? 'repaso' : 'practica')}</span>
      <div class="fila-cuerpo">
        <span class="fila-titulo">${nombre}</span>
        <span class="fila-sub">${esc(p.titulo || examenNombre(p.examen))}</span>
        <span class="fila-sub">${hechas} de ${p.ids.length} respondidas</span>
      </div>
      <div class="continuar-acciones">
        <button type="button" class="btn btn-primario btn-chico crecer" data-accion="continuar-sesion" data-espacio="practica">${icono('play', { tam: 18 })}Continuar</button>
        <button type="button" class="btn btn-borde btn-chico" data-accion="descartar-sesion" data-espacio="practica" aria-label="Descartar ${nombre.toLowerCase()}">${icono('papelera', { tam: 18 })}Descartar</button>
      </div>
    </div>`;
  }
  const s = (!solo || solo === 'simulacro') ? sesionEnCurso('simulacro') : null;
  if (s) {
    const hechas = respondidasDe(s);
    html += `<div class="continuar" data-espacio="simulacro">
      <span class="fila-icono">${icono('simulacro')}</span>
      <div class="fila-cuerpo">
        <span class="fila-titulo">Simulacro en curso</span>
        <span class="fila-sub">${esc(examenNombre(s.examen))}: ${hechas} de ${s.ids.length} respondidas</span>
        <span class="fila-sub">${s.limite ? `Quedan ${fmtReloj(s.restante)}` : 'Sin límite de tiempo'}</span>
      </div>
      <div class="continuar-acciones">
        <button type="button" class="btn btn-primario btn-chico crecer" data-accion="continuar-sesion" data-espacio="simulacro">${icono('play', { tam: 18 })}Continuar</button>
        <button type="button" class="btn btn-borde btn-chico" data-accion="descartar-sesion" data-espacio="simulacro" aria-label="Descartar simulacro en curso">${icono('papelera', { tam: 18 })}Descartar</button>
      </div>
    </div>`;
  }
  return html;
}

/**
 * Maneja los clics de las tarjetas. Devuelve true si el clic era suyo.
 * @param {Element} objetivo elemento con data-accion
 * @param {Function} alCambiar se llama tras descartar (para repintar)
 */
export async function manejarContinuar(objetivo, alCambiar) {
  const accion = objetivo.dataset.accion;
  const espacio = objetivo.dataset.espacio;
  if (accion === 'continuar-sesion') {
    navegar(espacio === 'simulacro' ? '/simulacro/examen' : '/practica/sesion');
    return true;
  }
  if (accion === 'descartar-sesion') {
    const ok = await confirmar({
      titulo: espacio === 'simulacro' ? '¿Descartar el simulacro?' : '¿Descartar la sesión?',
      texto: espacio === 'simulacro'
        ? 'Se perderán las respuestas marcadas y el tiempo restante. Las preguntas no cuentan para tu progreso.'
        : 'Las respuestas que ya diste quedan registradas en tu progreso; solo se cierra la sesión.',
      aceptar: 'Descartar',
      peligro: true,
    });
    if (ok) { descartarSesion(espacio); if (alCambiar) alCambiar(); }
    return true;
  }
  return false;
}
