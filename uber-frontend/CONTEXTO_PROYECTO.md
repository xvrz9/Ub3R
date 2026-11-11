# Contexto verificable del proyecto `uber-frontend`

Este documento describe el estado del repositorio a partir de sus archivos fuente y de configuración. Está pensado como contexto para una IA que vaya a ayudar con el proyecto.

## Cambios del 10 de noviembre de 2026 (prevalecen sobre el resto del documento)

- **Mapa de Neiva** con Leaflet (`leaflet` y `@types/leaflet` son las únicas dependencias nuevas), mosaicos de CARTO/OpenStreetMap y rutas por calles del servidor público de OSRM. Archivos: `src/app/map/map.component.ts`, `src/app/route.service.ts`, `src/app/lugares.ts`. En `angular.json` se agregó `allowedCommonJsDependencies: ["leaflet"]`.
- **Los carros del mapa son una simulación visual**: la API no entrega la ubicación del conductor. Buscando: ondas y 5 carros cerca del origen. Asignado: un carro va por calles hasta el origen (20 s). Llegó: detenido en el origen. En viaje: recorre la ruta (40 s). Las posiciones se derivan del id del viaje.
- **Pasajero y conductor**: mapa a pantalla completa con panel inferior (columna izquierda en pantallas de 900 px o más). El pasajero puede tocar el mapa para fijar origen o destino (se envía con el nombre `Punto en el mapa (lat, lng)`) e intercambiar origen y destino.
- **Coordenadas en el mapa**: se leen de `origin_latitude`/`origin_longitude` (o `destination_*`) si la API las manda; si no, por nombre de lugar conocido; si no, del nombre `Punto en el mapa (...)`. No está confirmado que la API devuelva coordenadas en `GET /client/active` ni en `GET /driver/ride-requests`.
- **Panel de administrador reescrito** con signals, sin `$any(this)`: métricas con estados de carga y error, pestañas Pendientes/Aprobados/Rechazados (`GET /admin/drivers?approval_status=...`; solo `pending` estaba confirmado), rechazo con confirmación y nota opcional, botón Actualizar.
- **Registro**: sin emojis (iconos SVG), con confirmación de contraseña (solo en el frontend, no se envía) y botón Ver/Ocultar. El cuerpo enviado no cambió.
- **Rutas**: `authGuard` valida el rol de cada dashboard con `data.role`; `guestGuard` saca de `/login` y `/register` a quien ya tiene sesión; ruta comodín a `/home`. `HomePage` limpia la sesión si el rol no se reconoce. Se eliminaron `home.page.html` y `home.page.scss` (no se usaban).
- **Interceptor**: solo agrega el token y reacciona al 401 en peticiones que empiezan por `API_URL`.
- **Sesión**: `AuthService` ya usa `API_URL`. `clearSession()` borra `token`, `user`, `activeTrip`, `lastRoute` y `driverAvailable`. `getUser()` tolera un JSON dañado.
- **Conductor**: guarda `driverAvailable` y al volver reenvía `PUT /driver/availability`; lectura de `activeTrip` protegida; valida distancia y duración mayores que cero antes de finalizar.
- **Estilos**: se eliminó la sección heredada del administrador (`dash__*`, `admin-*`, `metrica*`, `auth__*`) y se agregaron las secciones de mapa y administrador en `global.scss`. Sin emojis en todo `src/`.
- **Calidad**: los servicios y páginas usan `inject()`. Build de producción sin avisos, `npm run lint` sin errores y `npm test` con 8 archivos y 12 pruebas aprobadas. `.browserslistrc` se ajustó a los navegadores que soporta Angular 22.
- **No verificado contra la API real** (estaba apagada): ningún flujo se probó contra el servidor.

## Regla de evidencia

