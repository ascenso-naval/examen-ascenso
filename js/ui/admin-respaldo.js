// admin-respaldo.js — Pestaña «Respaldo» del panel de administración (#/admin?tab=respaldo, v1.4.0):
// · Resumen (admin_respaldo_resumen): totales por tabla, tamaño estimado, vouchers y la fecha
//   de la última descarga en este dispositivo; aviso fijo y aviso de 7 días.
// · [1.5.0] El aviso de los 7 días usa `admin_ultimo_respaldo()` (cuenta también el respaldo
//   automático del Mac y el manual) con copia en localStorage, y «Descargar respaldo» deja
//   constancia con `admin_registrar_respaldo('app', …)`: «Último respaldo: 14-oct 20:00 (Mac)».
// · «Descargar respaldo»: todas las tablas paginadas (js/respaldo.js) en un archivo JSON, con
//   barra de progreso por tabla, reintento por página y verificación «filas = total».
// · «Restaurar progreso de un usuario»: archivo de respaldo → cuenta → vista previa →
//   confirmación → admin_restaurar_estado (+ admin_restaurar_perfil) → «Deshacer».
// La monta vista-admin.js; el servidor exige rol admin en todas las funciones (42501).

import * as nube from '../nube.js';
import * as R from '../respaldo.js';
import { APP_VERSION } from '../version.js';
import { VERSION_ESQUEMA } from '../config-supabase.js';
import { esc, fmtNum, fmtFechaHora } from '../util.js';
import { icono } from './iconos.js';
import { confirmar } from './modal.js';
import { toast } from './toast.js';

