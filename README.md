# Ascensos 2027 — Simulador de examen (PWA)

Aplicación web instalable para estudiar los tres exámenes de ascenso de 40 preguntas con 5 alternativas: **Reglamentos**, **MAPLO** e **Inglés**. Funciona **sin conexión** en el celular (iPhone y Android) una vez instalada.

- **Práctica** con explicación inmediata, por examen, fuente, artículo, dificultad y orden (aleatorio, no vistas primero o débiles primero).
- **Simulacro** cronometrado «como el examen» (reparto por fuente según el temario), con rejilla 1-40, entrega automática, nota vigesimal y revisión.
- **Repaso** inteligente con repetición espaciada (1, 3, 7, 14, 30 y 60 días).
- **Explorar**: fichas por artículo y buscador de texto.
- **Progreso**: dominio, evolución de notas, actividad de 12 semanas y puntos débiles.
- **Gamificación**: XP, niveles con rangos navales, meta diaria, racha y 20 logros.
- **Cuenta** con correo y contraseña (v1.1.0): el progreso se **sincroniza** entre dispositivos (offline-first), **ranking** por apodo y **panel de administración** (ver secciones 7 y 8).
- **Instalar con un toque** (v1.2.0): quien abre el enlace en el celular sin la app instalada ve primero una pantalla que lo guía (botón nativo en Android, guía de 3 pasos en iPhone; ver sección 1).
- **Prueba gratis y pago único** (v1.3.0): cada cuenta nueva estudia gratis hasta un límite (por defecto 50 preguntas y 1 simulacro); luego la app pide un pago único de S/ 20 por Yape o Plin con voucher y número de operación, que el administrador verifica desde el panel (ver sección 9).
- **Respaldo y restauración** (v1.4.0): el administrador descarga desde el panel un respaldo completo de los datos del servidor en un archivo JSON y puede restaurar el progreso de un usuario desde ese archivo, con vista previa y «Deshacer» (ver sección 10).
- **Roles, cuentas y privacidad** (v1.5.0): nombre y apellido obligatorios (solo los ven el administrador y el verificador), **ranking opcional** con modo oculto, dos niveles de administración (**administrador** y **verificador**, que solo ve Pagos) y **papelera de cuentas de 30 días** con restauración y purga definitiva (ver sección 11).
- Desde la v1.3.0 **se necesita una cuenta para estudiar**: sin sesión solo se ve la pantalla de acceso.
- Sitio estático: HTML, CSS y JavaScript (módulos ES). Única dependencia: copia local de `@supabase/supabase-js` en `vendor/` (sin CDN). El backend es Supabase (`backend/schema.sql`).

---

## 1. Instalarla en el celular

La primera vez se necesita internet para descargar el banco (unos 2 MB). Después funciona sin conexión.

**Desde la v1.2.0 la app guía la instalación («Instalar con un toque»).** Basta compartir el enlace (`https://ascenso-naval.github.io/examen-ascenso/`): quien lo abre en el celular sin tener la app instalada ve primero una pantalla de instalación con la paleta de la app:

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
   git init && git add . && git commit -m "Ascensos 2027"
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