- Este repositorio contiene el **frontend**. No contiene el código ni la documentación contractual del backend.
- Las rutas HTTP, cargas útiles y formas de respuesta indicadas aquí se extraen de las llamadas y de los campos que el frontend lee. No constituyen una especificación confirmada del servidor.
- Cuando algo no está implementado o no puede deducirse del código, se indica expresamente en vez de completarlo con supuestos.
- La salida compilada está presente en `www/`, pero se ignora por Git. La fuente de verdad para cambios es `src/` y los archivos de configuración de la raíz.

## Propósito y alcance actual

Es una aplicación Ionic con Angular para un flujo de transporte con tres perfiles: `client`, `driver` y `admin`. Implementa:

- inicio y cierre de sesión;
- registro de clientes y conductores;
- redirección posterior al acceso según el rol guardado localmente;
- solicitud, estimación, seguimiento y cancelación de viajes para clientes;
- disponibilidad, aceptación y avance manual de viajes para conductores;
- métricas y aprobación/rechazo de conductores para administradores.

Hay un mapa de Neiva con posición simulada de los carros (ver la sección de cambios). No hay geolocalización del dispositivo, pagos, chat, notificaciones push, recuperación de contraseña, historial de viajes ni una administración de usuarios distinta de la aprobación de conductores.

## Tecnología y ejecución

| Área | Implementación observada |
| --- | --- |
| Framework UI | `@ionic/angular` `^9.0.0` |
| Framework web | Angular `22.2.3`, con componentes standalone y carga diferida de rutas |
| Lenguaje | TypeScript `~6.0.0`, con modo estricto habilitado |
| HTTP/reactividad | `HttpClient`, interceptores funcionales y RxJS `~7.8.0`; los servicios convierten observables a `Promise` con `firstValueFrom` |
| Móvil | Capacitor 8; `appId: io.ionic.starter`, `appName: uber-frontend`, directorio web `www` |
| Pruebas | Vitest con JSDOM, configurado por Angular |
| Calidad | ESLint con `angular-eslint` y `typescript-eslint` |

Scripts definidos en `package.json`:

```text
npm start       # ng serve
npm run build   # ng build (producción por defecto)
npm run watch   # ng build --watch --configuration development
npm test        # ng test
npm run lint    # ng lint
```

Dependencias declaradas: `@angular/common`, `@angular/compiler`, `@angular/core`, `@angular/forms`, `@angular/platform-browser` y `@angular/router` (`22.2.3`); `@ionic/angular` (`^9.0.0`); `@capacitor/app` (`8.1.2`), `@capacitor/core` (`8.5.3`), `@capacitor/haptics` (`8.0.2`), `@capacitor/keyboard` (`8.0.6`) y `@capacitor/status-bar` (`8.0.4`); `ionicons` (`^8.1.0`), `rxjs` (`~7.8.0`) y `tslib` (`^2.3.0`). Dependencias de desarrollo: `@angular/build` y `@angular/cli` (`22.2.4`), `@angular/compiler-cli` y `@angular/language-service` (`22.2.3`), `@capacitor/cli` (`8.5.3`), `@ionic/angular-toolkit` (`^13.0.0`), `angular-eslint` (`22.6.0`), `eslint` (`^10.10.0`), `jsdom` (`^30.1.1`), `typescript` (`~6.0.0`), `typescript-eslint` (`^8.61.0`) y `vitest` (`~5.0.5`).

El proyecto se denomina `app` en `angular.json`. El build publica en `www/`; producción usa hash de salida, sustituye `environment.ts` por `environment.prod.ts` y aplica presupuestos de 2 MB (advertencia) / 5 MB (error) para el bundle inicial. Desarrollo desactiva optimización, conserva mapas de fuentes y nombra los chunks. Los navegadores objetivo son Chrome 107+, Firefox 106+, Edge 107+, Safari 16.1+ e iOS 16.1+.

## Estructura de archivos

