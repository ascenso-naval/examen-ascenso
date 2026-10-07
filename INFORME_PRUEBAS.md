# Informe de pruebas — Ascenso 2026 (PWA)

Fecha: 6/10/2026, 12:41:40 a. m. (hora de Lima). Duración: 72 s.

Entorno: Chromium (Playwright 1.56.0), viewport 390×844, `isMobile: true`, `hasTouch`, escala 2, locale es-PE, zona America/Lima. App servida con `python3 -m http.server 8123 --directory app`.

**Resultado: 119 de 119 comprobaciones superadas.** Errores de consola: 0. Avisos de consola: 0.

Cómo repetirlas: `cd pruebas && npm install && node pruebas.mjs` (por partes: `node verificar_composicion.mjs`, `node unitarias.mjs`).

## Cobertura de la sección 6

| Requisito | Grupos de pruebas | Resultado |
|---|---|---|
| Carga inicial sin errores de consola, SW registrado, manifest válido | Estáticas, Carga inicial | OK (18 comprobaciones) |
| Práctica de 10 preguntas con un fallo → resumen, XP y estado guardados; persistencia tras recargar | Práctica | OK (9 comprobaciones) |
| Simulacro de 40 con tiempo: mínimos por fuente y exclusiones (script), entrega, nota y revisión | Simulacro, Composición (script), Simulacro con tiempo agotado | OK (25 comprobaciones) |
| Repaso: las falladas aparecen hoy y un acierto las reprograma | Repaso | OK (6 comprobaciones) |
| Exportar → borrar → importar restaura | Exportar e importar | OK (4 comprobaciones) |
| El modo ampliado cambia el conteo disponible | Modo ampliado | OK (3 comprobaciones) |
| Segunda carga con la red cortada funciona (también bajo un subdirectorio) | Sin conexión, Subdirectorio | OK (5 comprobaciones) |
| Capturas de cada pantalla principal en `app/_capturas/` | — | 30 capturas |
| `node --check` de todos los módulos y JSON del manifest | Estáticas | OK (13 comprobaciones) |
| Extra: lógica (niveles, racha, SRS, XP, nota, migración), interacciones, tema claro, nueva versión del SW | Lógica (unitarias), Interacciones, Pantallas, Tema claro, Nueva versión | OK (48 comprobaciones) |

## Estáticas

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | node --check de 41 archivos JS |  |
| OK | manifest.webmanifest es JSON válido |  |
| OK | manifest: name y short_name |  |
| OK | manifest: display standalone y orientación portrait |  |
| OK | manifest: start_url y scope relativos |  |
| OK | manifest: iconos 192, 512 y maskable |  |
| OK | manifest: theme/background navy |  |
| OK | iconos PNG con el tamaño declarado | iconos/icon-192.png=192x192, iconos/icon-512.png=512x512, iconos/icon-maskable-192.png=192x192, iconos/icon-maskable-512.png=512x512, iconos/apple-touch-icon.png=180x180 |
| OK | el service worker precachea todos los archivos de la app | 59 entradas |
| OK | las capturas no están en el precache |  |
| OK | APP_VERSION coincide en sw.js y js/version.js | 1.0.0 / 1.0.0 |
| OK | sin alert/confirm/prompt nativos |  |
| OK | sin recursos externos (http/https) en HTML, CSS y JS |  |

