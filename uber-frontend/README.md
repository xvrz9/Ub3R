# Uber Frontend

Documentación integral del proyecto frontend de transporte solicitado para clientes, conductores y administradores. La aplicación fue desarrollada con **Angular 22**, **Ionic 9**, **Capacitor 8** y **TypeScript 6**.

## 1. Objetivo general

`uber-frontend` es una interfaz web móvil y multiplataforma destinada a consumir una API REST de Laravel. Permite los procesos principales de una plataforma de movilidad:

- Registro e inicio de sesión de usuarios.
- Separación de experiencias por rol: cliente, conductor y administrador.
- Estimación y solicitud de viajes.
- Seguimiento y cancelación de viajes.
- Gestión de solicitudes por parte del conductor.
- Actualización de estados desde la recogida hasta la finalización.
- Aprobación o rechazo de conductores por parte del administrador.
- Visualización de indicadores generales de operación.

El proyecto genera una aplicación Angular que puede ejecutarse en navegador y empaquetarse como aplicación nativa mediante Capacitor.

## 2. Tecnologías

### Tecnologías principales

| Tecnología | Uso |
|---|---|
| Angular 22 | Framework SPA y componentes standalone |
| Ionic Angular 9 | Componentes visuales compatibles con móvil y web |
| Angular Router | Navegación y protección de rutas |
| TypeScript 6 | Tipado y lógica de la aplicación |
| RxJS 7 | Observables HTTP y manejo de respuestas asíncronas |
| Capacitor 8 | Integración y generación de aplicaciones móviles |
| SCSS/CSS | Estilos globales y específicos por página |
| Vitest | Framework de pruebas unitarias usado por Angular |
| Angular ESLint | Validación de código Angular y TypeScript |

### Dependencias relevantes

- `@ionic/angular`: componentes Ionic.
- `@angular/forms`: formularios y `ngModel`.
- `@angular/common/http`: comunicación HTTP.
- `@angular/router`: rutas y guardas.
- `@capacitor/app`, haptics, keyboard y status-bar: integraciones móviles disponibles para la aplicación.
- `ionicons`: iconografía Ionic.

## 3. Estructura del proyecto

```text
uber-frontend/
├── angular.json                 # Configuración de Angular/Ionic
├── capacitor.config.ts          # Identificador y configuración de Capacitor
├── eslint.config.js             # Reglas de linting
├── ionic.config.json            # Identificación como proyecto Ionic Angular standalone
├── package.json                 # Dependencias y scripts npm
├── tsconfig.app.json            # Configuración TypeScript de la aplicación
├── tsconfig.spec.json           # Configuración de pruebas
├── src/
│   ├── main.ts                  # Arranque e proveedores globales
│   ├── global.scss              # Estilos globales y CSS de Ionic
│   ├── index.html               # Documento HTML base
│   ├── environments/            # Variables para desarrollo y producción
│   ├── theme/variables.scss     # Variables visuales temáticas
│   └── app/
│       ├── app.component.ts     # Componente raíz
│       ├── app.routes.ts        # Tabla de rutas
│       ├── auth.service.ts      # Sesión, login, registro y logout
│       ├── auth.guard.ts        # Protege rutas privadas
│       ├── jwt.interceptor.ts   # Cabecera de autenticación y respuestas 401
│       ├── api.config.ts        # URL base de la API (única fuente)
│       ├── lugares.ts           # Lugares de Neiva y ubicación de puntos de la API
│       ├── route.service.ts     # Ruta por calles (OSRM) para dibujar en el mapa
│       ├── map/                 # Componente del mapa (Leaflet) y simulación de carros
│       ├── client.service.ts    # Operaciones del cliente
│       ├── driver.service.ts    # Operaciones del conductor
│       ├── admin.service.ts     # Operaciones del administrador
│       ├── home/                # Redirección según el rol
│       ├── login/               # Inicio de sesión
│       ├── register/            # Registro de cliente o conductor
│       ├── client-dashboard/    # Solicitud y seguimiento de viajes
│       ├── driver-dashboard/    # Disponibilidad y ejecución de viajes
│       └── admin-dashboard/     # Métricas y aprobación de conductores
└── www/                         # Compilación web generada por Angular
```

## 4. Arquitectura

La aplicación sigue una arquitectura por capas ligera:

1. **Presentación:** páginas y plantillas Ionic/Angular.
2. **Estado local:** propiedades de componentes, junto con `localStorage` para autenticación y el viaje activo del conductor.
3. **Acceso a datos:** servicios HTTP especializados por rol.
4. **Autenticación compartida:** `AuthService`, interceptor HTTP y guarda de rutas.
5. **Backend externo:** API REST Laravel ubicada por defecto en `http://20.20.1.22:8000/api`.
6. **Mapa:** Leaflet con mosaicos de CARTO/OpenStreetMap y rutas por calles del servidor público de OSRM (sin claves).

Todas las páginas principales, incluidos los dashboards, están configuradas como componentes `standalone`. La carga de componentes es diferida mediante funciones `loadComponent`, lo que permite dividir el código por ruta.

## 5. Arranque de la aplicación

El arranque se realiza desde `src/main.ts` con `bootstrapApplication`.

Se registran los siguientes proveedores:

- `RouteReuseStrategy` de Ionic.
- `provideIonicAngular()` para componentes Ionic.
- `provideRouter(...)` con precarga de rutas.
- `provideHttpClient(withInterceptors([...]))` para aplicar el interceptor JWT.

El componente raíz monta:

```text
ion-app
  └── ion-router-outlet
```

## 6. Configuración del servidor API

La URL REST se configura en un solo lugar, `src/app/api.config.ts` (`API_URL`), y la usan `AuthService`, `ClientService`, `DriverService` y `AdminService`.

Valor predeterminado:

```text
http://20.20.1.22:8000/api
```

> Para un emulador Android, normalmente puede requerirse `10.0.2.2` en lugar de una IP accesible solo desde la máquina anfitriona.

## 7. Autenticación y sesión

### Inicio de sesión

La página de login solicita correo/teléfono y contraseña. Envía:

```http
POST /api/auth/login
```

El cuerpo incluye:

```json
{
  "login": "correo_o_telefono",
  "password": "contraseña"
}
```

`AuthService` guarda estos datos en el navegador:

- `token` en `localStorage`: token de acceso.
- `user` en `localStorage`: objeto JSON del usuario autenticado.

Después del login, `/home` determina el dashboard correspondiente por el campo `role`.

### Registro

El registro permite dos roles:

- `client`: registra los datos básicos del usuario.
- `driver`: registra además licencia y información de vehículo.

Datos básicos:

- Nombre.
- Correo.
- Teléfono.
- Contraseña.
- Rol.

Datos adicionales de conductor:

- Número de licencia.
- Placa.
- Marca.
- Modelo.
- Año.
- Capacidad.
- Color.

Se envían al endpoint:

```http
POST /api/auth/register
```

Laravel puede responder errores de validación HTTP 422 y la interfaz los muestra agrupados.

### Cierre de sesión

El logout:

```http
POST /api/auth/logout
```

Luego elimina el token, el usuario y, cuando corresponde, el viaje activo local del conductor.

### Interceptor HTTP

`jwtInterceptor` actúa solo sobre las peticiones que empiezan por `API_URL` (el token nunca se envía a servicios externos como OSRM) e:

- Añade el encabezado de autorización cuando existe un token.
- Solicita respuestas JSON mediante `Accept: application/json`.
- Detecta respuestas HTTP 401, salvo las provenientes del login.
- Elimina la sesión local y redirige a `/login` cuando vence o se rechaza la autenticación.

### Guarda de rutas

`authGuard` permite entrar a rutas privadas únicamente si existe un token guardado; si no, redirige a `/login`. Cada dashboard declara además el rol que puede entrar (`data: { role: 'client' | 'driver' | 'admin' }`): si el rol guardado no coincide, el usuario va a `/home`, que lo lleva a su propio dashboard. `guestGuard` manda a `/home` a quien ya tiene sesión e intenta abrir `/login` o `/register`.

Esta validación solo ordena la navegación; la seguridad real depende de que el backend proteja sus endpoints.

Las rutas protegidas son:

- `/home`
- `/client-dashboard`
- `/driver-dashboard`
- `/admin-dashboard`

Las rutas públicas son `/login` y `/register`.

## 8. Sistema de rutas