```text
.
├── src/
│   ├── main.ts                         # arranque, router, Ionic e interceptor
│   ├── index.html                      # documento HTML base
│   ├── global.scss                     # imports Ionic y estilos globales de dashboards
│   ├── test-setup.ts                   # polyfill de matchMedia para JSDOM
│   ├── environments/
│   │   ├── environment.ts              # production: false
│   │   └── environment.prod.ts         # production: true
│   ├── theme/variables.scss            # solo comentario plantilla
│   ├── assets/
│   │   ├── icon/favicon.png            # favicon referenciado desde index.html
│   │   └── shapes.svg                  # SVG de formas; no hay referencias a él en src
│   └── app/
│       ├── app.component.*             # raíz: ion-app + ion-router-outlet
│       ├── app.routes.ts               # seis rutas
│       ├── api.config.ts               # URL base de API para tres servicios
│       ├── auth.service.ts             # sesión y autenticación
│       ├── auth.guard.ts               # guardia por presencia de token
│       ├── jwt.interceptor.ts          # cabeceras y reacción a 401
│       ├── client.service.ts           # API de cliente
│       ├── driver.service.ts           # API de conductor
│       ├── admin.service.ts            # API de administrador
│       ├── login/                      # página, HTML, SCSS y prueba básica
│       ├── register/                   # página, HTML, SCSS y prueba básica
│       ├── home/                       # redirección por rol, plantilla inline y prueba
│       ├── client-dashboard/           # dashboard; SCSS y spec vacíos
│       ├── driver-dashboard/           # dashboard; SCSS y spec vacíos
│       └── admin-dashboard/            # dashboard; SCSS y spec vacíos
├── angular.json                         # build, serve, tests y lint
├── package.json / package-lock.json     # dependencias bloqueadas
├── capacitor.config.ts                  # configuración de Capacitor
├── ionic.config.json                    # Ionic angular-standalone + Capacitor
├── eslint.config.js                     # reglas de lint
├── tsconfig*.json                       # TypeScript de app y pruebas
├── README.md                            # documentación preexistente del repositorio
└── www/                                 # artefactos compilados existentes, ignorados por Git
```

También existen configuraciones de editor en `.vscode/`: se recomienda `Webnative.webnative` y se excluyen dos archivos de tipos de Ionic de las sugerencias de autoimportación. `.editorconfig` establece UTF-8, dos espacios y comillas simples para TypeScript. `.gitignore` ignora, entre otros, `node_modules`, `www`, `dist`, `.angular` y coberturas.

## Arranque, composición y rutas

`src/main.ts` ejecuta `bootstrapApplication(AppComponent)` y registra:

- `IonicRouteStrategy` como estrategia de reutilización de rutas;
- Ionic mediante `provideIonicAngular()`;
- el router con precarga de todos los módulos/rutas (`PreloadAllModules`);
- `HttpClient` con `jwtInterceptor`.

`AppComponent` solo renderiza `<ion-app><ion-router-outlet></ion-router-outlet></ion-app>`. Todas las páginas son standalone y se cargan con `loadComponent`.

| URL | Página | Protección | Comportamiento |
| --- | --- | --- | --- |
| `/login` | `LoginPage` | No | Formulario de acceso. |
| `/register` | `RegisterPage` | No | Formulario para cliente o conductor. |
| `/home` | `HomePage` | Sí | Muestra un spinner y redirige según el rol local. |
| `/client-dashboard` | `ClientDashboardPage` | Sí | Flujo de cliente. |
| `/driver-dashboard` | `DriverDashboardPage` | Sí | Flujo de conductor. |
| `/admin-dashboard` | `AdminDashboardPage` | Sí | Flujo de administración. |
| `/` | — | — | Redirige a `/home`. |

La guardia (`authGuard`) comprueba que `localStorage` contenga la clave `token` y que el rol guardado coincida con `data.role` de la ruta; si no coincide, manda a `/home`. No valida la vigencia del token ni consulta al servidor. `HomePage` toma `user.role` del almacenamiento local: `client` lleva al dashboard de cliente, `driver` al de conductor, `admin` al administrativo; cualquier otro valor lleva a `/login`.