const fecha = (v) => (v ? fmtFechaHora(v) : '—');
const kb = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1).replace('.', ',')} MB` : `${fmtNum(Math.max(1, Math.round((b || 0) / 1024)))} KB`);
const NOMBRE_PLAN = { prueba: 'Prueba', pendiente: 'En revisión', pagado: 'Pagado', cortesia: 'Cortesía' };

/** ¿El dispositivo puede compartir un archivo JSON con la hoja nativa (iOS)? */
function puedeCompartirArchivo() {
  try {
    return !!(navigator.canShare && window.File && navigator.canShare({ files: [new File(['{}'], 'r.json', { type: 'application/json' })] }));
  } catch {
    return false;
  }
}

function descargarBlob(nombre, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * @param {{raiz: HTMLElement, pintar: Function, activa: () => boolean, alCambiarAviso?: Function}} op
 *   pintar(): vuelve a pintar el cuerpo del panel; activa(): ¿la pestaña Respaldo está visible?
 */
export function crearRespaldo({ raiz, pintar, activa, alCambiarAviso }) {
  let vivo = true;
  let resumen = null;
  let errorResumen = null;
  let cargandoResumen = false;
  // Descarga
  let descarga = null;      // {tablas:{nombre:{hechas,total,estado}}, reintentos, error}
  let resultado = null;     // {nombre, blob, filas, diferencias}
  // Restauración
  let archivo = null;       // {nombre, datos, perfiles}
  let errorArchivo = null;
  let leyendo = false;
  let elegido = null;       // id del perfil elegido
  let conPerfil = false;
  let previaLista = false;  // ¿ya se consultaron los datos actuales de la cuenta elegida?
  let restaurando = false;
  let restaurado = null;    // {id, correo, hora, deshecho, sinEstado, errorPerfil}

  const repintar = () => { if (vivo && activa()) pintar(); };

  // ---------------- Resumen ----------------
  async function cargarResumen() {
    if (cargandoResumen) return;
    cargandoResumen = true;
    errorResumen = null;
    try {
      resumen = await nube.adminRespaldoResumen();
    } catch (e) {
      errorResumen = e.message;
    }
    // [1.5.0] Último respaldo según el servidor (app, Mac o manual): es la fuente del aviso.
    try {
      R.anotarRespaldoServidor(await nube.adminUltimoRespaldo());
      if (alCambiarAviso) alCambiarAviso();
    } catch { /* se usa lo guardado en el dispositivo */ }
    cargandoResumen = false;
    repintar();
  }

  function htmlUltima() {
    const u = R.ultimoRespaldo();
    const srv = R.ultimoRespaldoServidor();
    const ef = R.ultimoEfectivo();
    const vencido = R.respaldoVencido();
    return `<p class="peq resp-ultima mt-s">Último respaldo: <strong id="resp-ultimo-servidor" data-fecha="${esc(ef ? ef.fecha : '')}" data-origen="${esc(ef ? ef.origen : '')}">${ef ? `${esc(fecha(ef.fecha))} (${esc(R.NOMBRE_ORIGEN[ef.origen] || ef.origen)})` : 'nunca'}</strong>
      ${vencido ? `<span class="etiqueta etiqueta-ambar" id="resp-vencido">${ef ? 'Hace más de 7 días' : 'Pendiente'}</span>` : '<span class="etiqueta etiqueta-ok" id="resp-al-dia">Al día</span>'}
      <br><span class="mini">Última descarga en este dispositivo: <strong id="resp-ultima" data-fecha="${esc(u || '')}">${u ? esc(fecha(u)) : 'nunca'}</strong>${srv ? ` · registrado en el servidor: ${esc(fecha(srv.generado_en))} (${esc(R.NOMBRE_ORIGEN[srv.origen] || srv.origen)})` : ''}</span></p>`;
  }

  function htmlResumen() {
    if (errorResumen) {
      return `<section class="tarjeta"><p class="peq" style="margin:0;color:var(--rojo-texto)" role="alert">No se pudo cargar el resumen: ${esc(errorResumen)}</p>
        <button type="button" class="btn btn-secundario btn-chico mt-s" data-accion="resp-resumen">Reintentar</button>${htmlUltima()}</section>`;
    }
    if (!resumen) return `<section class="tarjeta"><p class="peq atenuado" role="status" style="margin:0">Cargando resumen…</p>${htmlUltima()}</section>`;
    const t = resumen.tablas || {};
    return `<section class="tarjeta panel-resumen" aria-label="Resumen del respaldo">
      <dl class="cifras cifras-3">
        ${R.TABLAS.map((d) => `<div><dt>${esc(d.titulo)}</dt><dd class="num" data-tabla="${d.nombre}">${fmtNum(Number(t[d.nombre]) || 0)}</dd></div>`).join('')}
        <div><dt>Tamaño estimado</dt><dd class="num" data-dato="bytes">${esc(kb(Number(resumen.bytes_estimados) || 0))}</dd></div>
        <div><dt>Vouchers</dt><dd class="num" data-dato="vouchers">${fmtNum(Number(resumen.vouchers) || 0)}</dd></div>
        <div><dt>Esquema</dt><dd class="mini" style="font-weight:650">${esc(String(resumen.version_esquema || '—').replace('ascenso2026-esquema ', ''))}</dd></div>
      </dl>
      ${htmlUltima()}
    </section>`;
  }

  // ---------------- Descarga ----------------
  function htmlProgreso() {
    if (!descarga) return '';
    const filas = R.TABLAS.map((d) => {
      const x = descarga.tablas[d.nombre] || { hechas: 0, total: null, estado: 'espera' };
      const pct = x.total ? Math.min(100, Math.round((x.hechas / x.total) * 100)) : (x.estado === 'lista' ? 100 : 0);
      return `<li class="resp-tabla" data-tabla="${d.nombre}" data-estado="${x.estado}">
        <span class="resp-tabla-nombre">${esc(d.titulo)}</span>
        <span class="barra" role="progressbar" aria-label="${esc(d.titulo)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="--v:${pct}%"></i></span>
        <span class="mini num">${x.total === null ? '…' : `${fmtNum(x.hechas)}/${fmtNum(x.total)}`}</span></li>`;
    }).join('');
    return `<ul class="resp-progreso mt-s" id="resp-progreso" aria-label="Progreso de la descarga">${filas}</ul>
      ${descarga.reintentos ? `<p class="mini mt-s" id="resp-reintentos">Se reintentaron ${fmtNum(descarga.reintentos)} página${descarga.reintentos === 1 ? '' : 's'} por fallos de conexión.</p>` : ''}
      ${descarga.error ? `<p class="error-campo" role="alert" id="resp-error-descarga">${esc(descarga.error)}</p>` : ''}`;
  }

  function htmlResultado() {
    if (!resultado) return '';
    const dif = resultado.diferencias;
    return `<div class="tarjeta resp-resultado mt-s" id="resp-resultado" role="status">
      <p style="margin:0"><strong>${icono('check', { tam: 18, clase: 'en-linea' })} Respaldo descargado:</strong> <span class="num" id="resp-total">${fmtNum(resultado.filas)}</span> filas en total.</p>
      <p class="mini" style="margin:4px 0 0;word-break:break-all">${esc(resultado.nombre)} · ${esc(kb(resultado.blob.size))}</p>
      ${dif.length ? `<p class="aviso-almacen" id="resp-diferencias">${icono('alerta', { tam: 20 })}<span>Atención: ${dif.map((d) => `«${esc(d.tabla)}» trajo ${fmtNum(d.filas)} de ${fmtNum(d.total)} filas (diferencia ${fmtNum(d.total - d.filas)})`).join('; ')}. El archivo se descargó igual; repite el respaldo en unos minutos.</span></p>` : ''}
      <div class="botones-fila mt-s">
        ${puedeCompartirArchivo() ? `<button type="button" class="btn btn-secundario btn-chico" data-accion="resp-compartir">${icono('compartir', { tam: 18 })}Compartir</button>` : ''}
        <button type="button" class="btn btn-borde btn-chico" data-accion="resp-guardar">${icono('descargar', { tam: 18 })}Guardar otra vez</button>
      </div>
    </div>`;
  }

  async function descargar() {
    if (descarga && !descarga.fin) return;
    resultado = null;
    descarga = { tablas: {}, reintentos: 0, error: null, fin: false };
    repintar();
    try {
      if (!resumen) {
        try { resumen = await nube.adminRespaldoResumen(); } catch (e) { if (e.tipo !== 'red') throw e; }
      }
      const r = await R.armarRespaldo({
        pedir: (tabla, desde, limite) => nube.adminRespaldo(tabla, desde, limite),
        resumen,
        versionApp: APP_VERSION,
        versionEsquema: VERSION_ESQUEMA,
        alProgreso: ({ tabla, hechas, total, fin }) => {
          descarga.tablas[tabla] = { hechas, total, estado: fin ? 'lista' : 'bajando' };
          repintar();
        },
        alReintento: ({ desde }) => {
          if (desde !== undefined) { descarga.reintentos += 1; repintar(); }
        },
      });
      const nombre = R.nombreArchivo(new Date());
      const blob = new Blob([JSON.stringify(r.respaldo)], { type: 'application/json' });
      resultado = { nombre, blob, filas: r.filas, diferencias: r.diferencias };
      descargarBlob(nombre, blob);
      R.anotarRespaldo(new Date());
      // [1.5.0] Constancia en el servidor (bitácora «respaldos»): así el aviso de los 7 días
      // vale para cualquier dispositivo y se distingue del respaldo automático del Mac.
      try {
        const reg = await nube.adminRegistrarRespaldo('app', r.respaldo.generado_en, blob.size, {
          archivo: nombre,
          filas: r.filas,
          version_app: APP_VERSION,
          tablas: (resumen && resumen.tablas) || null,
          diferencias: r.diferencias.length,
        });
        R.anotarRespaldoServidor({ origen: (reg && reg.origen) || 'app', generado_en: (reg && reg.generado_en) || r.respaldo.generado_en, bytes: blob.size });
      } catch (e) {
        if (e.tipo !== 'red') console.warn('No se pudo registrar el respaldo en el servidor:', e.message);
        R.anotarRespaldoServidor({ origen: 'app', generado_en: r.respaldo.generado_en, bytes: blob.size });
      }
      descarga.fin = true;
      if (alCambiarAviso) alCambiarAviso();
      toast(r.diferencias.length ? 'Respaldo descargado con diferencias: revisa el aviso.' : `Respaldo descargado: ${fmtNum(r.filas)} filas.`, { tipo: r.diferencias.length ? 'info' : 'exito', icono: 'descargar' });
      cargarResumen();
    } catch (e) {
      descarga.error = `No se pudo completar el respaldo: ${e.message}`;
      descarga.fin = true;
    }
    repintar();
  }

  async function compartir() {
    if (!resultado) return;
    try {
      await navigator.share({ files: [new File([resultado.blob], resultado.nombre, { type: 'application/json' })], title: 'Respaldo Ascensos 2027' });
    } catch (e) {
      if (e && e.name !== 'AbortError') toast('No se pudo compartir. Usa «Guardar otra vez».', { tipo: 'error' });
    }
  }

  // ---------------- Restauración ----------------
  async function leerArchivo(f) {
    errorArchivo = null;
    archivo = null;
    elegido = null;
    restaurado = null;
    leyendo = true;
    repintar();
    let datos = null;
    try {
      datos = JSON.parse(await f.text());
    } catch {
      errorArchivo = 'El archivo no es un JSON válido.';
    }
    if (datos) {
      const v = R.validarRespaldo(datos);
      if (!v.ok) errorArchivo = v.error;
    }
    if (!errorArchivo) {
      try {
        const actuales = await nube.adminUsuarios();
        archivo = { nombre: f.name, datos, perfiles: R.perfilesDelRespaldo(datos, actuales || []) };
      } catch (e) {
        errorArchivo = `No se pudieron consultar las cuentas actuales: ${e.message}`;
      }
    }
    leyendo = false;
    repintar();
  }

  /** Vuelve a consultar admin_usuarios para refrescar la columna «actual». */
  async function refrescarActuales() {
    if (!archivo) return;
    try {
      archivo.perfiles = R.perfilesDelRespaldo(archivo.datos, (await nube.adminUsuarios()) || []);
    } catch { /* se queda con los datos anteriores */ }
  }

  function htmlListaPerfiles() {
    if (!archivo) return '';
    const d = archivo.datos;
    const filas = archivo.perfiles.map((p) => {
      const sinCuenta = !p.actual;
      return `<li class="resp-perfil${p.id === elegido ? ' elegido' : ''}" data-id="${esc(p.id)}" data-sin-cuenta="${sinCuenta ? '1' : '0'}">
        <span class="fila-cuerpo">
          <span class="fila-titulo">${esc(p.apodo || 'Sin apodo')}${p.rol === 'admin' ? ' <span class="etiqueta etiqueta-oro">admin</span>' : ''}</span>
          <span class="fila-sub resp-correo">${esc(p.correo || '—')}</span>
          <span class="fila-sub">${p.ep ? `${fmtNum(p.xp)} XP · ${fmtNum(p.preguntas)} preguntas · ${esc(fecha(p.fecha))}` : 'Sin progreso en el respaldo'}</span>
          ${sinCuenta ? '<span class="etiqueta etiqueta-mal mt-s resp-sin-cuenta">Sin cuenta actual</span>' : ''}
        </span>
        <button type="button" class="btn ${p.id === elegido ? 'btn-primario' : 'btn-borde'} btn-chico" data-accion="resp-elegir" data-id="${esc(p.id)}" ${sinCuenta ? 'disabled aria-disabled="true"' : ''} aria-label="Elegir ${esc(p.correo || p.apodo || p.id)}">${p.id === elegido ? 'Elegida' : 'Elegir'}</button>
      </li>`;
    }).join('');
    const sinCuenta = archivo.perfiles.filter((p) => !p.actual).length;
    return `<p class="peq mt-m" id="resp-archivo-info"><strong>${esc(archivo.nombre)}</strong> · generado ${esc(fecha(d.generado_en))} · app ${esc(d.version_app || '¿?')} · ${fmtNum(archivo.perfiles.length)} cuentas</p>
      ${sinCuenta ? `<p class="mini">${fmtNum(sinCuenta)} cuenta${sinCuenta === 1 ? '' : 's'} del respaldo ya no existe${sinCuenta === 1 ? '' : 'n'}: no se puede${sinCuenta === 1 ? '' : 'n'} restaurar desde la app (ver README, «Respaldo y restauración»).</p>` : ''}
      <ul class="lista-respaldo mt-s" id="resp-perfiles">${filas}</ul>`;
  }

  /**
   * Advertencia cuando la cuenta tiene HOY más progreso (XP o preguntas) que el respaldo: al
   * restaurar, el celular adopta el progreso del respaldo y ese avance queda solo en el servidor.
   */
  function advertenciaProgreso(p) {
    if (!p || !p.ep || !p.actual) return '';
    const xpA = Number(p.actual.xp) || 0;
    const prA = Number(p.actual.preguntas_total) || 0;
    const xpR = Number(p.xp) || 0;
    const prR = Number(p.preguntas) || 0;
    if (xpA <= xpR && prA <= prR) return '';
    return `Atención: hoy la cuenta tiene más progreso que el respaldo (${fmtNum(xpA)} XP y ${fmtNum(prA)} preguntas frente a ${fmtNum(xpR)} XP y ${fmtNum(prR)} preguntas). Si restauras, su celular adoptará el progreso del respaldo y ese avance quedará solo en la copia del servidor (se recupera con «Deshacer»).`;
  }

  function htmlPrevia() {
    if (!archivo || !elegido) return '';
    const p = archivo.perfiles.find((x) => x.id === elegido);
    if (!p || !p.actual) return '';
    const a = p.actual;
    const perf = R.perfilARestaurar(p);
    const puede = !!p.ep || conPerfil;
    const celda = (v) => (v === null || v === undefined ? '—' : esc(String(v)));
    const adv = advertenciaProgreso(p);
    return `<section class="tarjeta mt-m resp-previa" id="resp-previa" data-lista="${previaLista ? '1' : '0'}" aria-labelledby="resp-previa-titulo" aria-busy="${previaLista ? 'false' : 'true'}">
      <h3 id="resp-previa-titulo" style="margin:0">Vista previa: ${esc(p.correo || p.apodo || '')}</h3>
      <table class="tabla mt-s resp-comparar">
        <thead><tr><th scope="col"></th><th scope="col" class="num">Respaldo</th><th scope="col" class="num">Actual</th></tr></thead>
        <tbody>
          <tr data-dato="xp"><th scope="row">XP</th><td class="num">${p.ep ? fmtNum(p.xp) : '—'}</td><td class="num">${fmtNum(a.xp || 0)}</td></tr>
          <tr data-dato="preguntas"><th scope="row">Preguntas</th><td class="num">${p.ep ? fmtNum(p.preguntas) : '—'}</td><td class="num">${fmtNum(a.preguntas_total || 0)}</td></tr>
          <tr data-dato="fecha"><th scope="row">Fecha</th><td class="num">${esc(fecha(p.fecha))}</td><td class="num">${esc(fecha(a.ultima_actividad))}</td></tr>
          <tr data-dato="plan"><th scope="row">Plan</th><td class="num">${celda(NOMBRE_PLAN[p.plan] || p.plan)}</td><td class="num">${celda(NOMBRE_PLAN[a.plan] || a.plan)}</td></tr>
          <tr data-dato="apodo"><th scope="row">Apodo</th><td class="num">${celda(p.apodo)}</td><td class="num">${celda(a.apodo)}</td></tr>
          <tr data-dato="prueba"><th scope="row">Contadores de prueba</th><td class="num">${celda(p.preguntas_prueba)} / ${celda(p.simulacros_prueba)}</td><td class="num">${celda(a.preguntas_prueba)} / ${celda(a.simulacros_prueba)}</td></tr>
        </tbody>
      </table>
      <p class="mini">${previaLista ? '' : 'Actualizando los datos actuales… '}«Actual»: fecha de la última actividad en el servidor. Contadores: preguntas / simulacros de la prueba gratis.</p>
      ${p.ep ? '' : '<p class="aviso-almacen">El respaldo no tiene progreso de esta cuenta: solo se puede restaurar su perfil.</p>'}
      <label class="item-fila resp-casilla" style="padding:12px 0;border:0">
        <input type="checkbox" id="resp-con-perfil" ${conPerfil ? 'checked' : ''}>
        <span class="fila-cuerpo"><span class="fila-titulo">También plan, apodo y contadores de prueba</span>
        <span class="fila-sub">No cambia el rol ni el bloqueo.${p.plan === 'pendiente' ? ' El plan «En revisión» no se restaura: resuelve el pago en la pestaña Pagos.' : ''}${perf.plan === null && p.plan !== 'pendiente' ? ' El respaldo no trae un plan válido: se mantiene el actual.' : ''}</span></span>
      </label>
      ${adv ? `<p class="aviso-almacen resp-advertencia" id="resp-advertencia-progreso" role="alert">${icono('alerta', { tam: 20 })}<span>${esc(adv)}</span></p>` : ''}
      <div class="consejo resp-nota" id="resp-aviso-fusion">${icono('info', { tam: 20 })}<p>El celular del usuario adoptará el progreso restaurado. Si tenía más progreso que el respaldo, ese avance quedará solo en la copia del servidor y se recupera con «Deshacer».</p></div>
      <button type="button" class="btn btn-primario btn-bloque mt-m" data-accion="resp-restaurar" ${puede && previaLista && !restaurando ? '' : 'disabled'}>${restaurando ? 'Restaurando…' : `${icono('repaso', { tam: 20 })}Restaurar ${p.ep ? 'progreso' : 'perfil'}`}</button>
    </section>`;
  }

  function htmlRestaurado() {
    if (!restaurado) return '';
    if (restaurado.deshecho) {
      return `<div class="tarjeta mt-m resp-hecho" id="resp-deshecho" role="status"><p style="margin:0"><strong>Restauración deshecha.</strong> ${esc(restaurado.correo)} volvió ${restaurado.sinEstado ? 'a su situación anterior' : 'exactamente al progreso que tenía antes de restaurar'}.</p>
        ${restaurado.sinEstado ? '<p class="mini" id="resp-sin-estado" style="margin:6px 0 0">La cuenta no tenía progreso guardado antes; el celular volverá a subir el suyo al sincronizar.</p>' : ''}
        ${restaurado.conPerfil ? '<p class="mini" style="margin:6px 0 0">El plan, apodo y contadores no se deshacen: cámbialos desde la pestaña Usuarios si hace falta.</p>' : ''}</div>`;
    }
    return `<div class="tarjeta mt-m resp-hecho" id="resp-restaurado" role="status">
      <p style="margin:0"><strong>${icono('check', { tam: 18, clase: 'en-linea' })} ${restaurado.soloPerfil ? 'Perfil restaurado' : 'Progreso restaurado'}</strong> para ${esc(restaurado.correo)}.${restaurado.tamano ? ` <span class="mini">(${esc(kb(restaurado.tamano))})</span>` : ''}</p>
      ${restaurado.errorPerfil ? `<p class="error-campo" role="alert" style="margin-top:6px">El perfil no se pudo restaurar: ${esc(restaurado.errorPerfil)}</p>` : ''}
      ${restaurado.soloPerfil ? '' : `<p class="mini" style="margin:6px 0 0">Se guardó una copia del estado anterior. «Deshacer» la vuelve a poner tal cual (disponible mientras sigas en esta pestaña); lo que el usuario estudie después de restaurar quedaría solo en el historial del servidor.</p>
      <button type="button" class="btn btn-borde btn-chico mt-s" data-accion="resp-deshacer">${icono('volver', { tam: 18 })}Deshacer</button>`}
    </div>`;
  }

  async function restaurar() {
    const p = archivo && archivo.perfiles.find((x) => x.id === elegido);
    if (!p || !p.actual || restaurando) return;
    const soloPerfil = !p.ep;
    if (soloPerfil && !conPerfil) return;
    const perf = R.perfilARestaurar(p);
    const partes = [];
    if (!soloPerfil) partes.push(`reemplazará su progreso en la nube por el del respaldo (${fmtNum(p.xp)} XP, ${fmtNum(p.preguntas)} preguntas, ${fecha(p.fecha)}); antes se guarda una copia para poder deshacer`);
    if (conPerfil) partes.push(`restaurará ${[perf.apodo ? `el apodo «${perf.apodo}»` : null, perf.plan ? `el plan «${NOMBRE_PLAN[perf.plan]}»` : null, perf.preguntas !== null || perf.simulacros !== null ? 'los contadores de la prueba' : null].filter(Boolean).join(', ') || 'su perfil'}`);
    const ok = await confirmar({
      titulo: soloPerfil ? '¿Restaurar el perfil?' : '¿Restaurar el progreso?',
      texto: `Para ${p.correo || p.apodo}: ${partes.join('; y ')}.`,
      aviso: soloPerfil ? '' : advertenciaProgreso(p),
      aceptar: 'Restaurar',
    });
    if (!ok) return;
    restaurando = true;
    repintar();
    const r = { id: p.id, correo: p.correo || p.apodo || p.id, soloPerfil, conPerfil, deshecho: false, errorPerfil: null, tamano: null, hora: null };
    try {
      if (!soloPerfil) {
        const x = await nube.adminRestaurarEstado(p.id, p.ep.estado, p.ep.version_estado ?? null, p.ep.version_app ?? null);
        r.tamano = x && x.tamano;
        // Hora de la restauración según el servidor (para avisar en «Deshacer» de actividad posterior).
        r.hora = (x && x.actualizado) || new Date().toISOString();
      }
      if (conPerfil) {
        try {
          await nube.adminRestaurarPerfil(p.id, perf);
        } catch (e) {
          if (soloPerfil) throw e;
          r.errorPerfil = e.message;
        }
      }
      restaurado = r;
      toast(r.errorPerfil ? 'Progreso restaurado; el perfil no se pudo restaurar.' : (soloPerfil ? 'Perfil restaurado.' : 'Progreso restaurado.'), { tipo: r.errorPerfil ? 'info' : 'exito' });
      await refrescarActuales();
    } catch (e) {
      toast(e.message, { tipo: 'error' });
    }
    restaurando = false;
    repintar();
  }

  /** ¿La cuenta tiene actividad posterior a la restauración? (última actividad de admin_usuarios). */
  function actividadPosterior(r) {
    const p = archivo && archivo.perfiles.find((x) => x.id === r.id);
    const ua = p && p.actual && p.actual.ultima_actividad;
    const t = ua ? Date.parse(ua) : NaN;
    const h = r.hora ? Date.parse(r.hora) : NaN;
    return Number.isFinite(t) && Number.isFinite(h) && t > h ? ua : null;
  }

  async function deshacer() {
    if (!restaurado || restaurado.deshecho || restaurado.deshaciendo) return;
    const r = restaurado;
    r.deshaciendo = true;
    const b = raiz.querySelector('[data-accion="resp-deshacer"]');
    if (b) b.disabled = true;
    await refrescarActuales();
    const ua = actividadPosterior(r);
    const ok = await confirmar({
      titulo: '¿Deshacer la restauración?',
      texto: `${r.correo} volverá exactamente al progreso que tenía antes de restaurar (antes se guarda una copia del actual en el historial del servidor).`,
      aviso: ua ? `La cuenta tiene actividad posterior a la restauración (última: ${fecha(ua)}). Lo estudiado desde entonces no se conserva en el progreso: quedará solo en el historial del servidor.` : '',
      aceptar: 'Deshacer',
    });
    r.deshaciendo = false;
    if (!ok || restaurado !== r) {
      const b2 = raiz.querySelector('[data-accion="resp-deshacer"]');
      if (b2) b2.disabled = false;
      return;
    }
    try {
      const x = await nube.adminDeshacerRestauracion(restaurado.id);
      restaurado.deshecho = true;
      restaurado.sinEstado = !!(x && x.sin_estado);
      toast('Restauración deshecha.', { tipo: 'exito' });
      await refrescarActuales();
    } catch (e) {
      toast(e.message, { tipo: 'error' });
      const b3 = raiz.querySelector('[data-accion="resp-deshacer"]');
      if (b3) b3.disabled = false;
    }
    repintar();
  }

  /** Elige una cuenta: vuelve a consultar sus datos actuales para que la comparación sea fresca. */
  async function elegir(id) {
    elegido = id;
    conPerfil = false;
    restaurado = null;
    previaLista = false;
    repintar();
    const el = raiz.querySelector('#resp-previa');
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
    await refrescarActuales();
    if (elegido !== id) return;
    previaLista = true;
    repintar();
  }

  // ---------------- Pintado y eventos ----------------
  function html() {
    if (!resumen && !errorResumen) cargarResumen();
    const ocupado = descarga && !descarga.fin;
    return `<p class="aviso-almacen aviso-respaldo" id="resp-aviso" style="margin-top:0">${icono('alerta', { tam: 20 })}<span>Respalda antes de cambiar el esquema y una vez por semana.</span></p>
      <div class="mt-m">${htmlResumen()}</div>
      <h2>Descargar respaldo</h2>
      <p class="peq atenuado">Un archivo JSON con todas las tablas (perfiles, progreso, sesiones, ingresos, pagos y configuración de cobro). Las imágenes de los vouchers no van en el archivo: solo sus rutas. Guárdalo fuera del celular (computadora o nube personal).</p>
      <button type="button" class="btn btn-primario btn-bloque" data-accion="resp-descargar" ${ocupado ? 'disabled' : ''}>${icono('descargar', { tam: 20 })}${ocupado ? 'Descargando…' : 'Descargar respaldo'}</button>
      ${htmlProgreso()}
      ${htmlResultado()}
      <h2>Restaurar progreso de un usuario</h2>
      <p class="peq atenuado">Elige un archivo de respaldo, la cuenta y revisa la vista previa antes de confirmar. Solo cuentas que existen hoy.</p>
      <label class="btn btn-secundario btn-bloque" for="resp-archivo">${icono('subir', { tam: 20 })}${archivo ? 'Elegir otro archivo' : 'Elegir archivo de respaldo'}</label>
      <input class="sr-only" type="file" id="resp-archivo" accept="application/json,.json">
      ${leyendo ? '<p class="peq atenuado" role="status">Leyendo el archivo…</p>' : ''}
      ${errorArchivo ? `<p class="error-campo" role="alert" id="resp-error-archivo">${esc(errorArchivo)}</p>` : ''}
      ${htmlListaPerfiles()}
      ${htmlPrevia()}
      ${htmlRestaurado()}`;
  }

  /** Atiende un clic con data-accion «resp-*». Devuelve true si era suyo. */
  function alClic(a, b) {
    if (!a.startsWith('resp-')) return false;
    if (a === 'resp-descargar') descargar();
    else if (a === 'resp-resumen') { errorResumen = null; resumen = null; repintar(); }
    else if (a === 'resp-compartir') compartir();
    else if (a === 'resp-guardar' && resultado) descargarBlob(resultado.nombre, resultado.blob);
    else if (a === 'resp-elegir') {
      const p = archivo && archivo.perfiles.find((x) => x.id === b.dataset.id);
      if (p && p.actual) elegir(p.id);
    } else if (a === 'resp-restaurar') restaurar();
    else if (a === 'resp-deshacer') deshacer();
    return true;
  }

  /** Atiende «change» (archivo y casilla). Devuelve true si era suyo. */
  function alCambiar(e) {
    if (e.target.id === 'resp-archivo') {
      const f = e.target.files && e.target.files[0];
      if (f) leerArchivo(f);
      return true;
    }
    if (e.target.id === 'resp-con-perfil') {
      conPerfil = e.target.checked;
      repintar();
      return true;
    }
    return false;
  }

  /** Al salir de la pestaña: «Deshacer» deja de estar disponible. */
  function alSalir() {
    restaurado = null;
  }

  function recargar() {
    resumen = null;
    errorResumen = null;
    repintar();
  }

  return { html, alClic, alCambiar, alSalir, recargar, destruir: () => { vivo = false; } };
}
