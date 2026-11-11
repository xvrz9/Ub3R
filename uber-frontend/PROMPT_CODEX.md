# Prompt para Codex: terminar el frontend Ub3R (Ionic + Angular)

Vas a terminar un frontend que ya existe y ya compila. El objetivo es dejarlo completo, funcional y con apariencia tipo Uber, sin romper lo que funciona y sin inventar nada del backend. Lee este documento entero antes de tocar un archivo.

## 1. Contexto

- Proyecto de clase: app tipo Uber para la ciudad de Neiva (Huila, Colombia) con tres roles: `client`, `driver`, `admin`.
- Este repositorio contiene solo el frontend. El backend es una API REST en Laravel que corre en el servidor del docente, dentro de la red del salón. No tienes su código ni su documentación, y lo más probable es que no puedas alcanzarla desde tu entorno.
- El autor debe sustentar este código en clase. Por eso el código debe ser simple, plano y comentado en español.

### Dónde trabajar

- Carpeta de trabajo: `uber-frontend/` (la que contiene este archivo). Todo lo que hagas va aquí.
- La carpeta padre tiene otra copia vieja en `../src/` con su propio `package.json`. No la toques ni la uses como referencia.
- La raíz de Git es la carpeta padre. No hagas commit ni push salvo que el usuario lo pida.
- `uber-frontend/` no tiene `node_modules` propio: hoy compila porque resuelve los paquetes desde `../node_modules` (los dos `package.json` declaran las mismas dependencias). Antes de instalar algo nuevo ejecuta `npm install` dentro de `uber-frontend/`.

### Stack (verificado en `package.json`)

Angular 22.2.3 (componentes standalone, rutas con `loadComponent`), `@ionic/angular` ^9, Capacitor 8, TypeScript ~6.0 en modo estricto, RxJS ~7.8, Vitest + JSDOM, ESLint. Scripts: `npm start`, `npm run build`, `npm test`, `npm run lint`.

### Estado verificado el 10 de noviembre de 2026

- `npx ng build --configuration development` termina bien. Único aviso: `NG8113: All imports are unused` en `src/app/admin-dashboard/admin-dashboard.page.ts`.
- Pruebas y lint no se ejecutaron. Los `.spec.ts` de los tres dashboards están vacíos (0 bytes).
- `README.md` y `CONTEXTO_PROYECTO.md` están parcialmente desactualizados (por ejemplo, mencionan otras IP de la API y un tema oscuro que ya no se usa). Cuando un documento y el código se contradigan, manda el código.

## 2. Reglas que no se negocian

1. **No inventes backend.** Solo existen los endpoints, cuerpos y campos de la sección 3. No agregues endpoints, parámetros ni campos nuevos, y no cambies los cuerpos que ya se envían. Si una función necesitaría algo que la API no ofrece, resuélvelo en el frontend o no la hagas, y dilo en tu reporte final.
2. **No cambies `API_URL`** en `src/app/api.config.ts` (`http://20.20.1.22:8000/api`). Es la única fuente de la URL.
3. **No dejes datos falsos ni modo demo** en el código final: nada de usuarios, viajes o métricas inventadas. La única simulación permitida es la posición de los carros en el mapa (sección 5.3), porque la API no entrega GPS.
4. **Angular aquí funciona sin Zone.js.** Una propiedad normal que cambia después de un `await` no repinta la vista. Todo estado visible que cambie de forma asíncrona debe ser un `signal`. Los dashboards de cliente y conductor ya lo hacen; sigue ese patrón.
5. **Estructura plana y standalone.** Nada de `AppModule`, ni carpetas `core/` o `shared/`. Las páginas van en `src/app/<nombre>/` y los servicios en `src/app/`. Selectores `app-*`, clases con sufijo `Page` o `Component` (lo exige ESLint).
6. **Única dependencia nueva permitida:** `leaflet` y `@types/leaflet`. Nada de Google Maps, Mapbox ni servicios que pidan clave o tarjeta.
7. **Estilos en `src/global.scss`.** `angular.json` limita cada hoja de componente a 4 KB, por eso todo el diseño vive en el archivo global con clases `u-*`. Reutiliza las clases y los tokens `--u-*` existentes antes de crear otros. Los `.scss` de página se quedan casi vacíos.
8. **Cero emojis** en interfaz, código, comentarios y documentación. Usa iconos SVG en línea (o `ion-icon` si confirmas que compila con el mismo patrón de imports de `@ionic/angular` que usa el proyecto).
9. **Comentarios en español** sobre cada función importante: qué hace y con qué endpoint habla. Mismo estilo que el código actual. Prefiere `async/await` con los servicios existentes; nada de RxJS elaborado.
10. **Textos de interfaz en español**, tono cercano, como los actuales.
11. **Conserva las claves de `localStorage`:** `token`, `user`, `activeTrip`. Puedes agregar claves nuevas solo donde este documento lo indica.
12. **No simplifiques ni elimines funciones que ya sirven** (estimación, solicitud, cancelación, consulta cada 5 s, flujo del conductor, validaciones del registro). Mejora alrededor de ellas.