Desde la v1.4.1 la app busca una versión nueva cada vez que vuelve a primer plano o recupera la conexión (como mucho una vez cada 5 minutos), y **Ajustes → Aplicación** muestra la versión instalada y el botón **«Buscar actualización»**: si hay una versión nueva aparece el aviso «Nueva versión disponible · Actualizar»; si no, «Ya tienes la última versión (x.y.z)»; sin red, «Sin conexión». En la v1.4.1 el nombre visible pasó a **«Ascensos 2027»**; los identificadores internos (claves `ascenso2026:*` de localStorage, `app: 'ascenso2026'`, caché `ascenso2026-<versión>`, formato `ascenso2026-respaldo` y nombres de archivo exportados) no cambian, para que nadie pierda su progreso.

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
- Desde la v1.3.0 el panel tiene pestañas: **Usuarios** (lo anterior, más la columna *Plan* y «Marcar plan»), **Pagos** y **Cobro** (ver sección 9); desde la v1.4.0, también **Respaldo** (ver sección 10). El CSV de usuarios añade `plan`, `preguntas_prueba`, `simulacros_prueba` y `pagado_en`.
- Desde la **v1.5.0**, Usuarios trae además **Nombre**, **Apellido** y **Rol** con las acciones de rol, **«Eliminar cuenta»** y la sección **Papelera**, y hay un segundo nivel de administración (**verificador**, que solo ve Pagos): todo en la **sección 11**. El CSV de usuarios añade `nombre`, `apellido`, `ranking_visible`, `eliminado_en` y `eliminado_motivo`.
- **Diagnóstico** (`#/diagnostico`, también para cualquier usuario desde Ajustes → Cuenta): configuración, red, Auth (`/auth/v1/health`), sesión, REST y versión del esquema (`version_esquema()`), RLS activado en las 4 tablas (`diagnostico_esquema()`), prueba gratis y pagos (`pagos_ok`), respaldo y restauración (`respaldo_ok`, esquema 1.3.0), **cuenta y roles** (`cuenta_ok`, esquema 1.4.0: roles, nombre y apellido, papelera y bitácora de respaldos), aislamiento (solo se ve el perfil propio) y permisos de las funciones de administración.

Pasos en el dashboard de Supabase: `backend/INSTRUCCIONES_SUPABASE.md`.

## 9. Prueba gratis y pago

Requiere el esquema **1.2.0** en Supabase (`backend/schema.sql`: funciones `estado_acceso`, `registrar_consumo`, `registrar_pago`, `admin_pagos`, `admin_resolver_pago`, `admin_marcar_plan`, `admin_configurar_pago` y el bucket privado `comprobantes`). La app lo comprueba en **Ajustes → Diagnóstico de conexión** («Prueba gratis y pagos»).

**Cómo funciona (para el usuario)**
- Toda cuenta empieza en **prueba**: Inicio muestra un indicador discreto «Prueba gratis: 32 de 50 preguntas · 0 de 1 simulacro». Cuentan las respuestas de práctica y repaso, cada ficha revelada en **Explorar** (una vez por pregunta mientras se esté en Explorar; allí se avisa «Cada respuesta que reveles cuenta para tu prueba gratis») y los simulacros entregados.
- Al llegar a cualquiera de los dos límites aparece una **pantalla completa que no se puede cerrar**: monto (S/ 20, pago único y de por vida), los números de Yape y/o Plin con su titular, el número en grande con **«Copiar número»** (el botón confirma «¡Copiado!»), y el formulario: **1) captura del voucher** (se reduce en el celular a JPEG de máx. 1280 px y ≤ 1 MB) y **2) número de operación** (6 a 12 dígitos). «Enviar comprobante» se habilita cuando están ambos. Si la prueba se agota en medio de una práctica, primero se ve la explicación de la última respuesta; los resultados de un simulacro recién entregado también se pueden ver.
- Al enviar, la captura sube a `comprobantes/<id de la cuenta>/<marca de tiempo>.jpg` (almacenamiento privado) y la cuenta queda **«Pago en revisión»** (operación, fecha y miniatura) con **«Corregir»** (el nuevo comprobante reemplaza al anterior, no se duplica). Si el administrador lo **rechaza**, se muestra el motivo y el formulario para reintentar. Cuando lo **verifica**, la app se desbloquea sola (consulta cada 60 s mientras está abierta y al volver a abrirla) con una pantalla breve de agradecimiento.
- Desde el bloqueo solo se puede **«Cerrar sesión»** o ir a **«Mi cuenta»** (Ajustes → Cuenta, que muestra el plan). Sin conexión el bloqueo se mantiene (se usa el último estado conocido más lo respondido en el dispositivo) y avisa que enviar el comprobante requiere internet.
- El administrador y las cuentas en **cortesía** o **pagadas** no tienen límites. Un mismo número de operación no puede usarse en dos cuentas.

**Configurar los números de pago (administrador).** Más → Administración → pestaña **Cobro**: número y titular de Yape, número y titular de Plin (9 dígitos; vacío desactiva ese medio), monto, límite de preguntas, límite de simulacros y texto de ayuda (se muestra debajo de los números; p. ej. un WhatsApp de contacto). «Guardar configuración» envía solo los campos cambiados (`admin_configurar_pago`). Los números nunca están en el código.