## Configuración HTTP y sesión

La URL escrita en el código es `http://20.20.1.22:8000/api`, en un solo lugar: `API_URL` en `src/app/api.config.ts`, que usan `AuthService`, `ClientService`, `DriverService` y `AdminService`. La aplicación usa HTTP sin TLS en esa configuración.

Para cada petición dirigida a `API_URL`, `jwtInterceptor` añade `Accept: application/json`. Si hay un token local añade además `Authorization: Bearer <token>`. Ante un HTTP 401, excepto cuando la URL incluye `/auth/login`, borra `token` y `user` y navega a `/login`; después vuelve a propagar el error.

`AuthService` está disponible globalmente (`providedIn: 'root'`) y ofrece:

| Método | Efecto verificable |
| --- | --- |
| `login(login, password)` | `POST /auth/login` con `{ login, password }`; guarda la respuesta y la devuelve. |
| `register(data)` | `POST /auth/register` con el cuerpo recibido; guarda la respuesta y la devuelve. |
| `logout()` | Intenta `POST /auth/logout` con `{}`; aun si falla, borra la sesión local y navega a `/login`. |
| `clearSession()` | Elimina `token` y `user` de `localStorage`. |
| `getToken()` | Devuelve `localStorage['token']` o `null`. |
| `getUser()` | Parsea `localStorage['user']` o devuelve `null`. |
| `getRole()` | Devuelve `getUser()?.role` o `null`. |
| `isLoggedIn()` | Devuelve si existe un token local. |

Al guardar sesión, el servicio espera que la respuesta tenga `access_token` y `user`, y persiste ambos como `token` y `user`. No hay comprobación de formato, expiración ni manejo de un JSON inválido guardado en `user`.

## Contrato HTTP consumido por el frontend

Todos los tipos de respuesta de estos servicios son `any`. La siguiente tabla expone exactamente los métodos, cuerpos y campos que consume la interfaz; los campos de respuesta son inferidos por ese consumo.

| Perfil | Método y ruta relativa a `/api` | Cuerpo enviado | Respuesta/campos leídos por el frontend |
| --- | --- | --- | --- |
| Auth | `POST /auth/login` | `{ login, password }` | `access_token`, `user` |
| Auth | `POST /auth/register` | datos recibidos desde registro | `access_token`, `user` |
| Auth | `POST /auth/logout` | `{}` | No se lee contenido. |
| Cliente | `POST /client/estimate-fare` | coordenadas de origen y destino | `estimate.estimated_fare`, `estimate.distance_km`, `estimate.duration_min` |
| Cliente | `POST /client/ride-requests` | origen/destino con nombres y coordenadas | No se lee contenido directamente. |
| Cliente | `GET /client/active` | — | `has_active`, `data`, `type` |
| Cliente | `POST /client/cancel/{id}` | `{ reason }` | No se lee contenido directamente. |
| Conductor | `PUT /driver/availability` | `{ status: 'available' | 'unavailable' }` | No se lee contenido directamente. |
| Conductor | `GET /driver/ride-requests` | — | `requests` (arreglo). |
| Conductor | `POST /driver/ride-requests/{id}/accept` | `{}` | `trip`. |
| Conductor | `POST /driver/trips/{id}/arrive` | `{}` | `trip.status`. |
| Conductor | `POST /driver/trips/{id}/start` | `{}` | `trip.status`. |
| Conductor | `POST /driver/trips/{id}/complete` | `{ actual_distance_km, actual_duration_min }` | `trip.final_fare`. |
| Admin | `GET /admin/dashboard` | — | `stats` con los ocho indicadores detallados abajo. |
| Admin | `GET /admin/drivers?approval_status=pending` | — | `drivers` (arreglo). |
| Admin | `PATCH /admin/drivers/{id}/approval` | `{ approval_status, admin_notes }` | No se lee contenido directamente. |

