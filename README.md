# Ascenso 2026 — Simulador de examen (PWA)

Aplicación web instalable para estudiar los tres exámenes de ascenso de 40 preguntas con 5 alternativas: **Reglamentos**, **MAPLO** e **Inglés**. Funciona **sin conexión** en el celular (iPhone y Android) una vez instalada.

- **Práctica** con explicación inmediata, por examen, fuente, artículo, dificultad y orden (aleatorio, no vistas primero o débiles primero).
- **Simulacro** cronometrado «como el examen» (reparto por fuente según el temario), con rejilla 1-40, entrega automática, nota vigesimal y revisión.
- **Repaso** inteligente con repetición espaciada (1, 3, 7, 14, 30 y 60 días).
- **Explorar**: fichas por artículo y buscador de texto.
- **Progreso**: dominio, evolución de notas, actividad de 12 semanas y puntos débiles.
- **Gamificación**: XP, niveles con rangos navales, meta diaria, racha y 20 logros.
- **Cuenta** con correo y contraseña (v1.1.0): el progreso se **sincroniza** entre dispositivos (offline-first), **ranking** por apodo y **panel de administración** (ver secciones 7 y 8).
- **Instalar con un toque** (v1.2.0): quien abre el enlace en el celular sin la app instalada ve primero una pantalla que lo guía (botón nativo en Android, guía de 3 pasos en iPhone; ver sección 1).
- Sitio estático: HTML, CSS y JavaScript (módulos ES). Única dependencia: copia local de `@supabase/supabase-js` en `vendor/` (sin CDN). El backend es Supabase (`backend/schema.sql`).

---

## 1. Instalarla en el celular

La primera vez se necesita internet para descargar el banco (unos 2 MB). Después funciona sin conexión.

**Desde la v1.2.0 la app guía la instalación («Instalar con un toque»).** Basta compartir el enlace (`https://marconavy2510-prog.github.io/examen-ascenso/`): quien lo abre en el celular sin tener la app instalada ve primero una pantalla de instalación con la paleta de la app:

- **Android (Chrome, Edge, Samsung Internet):** botón grande **«Instalar la app»** que abre el aviso nativo del navegador (evento `beforeinstallprompt`). Mientras el navegador lo prepara el botón dice «Preparando instalación…»; si a los 4 s no está disponible, se muestra la guía manual del menú (⋮ → «Instalar app» / «Añadir a pantalla de inicio»; en Samsung Internet, ≡ → «Añadir página a»). Al aceptar: «Lista: ábrela desde tu pantalla de inicio».
- **iPhone/iPad:** guía animada de 3 pasos con iconos propios: **Compartir** (cuadrado con flecha; abajo en iPhone, arriba en iPad, con una flecha que lo señala) → **Añadir a pantalla de inicio** → **Añadir**. En Chrome, Firefox o Edge para iOS el texto se adapta a su menú; dentro del navegador de otra app (Instagram, Facebook…) sugiere abrir el enlace en Safari.
- **Computadora:** tarjeta breve «Esta app está pensada para el celular: abre este enlace en tu teléfono», con el enlace y «Copiar»; se puede continuar en el navegador.
- **«Seguir en el navegador»** (o Escape) cierra la pantalla y no vuelve a mostrarse durante **7 días** (clave `ascenso2026:instalar` en localStorage). **Ajustes → Aplicación → Instalar en el celular** la vuelve a abrir cuando se quiera.
- Si la app ya se abre instalada (`display-mode: standalone` o `navigator.standalone` en iOS), no se muestra nada de esto. Código: `js/instalacion.js` (detección, evento y preferencia) y `js/ui/instalar.js` (pantalla).

Pasos manuales, por si se necesitan:

**iPhone (Safari)**
1. Abre la dirección de la app en **Safari**.
2. Toca **Compartir** (el cuadrado con la flecha; si no lo ves, toca **⋯** y luego Compartir) → **Añadir a pantalla de inicio** → **Añadir**.
3. Abre la app desde el icono del timón. A partir de ahí úsala siempre desde ese icono.