**Verificar un pago (administrador).** Más → Administración muestra un contador dorado con los pagos pendientes. Pestaña **Pagos** → filtro *Pendientes / Verificados / Rechazados*. Cada tarjeta trae apodo, correo, medio, número de operación, monto, fecha y la miniatura del voucher (toca para ampliarla; URL firmada de 10 min). Compara el voucher y el número de operación con el historial de tu Yape o Plin y toca **«Verificar y desbloquear»** (pide confirmación) o **«Rechazar»** (motivo obligatorio, hasta 300 caracteres, que el usuario verá). En la pestaña **Usuarios** la columna *Plan* muestra el plan y el consumo de la prueba, y **«Marcar plan»** permite pasar una cuenta a **cortesía**, **pagado** o **prueba** (con confirmación).

**Detalles técnicos** (`js/acceso.js`, `js/ui/vista-bloqueo.js`):
- Fuente de verdad: Supabase (`estado_acceso()`). El dispositivo guarda el último estado conocido y el consumo aún no enviado en `localStorage['ascenso2026:acceso']`.
- El consumo se envía con `registrar_consumo` en lotes: al juntar 10 preguntas, al entregar un simulacro, al agotarse la prueba, al ocultar la app, al reconectar y al cerrar sesión. `estado_acceso` se consulta al ingresar/abrir, al reconectar, al volver al primer plano y tras cada simulacro; con el plan «pendiente», además cada 60 s.
- Enganches del consumo: `registrarRespuesta()` de `js/gamificacion.js` emite `respuesta-registrada` (práctica y repaso), `js/ui/vista-explorar.js` lo emite con `modo: 'explorar'` al revelar por primera vez una ficha, y `entregarSimulacro()` emite `sesion-terminada` con `tipo: 'simulacro'` (ambos por `js/bus.js`).
- Mientras la prueba está agotada, el enrutador desvía a Inicio las rutas de estudio (Práctica, Simulacro, Repaso, Explorar) y la pantalla de bloqueo cubre todo salvo Ajustes, Diagnóstico y los resultados ya obtenidos.

**Mejora futura:** subir la imagen del QR oficial de Yape/Plin desde el panel (hoy la pantalla de pago muestra solo el número, el titular y «Copiar número»).

## 10. Respaldo y restauración

Requiere el esquema **1.3.0** en Supabase (`backend/schema.sql` §6.c: `admin_respaldo_resumen`, `admin_respaldo`, `admin_restaurar_estado`, `admin_deshacer_restauracion`, `admin_restaurar_perfil` y la tabla `estado_progreso_historial`). La app lo comprueba en **Ajustes → Diagnóstico de conexión** («Respaldo y restauración»). El plan gratis de Supabase no hace copias: **el respaldo lo hace el administrador desde la app**. Regla: **respalda antes de cada cambio de esquema y una vez por semana.**

**Dónde.** Más → Administración → pestaña **Respaldo** (`#/admin?tab=respaldo`). Arriba, el aviso fijo «Respalda antes de cambiar el esquema y una vez por semana» y el resumen: filas por tabla (perfiles, progreso, sesiones, ingresos, pagos y configuración de cobro), tamaño estimado, número de vouchers y la **última descarga** hecha en ese dispositivo (`localStorage['ascenso2026:admin:ultimo-respaldo']`). Si nunca se descargó o pasaron **más de 7 días**, la pestaña muestra un aviso ámbar «!» y Más → Administración la etiqueta **«Respaldo»**.

**Descargar respaldo.** El botón **«Descargar respaldo»** pide todas las tablas por páginas con `admin_respaldo` (200 filas por página; 50 en `estado_progreso`, que pesa más) con una barra de progreso por tabla. Si una página falla por la red, se reintenta (hasta 3 veces, con espera creciente). Las filas se deduplican por clave primaria y se comprueba que cada tabla trae tantas filas como su total; si no cuadra, se vuelve a pedir esa tabla una vez y, si sigue sin cuadrar, se descarga igual con un aviso que indica la tabla y la diferencia (repite el respaldo en unos minutos). El archivo `ascenso2026-respaldo-AAAA-MM-DD-HHMM.json` contiene:

```
{ formato: 'ascenso2026-respaldo', version: 1, version_esquema, version_app, generado_en,
  resumen,                                   // lo que devolvió admin_respaldo_resumen()
  verificacion: { <tabla>: {filas, total, ok} },
  tablas: { perfiles, estado_progreso, eventos_sesion, ingresos, pagos, configuracion_pago },
  vouchers: [ rutas distintas de pagos.captura_path ] }
```

Las filas van completas (incluidos rol, bloqueado, plan, contadores, `pagado_en`, `aprobado_por`). Las **imágenes de los vouchers no van** en el archivo, solo sus rutas en el bucket `comprobantes` (descargarlas aparte es una mejora futura). En iPhone, si el sistema permite compartir archivos, aparece además **«Compartir»** (Guardar en Archivos, AirDrop, correo…). Guarda el archivo fuera del celular. Al terminar se anota la fecha y desaparece el aviso de 7 días.

**Restaurar el progreso de un usuario.** En la misma pestaña: **«Elegir archivo de respaldo»** → la app valida el archivo (formato `ascenso2026-respaldo`, versión 1, tablas bien formadas; un progreso exportado desde Ajustes o cualquier otro JSON se rechaza) → lista las cuentas del respaldo (apodo, correo, XP, preguntas y fecha del progreso) cruzadas por id con las cuentas actuales. Una cuenta que ya no existe aparece como **«Sin cuenta actual»** y no se puede restaurar desde la app (habría que recrearla y restaurar por SQL, ver `backend/INSTRUCCIONES_SUPABASE.md`). Al **elegir** una cuenta se ve la **vista previa**: XP, preguntas, fecha, plan, apodo y contadores de la prueba del respaldo frente a los actuales, con la nota «El celular del usuario adoptará el progreso restaurado. Si tenía más progreso que el respaldo, ese avance quedará solo en la copia del servidor y se recupera con «Deshacer»». Es lo que hace la sincronización (`js/sincronizacion.js`): al ver en la nube un estado más reciente, el celular lo **adopta entero**; solo si tiene cambios sin subir lo combina con los suyos (fusión por máximo). Si la cuenta tiene **hoy más XP o más preguntas** que el respaldo, la vista previa muestra además una **advertencia ámbar** con las cifras, que se repite en la confirmación. La casilla **«También plan, apodo y contadores de prueba»** restaura además esos datos del perfil (`admin_restaurar_perfil`; nunca el rol ni el bloqueo; el plan «En revisión» no se restaura: se resuelve en Pagos). **«Restaurar progreso»** pide confirmación y llama a `admin_restaurar_estado`, que guarda antes una copia del estado actual en el historial del servidor. El aviso de éxito trae **«Deshacer»** (`admin_deshacer_restauracion`: vuelve a la copia anterior), disponible mientras sigas en la pestaña Respaldo; pide confirmación. Deshacer devuelve el progreso, no el plan/apodo/contadores (esos se cambian desde Usuarios). Cómo se comporta:
- Devuelve **exactamente** el estado que había antes de restaurar. Lo que el usuario estudie **después** de la restauración no se combina: el estado de ese momento se guarda en el historial del servidor (`estado_progreso_historial`, motivo «deshacer») y queda **solo ahí**. Por eso la confirmación de «Deshacer» avisa si la cuenta tiene **actividad posterior a la restauración** (compara la última actividad de `admin_usuarios` con la hora de la restauración, que la app guarda en memoria mientras sigas en la pestaña).
- Con **dos restauraciones seguidas** de la misma cuenta, «Deshacer» vuelve al estado **intermedio** (el que dejó la primera restauración), no al de antes de ambas; la copia más antigua sigue en el historial (consulta SQL en `backend/INSTRUCCIONES_SUPABASE.md` §8.4).
- Si la cuenta **no tenía progreso** en la nube antes de restaurar, deshacer lo deja sin progreso y el resultado lo indica: «La cuenta no tenía progreso guardado antes; el celular volverá a subir el suyo al sincronizar». Todo queda registrado como evento «Restauración» en el detalle del usuario.