| Ruta | Componente | Protección | Responsabilidad |
|---|---|---:|---|
| `/` | Redirección | No aplica | Redirige a `/home` |
| `/home` | `HomePage` | Sí | Redirige según el rol |
| `/login` | `LoginPage` | No | Inicio de sesión |
| `/register` | `RegisterPage` | No | Registro |
| `/client-dashboard` | `ClientDashboardPage` | Sí | Gestión de viajes del cliente |
| `/driver-dashboard` | `DriverDashboardPage` | Sí | Gestión de viajes del conductor |
| `/admin-dashboard` | `AdminDashboardPage` | Sí | Métricas y aprobación de conductores |

## 9. Redirección por rol

La página `HomePage` es una pantalla de carga breve que revisa el usuario guardado:

- `client` → `/client-dashboard`
- `driver` → `/driver-dashboard`
- `admin` → `/admin-dashboard`
- Sin rol reconocido → `/login`

Esto desacopla la navegación posterior al login y permite volver al lugar adecuado al recargar la aplicación.

## 10. Funcionalidades por perfil

## 10.1 Cliente

El dashboard del cliente permite:

- Consultar si tiene una solicitud o viaje activo.
- Seleccionar origen y destino entre lugares predefinidos de Neiva.
- Evitar que origen y destino sean iguales.
- Estimar distancia, duración y tarifa.
- Crear una solicitud de viaje.
- Consultar el estado activo cada cinco segundos.
- Ver el conductor asignado y los datos de su vehículo.
- Cancelar solicitudes o viajes antes de iniciar el recorrido.
- Cerrar sesión.

### Lugares predefinidos

1. Parque Santander.
2. Terminal de Transportes.
3. Universidad Surcolombiana.
4. Centro Comercial San Pedro Plaza.
5. Aeropuerto Benito Salas.

Estos lugares están en `src/app/lugares.ts`. Además de los selectores, el pasajero puede tocar el mapa para fijar el origen o el destino; ese punto se envía con las mismas claves y con el nombre `Punto en el mapa (lat, lng)`. No hay búsqueda de direcciones.

### Mapa

Las pantallas de pasajero y conductor muestran un mapa de Neiva a pantalla completa con un panel inferior (en pantallas anchas, columna izquierda). El componente está en `src/app/map/map.component.ts` y la ruta por calles se pide en `src/app/route.service.ts`; si OSRM no responde se dibuja una línea recta. Distancia, duración y tarifa siempre salen de la API propia.

**La posición de los carros es una simulación visual del frontend**, porque la API no entrega la ubicación del conductor:

| Estado | Mapa |
|---|---|
| Sin viaje | Marcadores de origen y destino; ruta al estimar la tarifa |
| `requested` | Ondas sobre el origen y 5 carros moviéndose cerca |
| `assigned` | Un carro recorre por calles el camino hasta el origen (20 s) |
| `driver_arrived` | Carro detenido en el origen |
| `in_progress` | Carro recorriendo la ruta hasta el destino (40 s) |

Las posiciones se derivan del id del viaje, por eso no saltan cada vez que la página consulta la API.

### Estados visibles al cliente

| Estado | Texto mostrado |
|---|---|
| `requested` | Buscando conductor |
| `assigned` | Conductor asignado |
| `driver_arrived` | Tu conductor llegó |
| `in_progress` | En viaje |

### Operaciones HTTP del cliente

```http
POST /api/client/estimate-fare
POST /api/client/ride-requests
GET  /api/client/active
POST /api/client/cancel/{id}
```

## 10.2 Conductor

El dashboard del conductor permite:

- Activar o desactivar la disponibilidad.
- Recibir solicitudes mientras está disponible.
- Consultar solicitudes pendientes cada cinco segundos.
- Aceptar una solicitud disponible.
- Indicar que llegó al punto de recogida.
- Iniciar el viaje.
- Registrar distancia y duración reales.
- Finalizar el viaje y ver la tarifa final.
- Recuperar un viaje activo después de recargar la página.
- Cerrar sesión limpiando el viaje local.

### Disponibilidad

El conductor cambia su estado mediante la ruta implementada por `DriverService`:

```http
PUT /api/driver/availability
```

El backend puede rechazar el cambio con HTTP 403 si el conductor no ha sido aprobado por administración.

### Operaciones HTTP del conductor

```http
PUT  /api/driver/availability
GET  /api/driver/ride-requests
POST /api/driver/ride-requests/{id}/accept
POST /api/driver/trips/{id}/arrive
POST /api/driver/trips/{id}/start
POST /api/driver/trips/{id}/complete
```

