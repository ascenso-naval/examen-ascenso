# Informe de pruebas — Ascensos 2027 (PWA)

Fecha: 15/10/2026, 12:21:10 a. m. (hora de Lima). Duración: 301 s.

Entorno: Chromium (Playwright 1.56.0), viewport 390×844, `isMobile: true`, `hasTouch`, escala 2, locale es-PE, zona America/Lima. App servida en el puerto 8123 con el manejador de `http.server` de Python y cola de conexiones de 256 (con la cola por omisión, 5, los contextos en paralelo provocaban `ERR_CONNECTION_RESET`).

**Resultado: 533 de 533 comprobaciones superadas.** Errores de consola: 0. Avisos de consola: 0.

Cómo repetirlas: `cd pruebas && npm install && node pruebas.mjs` (por partes: `node verificar_composicion.mjs`, `node unitarias.mjs`).

## Cobertura de la sección 6

| Requisito | Grupos de pruebas | Resultado |
|---|---|---|
| Carga inicial sin errores de consola, SW registrado, manifest válido | Estáticas, Carga inicial | OK (24 comprobaciones) |
| Práctica de 10 preguntas con un fallo → resumen, XP y estado guardados; persistencia tras recargar | Práctica | OK (9 comprobaciones) |
| Simulacro de 40 con tiempo: mínimos por fuente y exclusiones (script), entrega, nota y revisión | Simulacro, Composición (script), Simulacro con tiempo agotado | OK (25 comprobaciones) |
| Repaso: las falladas aparecen hoy y un acierto las reprograma | Repaso | OK (6 comprobaciones) |
| Exportar → borrar → importar restaura | Exportar e importar | OK (4 comprobaciones) |
| El modo ampliado cambia el conteo disponible | Modo ampliado | OK (3 comprobaciones) |
| Segunda carga con la red cortada funciona (también bajo un subdirectorio) | Sin conexión, Subdirectorio | OK (5 comprobaciones) |
| Capturas de cada pantalla principal en `app/_capturas/` | — | 68 capturas |
| `node --check` de todos los módulos y JSON del manifest | Estáticas | OK (18 comprobaciones) |
| Extra: lógica (niveles, racha, SRS, XP, nota, migración), interacciones, tema claro, nueva versión del SW | Lógica (unitarias), Interacciones, Pantallas, Tema claro, Nueva versión | OK (62 comprobaciones) |

## Cobertura del encargo 02 (sección 5)

Comprobaciones del encargo 01 (sin los grupos «Nube»): 454 de 454 superadas (la app ahora ingresa con la cuenta precargada del servidor simulado).

| Requisito | Grupos de pruebas | Resultado |
|---|---|---|
| Vendor local, SW network-only para supabase.co, versión (1.2.0 desde el encargo 03), documentación y esquema | Nube (estáticas) | OK (11 comprobaciones) |
| Pantalla de acceso sin red muestra el mensaje correcto | Nube: acceso sin red | OK (5 comprobaciones) |
| Registro → apodo → práctica → sincroniza (verificado en el mock) → cerrar sesión | Nube: registro y sincronización | OK (14 comprobaciones) |
| Ingresar en «otro dispositivo» (contexto nuevo) → el progreso llega | Nube: otro dispositivo | OK (2 comprobaciones) |
| Offline con sesión: estudiar y encolar → al volver la red se sube; conflicto → fusión | Nube: sin conexión y fusión | OK (9 comprobaciones) |
| Ranking muestra la posición propia | Nube: ranking | OK (4 comprobaciones) |
| Usuario normal no ve el panel; la RPC responde 403 | Nube: usuario normal | OK (4 comprobaciones) |
| Admin ve #/admin con datos y exporta CSV | Nube: administración | OK (9 comprobaciones) |
| Usuario bloqueado → expulsado | Nube: bloqueo | OK (6 comprobaciones) |
| Diagnóstico, confirmación de correo, recuperar contraseña | Nube: diagnóstico, Nube: confirmación de correo, Nube: recuperar contraseña | OK (8 comprobaciones) |

## Cobertura del encargo 03 («Instalar con un toque»)

Comprobaciones de los encargos 01 y 02: 404 de 404 superadas (parten de «Seguir en el navegador» ya elegido, sembrado por `usarMock`). Nuevas del encargo 03: 34 de 34.

| Requisito | Grupos de pruebas | Resultado |
|---|---|---|
| Manifest instalable (id, iconos any/maskable), meta iOS, SW con fetch, precache y versión 1.2.0 | Instalación: estáticas | OK (3 comprobaciones) |
| (a) Instalada (`navigator.standalone` o `display-mode: standalone`): no aparece | Instalación: modo instalado | OK (2 comprobaciones) |
| (b) Android: «Preparando…», `beforeinstallprompt` sintético → «Instalar la app» → `prompt()` → éxito; rechazo; guía manual a los 4 s | Instalación: Android | OK (11 comprobaciones) |
| (c) iPhone Safari: guía de 3 pasos con flecha animada; reduced motion; Chrome en iOS; iPad | Instalación: iPhone | OK (6 comprobaciones) |
| (d) «Seguir en el navegador»: 7 días, reaparece al vencer, Escape, Ajustes → «Instalar en el celular» | Instalación: seguir en el navegador | OK (8 comprobaciones) |
| (e) Escritorio: tarjeta breve con el enlace y continuar | Instalación: escritorio | OK (3 comprobaciones) |
| (f) Sin errores de consola; las comprobaciones anteriores siguen en verde | Instalación: consola | OK (1 comprobaciones) · anteriores: 404/404 |

## Cobertura del encargo 04 (prueba gratis y pago único, v1.3.0)

Comprobaciones de los encargos 01 a 03: 252 de 252 superadas. Nuevas del encargo 04: 95 de 95. La cuenta precargada `estudiante@prueba.pe` (escenarios del encargo 01) está en **cortesía** en el mock para que el límite de la prueba no la afecte; las demás cuentas empiezan en prueba.

| Escenario (§6 de la especificación) | Grupos de pruebas | Resultado |
|---|---|---|
| Versión 1.3.0, precache, sin QR, esquema 1.2.0, README | Pago (estáticas) | OK (6 comprobaciones) |
| Configuración del cobro desde el panel | Pago: configuración (admin) | OK (6 comprobaciones) |
| App sin cuenta exige ingreso (conserva datos locales y «Conservar y subir») | Pago: app sin sesión exige ingreso | OK (3 comprobaciones) |
| Prueba contando (indicador en Inicio, lotes de 10) | Pago: prueba contando | OK (4 comprobaciones) |
| Agotado por preguntas; sin voucher → botón deshabilitado; sin operación; operación inválida | Pago: agotado por preguntas | OK (16 comprobaciones) |
| Comprobante válido; corrección | Pago: comprobante y corrección | OK (7 comprobaciones) |
| Operación duplicada en otra cuenta | Pago: operación duplicada | OK (3 comprobaciones) |
| Panel de pagos con voucher; rechazo con motivo | Pago: panel de pagos | OK (7 comprobaciones) |
| Rechazo y reintento (sondeo de 60 s simulado con el reloj de Playwright) | Pago: rechazo y reintento | OK (2 comprobaciones) |
| Verificación y desbloqueo automático | Pago: verificación y desbloqueo | OK (5 comprobaciones) |
| Cortesía | Pago: cortesía | OK (4 comprobaciones) |
| Agotado por simulacro | Pago: agotado por simulacro | OK (6 comprobaciones) |
| Bloqueo sin conexión | Pago: bloqueo sin conexión | OK (5 comprobaciones) |
| Auditoría H2: cerrar sesión sin conexión conserva el consumo pendiente y lo envía al reingresar (otra cuenta no lo recibe) | Pago: cerrar sesión sin conexión conserva el consumo | OK (5 comprobaciones) |
| Auditoría H6: detalle de usuario del admin, eventos de pago sin examen y con su detalle (operación / motivo) | Pago: detalle de usuario (admin) | OK (2 comprobaciones) |
| Decisión E04: Explorar consume la prueba (1 vez por ficha y sesión, aviso en prueba, envío al ocultar, bloqueo al agotar; cortesía sin consumo) | Pago: Explorar consume la prueba | OK (7 comprobaciones) |
| Admin nunca bloqueado | Pago: admin nunca bloqueado | OK (2 comprobaciones) |
| No admin no ve la pestaña Pagos (y el servidor lo impide) | Pago: no admin | OK (4 comprobaciones) |
| Sin errores de consola | Pago: consola | OK (1 comprobaciones) |

Decisiones finales del encargo 04: (1) revelar una ficha en Explorar consume la prueba gratis; (2) la pantalla de pago ya no muestra QR (número grande, titular y «Copiar número» con confirmación «¡Copiado!»; librería de QR eliminada).

## Cobertura del encargo 05 (respaldo y restauración, v1.4.0 · esquema 1.3.0)

Comprobaciones de los encargos 01 a 04: 347 de 347 superadas. Nuevas del encargo 05: 79 de 79. Los escenarios de respaldo reinician el mock y siembran 230 eventos, 55 cuentas con progreso y 4 pagos (3 vouchers distintos) para que la paginación sea real.

