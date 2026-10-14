// main.js — Arranque de la app: estado, apariencia, carga del banco (pantalla breve),
// sesión (pantalla de acceso si no hay), rutas por hash, navegación inferior,
// sincronización con la nube, guardado al ocultar la app y service worker.
// Si la app no se abre instalada, antes que nada se muestra la pantalla «Instalar con un toque».

// Primero: escucha temprana de `beforeinstallprompt` (no perder el evento).
import { montarInstalacion } from './ui/instalar.js';
import { cargarEstado, guardarYa, almacen } from './estado.js';
import { cargarDatos } from './datos.js';
import { definirRutas, iniciarRouter, refrescar } from './router.js';
import * as nube from './nube.js';
import * as sync from './sincronizacion.js';
import * as cuenta from './cuenta.js';
import { registrarSW } from './sw-registro.js';
import { pendientesHoy } from './consultas.js';
import { esc } from './util.js';
import { aplicarApariencia, vigilarTemaSistema } from './ui/apariencia.js';
import { icono } from './ui/iconos.js';
import { toast } from './ui/toast.js';
import * as vInicio from './ui/vista-inicio.js';
import * as vPractica from './ui/vista-practica.js';
import * as vSesion from './ui/vista-sesion.js';
import * as vResumen from './ui/vista-resumen.js';
import * as vSimulacro from './ui/vista-simulacro.js';
import * as vExamen from './ui/vista-examen.js';
import * as vResultado from './ui/vista-resultado.js';
import * as vRepaso from './ui/vista-repaso.js';
import * as vExplorar from './ui/vista-explorar.js';
import * as vProgreso from './ui/vista-progreso.js';
import * as vLogros from './ui/vista-logros.js';
import * as vAjustes from './ui/vista-ajustes.js';
import * as vMas from './ui/vista-mas.js';
import * as vRanking from './ui/vista-ranking.js';
import * as vAdmin from './ui/vista-admin.js';
import * as vDiagnostico from './ui/vista-diagnostico.js';
import { montarAcceso } from './ui/vista-acceso.js';

const RUTAS = [
  { patron: '/inicio', montar: vInicio.montar, nav: 'inicio' },
  { patron: '/practica', montar: vPractica.montar, nav: 'practica' },
  { patron: '/practica/sesion', montar: vSesion.montar, nav: 'practica', sesion: true },
  { patron: '/practica/resumen', montar: vResumen.montar, nav: 'practica' },
  { patron: '/simulacro', montar: vSimulacro.montar, nav: 'simulacro' },
  { patron: '/simulacro/examen', montar: vExamen.montar, nav: 'simulacro', sesion: true },
  { patron: '/simulacro/resultado/:id', montar: vResultado.montarResultado, nav: 'simulacro' },
  { patron: '/simulacro/revision/:id', montar: vResultado.montarRevision, nav: 'simulacro' },
  { patron: '/repaso', montar: vRepaso.montar, nav: 'mas' },
  { patron: '/explorar', montar: vExplorar.montar, nav: 'mas' },
  { patron: '/explorar/:examen', montar: vExplorar.montar, nav: 'mas' },
  { patron: '/explorar/:examen/:fuente', montar: vExplorar.montar, nav: 'mas' },
  { patron: '/explorar/:examen/:fuente/:grupo', montar: vExplorar.montar, nav: 'mas' },
  { patron: '/progreso', montar: vProgreso.montar, nav: 'progreso' },
  { patron: '/logros', montar: vLogros.montar, nav: 'mas' },
  { patron: '/ajustes', montar: vAjustes.montar, nav: 'mas' },
  { patron: '/mas', montar: vMas.montar, nav: 'mas' },
  { patron: '/ranking', montar: vRanking.montar, nav: 'mas' },
  { patron: '/admin', montar: vAdmin.montarPanel, nav: 'mas' },
  { patron: '/admin/usuario/:id', montar: vAdmin.montarDetalle, nav: 'mas' },
  { patron: '/diagnostico', montar: vDiagnostico.montar, nav: 'mas' },
];

const DESTINOS = [
  { nav: 'inicio', href: '#/inicio', icono: 'inicio', texto: 'Inicio' },
  { nav: 'practica', href: '#/practica', icono: 'practica', texto: 'Práctica' },
  { nav: 'simulacro', href: '#/simulacro', icono: 'simulacro', texto: 'Simulacro' },
  { nav: 'progreso', href: '#/progreso', icono: 'progreso', texto: 'Progreso' },
  { nav: 'mas', href: '#/mas', icono: 'mas', texto: 'Más' },
];

function pintarNav() {
  const nav = document.getElementById('nav');
  nav.innerHTML = `<div class="nav-interior">${DESTINOS.map((d) =>
    `<a href="${d.href}" data-nav="${d.nav}"><span class="nav-icono">${icono(d.icono)}</span>${esc(d.texto)}${d.nav === 'mas' ? '<span class="punto" hidden></span>' : ''}</a>`).join('')}</div>`;
}

/** Punto dorado en «Más» si hay repasos pendientes hoy. */
function actualizarPunto() {
  const p = document.querySelector('.nav a[data-nav="mas"] .punto');
  if (!p) return;
  const n = pendientesHoy().total;
  p.hidden = n === 0;
  const enlace = p.closest('a');
  enlace.setAttribute('aria-label', n ? `Más, ${n} repasos pendientes` : 'Más');
}