Las páginas muestran `error.message` o, cuando existe, `error.errors`. El registro y el dashboard de cliente aplanan `error.errors` y unen sus textos con ` | `. Esta es otra expectativa del frontend sobre la forma de errores, no una verificación del backend.

## Páginas y funciones

### Acceso y registro

`LoginPage` mantiene `login`, `password`, `error` y `loading`. Exige que ambos primeros valores sean no vacíos; de lo contrario muestra “Ingrese correo/teléfono y contraseña”. Al enviar, llama a `AuthService.login` y navega a `/home` con `replaceUrl: true`. El formulario contiene campos Ionic para correo/teléfono y contraseña; Enter en la contraseña ejecuta el acceso.

`RegisterPage` tiene un objeto `form` con valores iniciales:

```ts
{
  name: '', email: '', phone: '', password: '', role: 'client',
  license_number: '', plate: '', brand: '', model: '',
  year: null, capacity: 4, color: ''
}
```

Siempre exige `name`, `email`, `phone` y `password`. Envía esos valores y `role`. Para `role === 'driver'` añade `license_number`, `plate`, `brand`, `model`, `year` convertido con `Number`, `capacity` convertido con `Number` y `color`. La interfaz solo presenta esos campos adicionales para conductor; no aplica validación de cliente para ellos antes de enviar. Tras registrarse navega a `/home` con `replaceUrl: true`.

En estas páginas y en la página de inicio, los únicos métodos de componente son `LoginPage.onLogin()`, `RegisterPage.onRegister()` y `HomePage.ngOnInit()`, respectivamente. Los dos primeros ejecutan los flujos recién descritos; el último toma el rol local y realiza la redirección de `/home` indicada en la sección de rutas.

### Dashboard de cliente

`ClientDashboardPage` usa señales de Angular para lo que se renderiza después de operaciones asíncronas: origen, destino, estimación, viaje activo, tipo, error, información y estados de carga. Define cinco ubicaciones de ejemplo, con coordenadas aproximadas, todas en Neiva:

| Nombre | Latitud | Longitud |
| --- | ---: | ---: |
| Parque Santander | 2.9273 | -75.2896 |
| Terminal de Transportes | 2.9437 | -75.2954 |
| Universidad Surcolombiana | 2.9389 | -75.2889 |
| Centro Comercial San Pedro Plaza | 2.9380 | -75.2800 |
| Aeropuerto Benito Salas | 2.9501 | -75.2940 |

El origen inicial es Parque Santander y el destino inicial es Terminal de Transportes. El usuario solo puede seleccionar estos valores en controles HTML `<select>`; no hay entrada manual de direcciones ni un mapa.

Funciones relevantes:

- `cargarActivo()` consulta `/client/active` al iniciar, al entrar de nuevo en la vista y cada 5 segundos. Evita solicitudes simultáneas con `consultando`; ante fallo de red conserva el último estado visible.
- Si `has_active` es verdadero, guarda `data` y `type`, y borra la estimación. Si es falso, limpia el viaje; si ya había uno, informa que terminó o fue cancelado.
- `estimar()` evita origen/destino idénticos y solicita la estimación con cuatro coordenadas: `origin_latitude`, `origin_longitude`, `destination_latitude`, `destination_longitude`.
- `solicitar()` manda nombres y coordenadas de ambos extremos. Tras éxito fuerza una consulta del estado activo.
- `cancelar()` solo actúa si existe un viaje/solicitud activo y manda siempre la razón literal `Cancelado por el cliente`.
- `etiqueta()` traduce `requested`, `assigned`, `driver_arrived` e `in_progress`; para otro estado devuelve el valor original. `moneda()` antepone `$` y formatea con `es-CO`.
- `salir()` delega en `AuthService.logout()`.