**Restaurar TODO** (si se perdiera el proyecto de Supabase): proyecto nuevo → `backend/schema.sql` → `scripts/restaurar_respaldo.py` genera el SQL de inserción desde el JSON (ver `backend/INSTRUCCIONES_SUPABASE.md`, «Respaldo y restauración»).

Archivos: `js/respaldo.js` (paginación, deduplicación, verificación, armado y validación del archivo, aviso de 7 días) y `js/ui/admin-respaldo.js` (la pestaña).

## 11. Roles, cuentas y privacidad

Desde la **v1.5.0** (esquema **1.4.0**: `backend/schema.sql` §6.d). La app lo comprueba en **Ajustes → Diagnóstico de conexión** («Cuenta y roles»). Regla madre: **nada elimina información de usuarios** sin paso por la papelera de 30 días.

**Nombre y apellido (obligatorios).** El registro pide **Nombre** y **Apellido** además del correo, la contraseña y el apodo, con el aviso «Tu nombre y apellido solo los ve el administrador para verificar tu pago. Los demás usuarios solo ven tu apodo». Se envían como **metadatos del alta** (el trigger `manejar_nuevo_usuario` los guarda) y, por si el metadato no llegara, la app los confirma con `completar_datos()` al primer ingreso. Las **cuentas creadas antes de la v1.5.0** los completan al siguiente ingreso en la pantalla **«Completa tus datos»**, que **no se puede saltar**: no tiene botón de cerrar, ni «Más tarde», ni salida sin conexión. Solo se cierra cuando `completar_datos()` los confirma en el servidor; **sin conexión avisa y se queda abierta** («se cerrará en cuanto vuelva el internet»), y si la app se abre sin red con los datos pendientes vuelve a exigirse (el dispositivo recuerda la marca `datosPendientes` de la última vez que habló con el servidor). Se pueden corregir en **Ajustes → Cuenta**. Validación: 2 a 60 caracteres, sin los signos `<` ni `>`.

**Ranking opcional.** `perfiles.ranking_visible` vale `null` mientras no se haya preguntado. La app pregunta **«¿Quieres aparecer en el ranking?»** con dos botones (*Sí, aparecer* / *No, permanecer oculto*): en el **mismo paso que elegir el apodo** cuando la cuenta todavía no tiene apodo, y en una **pantalla breve propia** cuando ya lo tenía (el caso de quien se acaba de registrar y de las cuentas antiguas). Se cambia cuando se quiera con el conmutador **«Aparecer en el ranking»** de Ajustes → Cuenta.
- **Modo visible:** como siempre (apodo, XP, nota promedio, racha y la fila propia resaltada).
- **Modo oculto:** el ranking encabeza con «**Estás en modo oculto: los demás no te ven. Estarías en el puesto N**» y la lista va **sin la fila propia**; nadie más te ve. La posición *N* la calcula el servidor como si participaras, sin desplazar a los demás (los ocultos no ocupan puesto). En Inicio, la tarjeta dice «Modo oculto: estarías en el puesto N».

**Dos niveles de administración.**

| Rol | Qué puede hacer |
|---|---|
| **Usuario** | Estudiar. No ve el panel. |
| **Verificador** | En Más → Administración ve **solo la pestaña Pagos** (con el contador de pendientes): ve el apodo, el nombre, el correo, el medio, el número de operación, el monto y **la imagen del voucher** (miniatura y ampliada, con la misma URL firmada que el administrador), y **verifica o rechaza** pagos. Las demás pestañas no se le muestran y las RPC de administrador le responden 403 (`42501`). |
| **Administrador** | Todo: usuarios, roles, pagos, cobro, respaldo, papelera y CSV. |

El correo del dueño (`marconavy2510@gmail.com`) recibe el rol admin al registrarse. En **Usuarios**, cada fila trae **Nombre**, **Apellido** y **Rol**, y las acciones **«Hacer verificador»**, **«Hacer administrador»** y **«Volver a usuario»**, cada una con confirmación. El servidor impone dos reglas y la app muestra su mensaje tal cual: **nadie cambia su propio rol** (que lo haga otro administrador) y **la base nunca queda sin administradores activos** (primero nombra a otro). Cada cambio deja el evento `rol_cambiado` en la bitácora del usuario.