| Escenario (§3 de la especificación) | Grupos de pruebas | Resultado |
|---|---|---|
| Versión 1.4.0, precache, esquema 1.3.0, RPC en nube.js y mock, README §10 | Respaldo (estáticas) | OK (5 comprobaciones) |
| Paginación, límite efectivo, deduplicación, reintento por página, «filas = total» con un reintento de la tabla, vouchers, validación del archivo | Respaldo: lógica (unitarias) | OK (13 comprobaciones) |
| Aviso de 7 días (badge en la pestaña y en Más → Administración) | Respaldo: aviso de 7 días | OK (5 comprobaciones) |
| Resumen (totales por tabla, tamaño, vouchers, aviso fijo) | Respaldo: resumen | OK (4 comprobaciones) |
| Descarga completa interceptada y validada (formato, totales = filas, dedupe, vouchers), paginación con > límite, 2 cortes de red, fecha guardada y badge que desaparece | Respaldo: descarga completa | OK (13 comprobaciones) |
| Tabla que no cuadra: se repite una vez y se descarga avisando la diferencia | Respaldo: filas que no cuadran | OK (2 comprobaciones) |
| Restauración con vista previa, confirmación y «Deshacer» (verificado en el mock); «Deshacer» hasta cambiar de pestaña | Respaldo: restauración y deshacer | OK (13 comprobaciones) |
| «También plan, apodo y contadores de prueba» | Respaldo: también plan, apodo y contadores | OK (3 comprobaciones) |
| Archivo inválido rechazado | Respaldo: archivos inválidos | OK (1 comprobaciones) |
| Usuario sin cuenta actual no restaurable | Respaldo: usuario sin cuenta actual | OK (3 comprobaciones) |
| Validaciones del servidor (22023, límite efectivo 500/50, P0002) | Respaldo: validaciones del servidor | OK (3 comprobaciones) |
| Diagnóstico: «Respaldo y restauración» en verde | Respaldo: diagnóstico | OK (2 comprobaciones) |
| No admin no ve la pestaña; las 5 RPC → 403 | Respaldo: no admin | OK (4 comprobaciones) |
| Sin errores de consola | Respaldo: consola | OK (1 comprobaciones) |

## Cobertura del encargo 06 (roles, cuentas y privacidad, v1.5.0 · esquema 1.4.0)

Comprobaciones de los encargos 01 a 05: 426 de 426 superadas. Nuevas del encargo 06: 107 de 107. Los escenarios de cuentas reinician el mock: las cuentas precargadas llegan con nombre, apellido y su respuesta al ranking (base migrada), y la «cuenta antigua» sin datos se prepara con `/__mock/datos`.

| Escenario (§3 de la especificación) | Grupos de pruebas | Resultado |
|---|---|---|
| Versión 1.5.0, precache, esquema 1.4.0, RPC en nube.js y mock, README §11 | Cuenta (estáticas) | OK (13 comprobaciones) |
| Registro con Nombre y Apellido obligatorios (metadatos + completar_datos) y texto de privacidad | Cuenta: registro con nombre y apellido | OK (7 comprobaciones) |
| Cuenta antigua sin datos → pantalla «Completa tus datos» que no se puede saltar | Cuenta: cuenta antigua sin datos | OK (13 comprobaciones) |
| Pregunta del ranking (junto al apodo o en pantalla propia) y conmutador en Ajustes → Cuenta | Cuenta: registro con nombre y apellido, Cuenta: cuenta antigua sin datos, Cuenta: ranking en modo oculto | OK (10 comprobaciones) |
| Ranking oculto: «Estás en modo oculto… Estarías en el puesto N» y la lista sin la fila propia | Cuenta: ranking en modo oculto | OK (10 comprobaciones) |
| Nombre, apellido y correo nunca visibles para un usuario normal | Cuenta: privacidad de los datos personales | OK (4 comprobaciones) |
| Roles con confirmación y errores del servidor (último administrador, a sí mismo) | Cuenta: roles y errores del servidor | OK (10 comprobaciones) |
| Eliminar con motivo → Papelera (fecha, motivo, días restantes) → el usuario no entra → Restaurar | Cuenta: eliminar, papelera y restaurar | OK (18 comprobaciones) |
| Purga al abrir Usuarios con toast, copia en cuentas_purgadas, aviso de pendientes_auth y piso de 30 días | Cuenta: purga de la papelera | OK (8 comprobaciones) |
| Verificador: en Más → Administración solo la pestaña Pagos, verifica y las demás RPC le dan 403 | Cuenta: el verificador ve solo Pagos | OK (15 comprobaciones) |
| Aviso de respaldo con admin_ultimo_respaldo (app/Mac/manual) y registro al descargar | Cuenta: aviso de respaldo por el servidor | OK (6 comprobaciones) |
| Diagnóstico: paso «Cuenta y roles» (cuenta_ok) | Cuenta: diagnóstico | OK (2 comprobaciones) |
| Sin errores de consola | Cuenta: consola | OK (1 comprobaciones) |

## Esquema SQL en PostgreSQL 16 local

`backend/pruebas_schema.sql` instala `backend/schema.sql` tres veces (idempotencia) sobre un clúster temporal con roles anon/authenticated/service_role/supabase_auth_admin y un esquema `auth` mínimo, y simula sesiones con `request.jwt.claims`. Resultado (`backend/pruebas_schema.out`): **563 comprobaciones OK, 0 fallidas** — todas superadas.

`backend/auditoria_schema.sql` (instalación sobre base vacía con Storage simulado, ataques concretos): **430 OK, 0 fallas** de 430 (`backend/auditoria_schema.out`).

## Estáticas

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | node --check de 59 archivos JS |  |
| OK | manifest.webmanifest es JSON válido |  |
| OK | manifest: name y short_name |  |
| OK | manifest: description con el nombre «Ascensos 2027» | Ascensos 2027: práctica, simulacros cronometrados y repaso inteligente para los exámenes de ascenso: Reglamentos, MAPLO e Inglés. Funciona sin conexión. |
| OK | manifest: display standalone y orientación portrait |  |
| OK | manifest: start_url y scope relativos |  |
| OK | manifest: iconos 192, 512 y maskable |  |
| OK | manifest: theme/background navy |  |
| OK | iconos PNG con el tamaño declarado | iconos/icon-192.png=192x192, iconos/icon-512.png=512x512, iconos/icon-maskable-192.png=192x192, iconos/icon-maskable-512.png=512x512, iconos/apple-touch-icon.png=180x180 |
| OK | el service worker precachea todos los archivos de la app | 78 entradas |
| OK | las capturas no están en el precache |  |
| OK | APP_VERSION coincide en sw.js y js/version.js | 1.5.0 / 1.5.0 |
| OK | index.html: <title>, meta apple-mobile-web-app-title/application-name y pantalla de carga «Ascensos 2027» |  |
| OK | ningún texto visible dice «Ascenso 2026» |  |
| OK | identificadores internos intactos (claves ascenso2026:*, app, esquema, prefijo de caché, formato de respaldo) | 14 identificadores verificados |
| OK | sw-registro: busca versión nueva al volver a primer plano y al recuperar la red (cada 5 min como mucho) |  |
| OK | sin alert/confirm/prompt nativos |  |
| OK | sin recursos externos (http/https) en HTML, CSS y JS (salvo la API de Supabase) |  |

## Nube (estáticas)

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | vendor/supabase.js local (UMD de supabase-js) y sin el archivo suelto | 217901 bytes |
| OK | index.html carga el vendor antes de los módulos y sin CDN |  |
| OK | config-supabase.js coincide con backend/supabase.config.json |  |
| OK | ninguna secret key en app/ ni backend/ |  |
| OK | SW: precachea el vendor y deja supabase.co en network-only |  |
| OK | APP_VERSION 1.5.0 (encargo 06; 1.1.0 fue la del encargo 02, 1.2.0 la del 03, 1.3.0 la del 04, 1.4.0 la del 05 y 1.4.1 el parche) |  |
| OK | schema.sql: tablas con RLS, trigger de alta y todas las funciones | 10 funciones |
| OK | schema.sql probado en PostgreSQL 16 local (backend/pruebas_schema.out) | 563 comprobaciones OK |
| OK | rutas JSON del estado documentadas en README y schema.sql, coherentes con estado.js |  |
| OK | README: secciones «Cuenta y sincronización» y «Administración» |  |
| OK | backend/INSTRUCCIONES_SUPABASE.md con los pasos del dashboard |  |

