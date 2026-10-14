// vista-admin.js — Panel de administración (#/admin, solo si es_admin()), en pestañas:
// · Usuarios: resumen, tabla ordenable con buscador, plan de acceso y consumo de la prueba,
//   «Marcar plan» (cortesía / pagado / prueba), bloquear/desbloquear, detalle por usuario
//   (eventos y mapa de calor) y exportación CSV de usuarios y eventos.
// · Pagos (#/admin?tab=pagos): comprobantes pendientes / verificados / rechazados con el voucher
//   (URL firmada, ampliable), «Verificar y desbloquear» y «Rechazar» con motivo.
// · Cobro (#/admin?tab=cobro): configuración de pago (Yape, Plin, monto, límites, ayuda).
// · Respaldo (#/admin?tab=respaldo, v1.4.0): descargar el respaldo completo y restaurar el
//   progreso de un usuario desde un archivo (js/ui/admin-respaldo.js).
// El servidor también lo impide: las funciones admin_* responden 403 a quien no es admin.

import * as nube from '../nube.js';
import * as sync from '../sincronizacion.js';
import { esc, fmtNum, fmtNota, fmtFechaHora, fmtDuracion, hoyISO, sumarDias, normalizar } from '../util.js';
import { examenNombre } from '../datos.js';
import { icono } from './iconos.js';
import { cabecera, vacio } from './comun.js';
import { confirmar, abrirHoja } from './modal.js';
import { toast } from './toast.js';
import { mapaCalor } from './heatmap.js';
import { aCsv, descargarCsv } from './csv.js';
import { crearRespaldo } from './admin-respaldo.js';
import { respaldoVencido } from '../respaldo.js';

const COLUMNAS = [
  { clave: 'correo', titulo: 'Correo' },
  { clave: 'apodo', titulo: 'Apodo' },
  { clave: 'ultimo_ingreso', titulo: 'Último ingreso', fecha: true },
  { clave: 'xp', titulo: 'XP', num: true },
  { clave: 'nivel', titulo: 'Nivel', num: true },
  { clave: 'racha', titulo: 'Racha', num: true },
  { clave: 'preguntas_total', titulo: 'Preguntas', num: true },
  { clave: 'simulacros', titulo: 'Simulacros', num: true },
  { clave: 'nota_promedio', titulo: 'Nota prom.', num: true },
  { clave: 'plan', titulo: 'Plan' },
  { clave: 'bloqueado', titulo: 'Estado' },
];

const fechaCorta = (v) => (v ? fmtFechaHora(v) : '—');
const nota = (v) => (v === null || v === undefined ? '—' : fmtNota(Number(v)));
/** [Auditoría H6] Eventos que escribe el servidor (pagos y cambios de plan): sin examen, con detalle. */
const esEventoCuenta = (t) => typeof t === 'string' && (t.startsWith('pago_') || t === 'plan_cambiado' || t === 'restauracion');
const nombreTipo = (t) => ({
  practica: 'Práctica', simulacro: 'Simulacro', repaso: 'Repaso',
  pago_registrado: 'Comprobante enviado', pago_aprobado: 'Pago verificado', pago_rechazado: 'Pago rechazado', plan_cambiado: 'Cambio de plan', restauracion: 'Restauración',
}[t] || t);

/** ¿Puede ver el panel? Usa la caché del rol y lo confirma con el servidor si hay red. */
async function verificarAdmin() {
  if (!nube.enLinea()) return sync.metaNube().rol === 'admin' ? 'sin-red' : false;
  try {
    const si = await nube.esAdmin();
    sync.actualizarMeta({ rol: si ? 'admin' : 'usuario' });
    return si;
  } catch (e) {
    return e.tipo === 'red' ? 'sin-red' : false;
  }
}

function htmlRestringido() {
  return `${cabecera({ volver: '/mas' })}
    <h1>Administración</h1>
    ${vacio({ icono: 'candado', titulo: 'Acceso restringido', texto: 'Esta sección es solo para el administrador de la app.', accion: '<a class="btn btn-secundario" href="#/inicio">Ir a Inicio</a>' })}`;
}

function htmlSinRed() {
  return `${cabecera({ volver: '/mas' })}
    <h1>Administración</h1>
    ${vacio({ icono: 'nube-off', titulo: 'Sin conexión', texto: 'El panel consulta los datos en el servidor. Conéctate a internet y vuelve a intentarlo.' })}`;
}

function resumenPanel(usuarios, actividad) {
  const hoy = hoyISO();
  const hace7 = sumarDias(hoy, -6);
  const activos = (desde) => new Set(actividad.filter((a) => a.fecha >= desde && (a.preguntas > 0 || a.sesiones > 0)).map((a) => a.usuario_id)).size;
  return {
    registrados: usuarios.length,
    activosHoy: activos(hoy),
    activos7: activos(hace7),
    sesionesHoy: actividad.filter((a) => a.fecha === hoy).reduce((t, a) => t + (a.sesiones || 0), 0),
    simulacros: usuarios.reduce((t, u) => t + (u.simulacros || 0), 0),
    bloqueados: usuarios.filter((u) => u.bloqueado).length,
  };
}

// ---------------------------------------------------------------------------
// Panel (pestañas: Usuarios · Pagos · Cobro · Respaldo)
// ---------------------------------------------------------------------------
const PESTANAS = [
  { valor: 'usuarios', texto: 'Usuarios' },
  { valor: 'pagos', texto: 'Pagos' },
  { valor: 'cobro', texto: 'Cobro' },
  { valor: 'respaldo', texto: 'Respaldo' },
];
const FILTROS_PAGO = [
  { valor: 'pendiente', texto: 'Pendientes' },
  { valor: 'aprobado', texto: 'Verificados' },
  { valor: 'rechazado', texto: 'Rechazados' },
];
const NOMBRE_PLAN = { prueba: 'Prueba', pendiente: 'En revisión', pagado: 'Pagado', cortesia: 'Cortesía' };
const CLASE_PLAN = { prueba: '', pendiente: 'etiqueta-ambar', pagado: 'etiqueta-ok', cortesia: 'etiqueta-oro' };
const NOMBRE_MEDIO = { yape: 'Yape', plin: 'Plin' };
const fmtSoles = (m) => (m === null || m === undefined || m === '' ? '—' : `S/ ${Number(m) % 1 ? Number(m).toFixed(2) : fmtNum(Number(m))}`);
const TELEFONO_RE = /^[0-9]{9}$/;

