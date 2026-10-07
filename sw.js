/* sw.js — Service worker de «Ascenso 2026».
 *
 * · Precarga el app shell (HTML, CSS, módulos JS, manifest, iconos) y el banco (data/*.json)
 *   en una caché con versión: «ascenso2026-<APP_VERSION>».
 * · Estrategia: primero caché y actualización en segundo plano (stale-while-revalidate).
 * · Una versión nueva queda «en espera»; la página muestra «Nueva versión disponible ·
 *   Actualizar», que envía SKIP_WAITING y recarga.
 *
 * PARA PUBLICAR CAMBIOS: sube APP_VERSION (y la de js/version.js) — ver README.
 */
const APP_VERSION = '1.0.0';
const PREFIJO = 'ascenso2026-';
const CACHE = `${PREFIJO}${APP_VERSION}`;

const ARCHIVOS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/estilos.css',
  './js/main.js',
  './js/version.js',
  './js/util.js',
  './js/datos.js',
  './js/estado.js',
  './js/estadisticas.js',
  './js/srs.js',
  './js/seleccion.js',
  './js/gamificacion.js',
  './js/sesion.js',
  './js/consultas.js',
  './js/router.js',
  './js/sw-registro.js',
  './js/ui/anillo.js',
  './js/ui/apariencia.js',
  './js/ui/arranque.js',
  './js/ui/celebracion.js',
  './js/ui/comun.js',
  './js/ui/continuar.js',
  './js/ui/exportar.js',
  './js/ui/grafico.js',
  './js/ui/heatmap.js',
  './js/ui/iconos.js',
  './js/ui/modal.js',
  './js/ui/pregunta.js',
  './js/ui/sonido.js',
  './js/ui/toast.js',
  './js/ui/vista-ajustes.js',
  './js/ui/vista-examen.js',
  './js/ui/vista-explorar.js',
  './js/ui/vista-inicio.js',
  './js/ui/vista-logros.js',
  './js/ui/vista-mas.js',
  './js/ui/vista-practica.js',
  './js/ui/vista-progreso.js',
  './js/ui/vista-repaso.js',
  './js/ui/vista-resultado.js',
  './js/ui/vista-resumen.js',
  './js/ui/vista-sesion.js',
  './js/ui/vista-simulacro.js',
  './iconos/favicon.svg',
  './iconos/favicon-32.png',
  './iconos/icon-192.png',
  './iconos/icon-512.png',
  './iconos/icon-maskable-192.png',
  './iconos/icon-maskable-512.png',
  './iconos/apple-touch-icon.png',
  './data/banco.json',
  './data/meta.json',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // En la primera instalación se aprovecha la caché HTTP (el navegador acaba de descargar
    // los mismos archivos); en las actualizaciones se fuerza la red para no guardar copias viejas.
    const modo = self.registration.active ? 'reload' : 'default';
    await cache.addAll(ARCHIVOS.map((url) => new Request(url, { cache: modo })));
  })());
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil((async () => {
    const claves = await caches.keys();
    await Promise.all(claves.filter((k) => k.startsWith(PREFIJO) && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (evento) => {
  if (evento.data && evento.data.tipo === 'SKIP_WAITING') self.skipWaiting();
});

/** Copia «limpia» de una respuesta (Safari rechaza respuestas redirigidas en navegación). */
function limpia(res) {
  if (!res || !res.redirected) return res;
  return res.blob().then((cuerpo) => new Response(cuerpo, { status: res.status, statusText: res.statusText, headers: res.headers }));
}

async function avisarClientes(mensaje) {
  const clientes = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const c of clientes) c.postMessage(mensaje);
}

/** Primero caché; en paralelo se pide a la red y se actualiza la caché. */
async function cacheYActualizar(evento) {
  const req = evento.request;
  const url = new URL(req.url);
  const cache = await caches.open(CACHE);
  const guardada = await cache.match(req, { ignoreSearch: true });
  const esMeta = url.pathname.endsWith('/data/meta.json');
  const previa = guardada && esMeta ? guardada.clone() : null;

  const red = fetch(req).then(async (res) => {
    if (res && res.ok && res.type === 'basic') {
      if (previa) {
        // ¿Cambió el banco? Entonces se refresca también banco.json y se avisa a la página.
        const [antes, ahora] = await Promise.all([previa.text(), res.clone().text()]);
        if (antes !== ahora) {
          await cache.put(req, res.clone());
          try {
            const rb = await fetch('./data/banco.json', { cache: 'no-cache' });
            if (rb.ok) await cache.put('./data/banco.json', rb);
          } catch { /* sin red: se intentará en la próxima visita */ }
          await avisarClientes({ tipo: 'datos-actualizados' });
          return res;
        }
      }
      await cache.put(req, res.clone());
    }
    return res;
  }).catch(() => null);

  if (guardada) {
    evento.waitUntil(red);
    return guardada;
  }
  const res = await red;
  return res || new Response('Sin conexión', { status: 503, statusText: 'Sin conexion', headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

/** Navegación: se sirve el index.html guardado (la app funciona sin red). */
async function navegacion(evento) {
  const cache = await caches.open(CACHE);
  const guardada = (await cache.match('./index.html')) || (await cache.match('./'));
  const red = fetch(evento.request).then(async (res) => {
    if (res && res.ok && res.type === 'basic') await cache.put('./index.html', (await limpia(res.clone())));
    return res;
  }).catch(() => null);
  if (guardada) {
    evento.waitUntil(red);
    return limpia(guardada);
  }
  const res = await red;
  return (await limpia(res)) || new Response('<!doctype html><meta charset="utf-8"><title>Sin conexión</title><p>Sin conexión. Abre la app con internet una vez para instalarla.</p>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

self.addEventListener('fetch', (evento) => {
  const req = evento.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const base = new URL('./', self.location.href).pathname;
  if (!url.pathname.startsWith(base)) return;
  const relativa = url.pathname.slice(base.length);
  // Capturas, documentación y el propio sw.js no se interceptan.
  if (relativa.startsWith('_capturas/') || relativa.endsWith('.md') || relativa === 'sw.js') return;
  if (req.mode === 'navigate') {
    if (relativa === '' || relativa === 'index.html') evento.respondWith(navegacion(evento));
    return;
  }
  evento.respondWith(cacheYActualizar(evento));
});