## 3. Contrato de API (lo único que existe)

Extraído de las llamadas del propio frontend. Todas las peticiones llevan `Accept: application/json` y, con sesión, `Authorization: Bearer <token>`.

| Perfil | Método y ruta (relativa a `API_URL`) | Cuerpo enviado | Campos de respuesta que el frontend lee |
|---|---|---|---|
| Auth | `POST /auth/login` | `{ login, password }` | `access_token`, `user` (con `name`, `role`) |
| Auth | `POST /auth/register` | cliente: `name, email, password, role` y `phone` opcional. Conductor: además `license_number, plate, brand, model, year, capacity` y `color` opcional | `access_token`, `user` |
| Auth | `POST /auth/logout` | `{}` | nada |
| Cliente | `POST /client/estimate-fare` | `origin_latitude, origin_longitude, destination_latitude, destination_longitude` | `estimate.estimated_fare`, `estimate.distance_km`, `estimate.duration_min` |
| Cliente | `POST /client/ride-requests` | `origin_name, origin_latitude, origin_longitude, destination_name, destination_latitude, destination_longitude` | nada |
| Cliente | `GET /client/active` | — | `has_active`, `type` (`request` o `trip`), `data` con `id`, `status`, `estimated_fare`, `origin_name`, `destination_name`, `driver.user.name`, `driver.user.phone`, `vehicle.brand/model/color/plate` |
| Cliente | `POST /client/cancel/{id}` | `{ reason }` | nada |
| Conductor | `PUT /driver/availability` | `{ status: 'available' \| 'unavailable' }` | nada. 403 = conductor sin aprobar |
| Conductor | `GET /driver/ride-requests` | — | `requests[]` con `id`, `estimated_fare`, `estimated_distance_km`, `origin_name`, `destination_name`, `client.name` |
| Conductor | `POST /driver/ride-requests/{id}/accept` | `{}` | `trip` (`id`, `status`, `estimated_fare`). 409 = otro conductor la tomó |
| Conductor | `POST /driver/trips/{id}/arrive` | `{}` | `trip.status` |
| Conductor | `POST /driver/trips/{id}/start` | `{}` | `trip.status` |
| Conductor | `POST /driver/trips/{id}/complete` | `{ actual_distance_km, actual_duration_min }` | `trip.final_fare` |
| Admin | `GET /admin/dashboard` | — | `stats`: `total_clients, total_drivers, pending_drivers, approved_drivers, active_trips, completed_trips, cancelled_trips, total_revenue` |
| Admin | `GET /admin/drivers?approval_status=pending` | — | `drivers[]` con `id`, `user.name`, `user.email`, `license_number`, `vehicles[0].brand/model/plate` |
| Admin | `PATCH /admin/drivers/{id}/approval` | `{ approval_status: 'approved' \| 'rejected', admin_notes }` | nada |

