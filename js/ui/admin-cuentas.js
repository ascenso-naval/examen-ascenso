// admin-cuentas.js — Piezas de la pestaña «Usuarios» del panel que vienen del encargo 06
// (app v1.5.0, esquema 1.4.0 §6.d): columnas Nombre / Apellido / Rol, acciones de rol
// («Hacer verificador», «Hacer administrador», «Volver a usuario», con confirmación),
// «Eliminar cuenta» (modal con motivo obligatorio y aviso de los 30 días) y la sección
// «Papelera» (fecha, motivo, días restantes y «Restaurar»).
// Solo arma el HTML y pide los datos al administrador: las llamadas al servidor y el
// repintado los hace js/ui/vista-admin.js.

import { esc, fmtNum, fmtFechaHora } from '../util.js';
import { icono } from './iconos.js';
import { confirmar, abrirHoja } from './modal.js';

/** Días que una cuenta eliminada se conserva en la papelera antes de la purga definitiva. */
export const DIAS_PAPELERA = 30;
const DIA_MS = 86400000;

export const NOMBRE_ROL = { usuario: 'Usuario', verificador: 'Verificador', admin: 'Administrador' };
const CLASE_ROL = { usuario: '', verificador: 'etiqueta-ambar', admin: 'etiqueta-oro' };
/** Texto del botón que lleva a cada rol. */
const ACCION_ROL = { usuario: 'Volver a usuario', verificador: 'Hacer verificador', admin: 'Hacer administrador' };

const fecha = (v) => (v ? fmtFechaHora(v) : '—');

/** Etiqueta del rol de una cuenta. */
export const htmlRol = (u) => `<span class="etiqueta ${CLASE_ROL[u.rol] || ''}" data-rol="${esc(u.rol || 'usuario')}">${esc(NOMBRE_ROL[u.rol] || u.rol || 'Usuario')}</span>`;

/**
 * Días que le quedan a una cuenta en la papelera (0 = ya se puede purgar).
 * @param {string} eliminadoEn fecha ISO
 */
export function diasRestantes(eliminadoEn, ahora = Date.now()) {
  const t = eliminadoEn ? Date.parse(eliminadoEn) : NaN;
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.ceil((t + DIAS_PAPELERA * DIA_MS - ahora) / DIA_MS));
}

/**
 * Botones de rol de una fila (los dos roles que no tiene). El administrador no cambia su
 * propio rol: el servidor lo rechaza (22023) y aquí no se le ofrece.
 */
export function htmlAccionesRol(u, yo) {
  if (u.id === yo) return '';
  return ['verificador', 'admin', 'usuario'].filter((r) => r !== (u.rol || 'usuario')).map((r) =>
    `<button type="button" class="btn btn-borde btn-chico" data-accion="rol" data-id="${esc(u.id)}" data-rol="${r}">${esc(ACCION_ROL[r])}</button>`).join('');
}

/** Sección «Papelera» con las cuentas eliminadas (fecha, motivo, días restantes, Restaurar). */
export function htmlPapelera(eliminadas, pendientesAuth = 0) {
  const n = eliminadas.length;
  return `<h2 id="papelera">Papelera</h2>
    <p class="peq atenuado">Una cuenta eliminada deja de entrar a la app al instante, pero no se borra nada: puedes restaurarla durante ${DIAS_PAPELERA} días. Después se purga de forma definitiva al abrir esta pestaña.</p>
    ${pendientesAuth ? `<p class="aviso-almacen" id="aviso-pendientes-auth" role="status">${icono('alerta', { tam: 20 })}<span>${fmtNum(pendientesAuth)} cuenta${pendientesAuth === 1 ? '' : 's'} purgada${pendientesAuth === 1 ? '' : 's'} sigue${pendientesAuth === 1 ? '' : 'n'} en el sistema de autenticación: bórrala${pendientesAuth === 1 ? '' : 's'} a mano en Supabase → Authentication → Users (instrucciones en <code>backend/INSTRUCCIONES_SUPABASE.md</code> §9).</span></p>` : ''}
    ${n ? `<ul class="lista lista-papelera" id="lista-papelera">${eliminadas.map((u) => {
    const dias = diasRestantes(u.eliminado_en);
    return `<li class="fila fila-papelera" data-id="${esc(u.id)}">
        <span class="fila-cuerpo">
          <span class="fila-titulo">${esc(u.apodo || 'Sin apodo')}${u.nombre || u.apellido ? ` <span class="peq atenuado">${esc(`${u.nombre || ''} ${u.apellido || ''}`.trim())}</span>` : ''}</span>
          <span class="fila-sub celda-correo">${esc(u.correo || '—')}</span>
          <span class="fila-sub">Eliminada: ${esc(fecha(u.eliminado_en))} · Motivo: ${esc(u.eliminado_motivo || '—')}</span>
          <span class="fila-sub"><span class="etiqueta ${dias ? 'etiqueta-ambar' : 'etiqueta-mal'}" data-dias="${dias}">${dias ? `Quedan ${dias} día${dias === 1 ? '' : 's'}` : 'Se purga al abrir Usuarios'}</span>${u.purga_pendiente_auth ? ' <span class="etiqueta etiqueta-mal">Pendiente en Auth</span>' : ''}</span>
        </span>
        <button type="button" class="btn btn-secundario btn-chico" data-accion="restaurar-cuenta" data-id="${esc(u.id)}">${icono('volver', { tam: 18 })}Restaurar</button>
      </li>`;
  }).join('')}</ul>` : '<p class="peq atenuado" id="papelera-vacia">La papelera está vacía.</p>'}`;
}