Cuando hay estado activo, la vista puede mostrar `estimated_fare`, origen/destino, `driver.user.name`, `driver.user.phone` y datos de `vehicle`. Permite cancelar solo con estado `requested` o `assigned`.

Inventario completo de métodos de esta página:

| Método | Responsabilidad observada |
| --- | --- |
| `ngOnInit()` | Consulta el estado e inicia el intervalo de 5 segundos. |
| `ngOnDestroy()` | Cancela el intervalo. |
| `ionViewWillEnter()` | Consulta el estado inmediatamente al volver a la vista. |
| `cargarActivo()` | Obtiene y actualiza el viaje/solicitud activo sin solapar consultas. |
| `cambiarRuta()` | Borra estimación y error al cambiar origen o destino. |
| `coordenadas()` (privado) | Construye las cuatro coordenadas para la estimación. |
| `estimar()` | Valida que los puntos difieran y pide la estimación. |
| `solicitar()` | Crea la solicitud y actualiza el estado visible. |
| `cancelar()` | Cancela el elemento activo. |
| `salir()` | Inicia logout. |
| `etiqueta(status)` | Convierte estados conocidos a etiquetas en español. |
| `moneda(n)` | Formatea un número con el prefijo `$` y locale `es-CO`. |
| `mensaje(e)` (privado) | Normaliza un error HTTP para mostrarlo. |

### Dashboard de conductor

`DriverDashboardPage` mantiene propiedades normales (no señales): disponibilidad, lista de solicitudes, viaje, distancia, duración, mensajes y un temporizador. Al iniciar, intenta restaurar `activeTrip` desde `localStorage` mediante `JSON.parse`, y programa `cargarSolicitudes()` cada 5 segundos. No ejecuta esa carga inmediatamente al iniciar; se ejecuta al activar disponibilidad o en la siguiente iteración del temporizador. Destruir la página cancela el temporizador.

Flujo implementado:

1. `onToggle` llama a disponibilidad con `available` o `unavailable`. Si se activa, consulta solicitudes; si se desactiva, vacía la lista. Ante error fuerza `disponible = false`.
2. `cargarSolicitudes` no consulta si no está disponible o ya hay `viaje`; asigna `res.requests || []`.
3. `aceptar(s)` llama al endpoint de aceptación. Crea el viaje local combinando `res.trip` con `origin_name` y `destination_name` provenientes de la solicitud; adopta `s.estimated_distance_km` como distancia inicial, lo guarda bajo `activeTrip` y limpia la lista.
4. `llegar()` y `iniciar()` usan una función común que llama al servidor, actualiza solo `viaje.status` desde `res.trip.status` y vuelve a guardar el viaje local.
5. `finalizar()` envía los valores de los campos “distancia real” y “duración real” convertidos con `Number`. Tras éxito muestra `res.trip.final_fare`, borra el viaje y `activeTrip`, y marca disponibilidad local como verdadera.

La interfaz permite las acciones según el estado `assigned`, `driver_arrived` o `in_progress`. Muestra por solicitud tarifa estimada, origen, destino, distancia y `client.name`. No hay una consulta al backend para recuperar un viaje activo de conductor después de recargar: se usa exclusivamente `activeTrip` local. Al salir se elimina esa clave antes del logout.

Inventario completo de métodos de esta página:

| Método | Responsabilidad observada |
| --- | --- |
| `ngOnInit()` | Restaura `activeTrip` si existe e inicia el intervalo de solicitudes. |
| `ngOnDestroy()` | Cancela el intervalo. |
| `onToggle(ev)` | Solicita el cambio de disponibilidad y sincroniza la lista local. |
| `cargarSolicitudes()` | Obtiene solicitudes si está disponible y no tiene viaje. |
| `aceptar(s)` | Acepta una solicitud y guarda un viaje local compuesto. |
| `llegar()` | Solicita el estado de llegada. |
| `iniciar()` | Solicita el inicio del viaje. |
| `finalizar()` | Envía distancia/duración reales, limpia el viaje y muestra la tarifa final. |
| `accionViaje(fn)` (privado) | Implementación común para `llegar` e `iniciar`; actualiza `viaje.status`. |
| `guardarViaje()` (privado) | Persiste `viaje` como `activeTrip`. |
| `salir()` | Elimina `activeTrip` e inicia logout. |
| `etiqueta(status)` | Convierte estados conocidos a etiquetas en español. |
| `moneda(n)` | Formatea un número con el prefijo `$` y locale `es-CO`. |
| `mensaje(e)` (privado) | Convierte el error HTTP en texto visible. |

