// vista-diagnostico.js — «Diagnóstico de conexión»: prueba Auth y REST, versión del
// esquema, RLS esperado y permisos, con mensajes legibles. Disponible para toda cuenta.

import * as nube from '../nube.js';
import * as sync from '../sincronizacion.js';
import { esc, fmtFechaHora } from '../util.js';
import { APP_VERSION } from '../version.js';
import { icono } from './iconos.js';
import { cabecera } from './comun.js';

const ICONO = { true: 'check', false: 'alerta', null: 'info' };
const CLASE = { true: 'diag-ok', false: 'diag-mal', null: 'diag-aviso' };

export function montar(raiz) {
  let pasos = null;
  let vivo = true;

  function pintar() {
    const s = sync.situacionSync();
    const malos = pasos ? pasos.filter((p) => p.ok === false).length : 0;
    raiz.innerHTML = `
      ${cabecera({ volver: '/ajustes' })}
      <h1>Diagnóstico de conexión</h1>
      <p class="sub">Comprueba la conexión con el servidor (Supabase) y la configuración de la base de datos.</p>
      ${pasos ? `<p class="diag-resumen ${malos ? 'diag-mal' : 'diag-ok'}" role="status">${icono(malos ? 'alerta' : 'check', { tam: 20 })}
        ${malos ? `${malos} comprobación${malos === 1 ? '' : 'es'} con problemas` : 'Todo en orden'}</p>` : '<p class="peq atenuado" role="status">Comprobando…</p>'}
      ${pasos ? `<ul class="lista lista-diag">${pasos.map((p) => `<li class="fila ${CLASE[String(p.ok)]}" data-ok="${String(p.ok)}">
        <span class="fila-icono">${icono(ICONO[String(p.ok)], { tam: 22 })}</span>
        <span class="fila-cuerpo"><span class="fila-titulo">${esc(p.nombre)}</span><span class="fila-sub">${esc(p.detalle || '')}</span></span>
        ${p.ms ? `<span class="mini num">${p.ms} ms</span>` : ''}</li>`).join('')}</ul>` : ''}
      <section class="tarjeta mt-m">
        <dl class="cifras">
          <div><dt>Versión de la app</dt><dd>${esc(APP_VERSION)}</dd></div>
          <div><dt>Sincronización</dt><dd>${esc({ ok: 'Al día', pendiente: 'Cambios pendientes', offline: 'Sin conexión', sincronizando: 'Sincronizando…', error: 'Con error' }[s.tipo])}</dd></div>
          <div><dt>Última sincronización</dt><dd>${s.ultimaSync ? esc(fmtFechaHora(s.ultimaSync)) : '—'}</dd></div>
          <div><dt>Eventos en cola</dt><dd class="num">${s.cola}</dd></div>
        </dl>
        ${s.error ? `<p class="peq" style="color:var(--rojo-texto)">${esc(s.error)}</p>` : ''}
      </section>
      <div class="botones">
        <button type="button" class="btn btn-primario btn-bloque" data-accion="repetir">${icono('repaso', { tam: 20 })}Repetir diagnóstico</button>
      </div>`;
  }

  async function ejecutar() {
    pasos = null;
    pintar();
    const r = await nube.diagnostico();
    if (!vivo) return;
    pasos = r;
    pintar();
  }

  function alClic(e) {
    if (e.target.closest('[data-accion="repetir"]')) ejecutar();
  }
  raiz.addEventListener('click', alClic);
  ejecutar();
  return () => { vivo = false; raiz.removeEventListener('click', alClic); };
}