**Eliminar una cuenta (papelera de 30 días).** En Usuarios, **«Eliminar cuenta»** abre un modal con el **motivo obligatorio** (hasta 300 caracteres) y el aviso «Podrás restaurarla durante 30 días». Al confirmar:
- la cuenta **deja de entrar a la app al instante**, aunque su sesión siga válida: al abrirla (o al sincronizar) se cierra con «**Cuenta eliminada; contacta al administrador**», y tampoco puede volver a ingresar;
- **no se borra nada**: solo se marcan `eliminado_en`, `eliminado_por` y `eliminado_motivo` (evento `cuenta_eliminada`);
- desaparece de la tabla de usuarios activos, del **ranking** y de **Pagos** (en los dos casos lo excluye el **servidor**: `admin_pagos()` lleva `and p.eliminado_en is null`, y lo mismo vale con la sesión de un verificador; el panel conserva el cruce con `admin_usuarios()` solo como defensa de una base sin actualizar). Sus pagos **no se borran**: siguen en la tabla y en el respaldo, y vuelven a verse al restaurar la cuenta. Mientras esté en la papelera, `admin_resolver_pago()` tampoco deja resolverlos: responde «No se puede resolver este pago: la cuenta está en la papelera; restáurala primero.» (`22023`) y la app muestra ese mensaje tal cual sin cambiar nada. La cuenta pasa a la sección **Papelera** (apodo, nombre, correo, **fecha**, **motivo** y **días restantes**), con el botón **«Restaurar»** (confirmación; vuelve con su progreso, su plan y sus pagos intactos, evento `cuenta_restaurada`).

**Purga definitiva.** Al abrir la pestaña **Usuarios** la app llama a `admin_purgar_papelera()` (**purga perezosa**, sin tareas programadas). Las cuentas con **más de 30 días** en la papelera se borran de verdad: antes se guarda una **copia completa** en `cuentas_purgadas` (el último rastro, que no se consulta desde la app) y se borran sus pagos, sesiones, ingresos, progreso, historial y vouchers. Si purgó algo, aparece un **toast** con el número. Nadie puede adelantar la purga: el servidor rechaza un plazo menor que 30 días (`22023`). Cuando el rol de la base **no puede borrar en `auth.users`** (lo normal en Supabase), el perfil queda marcado `purga_pendiente_auth` y el panel avisa de cuántas cuentas hay que borrar a mano en **Supabase → Authentication → Users** (instrucciones en `backend/INSTRUCCIONES_SUPABASE.md` §9).

**Aviso de respaldo (ahora con el servidor).** El aviso de «hace más de 7 días» usa `admin_ultimo_respaldo()`, que incluye también el **respaldo automático del Mac** y los manuales, con copia en `localStorage['ascenso2026:admin:ultimo-respaldo-servidor']`. La pestaña Respaldo muestra «**Último respaldo: 14-oct 20:00 (Mac)**» y, debajo, la última descarga hecha en ese dispositivo. **«Descargar respaldo»** deja constancia con `admin_registrar_respaldo('app', …)` (fecha, tamaño y resumen).

**Quién ve qué.** `ranking()` **nunca** devuelve nombre, apellido ni correo: un usuario normal no puede ver los datos personales de nadie (RLS solo le deja su propia fila, y `admin_usuarios`/`admin_pagos` le responden 403). El **nombre y el apellido** los ven el **administrador** (Usuarios, detalle, CSV) y el **verificador** (en las tarjetas de Pagos, para comparar con el voucher). El cliente solo puede escribir `apodo`, `nombre` y `apellido` de su propia fila: `ranking_visible` y la papelera van por RPC (privilegio de columna + trigger `proteger_perfil`).