> En iPhone, la app instalada y Safari guardan el progreso por separado. Si ya estudiaste en Safari, usa **Ajustes → Exportar progreso** allí y **Importar progreso** en la app instalada.

**Android (Chrome)**
1. Abre la dirección en **Chrome**.
2. Toca **Instalar la app** en la pantalla de instalación, o el menú **⋮** → **Instalar app** (o «Añadir a pantalla de inicio»).
3. Abre la app desde el icono.

**Cuenta y copias de seguridad.** La primera vez se ingresa (o se crea la cuenta) con internet; desde entonces la app funciona sin conexión y sincroniza el progreso con la cuenta cuando hay red. Para usarla en otro celular basta ingresar con la misma cuenta. Exportar/importar (Ajustes) sigue disponible como respaldo manual.

## 2. Usarla en la computadora

Los service workers no funcionan con `file://`: hay que servir la carpeta.

```bash
cd app
python3 -m http.server 8123
# abre http://localhost:8123/
```

## 3. Publicar en GitHub Pages

Todo usa rutas relativas (`./`), así que funciona en `https://usuario.github.io/examen-ascenso/`. La carpeta incluye `.nojekyll` para que GitHub publique los archivos tal cual.

**Opción A — contenido de `app/` en la raíz del repositorio**
1. Crea el repositorio `examen-ascenso` en GitHub (público, o privado con un plan que permita Pages).
2. Copia **el contenido** de `app/` (no la carpeta) a la raíz del repositorio y súbelo:
   ```bash
   git init && git add . && git commit -m "Ascenso 2026"
   git branch -M main
   git remote add origin https://github.com/USUARIO/examen-ascenso.git
   git push -u origin main
   ```
3. En GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, rama **main**, carpeta **/ (root)** → **Save**.
4. En uno o dos minutos la app queda en `https://USUARIO.github.io/examen-ascenso/`.

**Opción B — carpeta `/docs`** (para tener en el mismo repositorio los scripts y el banco fuente)
1. Copia el contenido de `app/` a una carpeta `docs/` en la raíz del repositorio (`cp -r app/. docs/`).
2. Sube los cambios a la rama **main**.
3. **Settings → Pages**: rama **main**, carpeta **/docs** → **Save**.

Cada vez que publiques cambios, **sube la versión** (sección 5) para que los celulares instalados se actualicen.

## 4. Actualizar el banco de preguntas

```bash
python3 scripts/construir_banco.py --salida app/data   # regenera data/banco.json y data/meta.json
python3 scripts/subir_version.py                       # sube APP_VERSION (ver sección 5)
```

Luego publica (copia a la raíz o a `docs/` según la opción elegida y haz `git push`). No edites a mano `data/*.json`.

La app se adapta al formato del banco: si `meta.json → fuentes[].items` trae ítems (Reglamentos «1.01»…, MAPLO «Cap. 1»…«Anexo A», Inglés «01»…«29»), los usa con su título y orden; si una fuente no trae ítems, agrupa sus preguntas por el campo `item` o, cuando es «-», por `tema`.

## 5. Subir la versión de la app (`APP_VERSION`)

La versión vive en dos archivos que deben coincidir:

- `app/sw.js` → `const APP_VERSION = '1.0.0';` (nombre de la caché: `ascenso2026-1.0.0`)
- `app/js/version.js` → `export const APP_VERSION = '1.0.0';` (se muestra en Ajustes → Acerca de)

La forma fácil es `python3 scripts/subir_version.py` (sube el último número: 1.0.0 → 1.0.1) o `python3 scripts/subir_version.py 1.1.0` para fijar una versión. También puedes editar ambos archivos a mano.

Qué pasa en los celulares: al abrir la app con internet, el navegador detecta que `sw.js` cambió, descarga la versión nueva en segundo plano y muestra **«Nueva versión disponible · Actualizar»**. Al tocar *Actualizar* se activa la versión nueva, se recarga la app y se borra la caché anterior. El progreso no se pierde.

