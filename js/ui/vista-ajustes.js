// vista-ajustes.js — Ajustes: perfil, estudio, banco (modo ampliado / no verificadas con
// conteo), apariencia, sonidos, exportar/importar/reiniciar progreso y «Acerca de».

import { estado, guardar, guardarYa, leerExportacion, reemplazarEstado, reiniciarProgreso, almacen } from '../estado.js';
import { D, conteoDisponible, fuentesDe } from '../datos.js';
import { esc, fmtNum, fmtFechaHora, limitar, fmtNota } from '../util.js';
import { APP_VERSION } from '../version.js';
import { refrescar } from '../router.js';
import { icono } from './iconos.js';
import { segmentos } from './comun.js';
import { aplicarApariencia } from './apariencia.js';
import { confirmar } from './modal.js';
import { toast } from './toast.js';
import { exportarProgreso, compartirProgreso, puedeCompartir } from './exportar.js';
import { sonar } from './sonido.js';

const PASOS = {
  metaDiaria: { min: 5, max: 300, paso: 5, fmt: (v) => fmtNum(v) },
  notaMinima: { min: 10, max: 20, paso: 0.5, fmt: (v) => (Number.isInteger(v) ? String(v) : fmtNota(v)) },
  simPreguntas: { min: 10, max: 100, paso: 5, fmt: (v) => fmtNum(v) },
  simMinutos: { min: 10, max: 180, paso: 5, fmt: (v) => `${v} min` },
};

function paso(clave, etiqueta, ayuda) {
  const p = PASOS[clave];
  const v = estado.ajustes[clave];
  return `<div class="ajuste">
    <span class="ajuste-texto" id="et-${clave}"><strong>${esc(etiqueta)}</strong>${ayuda ? `<span>${esc(ayuda)}</span>` : ''}</span>
    <span class="paso" role="group" aria-labelledby="et-${clave}">
      <button type="button" class="btn-icono" data-accion="paso" data-clave="${clave}" data-delta="-1" aria-label="Disminuir" ${v <= p.min ? 'disabled' : ''}>${icono('menos', { tam: 20 })}</button>
      <span class="valor" id="val-${clave}" aria-live="polite">${p.fmt(v)}</span>
      <button type="button" class="btn-icono" data-accion="paso" data-clave="${clave}" data-delta="1" aria-label="Aumentar" ${v >= p.max ? 'disabled' : ''}>${icono('mas2', { tam: 20 })}</button>
    </span>
  </div>`;
}

function interruptor(clave, etiqueta, ayuda) {
  return `<div class="ajuste">
    <span class="ajuste-texto" id="et-${clave}"><strong>${esc(etiqueta)}</strong>${ayuda ? `<span>${esc(ayuda)}</span>` : ''}</span>
    <button type="button" class="interruptor" role="switch" aria-checked="${!!estado.ajustes[clave]}" aria-labelledby="et-${clave}" data-accion="interruptor" data-clave="${clave}"></button>
  </div>`;
}

function htmlConteo() {
  const c = conteoDisponible(estado.ajustes);
  return `<strong>${fmtNum(c.total)} preguntas disponibles</strong><span>${D.examenes.map((e) => `${esc(e.nombre)}: ${fmtNum(c.porExamen[e.id] || 0)}`).join('; ')}</span>`;
}

function htmlAcerca() {
  const m = D.meta || {};
  const bloques = D.examenes.map((e) => {
    const fs = fuentesDe(e.id);
    const total = fs.reduce((t, f) => t + f.preguntas.length, 0);
    const filas = fs.length > 1 ? fs.map((f) => `<li class="fila"><span class="fila-cuerpo"><span class="fila-titulo">${esc(f.sigla)}</span>
      <span class="fila-sub">${esc(f.nombre)}</span></span><span class="fila-valor">${fmtNum(f.preguntas.length)}</span></li>`).join('') : '';
    if (!filas) {
      return `<div class="desplegable mt-s"><div class="fila-fija"><span class="fila-cuerpo">${esc(e.nombre)}</span><span class="fila-valor">${fmtNum(total)}</span></div></div>`;
    }
    return `<details class="desplegable mt-s"><summary><span class="fila-cuerpo">${esc(e.nombre)}</span><span class="fila-valor">${fmtNum(total)}</span>${icono('chev-abajo', { clase: 'chev', tam: 20 })}</summary>
      <ul class="lista desplegable-cuerpo" style="box-shadow:none;border-radius:0">${filas}</ul></details>`;
  }).join('');
  return `<section id="acerca">
    <div class="tarjeta">
      <p class="texto-largo" style="margin-top:0">Simulador de estudio para los exámenes de ascenso de la Marina de Guerra del Perú: Reglamentos, MAPLO e Inglés.</p>
      <dl class="cifras" style="margin-top:6px">
        <div><dt>Versión de la app</dt><dd>${esc(APP_VERSION)}</dd></div>
        <div><dt>Versión del banco</dt><dd class="num">${esc(m.version || '—')}</dd></div>
        <div><dt>Banco generado</dt><dd>${esc(m.generado || '—')}</dd></div>
        <div><dt>Total de preguntas</dt><dd>${fmtNum(D.banco.length)}</dd></div>
      </dl>
    </div>
    <h3 class="mt-l" style="margin-bottom:4px">Preguntas por examen y fuente</h3>
    ${bloques}
    <p class="texto-largo mt-m">El banco fue generado a partir del temario oficial y de bancos de años anteriores, y verificado por auditoría frente a los reglamentos. Aun así, ante cualquier duda contrasta la pregunta con el reglamento o manual vigente: la norma oficial siempre prevalece.</p>
    <p class="mini">Funciona sin conexión. Tu progreso se guarda solo en este dispositivo.</p>
  </section>`;
}