Estados de viaje conocidos: `requested`, `assigned`, `driver_arrived`, `in_progress`. Errores: `error.message` y, en validación 422, `error.errors` (objeto de arreglos).

Lo que **no** se sabe y por tanto no puedes asumir:

- Si `GET /client/active` y `GET /driver/ride-requests` devuelven las coordenadas de origen y destino. Léelas de forma defensiva (sección 5.2).
- Si la API entrega la posición del conductor. No hay evidencia: trátala como inexistente.
- Si se puede registrar un administrador. No hay evidencia: no agregues ese rol al registro.
- No hay endpoints de historial, perfil, pagos, calificaciones ni listado de usuarios. No construyas pantallas para eso.

## 4. Qué hay hoy y qué falta

| Parte | Estado actual | Qué falta |
|---|---|---|
| Login | Funciona, usa signals y clases `u-*` | Solo pulido menor (sección 9) |
| Registro | Funciona para cliente y conductor, con validación | Tiene emojis en las tarjetas de rol; pulido (sección 9) |
| Cliente | Funciona con signals: estima, solicita, consulta cada 5 s, cancela. Origen y destino salen de dos `<select>` con 5 lugares de Neiva | No hay mapa. Tiene un emoji en el saludo |
| Conductor | Funciona con signals: disponibilidad, lista, aceptar, llegar, iniciar, finalizar | No hay mapa. Tiene emojis. La disponibilidad siempre arranca apagada al recargar |
| Administrador | Existe pero está a medias: usa propiedades normales (no repinta tras los `await`), `$any(this)` en la plantilla, HTML crudo con clases viejas (`dash__*`, `admin-*`, `auth__*`), y `auth__boton` / `dash__boton-claro` ni siquiera existen como clase sola. `global.scss` lo marca como "pendiente de rediseño" (sección 9 del archivo) | Rehacerlo completo (sección 8) |
| Guard | Solo revisa que haya token | Validar el rol por ruta |
| Interceptor | Agrega el token a todas las peticiones, sin mirar el destino | Limitarlo a la API propia (ver 5.4) |
| Sobrantes | `home/home.page.html` y `home/home.page.scss` son la plantilla "Blank" de Ionic y no se usan (la página tiene plantilla en línea) | Eliminarlos |

## 5. Tarea principal: mapa de Neiva con conductores y recorrido animado

Es lo más importante del encargo. Debe verse lo más parecido posible a Uber: el mapa ocupa la pantalla y la información vive en un panel inferior.

### 5.1 Tecnología

- Instala `leaflet` y `@types/leaflet`. Carga su CSS con `@import "leaflet/dist/leaflet.css";` en `src/global.scss`, junto a los imports de Ionic.
- Mosaicos sin clave, estilo claro parecido a Uber: `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png` con `subdomains: 'abcd'`. La atribución es obligatoria y debe verse: `&copy; OpenStreetMap contributors &copy; CARTO`.
- Vista inicial centrada en Neiva: centro `[2.9345, -75.2890]`, zoom 14, `minZoom` 12, y `maxBounds` aproximados de `[2.86, -75.36]` a `[3.02, -75.20]` para que no se salga de la ciudad.
- No uses los marcadores por defecto de Leaflet (sus imágenes se rompen con el empaquetador). Todos los marcadores son `L.divIcon` con SVG en línea: punto negro redondo para el origen, cuadrado negro para el destino (igual que los iconos `u-ruta__icono` actuales) y un carro visto desde arriba que rota según el rumbo.

### 5.2 Archivos nuevos