Aunque olvides subir la versión, los archivos se refrescan solos en segundo plano (estrategia «caché primero y actualización en segundo plano»): el cambio se ve en la siguiente apertura. Subir la versión garantiza una actualización completa y coherente.

## 6. Cómo funciona

**Filtro base (todos los modos).** Solo preguntas del temario (`en_temario`) y verificadas. En Ajustes, *Modo ampliado* añade las de fuera del temario e *Incluir no verificadas* las que la auditoría no pudo confirmar; Ajustes muestra cuántas quedan disponibles.

**Práctica.** Orden *Aleatorio*; *No vistas* (primero todas las nunca respondidas); *Débiles* (muestreo ponderado: no vistas ×3, falladas en su último intento ×4, acertadas hace ≤ 3 días ×0.5, y más peso a los artículos con menos dominio). Las alternativas se barajan con `mulberry32(hash(id + idSesión))`: el orden es estable en la sesión y en su revisión; se guarda siempre el índice original elegido.

**Exclusiones.** Las preguntas con `excluye` (una revela la respuesta de otra) nunca salen juntas en un simulacro, una práctica ni un repaso.

**Simulacro «como el examen».**
- Reglamentos: reparto proporcional al número de ítems del temario de cada fuente, por restos mayores y con mínimo 1 por fuente (40 preguntas: PERSUPE 10, PERMAR 6, PERSUBA 5, RECERNAV 4, LEDIFA 3, MACOMAR 2, RESIN 2, DL 1138 2 y 1 de cada una de las demás). Dentro de cada fuente, mezcla ≈ 30 % fácil / 45 % media / 25 % difícil, coordinada para que el total quede en 12/18/10, y preferencia por preguntas no usadas en los 2 simulacros anteriores.
- MAPLO: 60 % del cuestionario oficial (`oficial-maplo`) y 40 % generadas, máximo 3 por ítem (o tema).
- Inglés: mezcla 35/40/25 y máximo 3 por tema.
- Las preguntas se presentan en el orden del temario. Nota vigesimal = aciertos / total × 20 (un decimal); las no respondidas cuentan como incorrectas.
- El tiempo solo corre con la app visible; si se cierra, se retoma con el tiempo que quedaba.

**Repaso (repetición espaciada).** Cada pregunta en repaso tiene una caja (0-5) y una fecha. Fallar (en cualquier modo) → caja 0 para hoy. Acertar en repaso → sube de caja y vuelve en 1, 3, 7, 14, 30 o 60 días según la caja anterior. Acertar en práctica o simulacro una pregunta de repaso ya vencida también la hace avanzar. Las marcadas con bandera entran con caja 0.

**Dominio.** Media ponderada de los últimos 5 intentos de cada pregunta (acierto 1, fallo 0; el más reciente pesa 1, luego 0.6, 0.36…). Sin intentos: «sin datos». La cobertura se muestra aparte (vistas/total).

**XP, niveles y logros.** Práctica +10/+15/+20 por acierto según dificultad y +2 por intento fallido; repaso +12 por acierto; simulacro: aciertos ×1.5 del valor de práctica + 100 si aprueba + 100 si la nota es ≥ 18; meta diaria +50; cada 7 días de racha +150. Nivel *n* desde 120·(*n*−1)·*n*/2 XP (nivel 1 = 0, nivel 2 = 120, nivel 3 = 360…), con rangos de Grumete (1-3) a Almirante (25+). Un día cuenta para la racha si se cumple la meta diaria (30 por defecto).

## 7. Cuenta y sincronización

**Acceso.** Al abrir la app sin sesión aparece la pantalla de acceso: *Ingresar* / *Registrarse* (correo, contraseña de al menos 8 caracteres con mostrar/ocultar y, al registrarse, un **apodo** único de 3-20 caracteres `[A-Za-z0-9 _.-]`), «¿Olvidaste tu contraseña?» (enlace por correo que vuelve a la app con `?code=` y pide la contraseña nueva) y un aviso de privacidad. Sin sesión y sin red se muestra «Sin conexión…». Si Supabase exige confirmar el correo, la app muestra «Revisa tu correo» y guarda el apodo para aplicarlo al primer ingreso. Con una sesión guardada (supabase-js la guarda en `localStorage['ascenso2026:auth']`) la app entra directo, **también sin conexión**.