### Estados manejados

| Estado | Acción siguiente |
|---|---|
| `assigned` | Llegó al punto de recogida |
| `driver_arrived` | Iniciar viaje |
| `in_progress` | Cargar distancia y duración reales y finalizar |

Cuando se acepta una solicitud, el conductor combina la respuesta del backend con los nombres de origen/destino obtenidos de la tarjeta de solicitud. El viaje se guarda en `localStorage` bajo la clave `activeTrip` para persistir el estado ante recargas accidentales.

Como la API no tiene un endpoint para leer la disponibilidad, si el conductor dejó el interruptor encendido se guarda `driverAvailable` y al volver a abrir la página se reenvía `PUT /driver/availability` con `available`. Si responde 403 se apaga y se muestra el aviso de cuenta sin aprobar.

## 10.3 Administrador

El dashboard administrativo presenta:

- Clientes totales.
- Conductores totales.
- Conductores pendientes de aprobación.
- Conductores aprobados.
- Viajes activos.
- Viajes completados.
- Viajes cancelados.
- Ingresos totales.
- Conductores en tres pestañas: Pendientes, Aprobados y Rechazados.

En Pendientes se puede aprobar (nota fija `Documentación verificada.`) o rechazar. El rechazo pide confirmación y permite escribir el motivo; si se deja vacío se envía `Rechazado por el administrador.`. Hay estados de carga, vacío, error con reintento y botón Actualizar.

Solo `approval_status=pending` estaba confirmado en el código original. Las pestañas Aprobados y Rechazados usan el mismo endpoint con `approved` y `rejected`; si la API no acepta esos valores, el error se muestra dentro de esa pestaña y Pendientes sigue funcionando.

### Operaciones HTTP del administrador

```http
GET   /api/admin/dashboard
GET   /api/admin/drivers?approval_status=pending|approved|rejected
PATCH /api/admin/drivers/{id}/approval
```

El cuerpo de aprobación/rechazo es:

```json
{
  "approval_status": "approved|rejected",
  "admin_notes": "Nota administrativa"
}
```

## 11. Flujo completo de un viaje

1. El cliente inicia sesión y obtiene acceso al dashboard.
2. Selecciona origen y destino predefinidos.
3. Solicita una estimación de tarifa.
4. La API devuelve distancia, duración y precio estimado.
5. El cliente crea una solicitud de viaje.
6. El cliente consulta `/client/active` periódicamente para observar cambios.
7. Un conductor aprobado activa su disponibilidad.
8. El conductor consulta las solicitudes pendientes periódicamente.
9. El conductor acepta una solicitud, cambiando el viaje a `assigned`.
10. El conductor indica su llegada (`driver_arrived`).
11. El conductor inicia el recorrido (`in_progress`).
12. El conductor reporta distancia y duración reales.
13. El viaje se completa y devuelve una tarifa final.
14. El cliente deja de ver el viaje activo o recibe la información de finalización/cancelación.
15. El conductor vuelve a disponibilidad según indique el backend.

## 12. Manejo de errores y estados de carga

- El login y registro deshabilitan los botones durante las solicitudes.
- Los errores HTTP 422 muestran una lista de errores de validación.
- HTTP 401 elimina la sesión y vuelve al login mediante el interceptor.
- HTTP 403 se usa para indicar cuentas sin permiso o conductores sin aprobación.
- HTTP 409 se utiliza al indicar que otro conductor ganó una solicitud.
- HTTP 0 se interpreta como ausencia de conexión con el servidor.
- Se muestran mensajes informativos cuando un viaje termina o es cancelado.
- Las consultas periódicas no reemplazan necesariamente el estado local hasta recibir una respuesta válida.

## 13. Estilos y diseño

Todo el diseño vive en `src/global.scss` con clases `u-*` y tokens `--u-*`, porque `angular.json` limita cada hoja de componente a 4 KB. Secciones principales: tokens, estructura, tarjetas, ruta, formularios, botones, avisos, login y registro, utilidades, pantallas con mapa (`u-mapa-layout`, `u-panel`, marcadores y carros) y panel de administrador (`u-metricas`, `u-segmento`). La app usa una sola paleta clara; el tema oscuro de Ionic está desactivado. La interfaz no usa emojis: los iconos son SVG en línea.