- `src/app/lugares.ts`: mueve aquí los 5 lugares que hoy están en `client-dashboard.page.ts`, con exactamente los mismos nombres y coordenadas. No agregues lugares con coordenadas inventadas. Exporta también una función que resuelva un punto a partir de un objeto de la API: primero usa `origin_latitude` / `origin_longitude` (o `destination_*`) si vienen y son números válidos; si no, busca el nombre en la lista de lugares; si tampoco, devuelve `null` y el mapa simplemente no dibuja ese punto.
- `src/app/route.service.ts`: pide la geometría de la ruta por calles al servidor público de OSRM: `https://router.project-osrm.org/route/v1/driving/{lngOrigen},{latOrigen};{lngDestino},{latDestino}?overview=full&geometries=geojson` (ojo: OSRM recibe longitud primero). Tiempo máximo de 6 s. Si falla o no hay internet, devuelve una línea recta entre los dos puntos; el mapa nunca debe quedar roto por esto. La distancia, la duración y la tarifa que se muestran al usuario siguen saliendo solo de la API propia, no de OSRM.
- `src/app/map/map.component.ts` (`MapComponent`, selector `app-map`): componente standalone reutilizado por cliente y conductor. Recibe origen, destino, el estado del viaje y un identificador del viaje; emite el punto tocado en el mapa. Toda la lógica de Leaflet vive aquí, no en las páginas.

Cuidados técnicos del componente:

- Crea el mapa cuando el contenedor ya tiene tamaño y llama `invalidateSize()` al entrar a la vista (`ionViewDidEnter` de la página) y al redimensionar; de lo contrario Leaflet pinta mosaicos grises dentro de Ionic.
- Destruye el mapa y cancela animaciones y temporizadores en `ngOnDestroy`.
- La página consulta la API cada 5 s y reemplaza el objeto del viaje. El mapa solo debe reaccionar cuando cambian el identificador o el estado; no debe reiniciar animaciones ni volver a pedir la ruta en cada consulta.
- Respeta `prefers-reduced-motion`: sin animación, coloca el carro directamente en su posición final.

### 5.3 Comportamiento por estado

La API no entrega la ubicación de los conductores, así que la posición de los carros es una **simulación visual hecha en el frontend**. Déjalo dicho en un comentario en el componente y en la documentación. No la presentes como GPS real en ningún texto de la interfaz.

Cliente:

| Momento | Qué muestra el mapa |
|---|---|
| Sin viaje, eligiendo ruta | Marcadores de origen y destino. Al cambiar cualquiera, se ajusta el encuadre. Con tarifa estimada, se dibuja la ruta por calles en línea negra gruesa |
| `requested` | Ruta dibujada, un pulso tipo radar sobre el origen y entre 4 y 6 carros simulados moviéndose suavemente cerca del origen. Sus posiciones se derivan del id de la solicitud para que no salten en cada consulta ni al recargar |
| `assigned` | Desaparecen los demás carros. Un solo carro recorre una ruta por calles desde un punto cercano (entre 600 y 900 m) hasta el origen, rotando según el rumbo |
| `driver_arrived` | El carro queda detenido en el origen |
| `in_progress` | El carro recorre la ruta de origen a destino y se detiene al llegar |
| Viaje terminado o cancelado | El mapa vuelve al estado inicial |

Conductor:

| Momento | Qué muestra el mapa |
|---|---|
| Desconectado | Mapa de Neiva con su carro detenido, atenuado |
| En línea, sin viaje | Su carro y, si se pueden resolver las coordenadas, un marcador en el origen de cada solicitud pendiente |
| `assigned` | Ruta de su carro al punto de recogida, con el carro avanzando |
| `driver_arrived` | Carro detenido en el punto de recogida |
| `in_progress` | Carro recorriendo la ruta de origen a destino |

La animación usa `requestAnimationFrame`, avanza a lo largo de la polilínea de forma proporcional a la distancia y dura un tiempo fijo definido en constantes al inicio del archivo (por ejemplo, 20 s el acercamiento y 40 s el viaje).

### 5.4 Interceptor (obligatorio antes de usar OSRM)

Hoy `jwt.interceptor.ts` agrega el token a cualquier petición. Cámbialo para que el encabezado `Authorization` y la reacción al 401 apliquen solo cuando la URL empieza por `API_URL`. Así el token del usuario nunca viaja a OSRM ni a ningún tercero. Para OSRM puedes usar `fetch` directamente.