**Primer ingreso con progreso local** (p. ej. quien usaba la v1.0): «¿Conservar el progreso de este dispositivo?» → *Conservar y subir* lo sube como estado inicial (o lo fusiona si la cuenta ya tenía progreso en la nube); *Descartar* deja el de la cuenta. Al **cerrar sesión** se intenta subir lo pendiente (si no se puede, se avisa), y se borran del dispositivo la sesión y el progreso (se conservan tema, letra, mayúsculas y sonidos). Una **cuenta bloqueada** (`esta_bloqueado()` o rechazo RLS al subir) se cierra con el mensaje «Cuenta bloqueada; contacta al administrador».

**Sincronización (offline-first).** El estado local (`estado.js`) es la fuente de verdad; cada cambio real lo marca *pendiente* y programa una subida con 20 s de retardo; además se sincroniza al terminar una práctica/simulacro/repaso, al ocultar la app (`visibilitychange`), al recuperar la conexión (`online`), al abrirla y con «Sincronizar ahora» (Ajustes) o tocando el indicador de Inicio (✓ *Sincronizado* / ⟳ *Pendiente* / *Sin conexión*). Los fallos de red nunca bloquean el estudio: se reintenta con espera exponencial (5 s, 10 s, 20 s… hasta 5 min). Metadatos en `localStorage['ascenso2026:nube']` (cuenta vinculada, `pendiente`, `ultimaSync`, cola de eventos, ranking en caché).

Algoritmo de cada sincronización (`js/sincronizacion.js`):
1. Envía la **cola de eventos** (`eventos_sesion`), cada uno con `id_cliente` único por usuario: el servidor ignora los reenvíos (`on conflict (usuario_id, id_cliente) do nothing`); un evento que el servidor rechace por datos fuera de rango se descarta para no atascar la cola.
2. Consulta solo la fecha `actualizado` del estado remoto (la pone el servidor). Si es **más nueva** que `ultimaSync`:
   - con cambios locales pendientes → **fusión por secciones** (`js/fusion.js`) y se sube el resultado;
   - sin cambios pendientes → se **adopta el remoto** (si hay una sesión de estudio abierta en pantalla se conservan las sesiones locales).
3. Si hay cambios pendientes (o la cuenta aún no tiene estado), **sube** el estado completo (`upsert` en `estado_progreso`) y guarda la nueva `actualizado` como `ultimaSync`. Si hubo cambios durante la subida, sigue pendiente.

**Fusión por secciones** (`fusionar(local, remoto)`):

| Sección | Regla |
|---|---|
| `p` (progreso por pregunta) | Por cada id, base = registro con el intento más reciente (`u`): su SRS, marca, etc. Historiales unidos: parte común + intentos propios de cada lado (`n` y `a` se suman sin contar dos veces la parte común). Si algún historial ya está recortado a 10, `n` y `a` = máximo y `h` = el más reciente. |
| `sims` | Unión por `id`, ordenados por fecha. |
| `dias` | Unión por fecha; el mismo día: máximo de `r`, `a` y `xp`; `meta` si cualquiera la cumplió (la racha resultante es la mayor). |
| `xp`, `cont` | Máximo (campo a campo en `cont`). |
| `logros`, `fuentesDominadas` | Unión, con la fecha más antigua. |
| `ajustes`, `config`, `sesiones`, `ultimoResumen`, `ultimaExportacion` | Los locales. |

Limitación conocida: como en toda fusión sin historial de cambios, un «Reiniciar progreso» hecho en un dispositivo mientras otro tenía cambios sin subir no borra lo del otro (la fusión une).

**Eventos.** Al terminar una práctica, simulacro o repaso se registra `{tipo, examen (null si es mixto), inicio, fin, n, aciertos, nota (simulacro), duracion_s, id_cliente}`; sin red quedan en la cola persistente.

