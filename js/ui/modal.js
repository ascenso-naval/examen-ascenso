// modal.js — Hojas inferiores (bottom sheets) accesibles y confirmaciones propias
// (nunca se usan alert/confirm/prompt del navegador).

import { esc } from '../util.js';

let abiertos = 0;
const cierres = new Set();

/** Cierra todas las hojas abiertas (p. ej. al entregarse un simulacro por tiempo). */
export function cerrarTodas() {
  for (const fn of [...cierres]) fn(null);
}

/**
 * Abre una hoja inferior.
 * @param {object} op
 *   titulo (texto plano), html (cuerpo ya escapado), acciones [{texto, clase, valor}],
 *   clase, cerrable (toque fuera / Escape), etiqueta (aria-label si no hay título),
 *   alAbrir(hoja, cerrar) para enlazar eventos del cuerpo.
 * @returns {Promise<any>} valor de la acción elegida (null si se cierra sin elegir)
 */
export function abrirHoja(op = {}) {
  const { titulo = '', html = '', acciones = [], clase = '', cerrable = true, etiqueta = 'Diálogo', alAbrir } = op;
  return new Promise((resolve) => {
    const capa = document.getElementById('capa-modal');
    const app = document.getElementById('app');
    const cont = document.createElement('div');
    const idTitulo = `hoja-${Math.random().toString(36).slice(2, 8)}`;
    cont.className = `modal ${clase}`;
    cont.innerHTML = `
      <div class="hoja-fondo" data-cerrar></div>
      <section class="hoja" role="dialog" aria-modal="true" tabindex="-1"
        ${titulo ? `aria-labelledby="${idTitulo}"` : `aria-label="${esc(etiqueta)}"`}>
        <div class="hoja-asa" aria-hidden="true"></div>
        ${titulo ? `<h2 class="hoja-titulo" id="${idTitulo}">${esc(titulo)}</h2>` : ''}
        <div class="hoja-cuerpo">${html}</div>
        ${acciones.length ? `<div class="hoja-acciones">${acciones.map((a, i) =>
    `<button type="button" class="btn ${a.clase || 'btn-secundario'}" data-indice="${i}">${a.html || esc(a.texto)}</button>`).join('')}</div>` : ''}
      </section>`;
    capa.appendChild(cont);
    const hoja = cont.querySelector('.hoja');
    const previo = document.activeElement;
    abiertos += 1;
    if (app) app.inert = true;
    document.body.classList.add('con-modal');
    let cerrada = false;

    function cerrar(valor = null) {
      if (cerrada) return;
      cerrada = true;
      cierres.delete(cerrar);
      document.removeEventListener('keydown', alTeclear, true);
      cont.classList.remove('abierto');
      abiertos -= 1;
      if (abiertos <= 0) {
        abiertos = 0;
        // Con la pantalla de bloqueo (prueba agotada) la app sigue inerte debajo.
        if (app) app.inert = document.body.classList.contains('con-bloqueo');
        document.body.classList.remove('con-modal');
      }
      setTimeout(() => cont.remove(), 220);
      if (previo && typeof previo.focus === 'function' && document.contains(previo)) {
        try { previo.focus({ preventScroll: true }); } catch { /* sin foco */ }
      }
      resolve(valor);
    }

    function alTeclear(e) {
      if (e.key === 'Escape' && cerrable) { e.preventDefault(); cerrar(null); return; }
      if (e.key === 'Tab') {
        // Trampa de foco dentro de la hoja.
        const enfocables = [...hoja.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
          .filter((el) => !el.disabled && el.offsetParent !== null);
        if (!enfocables.length) { e.preventDefault(); return; }
        const primero = enfocables[0];
        const ultimo = enfocables[enfocables.length - 1];
        if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
        else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
      }
    }
    document.addEventListener('keydown', alTeclear, true);
    cierres.add(cerrar);

    cont.addEventListener('click', (e) => {
      const b = e.target.closest('[data-indice]');
      if (b && hoja.contains(b)) { cerrar(acciones[Number(b.dataset.indice)].valor); return; }
      if (cerrable && e.target.closest('[data-cerrar]')) cerrar(null);
    });

    if (alAbrir) alAbrir(hoja, cerrar);
    requestAnimationFrame(() => {
      cont.classList.add('abierto');
      const destino = hoja.querySelector('[autofocus]') || hoja.querySelector('.hoja-acciones .btn') || hoja;
      try { destino.focus({ preventScroll: true }); } catch { /* sin foco */ }
    });
  });
}

/** Confirmación propia. Devuelve true si se acepta. */
export async function confirmar({ titulo, texto, aviso = '', aceptar = 'Aceptar', cancelar = 'Cancelar', peligro = false }) {
  const v = await abrirHoja({
    titulo,
    // aviso: advertencia destacada (ámbar) bajo el texto, p. ej. al restaurar un respaldo.
    html: `<p>${esc(texto)}</p>${aviso ? `<p class="aviso-almacen aviso-modal" data-aviso role="alert">${esc(aviso)}</p>` : ''}`,
    acciones: [
      { texto: aceptar, clase: peligro ? 'btn-peligro' : 'btn-primario', valor: true },
      { texto: cancelar, clase: 'btn-secundario', valor: false },
    ],
  });
  return v === true;
}

/** Hay alguna hoja abierta. */
export const hayModal = () => abiertos > 0;