**La app no da por supuesto ningún privilegio que el servidor niegue: cuando el servidor dice no, lo muestra.** La imagen del voucher se pide con `createSignedUrl()`; si alguna vez el servidor la negara (una base con la política `comprobantes_select_dueno_o_admin` sin actualizar, un objeto que ya no está), la tarjeta del pago muestra **«Imagen no disponible»** con el motivo y, al verificador, un aviso con qué datos puede verificar igual (medio, número de operación y monto). Lo mismo con los errores de `admin_resolver_pago()`: el mensaje del servidor se muestra tal cual en un toast y el pago se queda como estaba.

Archivos: `js/cuenta.js` (pantallas obligatorias y pregunta del ranking), `js/ui/admin-cuentas.js` (columnas, acciones de rol, modal de eliminación y la papelera), `js/ui/vista-admin.js` (orquesta, purga, voucher y mensajes del servidor en Pagos), `js/ui/vista-ranking.js` (modo oculto) y `js/ui/vista-ajustes.js` (Cuenta).

## 12. Datos y privacidad

El progreso se guarda en el navegador (`localStorage['ascenso2026:estado']`, con escritura diferida y guardado inmediato al ocultar la app) y se sincroniza con la cuenta en Supabase. En el servidor se guardan: correo, apodo, **nombre y apellido** (desde la v1.5.0), el estado de estudio, las sesiones terminadas, la fecha de los ingresos (como mucho uno cada 6 h) y, desde la v1.3.0, el plan de acceso con el consumo de la prueba y los comprobantes de pago (medio, número de operación y la captura del voucher en un almacenamiento privado que solo ven el dueño y quien verifica pagos: administrador o verificador). Cada usuario solo puede leer y escribir lo suyo (RLS); el administrador lo consulta mediante funciones del servidor; en el ranking solo se ve el apodo, XP, nota promedio y racha, **y solo de quien eligió aparecer** (ver sección 11). El nombre y el apellido solo los ven el administrador y el verificador. Para borrar una cuenta se pide al administrador: la elimina al instante y puede restaurarla 30 días; después se purga de forma definitiva dejando una copia en `cuentas_purgadas`. La clave de la app (`publishable key`) es pública por diseño; la seguridad está en las políticas RLS. Si el navegador no permite guardar (modo privado), la app sigue funcionando en memoria y lo avisa.

**Quién decide tu acceso (v1.5.1).** Lo que hay en el celular es una **caché**, no un permiso. Con internet, el acceso al estudio (si la prueba gratis se agotó, si tu cuenta está pagada o es de cortesía) lo dice **siempre** el servidor: la app consulta `estado_acceso()` al abrir, al recuperar la conexión y al volver a primer plano, y manda esa respuesta. Lo guardado en `localStorage` (`ascenso2026:acceso`, `ascenso2026:nube`) solo sirve **sin conexión** y únicamente si el propio servidor lo confirmó antes en ese celular para esa cuenta (cada respuesta deja una marca con la fecha y el identificador de la cuenta). Si nunca se pudo confirmar y no hay internet, la app se bloquea con el aviso **«Sin conexión: no se pudo verificar tu acceso»** hasta que vuelva la red; editar el `localStorage` a mano (poner `rol: admin` o `plan: pagado`) no desbloquea nada y el consumo de la prueba se registra y se envía igual, porque quien decide si cuenta es el servidor. En la misma línea: la sustitución del backend para pruebas (`ascenso2026:supabase`) solo se acepta hacia `localhost`, `127.0.0.1` o `*.supabase.co`; el diagnóstico de conexión nunca muestra un trozo de la clave; el voucher se rechaza si pesa más de 10 MB o tiene más de 12 megapíxeles; y un archivo de respaldo se rechaza si pasa de 50 MB o no tiene el formato `ascenso2026-respaldo` (con cada progreso como objeto de menos de 2 MB).