**Ranking** (Más → Ranking y tarjeta en Inicio): top 50 por XP o por nota promedio de simulacros, con posición, apodo, XP, nota y racha; la fila propia se resalta (y se añade aunque quede fuera del top). Sin apodo, invita a elegirlo. Se actualiza al abrir, con el botón o tirando hacia abajo; sin red muestra la última copia.

**Rutas JSON del estado que usa el servidor** (`ranking()` y `admin_usuarios()` en `backend/schema.sql`; deben mantenerse coherentes con `js/estado.js`):

| Dato | Ruta en `estado_progreso.estado` | Cálculo |
|---|---|---|
| XP | `estado.xp` | entero |
| Nivel | desde `estado.xp` | nivel *n* si 60·(n−1)·n ≤ xp < 60·n·(n+1) (igual que `nivelDe()`) |
| Racha | `estado.dias["AAAA-MM-DD"].meta = 1` | días consecutivos con meta que terminan hoy o ayer (fecha de Lima) |
| Preguntas respondidas | `estado.cont.respondidas` | entero |
| Simulacros | `estado.sims` (longitud) y `eventos_sesion` tipo `simulacro` | el mayor |
| Nota promedio | `eventos_sesion.nota` (simulacros); si no hay, `estado.sims[*].nota` | 1 decimal |
| Actividad diaria | `estado.dias["AAAA-MM-DD"].r` y `eventos_sesion` | preguntas = máximo de ambos; sesiones = eventos |

## 8. Administración

Solo para la cuenta con `rol = 'admin'` (el correo del dueño, `marconavy2510@gmail.com`, lo recibe automáticamente al registrarse). La entrada aparece en **Más → Administración** (`#/admin`) y en Ajustes → Cuenta; a los demás no se les muestra, y aunque entren a `#/admin` ven «Acceso restringido»: el servidor rechaza las funciones `admin_*` con 403.

- **Resumen**: usuarios registrados, activos hoy y en 7 días (con preguntas o sesiones), sesiones hoy, simulacros totales y bloqueados.
- **Tabla de usuarios** (deslizable, ordenable tocando el encabezado, con buscador por correo/apodo): correo, apodo, último ingreso, XP, nivel, racha, preguntas, simulacros, nota promedio y estado; acciones **Bloquear/Desbloquear** (no puedes bloquearte a ti mismo) y **Detalle** (`#/admin/usuario/<id>`: cifras, mapa de calor de 12 semanas y sesiones recientes).
- **Exportar CSV** de usuarios y de eventos (UTF-8 con BOM, separador coma; se abre en Excel).
- **Diagnóstico** (`#/diagnostico`, también para cualquier usuario desde Ajustes → Cuenta): configuración, red, Auth (`/auth/v1/health`), sesión, REST y versión del esquema (`version_esquema()`), RLS activado en las 4 tablas (`diagnostico_esquema()`), aislamiento (solo se ve el perfil propio) y permisos de las funciones de administración.

Pasos en el dashboard de Supabase: `backend/INSTRUCCIONES_SUPABASE.md`.

## 9. Datos y privacidad

El progreso se guarda en el navegador (`localStorage['ascenso2026:estado']`, con escritura diferida y guardado inmediato al ocultar la app) y se sincroniza con la cuenta en Supabase. En el servidor se guardan: correo, apodo, el estado de estudio, las sesiones terminadas y la fecha de los ingresos (como mucho uno cada 6 h). Cada usuario solo puede leer y escribir lo suyo (RLS); el administrador lo consulta mediante funciones del servidor; en el ranking solo se ve el apodo, XP, nota promedio y racha. La clave de la app (`publishable key`) es pública por diseño; la seguridad está en las políticas RLS. Si el navegador no permite guardar (modo privado), la app sigue funcionando en memoria y lo avisa.

## 10. Estructura

