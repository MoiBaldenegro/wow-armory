# Inventario funcional de la UI — reinicio

> La UI anterior (neo-brutalista, Tailwind, framer-motion y lucide-react) se
> eliminó. Este documento conserva **qué debe seguir haciendo la interfaz** para
> reconstruirla desde cero sin perder funcionalidad.

## Capas que no se tocan

- `src/domain/`, `src/application/` y `src/infrastructure/`: reglas, casos de
  uso, puertos y adaptadores HTTP.
- Providers y hooks de presentación: `AuthProvider`, `ThemeProvider`,
  `UseCasesProvider`, `useAuth`, `useTheme`, `useUseCases`, `useCharacter`,
  `useCharacterDetails`, `useWowProfile`.
- Utilidades: `characterFormat.ts` y `searchErrorMessages.ts`.

## Rutas

| Ruta | Pantalla | Funcionalidad |
| --- | --- | --- |
| `/` | Inicio | Buscador de personaje, banner de error de auth, aviso de cuenta conectada y acceso al perfil. |
| `/character/:realmSlug/:characterName?mode=classic\|retail` | Ficha | Carga el personaje y sus detalles; muestra todos los estados. |
| `/profile` | Mi perfil | Sesión Battle.net, login/logout y personajes de la cuenta con filtros. |
| `/guide` | Guía | Formato de búsqueda, regiones, versiones y datos que muestra la ficha. |
| `/error` | Error de autenticación | Traduce `auth_error`/`code` a mensajes en español. |
| `*` | 404 | Página no encontrada con vuelta al inicio. |

## Funcionalidad por pantalla

### Inicio

- Formulario accesible con `Reino`, `Nombre`, selector `Classic`/`Retail` y
  botón `Buscar`.
- Normaliza el reino a slug y el nombre a minúsculas.
- Valida campo a campo, muestra errores accesibles, enfoca el primer campo
  inválido y limpia el error al escribir.
- Navega a `/character/<reino>/<nombre>?mode=<modo>`.
- Muestra el banner de error de auth leído de `?auth_error=` y lo elimina de la
  URL.
- Si hay sesión, muestra el BattleTag/cuenta y un enlace a `/profile`.

### Cabecera global

- Logo con enlace a inicio.
- Búsqueda rápida `reino/nombre` que navega a la ficha.
- Enlaces a Inicio y Guía; `Mi perfil` si hay sesión.
- Botón de login/logout de Battle.net con estado de carga.
- Alternador de tema claro/oscuro persistido en `localStorage`.
- La cabecera se monta en todas las páginas y el pie también.

### Ficha de personaje

- `mode` se lee de la query (`retail` o `classic`, por defecto `classic`).
- Se consulta el personaje y, en paralelo, los detalles opcionales (media y
  equipamiento).
- Estados:
  - `loading`: `Cargando personaje…` sin datos previos.
  - `success`: banner, retrato, datos, hermandad, equipamiento y logros.
  - `not-found`: alerta `No encontramos a <nombre> en <reino>.`, buscador y
    enlace al inicio.
  - `invalid`: alerta de formato inválido, buscador y enlace al inicio.
  - `rate-limited`: mensaje con o sin segundos y botón `Reintentar`.
  - `unavailable`: mensaje genérico y botón `Reintentar`; nunca expone el error
    crudo del servidor.
- Datos del personaje: nivel, raza, clase, especialización, reino, nivel de
  objeto, puntos de logro y última conexión.
- Los valores `0` de Blizzard se muestran como `No disponible`.
- Hermandad: nombre, reino, rango (`Maestro de hermandad` si es 0), miembros o
  `Sin hermandad`.
- Logros: icono/puntos, nombre y fecha; vacío si no hay.
- Media: retrato preferente (`avatar`) si existe.
- Equipamiento: slot, nombre, nivel e icono si existen.

### Mi perfil

- Verifica la sesión al cargar y muestra `Cargando perfil…`.
- No autenticado: mensaje `Inicia sesión con Battle.net para ver tu perfil.` y
  botón `Iniciar sesión`.
- Autenticado: BattleTag, ID de cuenta, estado de sesión y botón
  `Cerrar sesión`.
- Botones deshabilitados y `aria-busy` durante login/logout, con textos
  `Iniciando sesión…` y `Cerrando sesión…`.
- Errores accesibles: sesión, login y logout.
- Personajes de la cuenta: filtros por catálogo (`all`, `retail`, `classic`) y
  por reino disponible; lista enlazada a cada ficha con su `mode`.
- Estados de la lista: cargando, error y vacío.

### Guía

- Explica el formato `reino / nombre` y el ejemplo `grobbulus / Billiemoi`.
- Lista regiones (`us`, `eu`, `kr`, `tw`).
- Explica la separación Classic/Retail.
- Resume qué muestra la ficha y ofrece un enlace para buscar.

### Error y 404

- Error de auth: mensajes para `access_denied`, `invalid_state`,
  `auth_failed`, código desconocido y enlace al inicio.
- 404: título `Página no encontrada` y enlace al inicio.

## Decisiones del reinicio

- Estilo visual: **minimal moderno**, sin bordes gruesos ni sombras duras.
- Sin Tailwind, PostCSS, autoprefixer, framer-motion ni lucide-react.
- CSS propio con variables para claro/oscuro y SVG inline para iconos.
- Se mantienen React, React Router y Axios porque son funcionalidad.
- Los tests de presentación son el contrato observable: roles, etiquetas,
  textos y flujos deben conservarse.

## Estructura de presentación (plantilla)

```
src/presentation/
├── components/
│   ├── character/   ficha: hero, stats, equipo, logros y contenido
│   ├── feedback/    errores de auth y tarjetas de problema
│   ├── layout/      PageShell, CenteredPage, cabecera, pie, marca, búsqueda, tema
│   ├── profile/     cabecera, valores, cuenta, invitado y personajes
│   ├── search/      formulario completo de búsqueda
│   └── ui/          Icon, ErrorAlert, FormField, SectionHeading
├── hooks/           useAuth, useTheme, useUseCases y hooks de personaje
├── pages/           una página por ruta, solo orquestación
├── providers/       Auth, Theme y UseCases + contextos
├── router/          AppRouter
└── utils/           formato y mensajes de error
```

Reglas para añadir cosas nuevas:

- Página nueva: crear `pages/MiPagina.tsx` y envolver el contenido con
  `PageShell` (o `CenteredPage` si es una pantalla centrada). Añadir la ruta en
  `router/AppRouter.tsx` y su test.
- Componente nuevo: ubicarlo en la carpeta de su dominio (`character`,
  `profile`, `search`, `feedback`, `layout`) o en `ui` si es una primitiva
  reutilizable.
- Primera opción siempre: reutilizar `Icon`, `ErrorAlert`, `FormField`,
  `SectionHeading`, `PageShell` y las clases de `index.css`.
- Sin estilos inline ni nuevas librerías de UI; estilos en `index.css` con las
  variables de tema existentes.
- Mantener los textos y roles que cubren los tests actuales.
- Añadir un `*.test.tsx` junto al componente o página cuando introduzca un
  flujo, estado o contrato accesible nuevo.