export function montarPanel(raiz, params = {}) {
  let usuarios = null;
  let actividad = [];
  let error = null;
  let filtro = '';
  let orden = { col: 'ultimo_ingreso', dir: -1 };
  let vivo = true;
  let pestana = PESTANAS.some((t) => t.valor === params.tab) ? params.tab : 'usuarios';
  let filtroPago = 'pendiente';
  let pagos = null;            // filas de admin_pagos(filtroPago)
  let errorPagos = null;
  let nPendientes = null;
  let config = null;           // admin_configurar_pago({})
  let errorConfig = null;
  const urls = new Map();      // ruta del voucher → URL firmada
  const yo = nube.sesionLocal()?.id;
  const respaldo = crearRespaldo({
    raiz,
    pintar: () => pintarCuerpo(),
    activa: () => pestana === 'respaldo',
    alCambiarAviso: () => actualizarAvisoRespaldo(),
  });

  function filasVisibles() {
    const f = normalizar(filtro.trim());
    let r = usuarios || [];
    if (f) r = r.filter((u) => normalizar(`${u.correo || ''} ${u.apodo || ''}`).includes(f));
    const col = COLUMNAS.find((c) => c.clave === orden.col);
    return r.slice().sort((a, b) => {
      const x = a[orden.col];
      const y = b[orden.col];
      if (x === y) return 0;
      if (x === null || x === undefined) return 1;
      if (y === null || y === undefined) return -1;
      const cmp = col && col.num ? Number(x) - Number(y) : String(x).localeCompare(String(y));
      return cmp * orden.dir;
    });
  }

  function htmlPlan(u) {
    if (u.rol === 'admin') return '<span class="etiqueta etiqueta-oro">Admin</span>';
    const plan = u.plan || 'prueba';
    const lp = config ? config.limite_preguntas : null;
    const ls = config ? config.limite_simulacros : null;
    const uso = plan === 'prueba' || plan === 'pendiente'
      ? `<span class="mini celda-consumo num">${fmtNum(u.preguntas_prueba || 0)}${lp ? `/${fmtNum(lp)}` : ''} preg. · ${fmtNum(u.simulacros_prueba || 0)}${ls ? `/${fmtNum(ls)}` : ''} sim.</span>` : '';
    return `<span class="etiqueta ${CLASE_PLAN[plan] || ''}" data-plan="${esc(plan)}">${esc(NOMBRE_PLAN[plan] || plan)}</span>${uso}`;
  }

  function htmlTabla() {
    const filas = filasVisibles();
    const th = (c) => {
      const activa = orden.col === c.clave;
      const aria = activa ? (orden.dir === 1 ? 'ascending' : 'descending') : 'none';
      return `<th scope="col" class="${c.num ? 'num' : ''}" aria-sort="${aria}"><button type="button" class="orden-col" data-accion="ordenar" data-col="${c.clave}">${esc(c.titulo)}${activa ? (orden.dir === 1 ? ' ▲' : ' ▼') : ''}</button></th>`;
    };
    return `<div class="tabla-desliza" tabindex="0" role="region" aria-label="Tabla de usuarios (desliza horizontalmente)">
      <table class="tabla tabla-admin">
        <thead><tr>${COLUMNAS.map(th).join('')}<th scope="col">Acciones</th></tr></thead>
        <tbody>${filas.map((u) => `<tr data-id="${esc(u.id)}" class="${u.bloqueado ? 'fila-bloqueada' : ''}">
          <td class="celda-correo">${esc(u.correo || '—')}${u.rol === 'admin' ? ' <span class="etiqueta etiqueta-oro">admin</span>' : ''}</td>
          <td>${esc(u.apodo || '—')}</td>
          <td>${esc(fechaCorta(u.ultimo_ingreso))}</td>
          <td class="num">${fmtNum(u.xp || 0)}</td>
          <td class="num">${u.nivel || 1}</td>
          <td class="num">${u.racha || 0}</td>
          <td class="num">${fmtNum(u.preguntas_total || 0)}</td>
          <td class="num">${u.simulacros || 0}</td>
          <td class="num">${nota(u.nota_promedio)}</td>
          <td class="celda-plan">${htmlPlan(u)}</td>
          <td>${u.bloqueado ? '<span class="etiqueta etiqueta-mal">Bloqueado</span>' : '<span class="etiqueta etiqueta-ok">Activo</span>'}</td>
          <td class="celda-acciones">
            <a class="btn btn-secundario btn-chico" href="#/admin/usuario/${encodeURIComponent(u.id)}">Detalle</a>
            ${u.rol === 'admin' ? '' : `<button type="button" class="btn btn-borde btn-chico" data-accion="plan" data-id="${esc(u.id)}">Marcar plan</button>`}
            ${u.id === yo ? '' : `<button type="button" class="btn btn-borde btn-chico" data-accion="bloquear" data-id="${esc(u.id)}" data-bloquear="${u.bloqueado ? '0' : '1'}">${u.bloqueado ? 'Desbloquear' : 'Bloquear'}</button>`}
          </td>
        </tr>`).join('')}</tbody>
      </table>
    </div>
    <p class="mini">${fmtNum(filas.length)} de ${fmtNum(usuarios.length)} usuarios${filtro ? ' (filtrados)' : ''}. Toca un encabezado para ordenar.</p>`;
  }

  const htmlAvisoRespaldo = () => (respaldoVencido() ? ' <span class="etiqueta etiqueta-ambar" id="tab-respaldo-aviso" role="img" aria-label="Respaldo pendiente (más de 7 días)"></span>' : '');

  function htmlPestanas() {
    return `<div class="segmentos pestanas-admin" role="tablist" aria-label="Secciones de administración">${PESTANAS.map((t) => `<button type="button" role="tab" id="tab-${t.valor}" aria-controls="panel-admin" aria-selected="${t.valor === pestana}" aria-pressed="${t.valor === pestana}" data-accion="tab" data-valor="${t.valor}">${esc(t.texto)}${t.valor === 'pagos' && nPendientes ? ` <span class="etiqueta etiqueta-oro" id="tab-pagos-conteo">${nPendientes}</span>` : ''}${t.valor === 'respaldo' ? htmlAvisoRespaldo() : ''}</button>`).join('')}</div>`;
  }

  function actualizarAvisoRespaldo() {
    const t = raiz.querySelector('#tab-respaldo');
    if (t && vivo) t.innerHTML = `Respaldo${htmlAvisoRespaldo()}`;
  }

  function htmlUsuarios() {
    const r = resumenPanel(usuarios, actividad);
    return `<section class="tarjeta panel-resumen" aria-label="Resumen">
        <dl class="cifras cifras-3">
          <div><dt>Usuarios registrados</dt><dd class="num" data-dato="registrados">${fmtNum(r.registrados)}</dd></div>
          <div><dt>Activos hoy</dt><dd class="num" data-dato="activos-hoy">${fmtNum(r.activosHoy)}</dd></div>
          <div><dt>Activos 7 días</dt><dd class="num" data-dato="activos-7">${fmtNum(r.activos7)}</dd></div>
          <div><dt>Sesiones hoy</dt><dd class="num" data-dato="sesiones-hoy">${fmtNum(r.sesionesHoy)}</dd></div>
          <div><dt>Simulacros totales</dt><dd class="num" data-dato="simulacros">${fmtNum(r.simulacros)}</dd></div>
          <div><dt>Bloqueados</dt><dd class="num">${fmtNum(r.bloqueados)}</dd></div>
          <div><dt>Pagados</dt><dd class="num" data-dato="pagados">${fmtNum(usuarios.filter((u) => u.plan === 'pagado').length)}</dd></div>
          <div><dt>Cortesía</dt><dd class="num" data-dato="cortesia">${fmtNum(usuarios.filter((u) => u.plan === 'cortesia').length)}</dd></div>
          <div><dt>En prueba</dt><dd class="num" data-dato="en-prueba">${fmtNum(usuarios.filter((u) => u.rol !== 'admin' && (u.plan || 'prueba') === 'prueba').length)}</dd></div>
        </dl>
      </section>
      <div class="botones-fila admin-botones">
        <button type="button" class="btn btn-secundario btn-chico" data-accion="csv-usuarios">${icono('descargar', { tam: 18 })}CSV usuarios</button>
        <button type="button" class="btn btn-secundario btn-chico" data-accion="csv-eventos">${icono('descargar', { tam: 18 })}CSV eventos</button>
        <a class="btn btn-borde btn-chico" href="#/diagnostico">${icono('pulso', { tam: 18 })}Diagnóstico</a>
      </div>
      <h2>Usuarios</h2>
      <div class="caja-buscar">${icono('buscar', { tam: 20 })}
        <input class="entrada entrada-buscar" id="buscar-usuario" type="search" placeholder="Buscar por correo o apodo" aria-label="Buscar por correo o apodo" value="${esc(filtro)}" autocomplete="off">
      </div>
      <div id="tabla-usuarios" class="mt-s">${htmlTabla()}</div>`;
  }

  // ---------------- Pagos ----------------
  function htmlPago(g) {
    const pendiente = g.estado === 'pendiente';
    const url = urls.get(g.captura_path);
    return `<li class="pago tarjeta" data-id="${esc(g.id)}" data-estado="${esc(g.estado)}">
      <div class="pago-cabeza">
        <span class="fila-cuerpo"><span class="fila-titulo">${esc(g.apodo || 'Sin apodo')}</span><span class="fila-sub pago-correo">${esc(g.correo || '—')}</span></span>
        <span class="etiqueta ${pendiente ? 'etiqueta-ambar' : g.estado === 'aprobado' ? 'etiqueta-ok' : 'etiqueta-mal'}">${pendiente ? 'Pendiente' : g.estado === 'aprobado' ? 'Verificado' : 'Rechazado'}</span>
      </div>
      <div class="pago-cuerpo">
        <button type="button" class="pago-voucher" data-accion="voucher" data-ruta="${esc(g.captura_path || '')}" aria-label="Ampliar el voucher de ${esc(g.apodo || g.correo || '')}">
          ${url ? `<img src="${esc(url)}" alt="Voucher de ${esc(g.apodo || g.correo || '')}">` : `<span class="pago-voucher-vacio">${icono('subir', { tam: 22 })}<span class="mini">Voucher</span></span>`}
        </button>
        <dl class="pago-datos">
          <div><dt>Medio</dt><dd>${esc(NOMBRE_MEDIO[g.medio] || g.medio || '—')}</dd></div>
          <div><dt>Operación</dt><dd class="num pago-operacion">${esc(g.operacion || '—')}</dd></div>
          <div><dt>Monto</dt><dd class="num">${esc(fmtSoles(g.monto))}</dd></div>
          <div><dt>Fecha</dt><dd>${esc(fechaCorta(g.creado_en))}</dd></div>
          ${g.estado === 'rechazado' ? `<div class="pago-motivo"><dt>Motivo</dt><dd>${esc(g.motivo_rechazo || '—')}</dd></div>` : ''}
          ${!pendiente && g.resuelto_en ? `<div><dt>Resuelto</dt><dd>${esc(fechaCorta(g.resuelto_en))}</dd></div>` : ''}
        </dl>
      </div>
      ${pendiente ? `<div class="botones-fila pago-acciones">
        <button type="button" class="btn btn-primario btn-chico" data-accion="aprobar" data-id="${esc(g.id)}">${icono('check', { tam: 18 })}Verificar y desbloquear</button>
        <button type="button" class="btn btn-borde btn-chico" data-accion="rechazar" data-id="${esc(g.id)}">Rechazar</button>
      </div>` : ''}
    </li>`;
  }

  function htmlPagos() {
    const filtroHtml = `<div class="segmentos" role="group" aria-label="Estado de los pagos">${FILTROS_PAGO.map((f) => `<button type="button" data-accion="filtro-pago" data-valor="${f.valor}" aria-pressed="${f.valor === filtroPago}">${esc(f.texto)}</button>`).join('')}</div>`;
    let cuerpo;
    if (errorPagos) cuerpo = vacio({ icono: 'alerta', titulo: 'No se pudieron cargar los pagos', texto: errorPagos, accion: '<button type="button" class="btn btn-secundario" data-accion="recargar-pagos">Reintentar</button>' });
    else if (!pagos) cuerpo = '<p class="peq atenuado" role="status">Cargando pagos…</p>';
    else if (!pagos.length) {
      const t = { pendiente: 'No hay pagos pendientes', aprobado: 'Aún no hay pagos verificados', rechazado: 'No hay pagos rechazados' }[filtroPago];
      cuerpo = vacio({ icono: 'billete', titulo: t, texto: filtroPago === 'pendiente' ? 'Cuando alguien envíe su comprobante aparecerá aquí.' : '' });
    } else cuerpo = `<ul class="lista-pagos">${pagos.map(htmlPago).join('')}</ul>`;
    return `<p class="peq atenuado">Compara el voucher y el número de operación con tu historial de Yape o Plin antes de verificar.</p>
      ${filtroHtml}
      <div id="lista-pagos" class="mt-m" aria-live="polite">${cuerpo}</div>`;
  }

  async function cargarPagos() {
    errorPagos = null;
    pagos = null;
    if (vivo && pestana === 'pagos') pintarCuerpo();
    try {
      const filas = await nube.adminPagos(filtroPago);
      pagos = filas || [];
      if (filtroPago === 'pendiente') nPendientes = pagos.length;
    } catch (e) {
      errorPagos = e.message;
    }
    if (!vivo || pestana !== 'pagos') return;
    pintar();
    // Miniaturas: URL firmada de cada voucher (10 min).
    for (const g of pagos || []) {
      if (!g.captura_path || urls.has(g.captura_path)) continue;
      nube.urlComprobante(g.captura_path).then((u) => {
        urls.set(g.captura_path, u);
        const b = raiz.querySelector(`.pago[data-id="${CSS.escape(g.id)}"] .pago-voucher`);
        if (b && vivo) b.innerHTML = `<img src="${esc(u)}" alt="Voucher de ${esc(g.apodo || g.correo || '')}">`;
      }).catch(() => {});
    }
  }

  async function contarPendientes() {
    try {
      nPendientes = ((await nube.adminPagos('pendiente')) || []).length;
      const t = raiz.querySelector('#tab-pagos');
      if (t && vivo) t.innerHTML = `Pagos${nPendientes ? ` <span class="etiqueta etiqueta-oro" id="tab-pagos-conteo">${nPendientes}</span>` : ''}`;
    } catch { /* sin conteo */ }
  }

  function abrirVoucher(ruta) {
    const url = urls.get(ruta);
    if (!url) { toast('El voucher aún se está cargando.', { icono: 'reloj' }); return; }
    abrirHoja({
      titulo: 'Voucher',
      clase: 'hoja-voucher',
      html: `<img class="voucher-grande" src="${esc(url)}" alt="Voucher ampliado">`,
      acciones: [{ texto: 'Cerrar', clase: 'btn-secundario', valor: null }],
    });
  }

  async function aprobar(id) {
    const g = (pagos || []).find((x) => x.id === id);
    if (!g) return;
    const ok = await confirmar({
      titulo: '¿Verificar y desbloquear?',
      texto: `Confirma que recibiste ${fmtSoles(g.monto)} por ${NOMBRE_MEDIO[g.medio] || g.medio} con la operación ${g.operacion} de ${g.correo || g.apodo}. La cuenta tendrá acceso completo de por vida.`,
      aceptar: 'Verificar y desbloquear',
    });
    if (!ok) return;
    try {
      await nube.adminResolverPago(id, true);
      toast('Pago verificado: la cuenta quedó desbloqueada.', { tipo: 'exito' });
      const u = (usuarios || []).find((x) => x.id === g.usuario_id);
      if (u) u.plan = 'pagado';
      cargarPagos();
    } catch (e) {
      toast(e.message, { tipo: 'error' });
    }
  }

  async function rechazar(id) {
    const g = (pagos || []).find((x) => x.id === id);
    if (!g) return;
    let motivo = null;
    await abrirHoja({
      titulo: 'Rechazar comprobante',
      html: `<form class="form-motivo" novalidate>
        <p class="peq atenuado" style="margin-top:0">${esc(g.correo || g.apodo || '')} · ${esc(NOMBRE_MEDIO[g.medio] || g.medio)} · operación ${esc(g.operacion)}. El usuario verá este motivo y podrá enviar otro comprobante.</p>
        <label class="rotulo" for="motivo-rechazo"><strong>Motivo del rechazo</strong></label>
        <textarea class="entrada mt-s" id="motivo-rechazo" rows="3" maxlength="300" required autofocus placeholder="Ej.: el número de operación no coincide con el voucher"></textarea>
        <p class="ayuda-campo">Obligatorio, hasta 300 caracteres.</p>
        <p class="error-campo" role="alert" hidden></p>
        <div class="botones">
          <button type="submit" class="btn btn-peligro btn-bloque">Rechazar</button>
          <button type="button" class="btn btn-fantasma btn-bloque" data-cancelar>Cancelar</button>
        </div>
      </form>`,
      alAbrir: (hoja, cerrarHoja) => {
        const form = hoja.querySelector('form');
        const err = hoja.querySelector('.error-campo');
        hoja.querySelector('[data-cancelar]').addEventListener('click', () => cerrarHoja(null));
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const m = hoja.querySelector('#motivo-rechazo').value.trim();
          if (!m) { err.textContent = 'Escribe el motivo del rechazo (el usuario lo verá).'; err.hidden = false; return; }
          if (m.length > 300) { err.textContent = 'El motivo admite como máximo 300 caracteres.'; err.hidden = false; return; }
          const b = form.querySelector('[type="submit"]');
          b.disabled = true;
          try {
            await nube.adminResolverPago(id, false, m);
            motivo = m;
            cerrarHoja(true);
          } catch (e2) {
            err.textContent = e2.message;
            err.hidden = false;
            b.disabled = false;
          }
        });
      },
    });
    if (motivo) {
      toast('Comprobante rechazado. El usuario verá el motivo.', { tipo: 'exito' });
      const u = (usuarios || []).find((x) => x.id === g.usuario_id);
      if (u && u.plan === 'pendiente') u.plan = 'prueba';
      cargarPagos();
    }
  }

  // ---------------- Cobro (configuración de pago) ----------------
  function htmlCobro() {
    if (errorConfig) return vacio({ icono: 'alerta', titulo: 'No se pudo cargar la configuración', texto: errorConfig, accion: '<button type="button" class="btn btn-secundario" data-accion="recargar-cobro">Reintentar</button>' });
    if (!config) return '<p class="peq atenuado" role="status">Cargando configuración…</p>';
    const c = config;
    const campo = (id, rotulo, valor, extra = '', ayuda = '') => `<div class="campo">
      <label class="rotulo" for="${id}">${esc(rotulo)}</label>
      <input class="entrada" id="${id}" name="${id}" value="${esc(valor ?? '')}" ${extra}>
      ${ayuda ? `<span class="ayuda">${esc(ayuda)}</span>` : ''}</div>`;
    return `<form class="form-cobro" novalidate>
      <p class="peq atenuado">Estos datos los ve cada usuario al terminar su prueba gratis. Deja vacío el número de un medio para desactivarlo.</p>
      <fieldset class="tarjeta grupo-cobro"><legend>Yape</legend>
        ${campo('yape_numero', 'Número de Yape', c.yape_numero, 'inputmode="numeric" maxlength="11" autocomplete="off" placeholder="9 dígitos"')}
        ${campo('yape_titular', 'Titular de Yape', c.yape_titular, 'maxlength="80" autocomplete="off"', 'Nombre que aparece al yapear (hasta 80 caracteres).')}
      </fieldset>
      <fieldset class="tarjeta grupo-cobro"><legend>Plin</legend>
        ${campo('plin_numero', 'Número de Plin', c.plin_numero, 'inputmode="numeric" maxlength="11" autocomplete="off" placeholder="9 dígitos"')}
        ${campo('plin_titular', 'Titular de Plin', c.plin_titular, 'maxlength="80" autocomplete="off"')}
      </fieldset>
      <fieldset class="tarjeta grupo-cobro"><legend>Prueba gratis y monto</legend>
        ${campo('monto', 'Monto del pago único (S/)', c.monto, 'type="number" inputmode="decimal" min="0.5" max="10000" step="0.5"')}
        ${campo('limite_preguntas', 'Límite de preguntas de la prueba', c.limite_preguntas, 'type="number" inputmode="numeric" min="1" max="100000" step="1"', 'Respuestas en práctica y repaso.')}
        ${campo('limite_simulacros', 'Límite de simulacros de la prueba', c.limite_simulacros, 'type="number" inputmode="numeric" min="1" max="1000" step="1"', 'Simulacros terminados (entregados).')}
        <div class="campo"><label class="rotulo" for="texto_ayuda">Texto de ayuda</label>
          <textarea class="entrada" id="texto_ayuda" name="texto_ayuda" rows="4" maxlength="1000" placeholder="Ej.: Si tienes problemas para pagar, escríbeme al WhatsApp…">${esc(c.texto_ayuda || '')}</textarea>
          <span class="ayuda">Se muestra debajo de los números (hasta 1000 caracteres).</span></div>
      </fieldset>
      <p class="error-campo" id="cobro-error" role="alert" hidden></p>
      <button type="submit" class="btn btn-primario btn-bloque" data-accion="guardar-cobro">${icono('check', { tam: 20 })}Guardar configuración</button>
      ${c.actualizado_en ? `<p class="mini mt-s">Última actualización: ${esc(fechaCorta(c.actualizado_en))}.</p>` : ''}
    </form>`;
  }

  async function cargarConfig(pintarDespues = true) {
    errorConfig = null;
    try {
      config = await nube.adminConfigurarPago({});
    } catch (e) {
      errorConfig = e.message;
    }
    if (vivo && pintarDespues && pestana === 'cobro') pintarCuerpo();
  }

  async function guardarCobro(form) {
    const err = form.querySelector('#cobro-error');
    const mal = (t) => { err.textContent = t; err.hidden = false; };
    err.hidden = true;
    const v = (k) => form.elements[k].value.trim();
    const cambios = {};
    for (const k of ['yape_numero', 'plin_numero']) {
      const n = v(k).replace(/[\s-]/g, '');
      if (n && !TELEFONO_RE.test(n)) { mal(`El número de ${k.startsWith('yape') ? 'Yape' : 'Plin'} debe tener 9 dígitos.`); form.elements[k].focus(); return; }
      if (n !== (config[k] || '')) cambios[k] = n;
    }
    for (const k of ['yape_titular', 'plin_titular', 'texto_ayuda']) {
      const t = k === 'texto_ayuda' ? form.elements[k].value.trim() : v(k);
      if (t !== (config[k] || '')) cambios[k] = t;
    }
    const monto = Number(v('monto').replace(',', '.'));
    if (!(monto > 0) || monto > 10000) { mal('El monto debe ser un número mayor que 0 (máximo 10000).'); form.elements.monto.focus(); return; }
    if (monto !== Number(config.monto)) cambios.monto = monto;
    for (const [k, max, nombre] of [['limite_preguntas', 100000, 'preguntas'], ['limite_simulacros', 1000, 'simulacros']]) {
      const n = Number(v(k));
      if (!Number.isInteger(n) || n < 1 || n > max) { mal(`El límite de ${nombre} debe ser un entero mayor que 0 (máximo ${fmtNum(max)}).`); form.elements[k].focus(); return; }
      if (n !== Number(config[k])) cambios[k] = n;
    }
    if (!Object.keys(cambios).length) { toast('No hay cambios que guardar.'); return; }
    const b = form.querySelector('[type="submit"]');
    b.disabled = true;
    try {
      config = await nube.adminConfigurarPago(cambios);
      toast('Configuración de pago guardada.', { tipo: 'exito' });
      pintarCuerpo();
    } catch (e) {
      b.disabled = false;
      mal(e.message);
    }
  }

  // ---------------- Plan de una cuenta ----------------
  async function marcarPlan(id) {
    const u = (usuarios || []).find((x) => x.id === id);
    if (!u) return;
    const actual = u.plan || 'prueba';
    const opciones = [
      { valor: 'cortesia', texto: 'Cortesía (acceso completo gratis)' },
      { valor: 'pagado', texto: 'Pagado (acceso completo)' },
      { valor: 'prueba', texto: 'Prueba gratis' },
    ].filter((o) => o.valor !== actual);
    const elegido = await abrirHoja({
      titulo: 'Marcar plan',
      html: `<p class="peq atenuado" style="margin-top:0">${esc(u.correo || '')} · plan actual: <strong>${esc(NOMBRE_PLAN[actual] || actual)}</strong>.</p>`,
      acciones: opciones.map((o) => ({ texto: o.texto, clase: 'btn-secundario', valor: o.valor })).concat([{ texto: 'Cancelar', clase: 'btn-fantasma', valor: null }]),
    });
    if (!elegido) return;
    const ok = await confirmar({
      titulo: `¿Marcar como «${NOMBRE_PLAN[elegido]}»?`,
      texto: elegido === 'prueba'
        ? `${u.correo} volverá a la prueba gratis (sus contadores no cambian; si ya los agotó, se le pedirá el pago).${actual === 'pendiente' ? ' Su comprobante pendiente se rechazará.' : ''}`
        : `${u.correo} tendrá acceso completo sin límites.${actual === 'pendiente' ? (elegido === 'pagado' ? ' Su comprobante pendiente quedará verificado.' : ' Su comprobante pendiente se rechazará.') : ''}`,
      aceptar: 'Confirmar',
    });
    if (!ok) return;
    try {
      const r = await nube.adminMarcarPlan(id, elegido);
      u.plan = r && r.plan ? r.plan : elegido;
      toast(`Plan actualizado: ${NOMBRE_PLAN[u.plan] || u.plan}.`, { tipo: 'exito' });
      if (pestana === 'usuarios') raiz.querySelector('#tabla-usuarios').innerHTML = htmlTabla();
      if (actual === 'pendiente') contarPendientes();
    } catch (e) {
      toast(e.message, { tipo: 'error' });
    }
  }

  // ---------------- Pintado ----------------
  function htmlCuerpo() {
    if (pestana === 'pagos') return htmlPagos();
    if (pestana === 'cobro') return htmlCobro();
    if (pestana === 'respaldo') return respaldo.html();
    if (error) return vacio({ icono: 'alerta', titulo: 'No se pudieron cargar los datos', texto: error, accion: '<button type="button" class="btn btn-secundario" data-accion="recargar">Reintentar</button>' });
    if (!usuarios) return '<p class="peq atenuado" role="status">Cargando usuarios…</p>';
    return htmlUsuarios();
  }

  function pintarCuerpo() {
    const el = raiz.querySelector('#panel-admin');
    if (!el) { pintar(); return; }
    el.innerHTML = htmlCuerpo();
  }

  function pintar() {
    raiz.innerHTML = `
      ${cabecera({ volver: '/mas', derecha: `<button type="button" class="btn-icono" data-accion="recargar" aria-label="Actualizar datos">${icono('repaso')}</button>` })}
      <h1>Administración</h1>
      <p class="sub">Seguimiento de las cuentas, su estudio y sus pagos.</p>
      ${htmlPestanas()}
      <div id="panel-admin" class="mt-m" role="tabpanel" aria-labelledby="tab-${pestana}">${htmlCuerpo()}</div>`;
  }

  async function cargar() {
    error = null;
    try {
      const [u, a] = await Promise.all([nube.adminUsuarios(), nube.adminActividadDiaria(30)]);
      usuarios = u || [];
      actividad = a || [];
    } catch (e) {
      error = e.message;
    }
    if (vivo && pestana === 'usuarios') pintarCuerpo();
  }

  function cambiarPestana(t) {
    if (t === pestana) return;
    if (pestana === 'respaldo') respaldo.alSalir();
    pestana = t;
    try { history.replaceState(history.state, '', `#/admin${t === 'usuarios' ? '' : `?tab=${t}`}`); } catch { /* sin historial */ }
    pintar();
    if (t === 'pagos') cargarPagos();
    if (t === 'cobro' && !config) cargarConfig();
  }

  function exportarUsuarios() {
    const cols = [
      { clave: 'id', titulo: 'id' }, { clave: 'correo', titulo: 'correo' }, { clave: 'apodo', titulo: 'apodo' },
      { clave: 'rol', titulo: 'rol' }, { clave: 'bloqueado', titulo: 'bloqueado' }, { clave: 'creado', titulo: 'creado' },
      { clave: 'ultimo_ingreso', titulo: 'ultimo_ingreso' }, { clave: 'xp', titulo: 'xp' }, { clave: 'nivel', titulo: 'nivel' },
      { clave: 'racha', titulo: 'racha' }, { clave: 'preguntas_total', titulo: 'preguntas_total' }, { clave: 'simulacros', titulo: 'simulacros' },
      { clave: 'nota_promedio', titulo: 'nota_promedio' }, { clave: 'ultima_actividad', titulo: 'ultima_actividad' },
      { clave: 'plan', titulo: 'plan' }, { clave: 'preguntas_prueba', titulo: 'preguntas_prueba' },
      { clave: 'simulacros_prueba', titulo: 'simulacros_prueba' }, { clave: 'pagado_en', titulo: 'pagado_en' },
    ];
    descargarCsv(`ascenso2026-usuarios-${hoyISO()}.csv`, aCsv(filasVisibles(), cols));
    toast('CSV de usuarios exportado.', { tipo: 'exito', icono: 'descargar' });
  }

  async function exportarEventos() {
    try {
      const ev = await nube.adminEventos(null, 10000);
      const cols = ['id', 'usuario_id', 'correo', 'apodo', 'tipo', 'examen', 'inicio', 'fin', 'n', 'aciertos', 'nota', 'duracion_s', 'creado'].map((c) => ({ clave: c, titulo: c }));
      descargarCsv(`ascenso2026-eventos-${hoyISO()}.csv`, aCsv(ev || [], cols));
      toast(`CSV de eventos exportado (${fmtNum((ev || []).length)}).`, { tipo: 'exito', icono: 'descargar' });
    } catch (e) {
      toast(e.message, { tipo: 'error' });
    }
  }

  async function bloquear(id, bloquearlo) {
    const u = usuarios.find((x) => x.id === id);
    const ok = await confirmar({
      titulo: bloquearlo ? '¿Bloquear esta cuenta?' : '¿Desbloquear esta cuenta?',
      texto: bloquearlo
        ? `${u ? u.correo : 'La cuenta'} no podrá usar la app ni sincronizar; la próxima vez que se conecte verá «Cuenta bloqueada».`
        : `${u ? u.correo : 'La cuenta'} podrá volver a ingresar.`,
      aceptar: bloquearlo ? 'Bloquear' : 'Desbloquear',
      peligro: bloquearlo,
    });
    if (!ok) return;
    try {
      await nube.adminBloquear(id, bloquearlo);
      if (u) u.bloqueado = bloquearlo;
      toast(bloquearlo ? 'Cuenta bloqueada.' : 'Cuenta desbloqueada.', { tipo: 'exito' });
      pintarCuerpo();
    } catch (e) {
      toast(e.message, { tipo: 'error' });
    }
  }

  function alClic(e) {
    const b = e.target.closest('[data-accion]');
    if (!b) return;
    const a = b.dataset.accion;
    if (respaldo.alClic(a, b)) return;
    if (a === 'ordenar') {
      const col = b.dataset.col;
      orden = orden.col === col ? { col, dir: -orden.dir } : { col, dir: COLUMNAS.find((c) => c.clave === col)?.num || col === 'ultimo_ingreso' ? -1 : 1 };
      raiz.querySelector('#tabla-usuarios').innerHTML = htmlTabla();
    } else if (a === 'recargar') {
      if (pestana === 'pagos') cargarPagos();
      else if (pestana === 'respaldo') respaldo.recargar();
      else if (pestana === 'cobro') { config = null; pintarCuerpo(); cargarConfig(); } else { usuarios = null; pintarCuerpo(); cargar(); }
    } else if (a === 'tab') cambiarPestana(b.dataset.valor);
    else if (a === 'filtro-pago') {
      filtroPago = b.dataset.valor;
      cargarPagos();
    } else if (a === 'recargar-pagos') cargarPagos();
    else if (a === 'recargar-cobro') { config = null; pintarCuerpo(); cargarConfig(); }
    else if (a === 'voucher') abrirVoucher(b.dataset.ruta);
    else if (a === 'aprobar') aprobar(b.dataset.id);
    else if (a === 'rechazar') rechazar(b.dataset.id);
    else if (a === 'plan') marcarPlan(b.dataset.id);
    else if (a === 'csv-usuarios') exportarUsuarios();
    else if (a === 'csv-eventos') exportarEventos();
    else if (a === 'bloquear') bloquear(b.dataset.id, b.dataset.bloquear === '1');
  }
  function alEscribir(e) {
    // [Auditoría H5] Al editar el formulario «Cobro» se oculta el error de validación anterior.
    const formCobro = e.target.closest && e.target.closest('.form-cobro');
    if (formCobro) { const err = formCobro.querySelector('#cobro-error'); if (err) err.hidden = true; }
    if (e.target.id === 'yape_numero' || e.target.id === 'plin_numero') {
      const limpio = e.target.value.replace(/[^\d\s-]/g, '');
      if (limpio !== e.target.value) e.target.value = limpio;
      return;
    }
    if (e.target.id !== 'buscar-usuario') return;
    filtro = e.target.value;
    raiz.querySelector('#tabla-usuarios').innerHTML = htmlTabla();
  }
  function alCambiar(e) {
    respaldo.alCambiar(e);
  }
  function alEnviar(e) {
    if (!e.target.matches('.form-cobro')) return;
    e.preventDefault();
    guardarCobro(e.target);
  }

  raiz.innerHTML = `${cabecera({ volver: '/mas' })}<h1>Administración</h1><p class="peq atenuado" role="status">Comprobando permisos…</p>`;
  verificarAdmin().then((si) => {
    if (!vivo) return;
    if (si === 'sin-red') { raiz.innerHTML = htmlSinRed(); return; }
    if (!si) { raiz.innerHTML = htmlRestringido(); return; }
    pintar();
    cargar();
    // Los límites de la prueba (para la columna Plan) salen de la configuración de pago.
    cargarConfig(false).then(() => {
      if (!vivo) return;
      if (pestana === 'cobro') pintarCuerpo();
      const t = raiz.querySelector('#tabla-usuarios');
      if (t && usuarios) t.innerHTML = htmlTabla();
    });
    if (pestana === 'pagos') cargarPagos(); else contarPendientes();
  });
  raiz.addEventListener('click', alClic);
  raiz.addEventListener('input', alEscribir);
  raiz.addEventListener('submit', alEnviar);
  raiz.addEventListener('change', alCambiar);
  return () => {
    vivo = false;
    respaldo.destruir();
    raiz.removeEventListener('change', alCambiar);
    raiz.removeEventListener('click', alClic);
    raiz.removeEventListener('input', alEscribir);
    raiz.removeEventListener('submit', alEnviar);
  };
}