export function montar(raiz, params) {
  function pintar() {
    const aj = estado.ajustes;
    raiz.innerHTML = `
      <h1>Ajustes</h1>
      <p class="sub">Los cambios se guardan al instante.</p>
      ${!almacen.disponible ? `<p class="aviso-almacen">${icono('alerta', { tam: 20 })}<span>Este navegador no permite guardar datos. Exporta tu progreso antes de cerrar la app.</span></p>` : ''}

      <h2>Perfil</h2>
      <div class="lista">
        <div class="ajuste-bloque"><label for="nombre"><strong>Nombre</strong></label>
          <input class="entrada mt-s" id="nombre" type="text" maxlength="40" autocomplete="nickname" placeholder="Comandante" value="${esc(aj.nombre)}"></div>
        <div class="ajuste-bloque"><label for="fecha"><strong>Fecha del examen</strong></label>
          <input class="entrada mt-s" id="fecha" type="date" value="${esc(aj.fechaExamen)}"></div>
      </div>

      <h2>Estudio</h2>
      <div class="lista">
        ${paso('metaDiaria', 'Meta diaria', 'Preguntas por día para mantener la racha')}
        ${paso('notaMinima', 'Nota mínima aprobatoria', 'Escala vigesimal')}
        ${paso('simPreguntas', 'Preguntas por simulacro', 'Valor por defecto')}
        ${paso('simMinutos', 'Minutos por simulacro', 'Valor por defecto')}
      </div>

      <h2>Banco de preguntas</h2>
      <div class="lista">
        ${interruptor('modoAmpliado', 'Modo ampliado', 'Incluye preguntas fuera del temario oficial')}
        ${interruptor('incluirNoVerificadas', 'Incluir no verificadas', 'Preguntas que la auditoría no pudo confirmar en la fuente')}
        <div class="ajuste"><span class="ajuste-texto" id="conteo" aria-live="polite">${htmlConteo()}</span></div>
      </div>

      <h2>Apariencia</h2>
      <div class="lista">
        <div class="ajuste-bloque"><strong>Tema</strong>${segmentos([{ valor: 'auto', texto: 'Automático' }, { valor: 'claro', texto: 'Claro' }, { valor: 'oscuro', texto: 'Oscuro' }], aj.tema, 'tema', 'Tema')}</div>
        <div class="ajuste-bloque"><strong>Tamaño de letra</strong>${segmentos([{ valor: 0, texto: 'Pequeña' }, { valor: 1, texto: 'Normal' }, { valor: 2, texto: 'Grande' }], aj.letra, 'letra', 'Tamaño de letra')}</div>
        ${interruptor('mayusculas', 'Preguntas en MAYÚSCULAS', 'Como en el examen real (enunciado y alternativas)')}
        ${interruptor('sonidos', 'Sonidos', 'Efectos breves al acertar, fallar y subir de nivel')}
      </div>

      <h2>Tus datos</h2>
      <div class="lista">
        <div class="ajuste-bloque">
          <p class="peq atenuado" style="margin:0 0 12px">Exporta tu progreso a un archivo para tener una copia o pasarlo a otro dispositivo.${estado.ultimaExportacion ? ` Última exportación: ${esc(fmtFechaHora(estado.ultimaExportacion))}.` : ''}</p>
          <div class="botones" style="margin-top:0">
            <button type="button" class="btn btn-secundario btn-bloque" data-accion="exportar">${icono('descargar', { tam: 20 })}Exportar progreso</button>
            ${puedeCompartir() ? `<button type="button" class="btn btn-secundario btn-bloque" data-accion="compartir">${icono('compartir', { tam: 20 })}Compartir archivo</button>` : ''}
            <button type="button" class="btn btn-secundario btn-bloque" data-accion="importar">${icono('subir', { tam: 20 })}Importar progreso</button>
            <input type="file" id="archivo" accept="application/json,.json" hidden>
            <button type="button" class="btn btn-borde btn-bloque" data-accion="reiniciar" style="color:var(--rojo-texto)">${icono('papelera', { tam: 20 })}Reiniciar progreso</button>
          </div>
        </div>
      </div>

      <h2>Acerca de</h2>
      ${htmlAcerca()}`;
  }

  const guardarNombre = (() => {
    let t = null;
    return (v) => { clearTimeout(t); t = setTimeout(() => { estado.ajustes.nombre = v.trim(); guardar(); }, 250); };
  })();

  async function importar(archivo) {
    let nuevo;
    try {
      nuevo = leerExportacion(await archivo.text());
    } catch (e) {
      toast(e.message || 'No se pudo leer el archivo.', { tipo: 'error' });
      return;
    }
    const n = Object.values(nuevo.p).filter((s) => s.n).length;
    const ok = await confirmar({
      titulo: '¿Importar este progreso?',
      texto: `Reemplazará tu progreso actual por el del archivo (${fmtNum(n)} preguntas respondidas, ${fmtNum(nuevo.xp)} XP, ${nuevo.sims.length} simulacros). No se puede deshacer.`,
      aceptar: 'Importar',
    });
    if (!ok) return;
    reemplazarEstado(nuevo);
    aplicarApariencia();
    toast('Progreso importado.', { tipo: 'exito' });
    refrescar();
  }

  async function reiniciar() {
    const uno = await confirmar({
      titulo: '¿Reiniciar tu progreso?',
      texto: 'Se borrarán estadísticas, XP, logros, simulacros y repasos. Tus ajustes se conservan.',
      aceptar: 'Continuar', peligro: true,
    });
    if (!uno) return;
    const dos = await confirmar({
      titulo: 'Confirmación final',
      texto: 'Esta acción no se puede deshacer. Si no exportaste tu progreso, se perderá.',
      aceptar: 'Sí, reiniciar', peligro: true,
    });
    if (!dos) return;
    reiniciarProgreso();
    toast('Progreso reiniciado.', { icono: 'papelera' });
    refrescar();
  }

  async function alClic(e) {
    const b = e.target.closest('[data-accion]');
    if (!b) return;
    const aj = estado.ajustes;
    switch (b.dataset.accion) {
      case 'paso': {
        const clave = b.dataset.clave;
        const p = PASOS[clave];
        aj[clave] = limitar(Math.round((aj[clave] + Number(b.dataset.delta) * p.paso) * 10) / 10, p.min, p.max);
        guardar();
        const fila = b.closest('.ajuste');
        fila.querySelector(`#val-${clave}`).textContent = p.fmt(aj[clave]);
        const [menos, mas] = fila.querySelectorAll('[data-accion="paso"]');
        menos.disabled = aj[clave] <= p.min;
        mas.disabled = aj[clave] >= p.max;
        return;
      }
      case 'interruptor': {
        const clave = b.dataset.clave;
        aj[clave] = !aj[clave];
        b.setAttribute('aria-checked', String(aj[clave]));
        guardar();
        if (clave === 'mayusculas') aplicarApariencia();
        if (clave === 'sonidos' && aj.sonidos) sonar('acierto');
        if (clave === 'modoAmpliado' || clave === 'incluirNoVerificadas') raiz.querySelector('#conteo').innerHTML = htmlConteo();
        return;
      }
      case 'tema':
        aj.tema = b.dataset.valor;
        break;
      case 'letra':
        aj.letra = Number(b.dataset.valor);
        break;
      case 'exportar': exportarProgreso(); break;
      case 'compartir': await compartirProgreso(); break;
      case 'importar': raiz.querySelector('#archivo').click(); return;
      case 'reiniciar': await reiniciar(); return;
      default: return;
    }
    guardar();
    aplicarApariencia();
    const y = window.scrollY;
    pintar();
    window.scrollTo(0, y);
  }

  function alEntrada(e) {
    if (e.target.id === 'nombre') guardarNombre(e.target.value);
  }

  function alCambio(e) {
    if (e.target.id === 'fecha') {
      estado.ajustes.fechaExamen = e.target.value || '';
      guardar();
    } else if (e.target.id === 'archivo' && e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      e.target.value = '';
      importar(f);
    }
  }

  pintar();
  if (params && params.seccion === 'acerca') {
    requestAnimationFrame(() => raiz.querySelector('#acerca')?.scrollIntoView({ block: 'start' }));
  }
  raiz.addEventListener('click', alClic);
  raiz.addEventListener('input', alEntrada);
  raiz.addEventListener('change', alCambio);
  return () => {
    raiz.removeEventListener('click', alClic);
    raiz.removeEventListener('input', alEntrada);
    raiz.removeEventListener('change', alCambio);
    guardarYa();
  };
}
