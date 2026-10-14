// vista-admin.js — Panel de administración (#/admin, solo si es_admin()): resumen, tabla de
// usuarios ordenable con buscador, bloquear/desbloquear, detalle por usuario (eventos y
// mapa de calor de actividad) y exportación CSV de usuarios y eventos.
// El servidor también lo impide: las funciones admin_* responden 403 a quien no es admin.

import * as nube from '../nube.js';
import * as sync from '../sincronizacion.js';
import { esc, fmtNum, fmtNota, fmtFechaHora, fmtDuracion, hoyISO, sumarDias, normalizar } from '../util.js';
import { examenNombre } from '../datos.js';
import { icono } from './iconos.js';
import { cabecera, vacio } from './comun.js';
import { confirmar } from './modal.js';
import { toast } from './toast.js';
import { mapaCalor } from './heatmap.js';
import { aCsv, descargarCsv } from './csv.js';

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
  { clave: 'bloqueado', titulo: 'Estado' },
];

const fechaCorta = (v) => (v ? fmtFechaHora(v) : '—');
const nota = (v) => (v === null || v === undefined ? '—' : fmtNota(Number(v)));
const nombreTipo = (t) => ({ practica: 'Práctica', simulacro: 'Simulacro', repaso: 'Repaso' }[t] || t);

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
// Panel
// ---------------------------------------------------------------------------
export function montarPanel(raiz) {
  let usuarios = null;
  let actividad = [];
  let error = null;
  let filtro = '';
  let orden = { col: 'ultimo_ingreso', dir: -1 };
  let vivo = true;
  const yo = nube.sesionLocal()?.id;

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
          <td>${u.bloqueado ? '<span class="etiqueta etiqueta-mal">Bloqueado</span>' : '<span class="etiqueta etiqueta-ok">Activo</span>'}</td>
          <td class="celda-acciones">
            <a class="btn btn-secundario btn-chico" href="#/admin/usuario/${encodeURIComponent(u.id)}">Detalle</a>
            ${u.id === yo ? '' : `<button type="button" class="btn btn-borde btn-chico" data-accion="bloquear" data-id="${esc(u.id)}" data-bloquear="${u.bloqueado ? '0' : '1'}">${u.bloqueado ? 'Desbloquear' : 'Bloquear'}</button>`}
          </td>
        </tr>`).join('')}</tbody>
      </table>
    </div>
    <p class="mini">${fmtNum(filas.length)} de ${fmtNum(usuarios.length)} usuarios${filtro ? ' (filtrados)' : ''}. Toca un encabezado para ordenar.</p>`;
  }

  function pintar() {
    if (error) {
      raiz.innerHTML = `${cabecera({ volver: '/mas' })}<h1>Administración</h1>${vacio({ icono: 'alerta', titulo: 'No se pudieron cargar los datos', texto: error, accion: '<button type="button" class="btn btn-secundario" data-accion="recargar">Reintentar</button>' })}`;
      return;
    }
    if (!usuarios) {
      raiz.innerHTML = `${cabecera({ volver: '/mas' })}<h1>Administración</h1><p class="peq atenuado" role="status">Cargando usuarios…</p>`;
      return;
    }
    const r = resumenPanel(usuarios, actividad);
    raiz.innerHTML = `
      ${cabecera({ volver: '/mas', derecha: `<button type="button" class="btn-icono" data-accion="recargar" aria-label="Actualizar datos">${icono('repaso')}</button>` })}
      <h1>Administración</h1>
      <p class="sub">Seguimiento de las cuentas y su estudio.</p>
      <section class="tarjeta panel-resumen" aria-label="Resumen">
        <dl class="cifras cifras-3">
          <div><dt>Usuarios registrados</dt><dd class="num" data-dato="registrados">${fmtNum(r.registrados)}</dd></div>
          <div><dt>Activos hoy</dt><dd class="num" data-dato="activos-hoy">${fmtNum(r.activosHoy)}</dd></div>
          <div><dt>Activos 7 días</dt><dd class="num" data-dato="activos-7">${fmtNum(r.activos7)}</dd></div>
          <div><dt>Sesiones hoy</dt><dd class="num" data-dato="sesiones-hoy">${fmtNum(r.sesionesHoy)}</dd></div>
          <div><dt>Simulacros totales</dt><dd class="num" data-dato="simulacros">${fmtNum(r.simulacros)}</dd></div>
          <div><dt>Bloqueados</dt><dd class="num">${fmtNum(r.bloqueados)}</dd></div>
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

  async function cargar() {
    error = null;
    try {
      const [u, a] = await Promise.all([nube.adminUsuarios(), nube.adminActividadDiaria(30)]);
      usuarios = u || [];
      actividad = a || [];
    } catch (e) {
      error = e.message;
    }
    if (vivo) pintar();
  }

  function exportarUsuarios() {
    const cols = [
      { clave: 'id', titulo: 'id' }, { clave: 'correo', titulo: 'correo' }, { clave: 'apodo', titulo: 'apodo' },
      { clave: 'rol', titulo: 'rol' }, { clave: 'bloqueado', titulo: 'bloqueado' }, { clave: 'creado', titulo: 'creado' },
      { clave: 'ultimo_ingreso', titulo: 'ultimo_ingreso' }, { clave: 'xp', titulo: 'xp' }, { clave: 'nivel', titulo: 'nivel' },
      { clave: 'racha', titulo: 'racha' }, { clave: 'preguntas_total', titulo: 'preguntas_total' }, { clave: 'simulacros', titulo: 'simulacros' },
      { clave: 'nota_promedio', titulo: 'nota_promedio' }, { clave: 'ultima_actividad', titulo: 'ultima_actividad' },
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
      pintar();
    } catch (e) {
      toast(e.message, { tipo: 'error' });
    }
  }

  function alClic(e) {
    const b = e.target.closest('[data-accion]');
    if (!b) return;
    const a = b.dataset.accion;
    if (a === 'ordenar') {
      const col = b.dataset.col;
      orden = orden.col === col ? { col, dir: -orden.dir } : { col, dir: COLUMNAS.find((c) => c.clave === col)?.num || col === 'ultimo_ingreso' ? -1 : 1 };
      raiz.querySelector('#tabla-usuarios').innerHTML = htmlTabla();
    } else if (a === 'recargar') {
      usuarios = null;
      pintar();
      cargar();
    } else if (a === 'csv-usuarios') exportarUsuarios();
    else if (a === 'csv-eventos') exportarEventos();
    else if (a === 'bloquear') bloquear(b.dataset.id, b.dataset.bloquear === '1');
  }
  function alEscribir(e) {
    if (e.target.id !== 'buscar-usuario') return;
    filtro = e.target.value;
    raiz.querySelector('#tabla-usuarios').innerHTML = htmlTabla();
  }

  raiz.innerHTML = `${cabecera({ volver: '/mas' })}<h1>Administración</h1><p class="peq atenuado" role="status">Comprobando permisos…</p>`;
  verificarAdmin().then((si) => {
    if (!vivo) return;
    if (si === 'sin-red') { raiz.innerHTML = htmlSinRed(); return; }
    if (!si) { raiz.innerHTML = htmlRestringido(); return; }
    pintar();
    cargar();
  });
  raiz.addEventListener('click', alClic);
  raiz.addEventListener('input', alEscribir);
  return () => {
    vivo = false;
    raiz.removeEventListener('click', alClic);
    raiz.removeEventListener('input', alEscribir);
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
        <p class="sub">${esc(u.correo || '')} · ${u.bloqueado ? 'Bloqueado' : 'Activo'}${u.rol === 'admin' ? ' · administrador' : ''}</p>
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
          <tbody>${eventos.map((ev) => `<tr><td>${esc(fechaCorta(ev.fin || ev.creado))}</td><td>${esc(nombreTipo(ev.tipo))}</td>
            <td>${esc(ev.examen ? examenNombre(ev.examen) : 'Mixto')}</td><td class="num">${ev.n ?? '—'}</td><td class="num">${ev.aciertos ?? '—'}</td>
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