### Dashboard de administrador

`AdminDashboardPage` carga en `ngOnInit` las métricas y los conductores pendientes. Para las métricas espera `res.stats` con:

```text
total_clients, total_drivers, pending_drivers, approved_drivers,
active_trips, completed_trips, cancelled_trips, total_revenue
```

Los primeros siete se convierten a texto y el último se formatea como pesos colombianos. Para cada conductor pendiente, la vista usa `user.name`, `user.email`, `license_number` y, si existe, el primer elemento de `vehicles` (`brand`, `model`, `plate`).

`decidir(driver, estado)` puede enviar `approved` con la nota fija `Documentación verificada.` o `rejected` con `Rechazado por el administrador.`. Tras éxito recarga tanto pendientes como métricas. `salir()` llama al logout. El manejador traduce específicamente un 403 a “Esta cuenta no es administrador”.

La plantilla usa elementos HTML nativos para su cabecera, contenido y botones; aunque el componente importa varios componentes Ionic, no se usan en esa plantilla.

Inventario completo de métodos de esta página:

| Método | Responsabilidad observada |
| --- | --- |
| `ngOnInit()` | Inicia la carga de métricas y pendientes. |
| `cargarMetricas()` | Pide los KPIs y los transforma en ocho tarjetas. |
| `cargarPendientes()` | Pide y asigna el arreglo de conductores pendientes. |
| `decidir(driver, estado)` | Envía aprobación o rechazo y recarga ambas fuentes de datos. |
| `salir()` | Inicia logout. |
| `mensaje(e)` (privado) | Traduce red caída, 403 y otros errores en un texto. |

## Estados del viaje que la UI reconoce

No hay un enum TypeScript ni una máquina de estados central. Los valores solo aparecen como comparaciones y etiquetas en las páginas:

| Estado | Cliente | Conductor |
| --- | --- | --- |
| `requested` | “Buscando conductor”; puede cancelar | No tiene acción específica. |
| `assigned` | “Conductor asignado”; puede cancelar | “Ve por el pasajero”; puede registrar llegada. |
| `driver_arrived` | “Tu conductor llegó” | “Esperando al pasajero”; puede iniciar. |
| `in_progress` | “En viaje” | “En viaje”; puede introducir distancia/duración y finalizar. |

El conductor también menciona en comentarios que una aceptación simultánea puede producir HTTP 409 y que la disponibilidad puede recibir 403 si está pendiente de aprobación, pero el frontend no hace una ramificación específica por 409. El mensaje resultante usa el texto provisto por el servidor o “Error inesperado”.

## Persistencia local

| Clave | Quién la escribe | Uso |
| --- | --- | --- |
| `token` | `AuthService.saveSession` | Autorización HTTP y condición de la guardia. |
| `user` | `AuthService.saveSession` | JSON de usuario; su `role` determina el dashboard inicial. |
| `activeTrip` | Dashboard de conductor | JSON del viaje que el conductor aceptó o actualizó; se restaura al iniciar esa página. |

El logout elimina `token` y `user`; desde el dashboard de conductor también elimina `activeTrip`. El interceptor ante 401 elimina únicamente sesión de autenticación, no `activeTrip`.

## Estilos y experiencia visible