## 6. Dashboard del cliente

- Nuevo diseño: mapa a pantalla completa detrás; barra superior flotante con la marca y el botón Salir; panel inferior blanco con esquinas redondeadas, sombra y altura máxima cercana al 55 % de la pantalla con desplazamiento interno. En pantallas anchas el panel pasa a ser una columna lateral de unos 420 px.
- Dentro del panel va lo que ya existe, sin perder nada: selectores de origen y destino, botón de tarifa, tarjeta de tarifa estimada, estado del viaje con la barra de pasos, datos del conductor y del vehículo, avisos y botón de cancelar.
- Elegir en el mapa: conserva los dos selectores y agrega la opción de tocar el mapa para fijar el origen o el destino (el que esté activo). El punto elegido se envía con las mismas claves de siempre y con un nombre del tipo `Punto en el mapa (2.9312, -75.2871)`. Sigue impidiendo que origen y destino sean iguales.
- Guarda en `localStorage` (clave nueva `lastRoute`) el origen y el destino de la última solicitud, para poder dibujar la ruta tras recargar si la API no devuelve coordenadas. Bórrala cuando el viaje termine, se cancele o se cierre sesión.
- Quita el emoji del saludo.

## 7. Dashboard del conductor

- Mismo diseño de mapa más panel inferior que el cliente.
- Conserva todo el flujo actual: interruptor, lista de solicitudes, aceptar, llegar, iniciar, finalizar con distancia y duración reales.
- Disponibilidad tras recargar: no hay endpoint para leerla. Guarda la preferencia en `localStorage` (clave nueva `driverAvailable`) y, al abrir la página, si estaba en línea vuelve a enviar `PUT /driver/availability` con `available` para quedar sincronizado. Si responde 403, apágala y muestra el aviso que ya existe. Bórrala al cerrar sesión.
- Protege la lectura de `activeTrip` con `try/catch` (hoy un JSON dañado rompe la página).
- Al finalizar, valida que distancia y duración sean números mayores que cero antes de llamar a la API.
- Reemplaza los emojis de los estados vacíos por iconos SVG.

## 8. Panel de administrador (rehacer)

Reescribe `admin-dashboard.page.ts` y `.html` con el mismo lenguaje visual del resto: `ion-header` con `u-topbar` y la marca con rol "Administrador", `ion-content` con `u-content`, `u-page u-page--wide`, tarjetas `u-card`, avisos `u-aviso`, botones `u-btn`.

- Todo el estado visible en signals. Elimina `$any(this)` y los imports sin usar (debe desaparecer el aviso NG8113).
- Métricas: las ocho actuales, en una cuadrícula que se adapta (2 columnas en móvil, 4 en pantallas anchas), con los ingresos destacados y en pesos colombianos. Estado de carga y estado de error con botón de reintentar.
- Conductores: pestañas Pendientes, Aprobados y Rechazados, que usan el mismo endpoint cambiando `approval_status` por `pending`, `approved` o `rejected` (los mismos valores que ya acepta el `PATCH`). Solo `pending` está confirmado en el código actual; si la API falla con los otros dos, muestra el error dentro de esa pestaña y que Pendientes siga funcionando. Para esto, `AdminService` recibe el estado como parámetro en lugar de tenerlo fijo.
- Cada conductor: inicial en avatar, nombre, correo, licencia y vehículo (si viene). En Pendientes: botones Aprobar y Rechazar. Rechazar pide confirmación y permite escribir la nota; si se deja vacía se envían las notas fijas actuales (`Documentación verificada.` / `Rechazado por el administrador.`). Deshabilita los botones mientras la petición está en curso.
- Tras decidir, recarga la lista y las métricas, y muestra el aviso de éxito. Botón "Actualizar" manual. Estado vacío por pestaña.
- El 403 se sigue traduciendo a "Esta cuenta no es administrador".
- Al terminar, borra de `global.scss` la sección 9 ("Clases heredadas usadas por el panel de administrador") después de confirmar con una búsqueda que ninguna plantilla usa ya `dash__*`, `admin-*`, `metrica*` ni `auth__*`.