## Pago (estáticas)

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | versión ≥ 1.3.0 en sw.js y version.js (1.4.0 desde el encargo 05, 1.4.1 el parche, 1.5.0 desde el encargo 06); acceso.js y vista-bloqueo.js en el precache | ./js/acceso.js, ./js/ui/vista-bloqueo.js |
| OK | la app y el mock esperan el esquema ≥ 1.2.0 (1.4.0 desde el encargo 06) |  |
| OK | sin QR: librería eliminada, fuera del precache, sin generación en el bloqueo ni CSS huérfano |  |
| OK | formulario: voucher image/*, compresión por canvas (1280 px, JPEG ≤ 1 MB) y operación numérica |  |
| OK | acceso.js: lotes de 10, sondeo de 60 s en pendiente, primer plano y reconexión |  |
| OK | README: sección «Prueba gratis y pago» |  |

## Respaldo (estáticas)

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | versión 1.5.0 en sw.js y version.js (1.4.0 del encargo 05, 1.4.1 el parche, 1.5.0 el encargo 06); respaldo.js y admin-respaldo.js en el precache | ./js/respaldo.js, ./js/ui/admin-respaldo.js |
| OK | la app y el mock esperan el esquema 1.4.0 |  |
| OK | nube.js y el mock: las 5 RPC de respaldo y el paso «Respaldo» del diagnóstico |  |
| OK | backend/schema.sql (1.4.0) define las 5 funciones de respaldo que usa la app |  |
| OK | README §10 «Respaldo y restauración» (adopción del progreso restaurado, Deshacer exacto/intermedio, sin estado previo) |  |

## Cuenta (estáticas)

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | versión 1.5.0 en sw.js y version.js; js/ui/admin-cuentas.js en el precache | ./js/ui/admin-cuentas.js |
| OK | la app y el mock esperan el esquema 1.4.0 |  |
| OK | nube.js y el mock tienen las 10 RPC nuevas del encargo 06 | 10 RPC |
| OK | backend/schema.sql (1.4.0) define las funciones que usa la app |  |
| OK | schema.sql: el cliente solo escribe apodo, nombre y apellido en perfiles |  |
| OK | nube.js y el mock: paso «Cuenta y roles» del diagnóstico (cuenta_ok) |  |
| OK | respaldo.js: el aviso de 7 días usa admin_ultimo_respaldo() con copia en localStorage |  |
| OK | schema.sql: ranking() no devuelve nombre, apellido ni correo | 1725 caracteres de cuerpo |
| OK | vista-admin.js: el cruce con admin_usuarios() queda como defensa y la tarjeta explica el voucher que el servidor niegue |  |
| OK | schema.sql 1.4.0: admin_pagos excluye la papelera, admin_resolver_pago responde 22023 y la política del voucher admite es_verificador() |  |
| OK | mock-supabase.mjs: las mismas tres reglas (admin_pagos sin papelera, 22023 al resolver, URL firmada para el verificador) |  |
| OK | cuenta.js: «Completa tus datos» no tiene salida (ni botón para saltarla ni excepción sin conexión) |  |
| OK | README §11 «Roles, cuentas y privacidad» (verificador, papelera de 30 días, modo oculto) |  |

## Respaldo: lógica (unitarias)

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | descargarTabla: pagina 0/200/400 hasta el total | 0,200,400 |
| OK | descargarTabla: deduplica por clave primaria las páginas que se solapan |  |
| OK | descargarTabla: avanza con el límite efectivo que devuelve el servidor (50) | 9 páginas |
| OK | descargarTabla: reintenta la página ante errores de red |  |
| OK | descargarTabla: tras agotar los reintentos propaga el error |  |
| OK | descargarTabla: un error de permiso no se reintenta |  |
| OK | armarRespaldo: formato, versiones y las 6 tablas | 6 filas |
| OK | armarRespaldo: vouchers = rutas distintas de pagos | ["u/a.jpg","u/b.jpg"] |
| OK | armarRespaldo: si filas ≠ total vuelve a pedir la tabla una vez y anota la diferencia | [{"tabla":"ingresos","filas":2,"total":3}] |
| OK | nombre del archivo: ascenso2026-respaldo-AAAA-MM-DD-HHMM.json | ascenso2026-respaldo-2026-03-05-0907.json |
| OK | validarRespaldo: acepta el formato 1 y rechaza archivos ajenos, versiones futuras y tablas mal formadas |  |
| OK | perfilesDelRespaldo: XP y preguntas del estado; sin cuenta actual si el id no existe hoy |  |
| OK | perfilARestaurar: el plan «pendiente» no se envía (null deja el dato igual) |  |

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
| OK | importar rechaza archivos ajenos | El archivo no contiene un progreso de Ascensos 2027. |
| OK | migración completa los campos que faltan |  |
| OK | fusión de una pregunta: gana el intento más reciente y se unen los historiales sin duplicar la parte común | {"n":6,"a":4,"h":"101011","u":3000,"s":[2,"2026-10-10"]} |
| OK | fusión de registros idénticos no cambia nada |  |
| OK | historiales recortados (10): máximos y el historial más reciente |  |
| OK | fusión: unión de preguntas y de simulacros (por id, en orden) |  |
| OK | fusión: XP y contadores = máximo |  |
| OK | fusión: días unidos (máximos y meta si cualquiera la cumplió) |  |
| OK | fusión: logros unidos con la fecha más antigua |  |
| OK | fusión: ajustes y sesiones en curso locales |  |
| OK | tieneProgreso() distingue un estado vacío |  |
| OK | mock: nivelDe() coincide con la app |  |

## Carga inicial

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | la app carga, se ingresa con la cuenta y muestra Inicio | 131 ms |
| OK | service worker registrado y activo con scope ./ | http://localhost:8123/ |
| OK | precache del app shell y del banco | ascenso2026-1.5.0: 72 recursos |
| OK | manifest enlazado, iconos accesibles y meta tags iOS | Ascensos 2027 — Simulador de examen; content-type application/manifest+json |
| OK | título del documento, meta iOS y manifest servido: «Ascensos 2027» | Ascensos 2027 · Ascensos 2027 · Ascensos 2027 — Simulador de examen |
| OK | sin errores de consola en la carga inicial |  |

## Práctica

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | resumen con 9 de 10 aciertos | Práctica completada: 9 |
| OK | XP ganado en el resumen | +132 XP |
| OK | botón «Repetir las falladas» presente |  |
| OK | XP guardado en localStorage | 132 (esperado 132) |
| OK | respuestas y actividad del día guardadas | respondidas 10 |
| OK | la fallada entra a repaso (caja 0, hoy) | {"n":1,"a":0,"h":"0","u":1792041372706,"s":[0,"2026-10-15"]} |
| OK | logro «Primer paso» desbloqueado |  |
| OK | el resumen sigue disponible tras recargar | 9 |
| OK | tras recargar se conservan XP y meta diaria | brújula 10, XP 132 |

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
| OK | XP del simulacro (×1.5 + 100 por aprobar) y meta diaria (+50) | 942 (esperado 942) |
| OK | meta diaria cumplida y logros «Primer simulacro» y «Aprobado» |  |
| OK | la sesión del simulacro se cierra al entregar |  |
| OK | revisión: 40 preguntas y filtro «Solo erradas» (10) | 40 / 10 |

## Simulacro con tiempo agotado

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | MAPLO «como el examen»: 60 % oficial-maplo | 6 de 10 |
| OK | tarjeta «Continuar sesión» con el tiempo restante | Simulacro en curso MAPLO: 2 de 10 respondidas Quedan 14:57 Continuar Descartar |
| OK | al retomar se conservan las respuestas | 2 respondidas |
| OK | entrega automática al agotarse el tiempo | Simulacro de MAPLO, 15 oct, 00:16. Entregado al agotarse el tiempo. |

## Repaso

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | las falladas aparecen pendientes hoy | 19 en pantalla; 19 en el estado |
| OK | la fallada de la práctica está pendiente |  |
| OK | acierto en repaso: caja 0 → 1, próxima = mañana | [1,"2026-10-16"] |
| OK | fallo en repaso: caja 0, próxima = hoy | [0,"2026-10-15"] |
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
| OK | Progreso: mapa de calor de 12 semanas | 81 días |
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
| OK | exportar descarga un .json con el progreso | ascenso2026-progreso-2026-10-15.json (8846 bytes) |
| OK | reiniciar (doble confirmación) borra el progreso |  |
| OK | importar restaura el progreso | XP 1001, 2 simulacros, 71 preguntas |
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
| OK | Ajustes → Aplicación muestra la versión instalada junto a «Buscar actualización» | 1.5.0 |
| OK | «Buscar actualización» sin versión nueva: toast «Ya tienes la última versión (1.5.0)» |  |
| OK | «Buscar actualización» sin conexión: toast «Sin conexión» |  |
| OK | «Buscar actualización» con versión nueva: aparece «Nueva versión disponible → Actualizar» (sin el toast de «al día») |  |
| OK | aviso «Nueva versión disponible» cuando se instala una versión nueva |  |
| OK | «Actualizar» activa la versión nueva (skipWaiting), recarga y borra la caché vieja | ascenso2026-1.5.0-prueba |
| OK | el progreso se conserva tras actualizar | XP 1016 |

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

## Nube: acceso sin red

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | con red: la pantalla de acceso no muestra el aviso «Sin conexión» |  |
| OK | acceso: aviso de privacidad, «¿Olvidaste tu contraseña?» y mostrar/ocultar contraseña |  |
| OK | mostrar contraseña cambia el campo a texto |  |
| OK | sin sesión y sin red: mensaje claro en la pantalla de acceso | Sin conexión. Para ingresar o crear tu cuenta necesitas internet. Después de ingresar una vez, la app funciona sin conexión en este dispositivo. |
| OK | intentar ingresar sin red muestra el error legible | Sin conexión. Para ingresar o crear tu cuenta necesitas internet. Después de ingresar una vez, la app funciona sin conexión en este dispositivo. |

## Nube: registro y sincronización

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | registro: valida contraseña de al menos 8 caracteres |  |
| OK | registro: valida el formato del apodo |  |
| OK | primer ingreso con progreso local: pregunta «¿Conservar el progreso de este dispositivo?» | ¿Conservar el progreso de este dispositivo? |
| OK | sin apodo: la hoja de apodo incluye la pregunta del ranking (dos opciones) |  |
| OK | apodo ya usado («grumete» = «Grumete»): la cuenta se crea sin apodo pero con nombre y apellido | {"apodo":null,"rol":"usuario","nombre":"Nueva"} |
| OK | ranking sin apodo: invita a crearlo |  |
| OK | cambiar_apodo: el servidor rechaza un apodo duplicado con mensaje legible |  |
| OK | apodo guardado con cambiar_apodo |  |
| OK | «Conservar»: el progreso local sube como estado inicial | XP 500 |
| OK | al terminar la práctica se sincroniza: estado y evento en el servidor | XP 655; evento n=10, aciertos=10 |
| OK | evento de práctica con n, aciertos, examen e id_cliente |  |
| OK | las 10 respuestas están en el estado remoto |  |
| OK | Inicio: indicador «Sincronizado» |  |
| OK | cerrar sesión: borra sesión y progreso del dispositivo (conserva la apariencia) |  |

## Nube: otro dispositivo

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | ingresar en otro dispositivo (contexto nuevo): el progreso llega | XP 655, 13 preguntas |
| OK | los ajustes también llegan (adopción del remoto sin cambios locales) | 295 de 360 XP |

## Nube: sin conexión y fusión

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | sin conexión: se puede estudiar; el estado queda pendiente y el evento en cola | pendiente true, cola 1 |
| OK | el otro dispositivo sube sus cambios mientras B está sin conexión |  |
| OK | al volver la red se sube lo encolado y se fusiona: respuestas de ambos dispositivos | 33 preguntas |
| OK | fusión: XP = máximo de ambos | 825 (B 825, C 795) |
| OK | fusión: conserva el progreso anterior y la fecha más antigua de los logros |  |
| OK | eventos: los 3 registrados una sola vez (cola + idempotencia) | 3 eventos |
| OK | B queda sincronizado (sin pendientes ni cola) |  |
| OK | reenviar un evento con el mismo id_cliente no lo duplica |  |
| OK | «Sincronizar» en el otro dispositivo trae el estado fusionado |  |

## Nube: ranking

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | ranking: muestra la posición propia resaltada | Tu posición: 3.º con 825 XP |
| OK | ranking: sin cuentas bloqueadas y sin correos |  |
| OK | ranking: pestaña «Nota promedio» |  |
| OK | Inicio: tarjeta de ranking con la posición | RankingTu posición: 3.º de 6 · 825 XP 3.º |

## Nube: usuario normal

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | usuario normal: «Más» no muestra Administración |  |
| OK | usuario normal: #/admin muestra «Acceso restringido» |  |
| OK | RPC admin_usuarios con usuario normal → 403 (42501) | {"admin":403,"codigo":"42501","perfiles":1,"rol":403,"borrar":403,"anon":401,"ajeno":403} |
| OK | reglas del mock: solo su perfil, no cambia su rol, no borra, anon 401, no escribe filas ajenas |  |

## Nube: administración

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | admin: «Más» muestra Administración |  |
| OK | admin ve #/admin con todos los usuarios | 7 filas, 7 registrados |
| OK | resumen: activos hoy y sesiones hoy | activos 2, sesiones 7 |
| OK | la tabla muestra correo y apodo |  |
| OK | tabla ordenable (XP descendente) | pirata@prueba.pe |
| OK | buscador por correo/apodo |  |
| OK | exporta CSV de usuarios | ascenso2026-usuarios-2026-10-15.csv: 7 filas |
| OK | exporta CSV de eventos | 10 eventos |
| OK | detalle: eventos recientes y mapa de calor de actividad | 3 sesiones |

## Nube: bloqueo

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | el admin no tiene botón para bloquearse a sí mismo |  |
| OK | admin bloquea una cuenta desde el panel |  |
| OK | usuario bloqueado → expulsado con «Cuenta bloqueada; contacta al administrador» | Cuenta bloqueada; contacta al administrador. |
| OK | la sesión del bloqueado se cierra |  |
| OK | un bloqueado no puede volver a ingresar |  |
| OK | admin desbloquea la cuenta |  |

## Nube: diagnóstico

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | diagnóstico (admin): Auth, REST, versión del esquema y RLS en orden | 11 pasos |

## Nube: confirmación de correo

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | con confirmación de correo: muestra «Revisa tu correo» |  |
| OK | ingresar antes de confirmar: mensaje legible |  |
| OK | tras confirmar e ingresar quedan guardados el apodo, el nombre, el apellido y la respuesta del ranking | {"apodo":"Confirma","nombre":"Carla","rv":true} |

## Nube: recuperar contraseña

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | «¿Olvidaste tu contraseña?» envía el enlace |  |
| OK | el enlace vuelve a la app con ?code= | http://localhost:8123/?code=… |
| OK | el código se retira de la dirección |  |
| OK | la contraseña nueva funciona |  |

## Nube: progreso sin sincronizar (auditoría)

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | sin conexión: quedan cambios pendientes |  |
| OK | cerrar sesión con cambios sin subir: pide confirmación advirtiendo la pérdida |  |
| OK | al cancelar se conservan la sesión y el progreso local |  |
| OK | ingresar con otra cuenta habiendo cambios sin subir: pide confirmación |  |
| OK | al cancelar no se mezcla ni se borra el progreso de la otra cuenta |  |
| OK | la cuenta dueña reingresa y sus cambios pendientes llegan a la nube |  |

## Nube: errores de página

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | sin excepciones de JavaScript en los escenarios de la nube |  |

## Instalación: estáticas

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | manifest con criterios de instalación (id, name, short_name, start_url relativa, standalone, iconos 192/512 any y maskable, colores) | id=./ |
| OK | index.html con meta iOS y apple-touch-icon |  |
| OK | SW con handler fetch, archivos nuevos en el precache y versión ≥ 1.2.0 (1.4.0 desde el encargo 05; 1.4.1 desde el parche) |  |

## Instalación: modo instalado

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | iPhone con navigator.standalone=true: no aparece la pantalla de instalación (va directo al acceso) |  |
| OK | Android con (display-mode: standalone): no aparece la pantalla de instalación |  |

## Instalación: Android

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | es la primera pantalla: diálogo modal accesible (aria-modal, título, foco en el título, fondo inerte) | {"rol":"dialog","modal":"true","titulo":"Instala Ascensos 2027","foco":"inst-titulo","inerte":true} |
| OK | sin evento todavía: botón deshabilitado «Preparando instalación…» |  |
| OK | beforeinstallprompt capturado con preventDefault() |  |
| OK | al llegar el evento aparece el botón grande «Instalar la app» |  |
| OK | al tocarlo se llama a prompt() del evento (una vez) |  |
| OK | userChoice aceptado → «Lista: ábrela desde tu pantalla de inicio» |  |
| OK | appinstalled escuchado: mantiene el éxito y no vuelve a insistir en el navegador |  |
| OK | userChoice rechazado → aviso y guía manual del menú |  |
| OK | a los 2,5 s sin evento sigue «Preparando instalación…» |  |
| OK | pasados 4 s sin evento: guía manual de Chrome (menú ⋮ → «Instalar app» / «Añadir a pantalla de inicio») |  |
| OK | si el evento llega tarde, vuelve el botón «Instalar la app» |  |

## Instalación: iPhone

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | Safari en iPhone: guía de 3 pasos (Compartir → Añadir a pantalla de inicio → Añadir) | 1 Toca el botón Compartir (el cuadrado c / 2 Desplázate hacia abajo y toca Añadir a / 3 Añadir Toca Añadir (arriba a la derech |
| OK | pasos con iconos SVG propios y sin botón de instalación (iOS no lo permite) |  |
| OK | flecha animada que señala el botón Compartir en la barra inferior | {"abajo":10,"anim":"senalar-abajo"} |
| OK | con prefers-reduced-motion: sin animaciones y pasos visibles | {"flecha":"none","paso":"1"} |
| OK | Chrome en iPhone: texto adaptado (menú ⋯ / Compartir → Añadir a pantalla de inicio), sin la flecha de Safari |  |
| OK | iPad: Compartir en la barra superior y flecha hacia arriba |  |

## Instalación: escritorio

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | escritorio: tarjeta breve «Esta app está pensada para el celular» con el enlace | http://localhost:8123/ |
| OK | escritorio: sin guía de pasos ni botón de instalar (no hubo beforeinstallprompt) |  |
| OK | escritorio: «Seguir en el navegador» permite continuar al acceso |  |

## Instalación: seguir en el navegador

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | «Seguir en el navegador» cierra la pantalla y libera el fondo |  |
| OK | la elección se recuerda 7 días (localStorage) | 2026-10-22T05:18:57.798Z |
| OK | al recargar dentro de los 7 días no vuelve a aparecer |  |
| OK | vencidos los 7 días vuelve a aparecer |  |
| OK | Escape cierra la pantalla (igual que «Seguir en el navegador») |  |
| OK | Ajustes tiene la entrada «Instalar en el celular» |  |
| OK | la entrada de Ajustes vuelve a abrir la pantalla (aunque esté pospuesta) con el foco en el título |  |
| OK | al cerrarla se vuelve a Ajustes |  |

## Instalación: consola

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | sin errores de consola ni excepciones en los escenarios de instalación |  |

## Pago: configuración (admin)

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | admin: Inicio sin indicador de prueba gratis |  |
| OK | Cobro: carga la configuración actual con admin_configurar_pago({}) |  / 20 / 50 / 1 |
| OK | Cobro: valida que el número tenga 9 dígitos |  |
| OK | Cobro: el error de validación se oculta al editar el formulario (auditoría H5) |  |
| OK | Cobro: guarda solo los cambios (jsonb parcial) en el servidor | {"y":"987654321","p":"912345678","lp":15} |
| OK | el monto no cambia si no se toca |  |

## Pago: app sin sesión exige ingreso

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | sin sesión: aunque se abra #/practica, solo se ve la pantalla de acceso (no hay forma de estudiar) |  |
| OK | los datos locales previos se conservan en el dispositivo |  |
| OK | al registrarse: «Conservar y subir» sube el progreso local a la cuenta nueva |  |

## Pago: prueba contando

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | Inicio: «Prueba gratis: 0 de 15 preguntas · 0 de 1 simulacro» | Prueba gratis: 0 de 15 preguntas · 0 de 1 simulacro |
| OK | cada 10 respuestas se envía el lote con registrar_consumo (servidor: 10) | 10 preguntas |
| OK | por debajo del límite la app no se bloquea |  |
| OK | el indicador se actualiza: 10 de 15 preguntas |  |

## Pago: agotado por preguntas

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | la pregunta 15 agota la prueba y aparece la pantalla de bloqueo (tras ver la explicación) | 5 respondidas en la 2.ª práctica |
| OK | al agotarse se envía el consumo pendiente (servidor: 15) |  |
| OK | bloqueo: monto, número de Yape con su titular y texto de ayuda |  |
| OK | sin QR: solo número grande, titular y «Copiar número» |  |
| OK | pantalla completa no cerrable: la app debajo queda inerte y la práctica vuelve a Inicio (sesión guardada) |  |
| OK | Escape no cierra el bloqueo |  |
| OK | el enrutador impide abrir Práctica mientras está agotada |  |
| OK | el enrutador impide abrir Simulacro mientras está agotada |  |
| OK | «Copiar número» copia el número de Yape | Número copiado: 987 654 321 |
| OK | confirmación visual en el botón («¡Copiado!») y el número queda en el portapapeles | ¡Copiado! / 987654321 |
| OK | Plin: muestra su número y «Plinea S/ 20» |  |
| OK | sin voucher: «Enviar comprobante» deshabilitado (aunque haya operación) |  |
| OK | un archivo que no es imagen se rechaza con un mensaje claro |  |
| OK | con voucher y sin operación: el botón sigue deshabilitado |  |
| OK | el número de operación admite solo dígitos |  |
| OK | operación inválida (5 dígitos): mensaje claro y no se envía nada |  |

## Pago: comprobante y corrección

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | con voucher y operación: «Enviar comprobante» habilitado |  |
| OK | sube el voucher a comprobantes/<uid>/<timestamp>.jpg y registra el pago (pendiente) | 1b756192-50da-468d-ad7d-27dd9eb6ac18/1792041560731.jpg |
| OK | el voucher se envía comprimido como JPEG ≤ 1 MB | 1413 bytes |
| OK | plan → pendiente |  |
| OK | «Pago en revisión» con la operación y la miniatura del voucher |  |
| OK | Corregir: formulario con la operación anterior y la captura ya enviada |  |
| OK | la corrección reemplaza el pago pendiente (no duplica) con la nueva captura y operación |  |

## Pago: operación duplicada

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | con el contador del servidor en el límite, al volver al primer plano se bloquea |  |
| OK | operación ya usada en otra cuenta: mensaje claro y no se registra | Ese número de operación de Yape ya fue registrado por otra cuenta. Revisa el número o comunícate con el administrador. |
| OK | tras el error se conservan los datos para corregir |  |

## Pago: panel de pagos

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | Más → Administración: contador de pagos pendientes (1) |  |
| OK | Pagos: apodo, correo, medio, operación, monto y fecha | Ana_Pago Ana Prueba pago.ana@prueba.pe Pendiente Medio Yape Operación 20261015 Monto S/ 20 Fecha 15 oct, 00:19 Verificar |
| OK | el voucher se ve con una URL firmada del almacenamiento privado | 160 px |
| OK | el voucher se amplía en un modal |  |
| OK | rechazar exige motivo |  |
| OK | rechazo con motivo: pago rechazado y la cuenta vuelve a prueba |  |
| OK | filtro «Rechazados» muestra el pago con su motivo |  |

## Pago: rechazo y reintento

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | en «pendiente» la app consulta cada 60 s: muestra el rechazo con su motivo | Tu comprobante fue rechazado. Motivo: «El número de operación no coincide con el voucher.». Revisa los datos y vuelve a enviarlo. |
| OK | reintento: se crea un pago nuevo pendiente (el rechazado se conserva) |  |

## Pago: verificación y desbloqueo

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | «Verificar y desbloquear»: pago aprobado y plan pagado |  |
| OK | la app del usuario se desbloquea sola (sondeo) con la pantalla de agradecimiento |  |
| OK | tras el agradecimiento: Inicio sin bloqueo ni indicador de prueba |  |
| OK | con el plan pagado se puede volver a practicar |  |
| OK | Ajustes → Cuenta muestra «Acceso completo» |  |

## Pago: cortesía

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | Usuarios: columna Plan con el consumo de la prueba | Prueba15/15 preg. · 0/1 sim. |
| OK | «Marcar plan» → Cortesía con confirmación |  |
| OK | la cuenta en cortesía se desbloquea al volver al primer plano |  |
| OK | cortesía: sin bloqueo |  |

## Pago: agotado por simulacro

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | al terminar el simulacro se registra en el servidor (simulacros_prueba = 1) |  |
| OK | el resultado del simulacro se puede ver (no se tapa con el bloqueo) |  |
| OK | agotado por simulacro: al salir del resultado aparece el bloqueo («1 de 1 simulacro») |  |
| OK | el bloqueo ofrece «Cerrar sesión» y «Mi cuenta» |  |
| OK | «Mi cuenta» abre Ajustes → Cuenta con el aviso de la prueba terminada |  |
| OK | «Ver cómo desbloquear» vuelve a la pantalla de pago |  |

## Pago: bloqueo sin conexión

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | sin conexión: con el contador local (12 + 3) en el límite se bloquea igual | 3 respondidas, pendientes 3 |
| OK | aviso: enviar el comprobante requiere conexión |  |
| OK | sin conexión el botón «Enviar comprobante» queda deshabilitado |  |
| OK | sin conexión, al reabrir la app sigue bloqueada (estado guardado en el dispositivo) |  |
| OK | al reconectar se envía el consumo pendiente (servidor: 15) |  |

## Pago: cerrar sesión sin conexión conserva el consumo

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | sin conexión: el consumo pendiente (3) se guarda también en ascenso2026:acceso:pend:<uid> | {"p":3,"s":0} |
| OK | al cerrar sesión sin conexión se borra el estado de acceso, pero el consumo pendiente de la cuenta se conserva | {"acceso":null,"pend":{"p":3,"s":0}} |
| OK | otra cuenta en el mismo dispositivo: no recibe ese consumo y el de la cuenta anterior sigue guardado aparte | pago.dani@prueba.pe: 0; pendiente de usuario@prueba.pe: 3 |
| OK | al volver a ingresar con la misma cuenta se envía el consumo con registrar_consumo (servidor: 12 → 15) y se borra la copia |  |
| OK | la prueba no se reinicia: sigue agotada (15 de 15) y bloqueada |  |

## Pago: detalle de usuario (admin)

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | eventos de pago con examen «—» (no «Mixto») | 5 eventos de pago |
| OK | eventos de pago con su detalle (operación / motivo) desde admin_eventos().detalle | Pago verificado yape · operación 20261016 · pago 780cff59-9bfb-4a26-b990-db6040d6ec02 \| Pago rechazado yape · operación 20261015 · motivo: El número de operación no coincide con  |

## Pago: Explorar consume la prueba

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | Explorar en prueba: aviso discreto «Cada respuesta que reveles cuenta para tu prueba gratis» | Cada respuesta que reveles cuenta para tu prueba gratis |
| OK | revelar 3 fichas (una dos veces) suma 3 al consumo local, una vez por pregunta | pendiente 3, abiertas 3 |
| OK | al ocultar la app se envía el consumo de Explorar con registrar_consumo (servidor: 3) | 3 |
| OK | una ficha ya contada en esta sesión no vuelve a contar |  |
| OK | agotar la prueba revelando fichas en Explorar muestra el bloqueo (servidor: 15) y saca de Explorar | #/inicio |
| OK | con la prueba agotada el enrutador sigue desviando #/explorar a Inicio |  |
| OK | cortesía: Explorar sin aviso y revelar fichas no consume | plan cortesia |

## Pago: admin nunca bloqueado

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | admin: aunque sus contadores superen el límite, nunca ve el bloqueo ni acumula consumo |  |
| OK | admin: Explorar sin aviso de prueba y revelar fichas no consume |  |

## Pago: no admin

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | usuario normal: «Más» no muestra Administración ni el contador de pagos |  |
| OK | usuario normal: #/admin?tab=pagos muestra «Acceso restringido» (sin pestaña Pagos) |  |
| OK | RPC admin_pagos / resolver / configurar / marcar plan → 403 (42501) para un usuario normal | {"pagos":[403,"42501"],"resolver":[403,"42501"],"config":[403,"42501"],"plan":[403,"42501"],"consumo":[400,"22023"],"ajeno":400,"ajenoMsg":"new row violates row-level security policy"} |
| OK | registrar_consumo > 200 → 22023; subir a la carpeta de otro usuario → rechazado |  |

## Pago: consola

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | sin errores de consola ni excepciones en los escenarios de pago |  |

## Respaldo: aviso de 7 días

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | nunca se descargó: Más → Administración muestra el aviso «Respaldo» |  |
| OK | pestaña Respaldo con badge y «Última descarga: nunca» |  |
| OK | última descarga hace 8 días: badge en la pestaña y «Hace más de 7 días» |  |
| OK | última descarga hace 2 días: sin badge («Al día») |  |
| OK | hace 2 días: Más → Administración sin aviso de respaldo |  |

## Respaldo: resumen

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | resumen: totales por tabla de admin_respaldo_resumen() | {"perfiles":61,"estado_progreso":58,"eventos_sesion":233,"ingresos":1,"pagos":4,"configuracion_pago":1} |
| OK | datos sembrados para paginar: > 200 eventos y > 50 estados | {"eventos":233,"estados":58,"perfiles":61,"pagos":4} |
| OK | resumen: vouchers (rutas distintas) y tamaño estimado |  |
| OK | aviso fijo «Respalda antes de cambiar el esquema y una vez por semana» |  |

## Respaldo: descarga completa

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | nombre ascenso2026-respaldo-AAAA-MM-DD-HHMM.json | ascenso2026-respaldo-2026-10-15-0019.json |
| OK | archivo: formato, version 1, version_esquema, version_app, generado_en y resumen |  |
| OK | cada tabla trae tantas filas como su total | perfiles 61/61, estado_progreso 58/58, eventos_sesion 233/233, ingresos 1/1, pagos 4/4, configuracion_pago 1/1 |
| OK | sin filas repetidas pese a las páginas solapadas (deduplicación por clave primaria) |  |
| OK | paginación real: > 200 eventos (páginas de 200) y > 50 estados (páginas de 50) | 233 eventos, 58 estados |
| OK | admin_respaldo se llamó por páginas (más los 2 reintentos) | 11 llamadas (mínimo 10) |
| OK | reintento por página tras 2 cortes de conexión (se informa) | Se reintentaron 2 páginas por fallos de conexión. · cortes en el mock: 2 |
| OK | filas completas (rol, bloqueado, plan, contadores, pagado_en, aprobado_por; configuración de cobro) |  |
| OK | vouchers: rutas distintas de pagos.captura_path | 0ab951e2-99d7-4d31-b6a3-f99a32d25c3a/semilla-0.jpg, 90a39be9-d980-40ad-a59b-59cba4e2331b/semilla-1.jpg, c27384b7-c57e-4411-a38e-c9bf32ae8975/semilla-2.jpg |
| OK | muestra el total de filas descargadas | 358 |
| OK | guarda la fecha de la descarga en localStorage (ascenso2026:admin:ultimo-respaldo) | 2026-10-15T05:19:57.116Z |
| OK | tras descargar desaparece el badge de la pestaña |  |
| OK | tras descargar desaparece el aviso en Más → Administración |  |

## Respaldo: filas que no cuadran

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | una tabla incompleta se vuelve a pedir y, si sigue igual, se descarga igual | {"filas":60,"total":61,"ok":false} |
| OK | aviso con la tabla y la diferencia de filas |  |

## Respaldo: restauración y deshacer

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | lista los perfiles del respaldo con apodo, correo, XP y fecha | 61 cuentas |
| OK | vista previa: XP y preguntas del respaldo frente a los actuales | 5400 vs 100 · 380 vs 7 |
| OK | nota de la vista previa: el celular adoptará el progreso restaurado (lo de más queda en el servidor; «Deshacer») |  |
| OK | actual (100 XP) < respaldo (5400 XP): sin advertencia ámbar |  |
| OK | al cancelar la confirmación no se restaura nada |  |
| OK | admin_restaurar_estado: el estado del servidor es el del respaldo | xp 5400 |
| OK | se guardó una copia del estado anterior en el historial |  |
| OK | evento «restauracion» registrado |  |
| OK | la vista previa se actualiza con el estado actual tras restaurar |  |
| OK | «Deshacer» pide confirmación; sin actividad posterior, sin aviso | timonel@prueba.pe volverá exactamente al progreso que tenía antes de restaurar (antes se guarda una copia del actual en  |
| OK | la cuenta tenía progreso antes: sin el aviso «no tenía progreso guardado» |  |
| OK | «Deshacer» vuelve al estado anterior (y guarda el restaurado con motivo «deshacer») |  |
| OK | «Deshacer» deja de estar disponible al cambiar de pestaña (la restauración se mantiene) |  |

## Respaldo: también plan, apodo y contadores

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | vista previa: plan del respaldo frente al actual | Prueba vs Cortesía |
| OK | la confirmación detalla lo que se restaurará del perfil | Para vigia@prueba.pe: reemplazará su progreso en la nube por el del respaldo (260 XP, 25 preguntas, 15 oct, 00:19); antes se guarda una copi |
| OK | admin_restaurar_perfil: plan, apodo y contadores del respaldo (sin tocar rol ni bloqueo) | {"plan":"prueba","pp":0,"sp":0} |

## Respaldo: progreso actual mayor, actividad posterior y cuenta sin progreso

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | actual > respaldo: advertencia ámbar destacada en la vista previa con las cifras | Atención: hoy la cuenta tiene más progreso que el respaldo (9,000 XP y 500 preguntas frente a 5,400 XP y 380 preguntas). Si restauras, su celular adop · borde rgb(240, 164, 58) |
| OK | la advertencia se repite en el modal de confirmación | Atención: hoy la cuenta tiene más progreso que el respaldo (9,000 XP y 500 preguntas frente a 5,400 XP y 380 preguntas). |
| OK | restaurado pese a la advertencia (5400 XP) |  |
| OK | «Deshacer» con actividad posterior: la confirmación lo advierte | La cuenta tiene actividad posterior a la restauración (última: 15 oct, 00:20). Lo estudiado desde entonces no se conserva en el progreso: qu |
| OK | «Deshacer» devuelve EXACTAMENTE el estado previo (9000 XP); lo estudiado después (5600) queda solo en el historial |  |
| OK | cuenta sin progreso actual: sin advertencia |  |
| OK | deshacer con sin_estado: la cuenta queda sin progreso y el resultado lo explica | La cuenta no tenía progreso guardado antes; el celular volverá a subir el suyo al sincronizar. |

## Respaldo: archivos inválidos

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | archivo inválido rechazado (no JSON, progreso exportado, versión futura, sin perfiles), sin lista de cuentas | ok \| ok \| ok \| ok |

## Respaldo: usuario sin cuenta actual

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | cuenta del respaldo que ya no existe: «Sin cuenta actual» y no se puede elegir |  |
| OK | sin vista previa ni restauración para una cuenta inexistente |  |
| OK | el servidor también lo rechaza (P0002) | [400,"P0002"] |

## Respaldo: validaciones del servidor

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | tabla no permitida, inicio negativo o límite 0 → 22023 | [{"st":400,"code":"22023"},{"st":400,"code":"22023"},{"st":400,"code":"22023"}] |
| OK | límite efectivo: 500 por llamada y 50 en estado_progreso | 500 / 50 |
| OK | deshacer sin restauraciones previas → P0002 |  |

## Respaldo: diagnóstico

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | diagnóstico: paso «Respaldo y restauración» en verde (respaldo_ok) |  |
| OK | diagnóstico: esquema 1.4.0 y ningún paso en rojo |  |

## Respaldo: no admin

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | usuario normal: «Más» sin Administración ni aviso de respaldo |  |
| OK | usuario normal: #/admin?tab=respaldo muestra «Acceso restringido» (sin pestaña Respaldo) |  |
| OK | las 5 RPC de respaldo → 403 (42501) para un usuario normal | [[403,"42501"],[403,"42501"],[403,"42501"],[403,"42501"],[403,"42501"]] |
| OK | el usuario normal no pudo cambiarse el plan |  |

## Respaldo: consola

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | sin errores de consola ni excepciones en los escenarios de respaldo |  |

## Cuenta: registro con nombre y apellido

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | registro: campos Nombre y Apellido y el texto «Tu nombre y apellido solo los ve el administrador…» |  |
| OK | registro: sin nombre no se crea la cuenta |  |
| OK | registro: sin apellido no se crea la cuenta |  |
| OK | registro: apellido de menos de 2 caracteres rechazado |  |
| OK | ninguna cuenta se creó mientras faltaban datos |  |
| OK | tras el alta: pregunta «¿Quieres aparecer en el ranking?» con dos botones | ¿Quieres aparecer en el ranking? |
| OK | el registro guarda nombre y apellido (metadatos del alta) y la respuesta del ranking | {"nombre":"Nina","apellido":"Delgado","apodo":"Nina_D","rv":true} |

## Cuenta: cuenta antigua sin datos

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | al ingresar sin nombre/apellido: pantalla «Completa tus datos» |  |
| OK | la pantalla no se puede saltar: solo tiene «Guardar y continuar» (no hay «Más tarde» ni «Continuar sin conexión») |  |
| OK | Escape no cierra la pantalla obligatoria |  |
| OK | exige el nombre |  |
| OK | exige un apellido de al menos 2 caracteres |  |
| OK | la pantalla repite el texto de privacidad |  |
| OK | sin conexión: la pantalla obligatoria avisa y sigue abierta, sin ningún botón para saltarla | Sin conexión con el servidor. Revisa tu internet e inténtalo de nuevo. Tus datos se guardan en el servidor: vuelve a intentarlo cuando tengas internet. |
| OK | sin conexión no se guardó nada: la cuenta sigue sin nombre ni apellido |  |
| OK | al abrir la app sin conexión con los datos pendientes, «Completa tus datos» vuelve a exigirse |  |
| OK | completar_datos guarda el nombre y el apellido | {"n":"Rosa","a":"Huamán"} |
| OK | queda constancia del evento «datos_completados» la primera vez | 1 eventos |
| OK | tras completar los datos llega la pregunta del ranking, con sus dos botones y sin salida | ¿Quieres aparecer en el ranking? |
| OK | elegir «No, permanecer oculto» guarda ranking_visible = false |  |

## Cuenta: ranking en modo oculto

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | ranking oculto: «Estás en modo oculto… Estarías en el puesto N» (N calculado como si participara) |  Estás en modo oculto: los demás no te ven. Estarías en el puesto 2. Para aparecer, activa «Aparecer en el ran |
| OK | ranking oculto: la lista no trae la fila propia (ni «Tu posición») |  |
| OK | ranking: sin correos ni nombres de nadie |  |
| OK | Inicio: la tarjeta de ranking dice «Modo oculto: estarías en el puesto N» | RankingModo oculto: estarías en el puesto 2 · 260 XP 2.º |
| OK | Ajustes → Cuenta: nombre y apellido editables y el conmutador «Aparecer en el ranking» apagado | Rosa / Huamán / false |
| OK | Ajustes → Cuenta: «Guardar» cambia el nombre y el apellido con completar_datos |  |
| OK | Ajustes → Cuenta: valida el apellido | Escribe tu apellido. De 2 a 60 caracteres, sin los signos < ni >. |
| OK | el conmutador activa el ranking (cambiar_ranking_visible) | ranking_visible = true |
| OK | en modo visible el ranking vuelve a mostrar la fila propia y «Tu posición» |  |
| OK | el conmutador vuelve a dejar la cuenta en modo oculto |  |

## Cuenta: privacidad de los datos personales

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | por REST solo ve su propio perfil (con su nombre) | [{"id":"a0000000-0000-4000-8000-000000000005","correo":"vigia@prueba.pe","nombre":"Rosa María","apellido":"Huamán"}] |
| OK | ranking() no devuelve nombre, apellido ni correo | posicion,apodo,xp,nota_promedio,simulacros,racha,es_yo |
| OK | admin_usuarios y admin_pagos → 403 para un usuario normal | 403 / 403 |
| OK | el cliente no puede escribir ranking_visible por REST (va por RPC) | 403 |

## Cuenta: roles y errores del servidor

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | Usuarios: columnas Nombre, Apellido y Rol | Correo \| Apodo \| Nombre \| Apellido \| Rol \| Último ingreso ▼ \| XP \| Nivel \| Racha \| Preguntas \| Simulacros \| Nota prom. \| Plan \| Estado \| Acciones |
| OK | Usuarios: el administrador ve el nombre, el apellido y el rol de cada cuenta | {"nombre":"Rosa María","apellido":"Huamán","rol":"Usuario"} |
| OK | el administrador no tiene botones para cambiar su propio rol ni para eliminarse |  |
| OK | el administrador asigna el rol «verificador» (con confirmación) |  |
| OK | queda constancia del evento «rol_cambiado» |  |
| OK | degradar al único administrador → 22023 «La base quedaría sin administradores activos» | {"st":400,"code":"22023","message":"La base quedaría sin administradores activos: nombra primero a otro administrador."} |
| OK | con otro administrador activo, cambiarse el rol a sí mismo → 22023 «No puedes cambiar tu propio rol» | {"st":400,"code":"22023","message":"No puedes cambiar tu propio rol: pídeselo a otro administrador."} |
| OK | rol no válido → 22023; usuario inexistente → P0002 | 22023 / P0002 |
| OK | el panel muestra el mensaje de error del servidor | No puedes eliminar la cuenta de un administrador: quítale primero el rol. |
| OK | «Volver a usuario» quita el acceso al panel |  |

## Cuenta: eliminar, papelera y restaurar

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | el modal avisa «Podrás restaurarla durante 30 días» |  usuario@prueba.pe · Lucía Paredes La cuenta deja de entrar a la app al instante y no aparece en el ranking ni en los pa |
| OK | el motivo es obligatorio |  |
| OK | admin_eliminar_cuenta: fecha, motivo y quién la eliminó (no borra nada) | {"en":"2026-10-15T05:20:49.247Z","m":"La persona pidió que se borre su cuenta"} |
| OK | la cuenta desaparece de la tabla de usuarios activos |  |
| OK | Papelera: correo, fecha, motivo y días restantes |  Grumete Lucía Paredes usuario@prueba.pe Eliminada: 15 oct, 00:20 · Motivo: La persona pidió que se borre su cuenta Quedan 30 días Restaurar  |
| OK | la sesión abierta de una cuenta eliminada queda fuera con «Cuenta eliminada; contacta al administrador» | Cuenta eliminada; contacta al administrador. |
| OK | una cuenta eliminada no puede volver a ingresar y ve el mensaje |  |
| OK | no queda sesión guardada de la cuenta eliminada |  |
| OK | el ranking sigue respondiendo al resto |  |
| OK | la cuenta eliminada no aparece en el ranking | Timonel, Almirante, Cadete, Nina_D |
| OK | admin_pagos() del servidor NO devuelve el pago de una cuenta que está en la papelera | sin pagos |
| OK | la fila del pago sigue en la tabla (la papelera no borra nada) |  |
| OK | admin_resolver_pago() rechaza el pago de una cuenta en la papelera (22023, «restáurala primero») | {"st":400,"code":"22023","message":"No se puede resolver este pago: la cuenta está en la papelera; restáurala primero."} |
| OK | el pago rechazado con 22023 sigue pendiente (no se resolvió nada) |  |
| OK | Pagos: la pestaña no muestra el comprobante ni los datos de la cuenta que está en la papelera | No hay pagos pendientesCuando alguien envíe su comprobante aparecerá aquí. |
| OK | admin_restaurar_cuenta: la cuenta vuelve con sus datos intactos (apodo, nombre, plan) | {"apodo":"Grumete","nombre":"Lucía","plan":"prueba"} |
| OK | eventos «cuenta_eliminada» y «cuenta_restaurada» en la bitácora |  |
| OK | tras restaurarla, la cuenta vuelve a entrar a la app (sesión guardada, sin mensaje de error) | {"sesion":true,"error":null,"apodo":"Grumete"} |

## Cuenta: purga de la papelera

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | al abrir Usuarios se llama a admin_purgar_papelera() y se avisa con un toast | Papelera: 1 cuenta purgada de forma definitiva (más de 30 días). |
| OK | la purga guarda la copia en cuentas_purgadas y borra los datos de la cuenta | 1 copias |
| OK | sin privilegio en Auth, el perfil queda marcado purga_pendiente_auth |  |
| OK | el panel avisa de las cuentas pendientes en Authentication → Users |  |
| OK | la purga NO toca una cuenta con menos de 30 días en la papelera |  |
| OK | evento «cuenta_purgada» en la bitácora del administrador | purga definitiva de nina.datos@prueba.pe (c181b569-7b0c-440c-94d0-430a97878fe5) · 30 días en la papelera · pen |
| OK | la purga borró también los eventos de la cuenta purgada |  |
| OK | nadie puede adelantar la purga (p_dias < 30 → 22023) | {"st":400,"code":"22023","message":"Los días de la papelera deben estar entre 30 y 3650 (la papelera protege 30 días)."} |

## Cuenta: el verificador ve solo Pagos

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | verificador: Más → Administración con el texto de Pagos | AdministraciónVerificar los pagos pendientes 1 |
| OK | verificador: sin aviso de respaldo en Más |  |
| OK | verificador: el panel solo muestra la pestaña Pagos | Pagos 1 |
| OK | verificador: ve el comprobante pendiente con sus datos |  GrumeteLucía Paredesusuario@prueba.pe Pendiente MedioYape Operación90000123 MontoS/ 20 Fecha15 oct, 00:21 Ver |
| OK | verificador: ve la imagen del voucher (la <img> carga, sin «Imagen no disponible» ni aviso de permiso) | {"imagen":true,"ancho":1,"falla":null,"marcador":"","aviso":false} |
| OK | verificador: al tocar el voucher se amplía la imagen (sin toast de permiso) | 1 px |
| OK | administrador: el mismo voucher se ve con su URL firmada (la imagen se carga) y sin aviso | 1 px |
| OK | verificador: si el servidor responde 22023 al resolver, la app muestra su mensaje tal cual | No se puede resolver este pago: la cuenta está en la papelera; restáurala primero. |
| OK | el pago no cambia de estado tras el 22023 (sigue pendiente, la cuenta sin plan «pagado») |  |
| OK | verificador: un pago de una cuenta en la papelera no aparece en Pagos | No hay pagos pendientesCuando alguien envíe su comprobante aparecerá aquí. |
| OK | verificador: es el SERVIDOR el que no lo lista (admin_pagos con su sesión tampoco lo devuelve) | [] |
| OK | verificador: tras «Restaurar» el pago vuelve a aparecer en Pagos |  GrumeteLucía Paredesusuario@prueba.pe Pendiente MedioYape Operación90000123 MontoS/ 20 Fecha15 oct, 00:21 Ver |
| OK | el verificador puede verificar un pago y desbloquear la cuenta |  |
| OK | verificador: las RPC de administrador (usuarios, roles, papelera, respaldo, cobro) → 403 (42501) | {"usuarios":[403,"42501"],"eliminar":[403,"42501"],"rol":[403,"42501"],"purgar":[403,"42501"],"respaldo":[403,"42501"],"ultimo":[403,"42501"],"configurar":[403,"42501"]} |
| OK | verificador: aunque pida #/admin?tab=usuarios no ve la tabla ni la papelera |  |

## Cuenta: aviso de respaldo por el servidor

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | sin ningún respaldo registrado: «Último respaldo: nunca» y aviso pendiente |  |
| OK | con el respaldo automático del Mac de ayer: «Último respaldo: fecha (Mac)» y sin aviso | 14 oct, 00:21 (Mac) |
| OK | con el último respaldo hace 9 días: «Hace más de 7 días» | Hace más de 7 días |
| OK | la pestaña Respaldo vuelve a mostrar el badge |  |
| OK | al descargar se registra con admin_registrar_respaldo('app', …) con el tamaño y el resumen | {"origen":"app","bytes":12144,"filas":28} |
| OK | tras descargar: «Último respaldo: … (App)» y el aviso desaparece | 15 oct, 00:21 (App) |

## Cuenta: diagnóstico

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | diagnóstico: paso «Cuenta y roles» en verde (cuenta_ok) |  |
| OK | diagnóstico: esquema 1.4.0 y ningún paso en rojo |  Configuración127.0.0.1:54321 (sustituida para pruebas) · clave sb_publishable_… Red del dispositivoEl navegador indica  |

## Cuenta: consola

| Resultado | Comprobación | Detalle |
|---|---|---|
| OK | sin errores de consola ni excepciones en los escenarios de cuentas y roles |  |

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
- `31_acceso_sin_red.png`: Acceso sin sesión y sin red: mensaje «Sin conexión»
- `32_acceso.png`: Pantalla de acceso: Ingresar / Registrarse, mostrar contraseña, recuperar y privacidad
- `33_registro.png`: Registro: correo, contraseña (mín. 8), nombre, apellido y apodo
- `34_conservar_progreso.png`: Primer ingreso con progreso local: ¿conservarlo y subirlo?
- `35_inicio_sincronizado.png`: Inicio con el indicador de sincronización y la tarjeta de ranking
- `36_ajustes_cuenta.png`: Ajustes → Cuenta: correo, apodo, sincronización, diagnóstico y cerrar sesión
- `37_sin_conexion_pendiente.png`: Sin conexión con sesión: se estudia y los cambios quedan en cola
- `38_ranking.png`: Ranking por XP con la fila propia resaltada
- `39_admin_restringido.png`: Usuario normal en #/admin: acceso restringido
- `40_admin.png`: Panel de administración: resumen, exportación CSV y tabla de usuarios (página completa, sin la barra inferior)
- `41_admin_detalle.png`: Administración: detalle de un usuario con actividad y sesiones (página completa, sin la barra inferior)
- `42_cuenta_bloqueada.png`: Usuario bloqueado: expulsado a la pantalla de acceso
- `43_diagnostico.png`: Diagnóstico de conexión: Auth, REST, versión del esquema, RLS y permisos (página completa, sin la barra inferior)
- `44_revisa_correo.png`: Registro con confirmación de correo activada: «Revisa tu correo»
- `45_instalar_android.png`: Instalar con un toque (Android/Chrome): botón «Instalar la app» con el diálogo nativo
- `46_instalar_iphone.png`: Instalar con un toque (iPhone/Safari): guía animada de 3 pasos y flecha hacia Compartir
- `47_instalar_escritorio.png`: Instalar con un toque (escritorio): tarjeta «abre este enlace en tu teléfono»
- `50_bloqueo_pago.png`: Bloqueo (390×844): prueba agotada, monto, Yape con número, titular y «Copiar número» (sin QR)
- `51_bloqueo_formulario.png`: Bloqueo: voucher con miniatura y número de operación listos para enviar
- `52_pago_en_revision.png`: Pago en revisión: operación, medio, fecha, miniatura y «Corregir»
- `53_admin_pagos.png`: Administración → Pagos: pendientes con voucher, «Verificar y desbloquear» y «Rechazar» (página completa, sin la barra inferior)
- `54_admin_cobro.png`: Administración → Cobro: números de Yape y Plin, titulares, monto, límites de la prueba y texto de ayuda (página completa, sin la barra inferior)
- `55_pago_rechazado.png`: Comprobante rechazado: motivo y formulario para reintentar
- `56_pago_verificado.png`: Pago verificado: agradecimiento antes de volver a Inicio
- `57_inicio_prueba.png`: Inicio durante la prueba gratis: indicador discreto de preguntas y simulacros
- `58_bloqueo_sin_conexion.png`: Bloqueo sin conexión: se ven los datos de pago; enviar requiere internet
- `60_admin_respaldo.png`: Administración → Respaldo: aviso, totales por tabla, última descarga, «Descargar respaldo» y «Restaurar progreso de un usuario»
- `61_restaurar_previa.png`: Restaurar progreso: vista previa del respaldo frente al actual, casilla «También plan, apodo y contadores» y nota «El celular del usuario adoptará el progreso restaurado…»
- `62_ajustes_actualizacion.png`: Ajustes → Aplicación: versión instalada y «Buscar actualización» («Ya tienes la última versión»)
- `70_registro_nombre.png`: Registro: correo, contraseña, Nombre y Apellido obligatorios, apodo y el texto de privacidad
- `71_pregunta_ranking.png`: Pregunta obligatoria del ranking: «Sí, aparecer» / «No, permanecer oculto»
- `72_ranking_oculto.png`: Ranking en modo oculto: aviso con el puesto estimado y la lista sin la fila propia
- `73_admin_usuarios_roles.png`: Administración → Usuarios: columnas Nombre, Apellido y Rol con las acciones de rol y «Eliminar cuenta»
- `74_admin_papelera.png`: Administración → Usuarios: sección Papelera con la fecha, el motivo, los días restantes y «Restaurar»
- `75_ajustes_cuenta_ranking.png`: Ajustes → Cuenta: nombre y apellido editables y el conmutador «Aparecer en el ranking» (página completa, sin la barra inferior)
- `76_cuenta_eliminada.png`: Cuenta eliminada: la app no deja entrar y muestra «Cuenta eliminada; contacta al administrador»
- `77_verificador_pagos.png`: Panel del verificador: solo la pestaña Pagos, con el comprobante pendiente y la imagen del voucher (página completa, sin la barra inferior)
- `78_diagnostico_cuenta.png`: Diagnóstico de conexión con el paso «Cuenta y roles» (esquema 1.4.0) (página completa, sin la barra inferior)

## Limitaciones de estas pruebas

- Se ejecutan en Chromium. Safari iOS no está disponible en este entorno: la instalación en iPhone y el comportamiento de `black-translucent` y las zonas seguras deben verificarse en un dispositivo real.
- Los sonidos (Web Audio) y la vibración no se verifican de forma automática.
- Pantalla de instalación: iOS y Android se emulan en Chromium con su *user agent*; `beforeinstallprompt` y `appinstalled` se simulan (los eventos reales de Chromium se bloquean en esas pruebas). El diálogo nativo de Chrome y el menú Compartir de Safari deben verificarse en dispositivos reales.
- Supabase real no es accesible desde el entorno de desarrollo: Auth/REST se prueban con `pruebas/mock-supabase.mjs` y el SQL con PostgreSQL 16 local. Tras publicar, verificar con Ajustes → Diagnóstico de conexión.
