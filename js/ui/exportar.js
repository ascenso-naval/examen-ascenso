// exportar.js — Exportar el progreso como archivo .json (Blob + <a download>) y, si el
// dispositivo lo permite, compartirlo (útil en iPhone para guardarlo en Archivos).

import { estado, exportarTexto, guardarYa } from '../estado.js';
import { D } from '../datos.js';
import { hoyISO } from '../util.js';
import { APP_VERSION } from '../version.js';
import { toast } from './toast.js';

function archivo() {
  const nombre = `ascenso2026-progreso-${hoyISO()}.json`;
  const texto = exportarTexto(APP_VERSION, D.meta?.version);
  return { nombre, blob: new Blob([texto], { type: 'application/json' }) };
}

function anotarExportacion() {
  estado.ultimaExportacion = new Date().toISOString();
  guardarYa();
}

/** Descarga el progreso. */
export function exportarProgreso() {
  const { nombre, blob } = archivo();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  anotarExportacion();
  toast(`Progreso exportado: ${nombre}`, { tipo: 'exito', icono: 'descargar' });
}

/** ¿Se puede compartir un archivo con la hoja nativa del sistema? */
export function puedeCompartir() {
  try {
    if (!navigator.canShare || !window.File) return false;
    return navigator.canShare({ files: [new File(['{}'], 'prueba.json', { type: 'application/json' })] });
  } catch {
    return false;
  }
}

/** Comparte el archivo de progreso (Web Share API). */
export async function compartirProgreso() {
  const { nombre, blob } = archivo();
  try {
    await navigator.share({ files: [new File([blob], nombre, { type: 'application/json' })], title: 'Progreso Ascensos 2027' });
    anotarExportacion();
  } catch (e) {
    if (e && e.name !== 'AbortError') toast('No se pudo compartir. Usa «Exportar progreso».', { tipo: 'error' });
  }
}
