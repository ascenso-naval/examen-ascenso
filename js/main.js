// main.js — Arranque de la app: estado, apariencia, carga del banco (pantalla breve),
// rutas por hash, navegación inferior, guardado al ocultar la app y service worker.

import { cargarEstado, guardarYa, almacen } from './estado.js';
import { cargarDatos } from './datos.js';
import { definirRutas, iniciarRouter } from './router.js';
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

async function arrancar() {
  cargarEstado();
  aplicarApariencia();
  vigilarTemaSistema();
  pintarNav();
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
  iniciarRouter(document.getElementById('vista'));
  actualizarPunto();
  window.addEventListener('hashchange', actualizarPunto);

  const carga = document.getElementById('carga');
  carga.classList.add('oculta');
  setTimeout(() => carga.remove(), 260);

  if (!almacen.disponible) {
    toast('Este navegador no permite guardar datos (¿modo privado?). La app funciona, pero exporta tu progreso antes de cerrar.', { tipo: 'error', duracion: 7000 });
  }

  // Guardar siempre al ocultar o cerrar la app (iOS puede suspenderla sin aviso).
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') guardarYa(); });
  window.addEventListener('pagehide', guardarYa);

  registrarSW();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}

arrancar();