## Composición (script)

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | composición de simulacros y exclusiones (400 repeticiones por examen) |  |
| OK | Reglamentos: mínimo 1 pregunta por fuente | reparto {"PERMAR-13016":6,"PERSUBA-13007":5,"RECERNAV-13601":4,"PERSUPE-13006":10,"DOBAMAR-21000":1,"REDROMA-13022":1,"RESIEMAR-13017":1,"DL 1095":1,"MACOMAR-11104":2,"RECASIC-13501":1,"RESIN":2,"DL 1138":2,"LEDIFA":3,"P |
| OK | Reglamentos: ningún par excluyente | 400 composiciones |
| OK | Reglamentos: reparto proporcional (restos mayores) estable |  |
| OK | Reglamentos: no repite preguntas de los 2 simulacros anteriores |  |
| OK | MAPLO: 24 oficiales + 16 generadas, máx. 3 por tema |  |
| OK | Inglés: 14/16/10 por dificultad, máx. 3 por tema |  |

## Lógica (unitarias)

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | umbrales de nivel (1 = 0, 2 = 120, 3 = 360, 25 = 36 000) |  |
| OK | nivel según XP acumulado |  |
| OK | títulos por tramos de 3 niveles |  |
| OK | aritmética de fechas locales |  |
| OK | fallo → caja 0, próxima hoy |  |
| OK | acierto en repaso desde caja 0 → caja 1, +1 día |  |
| OK | caja 1 → 2, +3 días |  |
| OK | acierto en práctica antes de la fecha no adelanta la caja |  |
| OK | acierto en práctica de una pregunta vencida → avanza (+7 días) |  |
| OK | caja 5 se mantiene y vuelve en 60 días |  |
| OK | marcar con bandera → caja 0 hoy |  |
| OK | desmarcar sin responder restaura el estado previo |  |
| OK | dominio de una pregunta (1, 0, sin datos) |  |
| OK | lo reciente pesa más (fallo antiguo + acierto reciente ≈ 0.625) | 0.625 |
| OK | barajado estable dentro de una sesión (mulberry32(hash(id + idSesión))) |  |
| OK | el orden cambia entre sesiones | 6 órdenes distintos en 6 sesiones |
| OK | racha: días consecutivos con meta (hasta ayer si hoy falta) |  |
| OK | práctica: +20 por acierto difícil |  |
| OK | práctica: +2 por intento fallido |  |
| OK | repaso: +12 por acierto; meta diaria cumplida: +50 | 84 |
| OK | la meta cumplida cuenta el día para la racha |  |
| OK | nota vigesimal 36/40 = 18.0 (2 sin responder cuentan como incorrectas) | 18 |
| OK | XP del simulacro: aciertos ×1.5 + 100 + 100 (≥ 18) + meta diaria | 1030 / 1030 |
| OK | logros de simulacro (Primer simulacro, Aprobado, Sobresaliente) |  |
| OK | las no respondidas entran a repaso |  |
| OK | exportar → leer conserva el progreso |  |
| OK | importar rechaza archivos ajenos | El archivo no contiene un progreso de Ascenso 2026. |
| OK | migración completa los campos que faltan |  |

## Carga inicial

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | la app carga y muestra Inicio | 429 ms |
| OK | service worker registrado y activo con scope ./ | http://localhost:8123/ |
| OK | precache del app shell y del banco | ascenso2026-1.0.0: 53 recursos |
| OK | manifest enlazado, iconos accesibles y meta tags iOS | Ascenso 2026 — Simulador de examen; content-type application/manifest+json |
| OK | sin errores de consola en la carga inicial |  |

## Práctica

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | resumen con 9 de 10 aciertos | Práctica completada: 9 |
| OK | XP ganado en el resumen | +142 XP |
| OK | botón «Repetir las falladas» presente |  |
| OK | XP guardado en localStorage | 142 (esperado 142) |
| OK | respuestas y actividad del día guardadas | respondidas 10 |
| OK | la fallada entra a repaso (caja 0, hoy) | {"n":1,"a":0,"h":"0","u":1791265233953,"s":[0,"2026-10-06"]} |
| OK | logro «Primer paso» desbloqueado |  |
| OK | el resumen sigue disponible tras recargar | 9 |
| OK | tras recargar se conservan XP y meta diaria | brújula 10, XP 142 |

## Simulacro

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | simulacro de 40 preguntas únicas |  |
| OK | composición: al menos 1 pregunta de cada una de las 14 fuentes | {"PERMAR-13016":6,"PERSUBA-13007":5,"RECERNAV-13601":4,"PERSUPE-13006":10,"DOBAMAR-21000":1,"REDROMA-13022":1,"RESIEMAR-13017":1,"DL 1095":1,"MACOMAR-11104":2,"RECASIC-13501":1,"RESIN":2,"DL 1138":2,"LEDIFA":3,"PNM":1} |
| OK | composición: ningún par mutuamente excluido (`excluye`) |  |
| OK | composición: respeta el filtro base |  |
| OK | composición proporcional a los ítems del temario | PERSUPE 10, PERMAR 6 |
| OK | el temporizador corre | 1:00:00 → 59:58 |
| OK | «marcar para revisar» guardado en la sesión |  |
| OK | confirmación al entregar con preguntas sin responder | Te quedan 5 preguntas sin responder; contarán como incorrectas. |
| OK | nota vigesimal 15.0 (30/40) y aprobado | 15.0; Aprobado (nota mínima 14) |
| OK | simulacro guardado en el historial | {"nota":15,"ac":30,"respondidas":35} |
| OK | XP del simulacro (×1.5 + 100 por aprobar) y meta diaria (+50) | 952 (esperado 952) |
| OK | meta diaria cumplida y logros «Primer simulacro» y «Aprobado» |  |
| OK | la sesión del simulacro se cierra al entregar |  |
| OK | revisión: 40 preguntas y filtro «Solo erradas» (10) | 40 / 10 |

## Simulacro con tiempo agotado

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | MAPLO «como el examen»: 60 % oficial-maplo | 6 de 10 |
| OK | tarjeta «Continuar sesión» con el tiempo restante | Simulacro en curso MAPLO: 2 de 10 respondidas Quedan 14:57 Continuar Descartar |
| OK | al retomar se conservan las respuestas | 2 respondidas |
| OK | entrega automática al agotarse el tiempo | Simulacro de MAPLO, 6 oct, 00:41. Entregado al agotarse el tiempo. |

## Repaso

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | las falladas aparecen pendientes hoy | 19 en pantalla; 19 en el estado |
| OK | la fallada de la práctica está pendiente |  |
| OK | acierto en repaso: caja 0 → 1, próxima = mañana | [1,"2026-10-07"] |
| OK | fallo en repaso: caja 0, próxima = hoy | [0,"2026-10-06"] |
| OK | resumen del repaso | Repaso completado |
| OK | contador de repasos acertados | 1 |

## Pantallas

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | Explorar: 14 fuentes de Reglamentos |  |
| OK | Explorar: ítem 1.01 con sus fichas | 5 fichas |
| OK | Explorar MAPLO: grupos por capítulo/anexo (21 en el banco final; >50 si el banco trae item «-») | 21 grupos |
| OK | buscador sin tildes con resultados agrupados por fuente | 19 fichas |
| OK | Progreso: gráfico de notas con el simulacro |  |
| OK | Progreso: mapa de calor de 12 semanas | 79 días |
| OK | Logros: 20 medallas (bloqueadas en gris) |  |

## Interacciones

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | nombre y cuenta regresiva en Inicio | Hola, Marco / Faltan 70 días |
| OK | elegir artículos actualiza el conteo disponible | 12 preguntas disponibles La sesión tendrá hasta 12 |
| OK | la sesión solo usa preguntas de los artículos elegidos | 9 preguntas, ítems 1.02, 1.01 |
| OK | al salir con «atrás» la práctica queda como sesión en curso |  |
| OK | descartar la sesión en curso (con confirmación) |  |
| OK | «Marcar todo para repaso» marca las preguntas del artículo | 12 de 12 |
| OK | «Practicar este artículo» inicia una práctica del ítem | 11 preguntas |
| OK | letra grande y MAYÚSCULAS se aplican al instante | 2, 1 |
| OK | el enunciado se muestra en MAYÚSCULAS (solo con CSS) | uppercase |

## Modo ampliado

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | el modo ampliado cambia el conteo disponible | 2067 → 2198 |
| OK | «incluir no verificadas» suma las no verificables | 2220 |
| OK | al desactivar vuelve al conteo base |  |

## Exportar e importar

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | exportar descarga un .json con el progreso | ascenso2026-progreso-2026-10-06.json (8779 bytes) |
| OK | reiniciar (doble confirmación) borra el progreso |  |
| OK | importar restaura el progreso | XP 996, 2 simulacros, 71 preguntas |
| OK | el progreso importado persiste tras recargar |  |

## Tema claro

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | cambio a tema claro | light |

## Sin conexión

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | segunda carga con la red cortada muestra Inicio |  |
| OK | sin conexión: se compone y empieza un simulacro de Inglés | 40 preguntas |

## Nueva versión

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | aviso «Nueva versión disponible» cuando se instala una versión nueva |  |
| OK | «Actualizar» activa la versión nueva (skipWaiting), recarga y borra la caché vieja | ascenso2026-1.0.0-prueba |
| OK | el progreso se conserva tras actualizar | XP 1006 |

## Subdirectorio

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | servida bajo /app/: el SW se registra con el scope del subdirectorio | http://localhost:8124/app/ |
| OK | en subdirectorio y sin conexión la app carga y navega |  |
| OK | sin errores de consola en subdirectorio |  |

## Consola

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | sin errores de consola en todo el recorrido |  |

## Detalle de la verificación de composición

- Reglamentos, 400 simulacros de 40: reparto por fuente PERMAR-13016 6, PERSUBA-13007 5, RECERNAV-13601 4, PERSUPE-13006 10, DOBAMAR-21000 1, REDROMA-13022 1, RESIEMAR-13017 1, DL 1095 1, MACOMAR-11104 2, RECASIC-13501 1, RESIN 2, DL 1138 2, LEDIFA 3, PNM 1.
- Pares excluyentes: 0; fuentes sin mínimo: 0; fuera del filtro base: 0; repetidas respecto a los 2 simulacros anteriores: 0.
- Mezcla de dificultad media por simulacro (objetivo 12/18/10): 12.0 / 18.3 / 9.7.
- Con 10 preguntas (menos que fuentes): 10 preguntas, 0 pares. «Solo fuentes seleccionadas» (PERSUPE, PERMAR, PNM): 40 preguntas de 3 fuentes.
- MAPLO: pares 0, composiciones sin 24 oficiales 0, máximo por tema 3.
- Inglés: pares 0, composiciones fuera de 14/16/10 0, máximo por tema 3.
- Práctica «todas las disponibles» por fuente y cola de repaso: 0 pares excluyentes.

## Capturas (app/_capturas/)

No se incluyen en el precache del service worker.

- `01_inicio.png`: Inicio: cuenta regresiva, meta diaria (brújula), racha, nivel y accesos
- `02_practica_configuracion.png`: Práctica: configuración (examen, fuentes, artículos, dificultad, cantidad, orden)
- `03_practica_pregunta.png`: Práctica: pregunta con alternativas A-E
- `04_practica_fallo.png`: Práctica: respuesta incorrecta, correcta en verde, explicación y referencia
- `05_practica_acierto.png`: Práctica: respuesta correcta con +XP
- `06_subida_de_nivel.png`: Modal de celebración al subir de nivel (confeti CSS)
- `07_practica_resumen.png`: Práctica: resumen con aciertos, XP, tiempo y falladas
- `08_simulacro_configuracion.png`: Simulacro: configuración y reparto por fuente «como el examen»
- `09_simulacro_pregunta.png`: Simulacro: temporizador en la cabecera, sin feedback, navegación
- `10_simulacro_rejilla.png`: Simulacro: rejilla 1-40 con estados (respondida, marcada, sin responder)
- `11_simulacro_resultado.png`: Simulacro: nota vigesimal, aprobado, desglose por fuente y dificultad, XP
- `12_simulacro_revision.png`: Simulacro: revisión con tu respuesta vs. la correcta, explicación y referencia
- `13_inicio_continuar.png`: Inicio: «Continuar sesión» de un simulacro interrumpido con su tiempo
- `14_repaso.png`: Repaso: preguntas para hoy por examen, pronóstico y pendientes por fuente
- `15_repaso_sesion.png`: Repaso: sesión con feedback inmediato
- `16_explorar.png`: Explorar: árbol examen → fuente con dominio
- `17_explorar_fichas.png`: Explorar: artículo en modo ficha (respuesta revelada) y acciones
- `18_explorar_busqueda.png`: Explorar: búsqueda de texto con resultados agrupados por fuente
- `19_progreso.png`: Progreso: dominio, vistas, aciertos, promedio, gráfico SVG y mapa de calor (página completa, sin la barra inferior)
- `20_logros.png`: Logros: nivel con insignia, rangos y medallas (página completa, sin la barra inferior)
- `21_mas.png`: Más: Repaso, Explorar, Logros, Ajustes y Acerca de
- `22_ajustes.png`: Ajustes: perfil, estudio, banco (con conteo), apariencia y datos (página completa, sin la barra inferior)
- `23_inicio_claro.png`: Inicio en tema claro
- `24_practica_claro.png`: Práctica en tema claro
- `25_progreso_claro.png`: Progreso en tema claro (página completa, sin la barra inferior)
- `26_sin_conexion_simulacro.png`: Sin conexión: simulacro de Inglés funcionando desde la caché
- `27_nueva_version.png`: Aviso «Nueva versión disponible · Actualizar»
- `28_inicio_con_fecha.png`: Inicio con nombre y cuenta regresiva al examen
- `29_practica_articulos.png`: Práctica: «Elegir artículos» con ítems del temario seleccionados
- `30_mayusculas_letra_grande.png`: Pregunta en MAYÚSCULAS y letra grande (como el examen real)

## Limitaciones de estas pruebas

- Se ejecutan en Chromium. Safari iOS no está disponible en este entorno: la instalación en iPhone y el comportamiento de `black-translucent` y las zonas seguras deben verificarse en un dispositivo real.
- Los sonidos (Web Audio) y la vibración no se verifican de forma automática.