## 14. Pruebas

Hay archivos de pruebas unitarias para:

- Componente raíz.
- Página de login.
- Página de registro.
- Página de inicio/redirección.
- Dashboard de cliente.
- Dashboard de conductor.
- Dashboard de administrador.

Además, `src/app/lugares.spec.ts` prueba cómo se ubican en el mapa los puntos que llegan de la API. Las pruebas de páginas usan `provideHttpClientTesting`, así que nunca llaman a la API real.

Varias pruebas son pruebas de creación básica, no una suite completa de validación de flujos. Para obtener pruebas de mayor valor se deberían agregar casos de:

- Autenticación exitosa y fallida.
- Expiración de token.
- Validación de registro por rol.
- Estimación y cancelación de viajes.
- Estados del conductor.
- Permisos administrativos.
- Carga concurrente y respuestas HTTP.

Ejecutar todas las pruebas:

```bash
npm test
```

## 15. Comandos disponibles

Instalar dependencias:

```bash
npm install
```

Servidor de desarrollo Angular/Ionic:

```bash
npm start
```

También puede utilizarse:

```bash
ionic serve
```

Construir la aplicación:

```bash
npm run build
```

La salida de producción se escribe en `www/`.

Ejecutar pruebas:

```bash
npm test
```

Ejecutar linting:

```bash
npm run lint
```

## 16. Compilación y Capacitor

La configuración de Capacitor declara:

```text
appId: io.ionic.starter
appName: uber-frontend
webDir: www
```

Flujo típico:

```bash
npm run build
npx cap sync
```

Para plataformas específicas:

```bash
npx cap add android
npx cap add ios
npx cap open android
npx cap open ios
```

`appId` e `appName` deben personalizarse antes de publicar una aplicación con identidad oficial. La carpeta `www/` ya contiene una compilación previa, pero debe regenerarse antes de distribuir nuevos cambios.

## 17. Entorno móvil y web

La aplicación está diseñada como una SPA híbrida. Consideraciones importantes:

- El navegador móvil y Capacitor pueden requerir permisos de red diferentes.
- Una API HTTP puede ser bloqueada por políticas HTTPS o seguridad de plataformas móviles.
- La IP configurada debe ser visible desde el dispositivo o emulador.
- `localStorage` guarda `token`, `user`, `activeTrip`, `lastRoute` (última ruta del pasajero) y `driverAvailable`. Al cerrar sesión se borran todas. No es almacenamiento seguro para secretos críticos.
- No hay almacenamiento cifrado específico de Capacitor para el token.
- El mapa necesita internet para los mosaicos y las rutas. No hay geolocalización real del dispositivo y la posición de los carros es simulada.

## 18. Limitaciones y oportunidades de mejora

- Mover la configuración API a los archivos `environment.ts`/`environment.prod.ts`.
- Mostrar la ubicación real del conductor si el backend llega a ofrecerla.
- Evitar almacenar el viaje activo como estado sensible en `localStorage`; usar una consulta al backend al iniciar.
- Separar mejor el tipo de respuesta de cada API mediante interfaces TypeScript.
- Sustituir `any` por modelos tipados para solicitudes, viajes, conductores y usuarios.
- Agregar manejo de desconexión/reconexión en los `setInterval`.
- Agregar cancelaciones reales del temporizador al salir de la página.
- Ampliar las pruebas unitarias e integración HTTP.
- Añadir paginación si las solicitudes o conductores crecen.
- Personalizar el `appId`, nombre, íconos y configuración de splash screen.
- Revisar el contenido HTTP vs HTTPS y CORS antes del despliegue.
- Eliminar archivos compilados antiguos de `www/` durante cada despliegue o automatizar la generación limpia.

## 19. Resumen técnico

En conjunto, el proyecto implementa una SPA móvil basada en Angular standalone, Ionic y Capacitor. Expone tres experiencias diferenciadas y comunica estados de viaje con una API Laravel mediante servicios HTTP. La autenticación se administra con token almacenado localmente, el rol decide el dashboard inicial y el interceptor controla el vencimiento de sesión. El principal flujo funcional conecta estimación y solicitud de viajes, asignación a conductores, ejecución hasta completar el recorrido, administración de conductores y métricas operativas.