/**
 * Confirmación de un cambio de rol.
 * @returns {Promise<boolean>}
 */
export function confirmarRol(u, rol) {
  const quien = u.correo || u.apodo || 'esta cuenta';
  const texto = {
    verificador: `${quien} podrá abrir la pestaña Pagos del panel para ver los vouchers y verificar o rechazar pagos. No verá usuarios, actividad, cobro ni respaldo.`,
    admin: `${quien} tendrá acceso completo al panel: usuarios, roles, pagos, cobro, respaldo y eliminación de cuentas.`,
    usuario: `${quien} dejará de tener acceso al panel de administración.`,
  }[rol];
  return confirmar({
    titulo: `¿${ACCION_ROL[rol]}?`,
    texto,
    aceptar: ACCION_ROL[rol],
    peligro: rol === 'usuario',
  });
}

/**
 * Modal de «Eliminar cuenta»: motivo obligatorio (hasta 300 caracteres) y aviso de los 30 días.
 * @returns {Promise<string|null>} el motivo escrito o null si se cancela
 */
export function pedirMotivoEliminar(u) {
  return new Promise((resolve) => {
    let motivo = null;
    abrirHoja({
      titulo: 'Eliminar cuenta',
      clase: 'hoja-eliminar',
      html: `<form class="form-eliminar" novalidate>
        <p class="peq atenuado" style="margin-top:0">${esc(u.correo || u.apodo || '')}${u.nombre || u.apellido ? ` · ${esc(`${u.nombre || ''} ${u.apellido || ''}`.trim())}` : ''}</p>
        <p>La cuenta deja de entrar a la app al instante y no aparece en el ranking ni en los pagos. <strong>Podrás restaurarla durante ${DIAS_PAPELERA} días</strong>; después se purga de forma definitiva.</p>
        <label class="rotulo" for="motivo-eliminar"><strong>Motivo de la eliminación</strong></label>
        <textarea class="entrada mt-s" id="motivo-eliminar" rows="3" maxlength="300" required autofocus placeholder="Ej.: la persona pidió que se borre su cuenta"></textarea>
        <p class="ayuda-campo">Obligatorio, hasta 300 caracteres. Queda registrado en la bitácora.</p>
        <p class="error-campo" role="alert" hidden></p>
        <div class="botones">
          <button type="submit" class="btn btn-peligro btn-bloque">${icono('papelera', { tam: 20 })}Eliminar cuenta</button>
          <button type="button" class="btn btn-fantasma btn-bloque" data-cancelar>Cancelar</button>
        </div>
      </form>`,
      alAbrir: (hoja, cerrar) => {
        const form = hoja.querySelector('form');
        const error = hoja.querySelector('.error-campo');
        hoja.querySelector('[data-cancelar]').addEventListener('click', () => cerrar(null));
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const m = hoja.querySelector('#motivo-eliminar').value.trim();
          error.hidden = true;
          if (!m) { error.textContent = 'Escribe el motivo de la eliminación (queda registrado).'; error.hidden = false; return; }
          if (m.length > 300) { error.textContent = 'El motivo admite como máximo 300 caracteres.'; error.hidden = false; return; }
          if (/[<>]/.test(m)) { error.textContent = 'El motivo no admite los signos < ni >.'; error.hidden = false; return; }
          motivo = m;
          cerrar(true);
        });
      },
    }).then(() => resolve(motivo));
  });
}
