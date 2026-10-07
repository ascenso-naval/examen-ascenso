# Ascenso 2026 — Simulador de examen (PWA)

Aplicación web instalable para estudiar los tres exámenes de ascenso de 40 preguntas con 5 alternativas: **Reglamentos**, **MAPLO** e **Inglés**. Funciona **sin conexión** en el celular (iPhone y Android) una vez instalada.

- **Práctica** con explicación inmediata, por examen, fuente, artículo, dificultad y orden (aleatorio, no vistas primero o débiles primero).
- **Simulacro** cronometrado «como el examen» (reparto por fuente según el temario), con rejilla 1-40, entrega automática, nota vigesimal y revisión.
- **Repaso** inteligente con repetición espaciada (1, 3, 7, 14, 30 y 60 días).
- **Explorar**: fichas por artículo y buscador de texto.
- **Progreso**: dominio, evolución de notas, actividad de 12 semanas y puntos débiles.
- **Gamificación**: XP, niveles con rangos navales, meta diaria, racha y 20 logros.
- Sitio estático: HTML, CSS y JavaScript (módulos ES) sin dependencias ni recursos externos.

---

## 1. Instalarla en el celular

La primera vez se necesita internet para descargar el banco (unos 2 MB). Después funciona sin conexión.

**iPhone (Safari)**
1. Abre la dirección de la app en **Safari** (por ejemplo `https://usuario.github.io/examen-ascenso/`).
2. Toca **Compartir** (el cuadrado con la flecha) → **Añadir a pantalla de inicio** → **Añadir**.
3. Abre la app desde el icono del timón. A partir de ahí úsala siempre desde ese icono.

> En iPhone, la app instalada y Safari guardan el progreso por separado. Si ya estudiaste en Safari, usa **Ajustes → Exportar progreso** allí y **Importar progreso** en la app instalada.

**Android (Chrome)**
1. Abre la dirección en **Chrome**.
2. Toca el menú **⋮** → **Instalar app** (o «Añadir a la pantalla principal»), o acepta el aviso de instalación.
3. Abre la app desde el icono.

**Copias de seguridad.** El progreso vive solo en el dispositivo. Exporta de vez en cuando (Ajustes → Exportar progreso; en iPhone puedes usar «Compartir archivo» para guardarlo en Archivos o enviártelo). Para pasar el progreso a otro celular: exporta en uno e importa en el otro.

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

## 7. Datos y privacidad

Todo se guarda en el navegador del dispositivo, en `localStorage` bajo la clave `ascenso2026:estado` (con escritura diferida y guardado inmediato al ocultar la app). Nada se envía a ningún servidor. Si el navegador no permite guardar (modo privado), la app sigue funcionando en memoria y lo avisa.

## 8. Estructura

```
index.html              página única: carga js/main.js
manifest.webmanifest    datos de instalación (nombre, iconos, colores)
sw.js                   service worker: precache con versión y actualización en segundo plano
css/estilos.css         estilos (tema oscuro/claro con variables CSS)
js/main.js              arranque, rutas y navegación inferior
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
js/version.js           APP_VERSION visible
js/util.js              fechas locales, azar con semilla, formato
js/ui/vista-*.js        una vista por pantalla
js/ui/*.js              componentes: modal, toast, anillo, gráfico, mapa de calor, iconos…
data/                   banco.json y meta.json (generados por scripts/construir_banco.py)
iconos/                 iconos PNG y SVG (generados por scripts/generar_iconos.py)
_capturas/              capturas de las pruebas (no se precargan)
INFORME_PRUEBAS.md      resultado de las pruebas automáticas
```

Iconos: `python3 scripts/generar_iconos.py` los vuelve a generar con Pillow (timón dorado sobre azul marino; diseño propio, sin emblemas oficiales).

## 9. Pruebas

```bash
cd pruebas
npm install          # instala Playwright 1.56 (usa el Chromium ya instalado)
node pruebas.mjs     # escenarios de la especificación, capturas e INFORME_PRUEBAS.md
node verificar_composicion.mjs   # solo la verificación de la composición del simulacro
node unitarias.mjs               # solo la lógica: niveles, racha, SRS, XP, nota y migración
```

## 10. Limitaciones conocidas

- Las pruebas automáticas usan Chromium; la instalación en iPhone (Safari) debe verificarse en un dispositivo real.
- El progreso no se sincroniza entre dispositivos: se mueve con exportar/importar.
- El banco fue generado a partir del temario oficial y de bancos previos, y verificado por auditoría. Ante cualquier duda, contrasta con el reglamento o manual vigente.