**Mientras se comprueba, no hay acceso (v1.5.1, ronda 2).** Al abrir la app con internet, la caché del celular **no decide nada**: hasta que llega la respuesta de `estado_acceso()` la app se queda en **«Comprobando tu acceso…»** y no monta ninguna pantalla de estudio (si el servidor tarda más de 8 s, la app sigue, pero el estudio continúa bloqueado hasta que responda). La marca de «esto lo confirmó el servidor» que permite estudiar sin conexión va atada al **inicio de sesión actual** (se toma del token que firma el servidor): una marca de otra cuenta, de otro celular o de una sesión anterior no vale, y **caduca a los 30 días** (hay que conectarse otra vez). El voucher se rechaza por peso y por megapíxeles **antes de decodificar la imagen** (las dimensiones se leen de la cabecera del archivo). Límite conocido y asumido: quien abre las herramientas del navegador en su propio celular puede fabricar esa marca y estudiar **sin conexión** —desde el navegador no hay forma de evitarlo sin que el servidor firme su respuesta—, pero el consumo se sigue contando y se envía al reconectar, y toda operación de verdad (pagos, datos de otras cuentas, administración) la decide el servidor con RLS.

## 13. Estructura

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
js/cuenta.js            flujo de la cuenta: tras ingresar, cerrar sesión, expulsar, apodo,
                        «Completa tus datos» y la pregunta del ranking (v1.5.0)
js/acceso.js            prueba gratis: estado de acceso, consumo en lotes, sondeo del pago (v1.3.0)
js/ui/vista-bloqueo.js  pantalla de bloqueo y pago (Yape/Plin, voucher, revisión, agradecimiento)
js/respaldo.js          respaldo completo: paginación, deduplicación, archivo, validación y aviso de 7 días (v1.4.0)
js/ui/admin-respaldo.js pestaña Respaldo del panel: descargar y restaurar el progreso de un usuario (v1.4.0)
js/ui/admin-cuentas.js  Usuarios: nombre, apellido, rol, acciones de rol, eliminar y papelera (v1.5.0)
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

## 14. Pruebas

```bash
cd pruebas
npm install          # instala Playwright 1.56 (usa el Chromium ya instalado)
node pruebas.mjs     # escenarios de las especificaciones (01 a 06), capturas e INFORME_PRUEBAS.md
node mock-supabase.mjs           # solo el servidor simulado de Supabase (puerto 54321)
node verificar_composicion.mjs   # solo la verificación de la composición del simulacro
node unitarias.mjs               # solo la lógica: niveles, racha, SRS, XP, nota y migración
```

`pruebas.mjs` levanta `pruebas/mock-supabase.mjs` (emula GoTrue y PostgREST con las mismas reglas que el esquema: 401/403 al violarlas) y apunta la app a él con `localStorage['ascenso2026:supabase'] = {"url": …, "key": …}`. Los escenarios de la nube están en `pruebas/escenarios_nube.mjs`; los del respaldo y la restauración, en `pruebas/escenarios_respaldo.mjs` (reinician el mock y siembran más de 200 eventos y más de 50 estados con `__mock/sembrar_respaldo` para que la paginación sea real; `__mock/respaldo` simula cortes de red, páginas solapadas y tablas incompletas); los de la prueba gratis y el pago, en `pruebas/escenarios_pago.mjs` (el mock emula también Storage: subida multipart a `comprobantes/<uid>/…` y URL firmada; la cuenta `estudiante@prueba.pe` está en cortesía para que los escenarios del encargo 01 no choquen con el límite); y los de **roles, cuentas y privacidad** (sección 11), en `pruebas/escenarios_cuenta.mjs` (reinicia el mock; `__mock/datos` deja una cuenta «antigua» sin nombre ni respuesta del ranking, `__mock/papelera` envejece una eliminación para probar la purga de los 30 días, `__mock/respaldos` siembra un respaldo del Mac y `__mock/pago` un comprobante pendiente para el verificador). El esquema SQL se prueba en un PostgreSQL 16 local con `backend/pruebas_schema.sql` (salida en `backend/pruebas_schema.out`).

## 15. Limitaciones conocidas

- Las pruebas automáticas usan Chromium; la instalación en iPhone (Safari) debe verificarse en un dispositivo real.
- La conexión con el Supabase real solo se verificó con el servidor simulado y con PostgreSQL local; tras publicar, usa **Ajustes → Diagnóstico de conexión**.
- El banco fue generado a partir del temario oficial y de bancos previos, y verificado por auditoría. Ante cualquier duda, contrasta con el reglamento o manual vigente.