```
index.html              página única: carga js/main.js
manifest.webmanifest    datos de instalación (nombre, iconos, colores)
sw.js                   service worker: precache con versión y actualización en segundo plano
css/estilos.css         estilos (tema oscuro/claro con variables CSS)
js/main.js              arranque, sesión, rutas y navegación inferior
vendor/supabase.js      @supabase/supabase-js v2.117.3 (UMD local → window.supabase)
js/config-supabase.js   URL y publishable key del proyecto (sustituibles para pruebas)
js/nube.js              envoltorio de Supabase: cuenta, estado, eventos, ranking, admin, diagnóstico
js/sincronizacion.js    sincronización offline-first (pendiente, cola, reintentos)
js/fusion.js            fusión por secciones del estado local y remoto
js/cuenta.js            flujo de la cuenta: tras ingresar, cerrar sesión, expulsar, apodo
js/bus.js               avisos internos (fin de sesión de estudio)
js/router.js            enrutador por hash (#/inicio, #/practica, …)
js/datos.js             carga del banco, índices, grupos, filtro base, barajado y búsqueda
js/estado.js            estado persistente, migraciones, exportar/importar
js/seleccion.js         selección de práctica, composición del simulacro y cola de repaso
js/srs.js               repetición espaciada (cajas e intervalos)
js/gamificacion.js      XP, niveles, meta diaria, racha y logros
js/estadisticas.js      dominio y resúmenes
js/consultas.js         consultas combinadas para las vistas
js/sesion.js            sesiones en curso (práctica/repaso y simulacro)
js/sw-registro.js       registro del SW y aviso de nueva versión
js/instalacion.js       ¿instalada?, plataforma, beforeinstallprompt y «Seguir en el navegador» (7 días)
js/ui/instalar.js       pantalla «Instalar con un toque» (Android, iPhone/iPad, escritorio)
js/version.js           APP_VERSION visible
js/util.js              fechas locales, azar con semilla, formato
js/ui/vista-*.js        una vista por pantalla (acceso, ranking, admin y diagnóstico incluidas)
js/ui/csv.js            exportación CSV (Blob)
js/ui/*.js              componentes: modal, toast, anillo, gráfico, mapa de calor, iconos…
data/                   banco.json y meta.json (generados por scripts/construir_banco.py)
iconos/                 iconos PNG y SVG (generados por scripts/generar_iconos.py)
_capturas/              capturas de las pruebas (no se precargan)
INFORME_PRUEBAS.md      resultado de las pruebas automáticas
```

Iconos: `python3 scripts/generar_iconos.py` los vuelve a generar con Pillow (timón dorado sobre azul marino; diseño propio, sin emblemas oficiales).

## 11. Pruebas

```bash
cd pruebas
npm install          # instala Playwright 1.56 (usa el Chromium ya instalado)
node pruebas.mjs     # escenarios de las especificaciones (01 y 02), capturas e INFORME_PRUEBAS.md
node mock-supabase.mjs           # solo el servidor simulado de Supabase (puerto 54321)
node verificar_composicion.mjs   # solo la verificación de la composición del simulacro
node unitarias.mjs               # solo la lógica: niveles, racha, SRS, XP, nota y migración
```

`pruebas.mjs` levanta `pruebas/mock-supabase.mjs` (emula GoTrue y PostgREST con las mismas reglas que el esquema: 401/403 al violarlas) y apunta la app a él con `localStorage['ascenso2026:supabase'] = {"url": …, "key": …}`. Los escenarios de la nube están en `pruebas/escenarios_nube.mjs`. El esquema SQL se prueba en un PostgreSQL 16 local con `backend/pruebas_schema.sql` (salida en `backend/pruebas_schema.out`).

## 12. Limitaciones conocidas

- Las pruebas automáticas usan Chromium; la instalación en iPhone (Safari) debe verificarse en un dispositivo real.
- La conexión con el Supabase real solo se verificó con el servidor simulado y con PostgreSQL local; tras publicar, usa **Ajustes → Diagnóstico de conexión**.
- El banco fue generado a partir del temario oficial y de bancos previos, y verificado por auditoría. Ante cualquier duda, contrasta con el reglamento o manual vigente.