## 9. Registro, login y base

Registro:

- Sustituye los emojis de las tarjetas "Pasajero" y "Conductor" por iconos SVG.
- Agrega confirmación de contraseña y el botón Ver/Ocultar que ya tiene el login. La confirmación solo se valida en el frontend; no se envía.
- No cambies el cuerpo que se envía ni las validaciones existentes. No agregues el rol administrador.

Login:

- Sin cambios funcionales. Si ya hay sesión al abrir `/login` o `/register`, redirige a `/home`.

Rutas y sesión:

- `authGuard`: además del token, valida el rol. Declara el rol esperado en cada ruta con `data: { role: '...' }`; si no coincide, redirige a `/home` (que ya reparte según el rol).
- `HomePage`: si hay token pero el rol no es reconocido, limpia la sesión antes de ir a `/login`.
- Centraliza la limpieza: `clearSession()` también debe borrar `activeTrip`, `lastRoute` y `driverAvailable`.
- Elimina `src/app/home/home.page.html` y `home.page.scss` (sin uso).

Pulido general:

- Revisa cada pantalla a 360 px, 768 px y 1280 px de ancho: nada desbordado, nada cortado, botones alcanzables con el pulgar.
- Todo botón que dispara una petición muestra carga y se deshabilita. Todo listado tiene estado vacío. Todo error de red tiene mensaje legible.
- Foco visible y `aria-label` en botones que solo tienen icono.

## 10. Orden de trabajo

Haz una fase a la vez y compila al terminar cada una. No pases a la siguiente con errores.

0. Línea base: `npm install` en `uber-frontend/`; ejecuta build, lint y pruebas, y anota el resultado para compararlo al final.
1. Base: interceptor limitado a `API_URL`, guard por rol, limpieza de sesión, sobrantes de `home`.
2. Mapa: `lugares.ts`, `route.service.ts`, `MapComponent`.
3. Cliente con mapa.
4. Conductor con mapa.
5. Panel de administrador.
6. Registro, login y eliminación de todos los emojis.
7. Limpieza de CSS heredado, pruebas, documentación.

## 11. Verificación final

Debe cumplirse todo:

- `npm run build` (producción) sin errores ni avisos, y dentro de los presupuestos de `angular.json`.
- `npm run lint` sin errores.
- `npm test` pasa. Los tres `.spec.ts` vacíos deben tener al menos la prueba de creación, con el mismo patrón de `login.page.spec.ts` más los proveedores que hagan falta (`provideHttpClient`, `provideRouter`). Leaflet no debe romper las pruebas en JSDOM.
- Una búsqueda de emojis en `src/` no devuelve nada.
- Una búsqueda de `$any(`, `dash__`, `auth__` y `admin-header` en `src/` no devuelve nada.
- `API_URL`, los endpoints y los cuerpos de las peticiones son idénticos a los de la sección 3 (salvo el parámetro `approval_status` del listado de administrador, descrito en la sección 8).
- No queda ningún dato falso, credencial de prueba ni bandera de demostración.
- Si no puedes alcanzar la API, dilo: no afirmes haber probado flujos contra el servidor. Verifica lo que sí puedes (compilación, pruebas, mapa, ruta y animación en el navegador).

## 12. Entrega

1. Actualiza `CONTEXTO_PROYECTO.md` y `README.md` solo donde quedaron falsos: URL de la API, mapa, panel de administrador, guard por rol, claves de `localStorage`, y la aclaración de que la posición de los carros es simulada.
2. Reporte final corto con: archivos creados, modificados y eliminados; resultado de build, lint y pruebas; qué no pudiste verificar contra la API real; y cualquier cosa de este documento que no hiciste y por qué.