function errorDeCarga(e) {
  const carga = document.getElementById('carga');
  console.warn('No se pudo cargar el banco:', e);
  carga.querySelector('.carga-barra')?.remove();
  carga.querySelector('#carga-texto').textContent = 'No se pudo cargar el banco de preguntas. Revisa tu conexión: la primera vez la app necesita internet para descargarlo.';
  const b = document.createElement('button');
  b.className = 'btn';
  b.type = 'button';
  b.textContent = 'Reintentar';
  b.addEventListener('click', () => location.reload());
  carga.appendChild(b);
}

function quitarCarga() {
  const carga = document.getElementById('carga');
  if (!carga) return;
  carga.classList.add('oculta');
  setTimeout(() => carga.remove(), 260);
}

let routerIniciado = false;
let recuperandoClave = false;

/** Entra a la app con una sesión válida (o persistida, aunque no haya red). */
function entrar(usuario) {
  document.body.classList.remove('sin-sesion');
  sync.iniciar({
    alExpulsar: (motivo) => cuenta.expulsar(motivo),
    alAplicarRemoto: () => {
      aplicarApariencia();
      if (!document.body.classList.contains('en-sesion') && !document.querySelector('.modal')) refrescar();
    },
  });
  if (!routerIniciado) {
    routerIniciado = true;
    iniciarRouter(document.getElementById('vista'));
    actualizarPunto();
    window.addEventListener('hashchange', actualizarPunto);
  } else {
    refrescar();
  }
  sync.sincronizar();
  if (recuperandoClave) { recuperandoClave = false; cuenta.pedirNuevaContrasena(); }
}

/** Muestra la pantalla de acceso (sin sesión). */
function mostrarAcceso() {
  document.body.classList.add('sin-sesion');
  const vista = document.getElementById('vista');
  let limpiar = null;
  limpiar = montarAcceso(vista, {
    alIngresar: async (usuario, op) => {
      await cuenta.trasIngresar(usuario, op);
      if (limpiar) limpiar();
      vista.innerHTML = '';
      entrar(usuario);
    },
  });
}

/** Sesión al abrir: procesa los enlaces de correo (?code=…) y lee la sesión guardada. */
async function sesionInicial() {
  const url = new URL(window.location.href);
  const conCodigo = url.searchParams.has('code') || url.searchParams.has('error_description');
  try {
    // Escucha de eventos de Auth (recuperación de contraseña, cierre por token inválido).
    nube.onAuthStateChange((evento) => {
      if (evento === 'PASSWORD_RECOVERY') {
        if (routerIniciado) cuenta.pedirNuevaContrasena(); else recuperandoClave = true;
      }
      if (evento === 'SIGNED_OUT' && routerIniciado && !cuenta.saliendo && !nube.sesionLocal()) cuenta.expulsar('sesion');
    });
    if (conCodigo && nube.enLinea()) await nube.cliente().auth.initialize();
  } catch (e) {
    console.warn('No se pudo iniciar el cliente de Supabase:', e);
  }
  if (conCodigo) {
    url.searchParams.delete('code');
    url.searchParams.delete('error');
    url.searchParams.delete('error_code');
    url.searchParams.delete('error_description');
    try { history.replaceState(null, '', url.pathname + (url.search || '') + url.hash); } catch { /* sin historial */ }
  }
  return nube.sesionLocal();
}

async function arrancar() {
  cargarEstado();
  aplicarApariencia();
  vigilarTemaSistema();
  pintarNav();
  // Pantalla de instalación (si no está instalada ni pospuesta): el banco sigue cargando debajo.
  montarInstalacion();
  almacen.alFallar = () => {
    if (almacen.avisado) return;
    almacen.avisado = true;
    toast('No se pudo guardar el progreso en este dispositivo. Exporta tu progreso desde Ajustes.', { tipo: 'error', duracion: 7000 });
  };

  try {
    await cargarDatos();
  } catch (e) {
    errorDeCarga(e);
    return;
  }

  definirRutas(RUTAS);
  const usuario = await sesionInicial();
  quitarCarga();
  if (!usuario) {
    mostrarAcceso();
  } else if (sync.usuarioVinculado() !== usuario.id && nube.enLinea()) {
    // Sesión nueva en este dispositivo (p. ej. tras confirmar el correo): vincular primero.
    try {
      await cuenta.trasIngresar(usuario, {});
      entrar(usuario);
    } catch (e) {
      if (e && e.tipo === 'bloqueado') { cuenta.expulsar('bloqueada'); return; }
      if (e && e.tipo === 'cancelado') {
        try { window.sessionStorage.setItem(cuenta.CLAVE_MENSAJE, e.message); } catch { /* sin almacenamiento */ }
        mostrarAcceso();
        return;
      }
      entrar(usuario);
    }
  } else {
    entrar(usuario);
    cuenta.revisarAlAbrir(usuario, (motivo) => cuenta.expulsar(motivo));
  }

  if (!almacen.disponible) {
    toast('Este navegador no permite guardar datos (¿modo privado?). La app funciona, pero exporta tu progreso antes de cerrar.', { tipo: 'error', duracion: 7000 });
  }

  // Guardar siempre al ocultar o cerrar la app (iOS puede suspenderla sin aviso).
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') guardarYa(); });
  window.addEventListener('pagehide', () => guardarYa());

  registrarSW();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}

arrancar();