- `global.scss` importa CSS base, normalización, estructura, tipografía y utilidades de Ionic; activa la paleta oscura dependiente del sistema (`dark.system.css`). También define las clases compartidas que empiezan por `dash__` y `metrica__`. Las plantillas de dashboard usan además clases `auth__error`, `auth__campo`, `auth__boton` y `auth__input`, pero no existe un selector con esos nombres en los SCSS del proyecto.
- Login y registro poseen SCSS propio, con superficies claras, tarjeta centrada, campos redondeados y reglas para movimiento reducido. Login limita la tarjeta a 440 px; registro a 680 px y adapta márgenes bajo 520 px.
- Los SCSS específicos de los tres dashboards y de `app.component` están vacíos. El SCSS de `home` contiene el estilo plantilla de `#container`, pero `HomePage` renderiza un spinner inline y no tiene tal elemento.
- `index.html` tiene título `Ionic App`, idioma `en`, favicon local y metaetiquetas para pantalla móvil/iOS.

## Pruebas y calidad existente

- Hay pruebas que solo comprueban creación del componente para `AppComponent`, `HomePage`, `LoginPage` y `RegisterPage`.
- Las especificaciones de cliente, conductor y administrador existen, pero están vacías (0 bytes).
- No hay pruebas de servicios, guardia, interceptor, rutas, solicitudes HTTP, estados del viaje ni validaciones de formularios.
- `src/test-setup.ts` añade una implementación mínima de `window.matchMedia` porque JSDOM no la trae y componentes Ionic la consultan.
- ESLint aplica las configuraciones recomendadas para TypeScript y plantillas Angular; exige selectores `app-*`, atributos `appCamelCase` y sufijos de clase `Page` o `Component`.

Este documento no afirma que la suite o el build estén pasando: no se ejecutaron como parte de su elaboración.

## Restricciones y puntos a tener presentes al pedir cambios a una IA

1. Mantener los componentes como standalone y no crear un `AppModule`, salvo que se solicite explícitamente un cambio arquitectónico.
2. No asumir que el backend acepta campos, devuelve datos o aplica transiciones adicionales a los que el frontend ya consume. Confirmar esos contratos antes de extenderlos.
3. No usar el rol local como autorización de seguridad: actualmente solo ordena la navegación; el backend debe proteger los endpoints y rutas.
4. Si se cambia la URL del API, actualizar tanto `api.config.ts` como `AuthService`, o refactorizar ambos deliberadamente a una fuente única.
5. Conservar o reemplazar intencionalmente los tres valores de `localStorage`, especialmente `activeTrip`, que mantiene el viaje local del conductor entre recargas.
6. Al modificar UI asíncrona del dashboard de cliente, conservar el uso de señales o una estrategia de actualización equivalente: el archivo explica que Angular 22 no actualiza la vista tras `await` para esas propiedades normales en esta configuración.
7. Evitar presentar como ya implementadas características que no aparecen en el código fuente (mapas, GPS, pagos, notificaciones, historial o gestión de viaje del conductor desde el servidor).

## Archivos principales a consultar según la tarea

| Necesidad | Archivos fuente de referencia |
| --- | --- |
| Nueva ruta o protección | `src/app/app.routes.ts`, `auth.guard.ts`, `main.ts` |
| Sesión/autorización | `auth.service.ts`, `jwt.interceptor.ts` |
| URL o endpoint | `api.config.ts`, `auth.service.ts`, servicio del perfil |
| Registro/acceso | `login/`, `register/`, `auth.service.ts` |
| Flujo de cliente | `client-dashboard/`, `client.service.ts` |
| Flujo de conductor | `driver-dashboard/`, `driver.service.ts` |
| Aprobación y KPIs | `admin-dashboard/`, `admin.service.ts` |
| Estilo compartido | `src/global.scss`, y el SCSS de la página correspondiente |
| Build, test o lint | `package.json`, `angular.json`, `tsconfig*.json`, `eslint.config.js` |