// ---------------------------------------------------------------------------
// Detalle de un usuario
// ---------------------------------------------------------------------------
export function montarDetalle(raiz, params) {
  let vivo = true;
  const id = params.id;

  async function cargar() {
    const si = await verificarAdmin();
    if (!vivo) return;
    if (si === 'sin-red') { raiz.innerHTML = htmlSinRed(); return; }
    if (!si) { raiz.innerHTML = htmlRestringido(); return; }
    raiz.innerHTML = `${cabecera({ volver: '/admin' })}<h1>Usuario</h1><p class="peq atenuado" role="status">Cargando…</p>`;
    try {
      const [usuarios, actividad, eventos] = await Promise.all([nube.adminUsuarios(), nube.adminActividadDiaria(84), nube.adminEventos(id, 100)]);
      if (!vivo) return;
      const u = (usuarios || []).find((x) => x.id === id);
      if (!u) { raiz.innerHTML = `${cabecera({ volver: '/admin' })}<h1>Usuario</h1>${vacio({ titulo: 'No existe ese usuario' })}`; return; }
      const dias = {};
      for (const a of actividad || []) if (a.usuario_id === id) dias[a.fecha] = { r: a.preguntas || 0 };
      raiz.innerHTML = `
        ${cabecera({ volver: '/admin' })}
        <h1>${esc(u.apodo || 'Sin apodo')}</h1>
        <p class="sub">${esc(u.correo || '')} · ${u.bloqueado ? 'Bloqueado' : 'Activo'}${u.rol === 'admin' ? ' · administrador' : ` · plan: ${esc({ prueba: 'prueba gratis', pendiente: 'pago en revisión', pagado: 'pagado', cortesia: 'cortesía' }[u.plan || 'prueba'] || u.plan)}`}</p>
        <section class="tarjeta">
          <dl class="cifras cifras-3">
            <div><dt>XP</dt><dd class="num">${fmtNum(u.xp || 0)}</dd></div>
            <div><dt>Nivel</dt><dd class="num">${u.nivel || 1}</dd></div>
            <div><dt>Racha</dt><dd class="num">${u.racha || 0}</dd></div>
            <div><dt>Preguntas</dt><dd class="num">${fmtNum(u.preguntas_total || 0)}</dd></div>
            <div><dt>Simulacros</dt><dd class="num">${u.simulacros || 0}</dd></div>
            <div><dt>Nota promedio</dt><dd class="num">${nota(u.nota_promedio)}</dd></div>
            <div><dt>Registro</dt><dd>${esc(fechaCorta(u.creado))}</dd></div>
            <div><dt>Último ingreso</dt><dd>${esc(fechaCorta(u.ultimo_ingreso))}</dd></div>
            <div><dt>Última actividad</dt><dd>${esc(fechaCorta(u.ultima_actividad))}</dd></div>
          </dl>
        </section>
        <h2>Actividad (12 semanas)</h2>
        <section class="tarjeta"><div class="calor" id="calor-admin"></div></section>
        <h2>Sesiones recientes</h2>
        ${eventos && eventos.length ? `<div class="tabla-desliza" tabindex="0" role="region" aria-label="Sesiones recientes">
          <table class="tabla tabla-admin"><thead><tr><th scope="col">Fecha</th><th scope="col">Tipo</th><th scope="col">Examen</th>
            <th scope="col" class="num">Preguntas</th><th scope="col" class="num">Aciertos</th><th scope="col" class="num">Nota</th><th scope="col" class="num">Duración</th></tr></thead>
          <tbody>${eventos.map((ev) => `<tr><td>${esc(fechaCorta(ev.fin || ev.creado))}</td><td>${esc(nombreTipo(ev.tipo))}${esEventoCuenta(ev.tipo) && ev.detalle ? `<br><span class="mini atenuado">${esc(ev.detalle)}</span>` : ''}</td>
            <td>${esEventoCuenta(ev.tipo) ? '—' : esc(ev.examen ? examenNombre(ev.examen) : 'Mixto')}</td><td class="num">${ev.n ?? '—'}</td><td class="num">${ev.aciertos ?? '—'}</td>
            <td class="num">${nota(ev.nota)}</td><td class="num">${ev.duracion_s ? esc(fmtDuracion(ev.duracion_s)) : '—'}</td></tr>`).join('')}</tbody></table></div>`
    : vacio({ icono: 'reloj', titulo: 'Sin sesiones registradas' })}`;
      mapaCalor(raiz.querySelector('#calor-admin'), dias, { meta: 30, hoy: hoyISO() });
    } catch (e) {
      if (!vivo) return;
      raiz.innerHTML = `${cabecera({ volver: '/admin' })}<h1>Usuario</h1>${vacio({ icono: 'alerta', titulo: 'No se pudieron cargar los datos', texto: e.message })}`;
    }
  }

  cargar();
  return () => { vivo = false; };
}
