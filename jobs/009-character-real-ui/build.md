# Build — ronda 1

## Resumen

El cliente ahora busca personajes reales y muestra su ficha. La búsqueda de la
home y de la ficha usa dos campos (reino y nombre). La del header usa una sola
cadena `reino/nombre`. Las dos normalizan la entrada con el nuevo
`SearchCharacter` (application) y navegan a `/character/:realmSlug/:characterName`
sin hacer ninguna petición. La ficha monta Header, ThemeToggle y Footer, y
obtiene los datos con el hook `useCharacter`. Ese hook llama a
`useUseCases().getCharacter`, pasa el nombre a minúsculas y devuelve un estado
discriminado. También descarta las respuestas obsoletas. La ficha pinta solo
campos del contrato real y tiene en español los estados de carga, éxito,
no encontrado, inválido, rate limit y no disponible. Se eliminaron los mocks
(`mockCharacter`, `types/character`) y también `StatBar`. Además se incluyen
los minors heredados de 008: `Retry-After` en formato fecha HTTP, texto de carga
en los botones de `ProfilePage`, `role="status"`, `p-6 sm:p-8` y
Header/ThemeToggle/Footer en la ficha.

Solo cambia `wow-armory-client/`. Trabajo hecho en el worktree
`C:\Users\Moises\Desktop\wow-armory-wt\009-character-real-ui`, rama
`factory/009-character-real-ui`.

## Cambios

- `wow-armory-client/src/application/character/SearchCharacter.ts` (nuevo).
  Funciones puras:
  - `normalizeRealmSlug`: recorta, pasa a minúsculas, quita `'`/`’` y convierte
    los espacios en `-`.
  - `normalizeCharacterName`: recorta y pasa a minúsculas.
  - `searchCharacter(realm, name)` → `{ realmSlug, characterName }`.
  - `parseCharacterQuery('reino/nombre')`: exige exactamente un `/` y las dos
    partes no vacías.

  Los errores son `InvalidSearchInput`, que extiende `CharacterValidation` y
  añade `field: 'realm' | 'name' | 'query'` y `reason: 'empty' | 'invalid'`.
  El mensaje distingue reino y nombre. Valida con `REALM_SLUG_PATTERN` y
  `CHARACTER_NAME_PATTERN` de `GetCharacter`. No es un caso de uso con
  repositorio, así que `container.ts` no se toca.
- `.../application/character/SearchCharacter.test.ts` (nuevo, 21 tests):
  - Normalización.
  - Apóstrofos (`'` y `’`) y espacios.
  - Entradas vacías.
  - Caracteres inválidos (`..`, `/`, `%2F`, `.`, espacio en el nombre, `ë`).
  - Variante `reino/nombre` con y sin separador, y con más de un `/`.
- `wow-armory-client/src/infrastructure/http/HttpError.ts`: `parseRetryAfter`
  ahora se exporta y acepta:
  - Segundos enteros, como número o como cadena de dígitos.
  - Una fecha HTTP en formato IMF-fixdate (`Wed, 21 Oct 2026 07:28:00 GMT`).
    Se convierte en `max(0, ceil((fecha - ahora)/1000))`.

  Cualquier otro valor devuelve `undefined`.
- `.../infrastructure/http/HttpError.test.ts`: tests de segundos, de fecha con
  `vi.useFakeTimers`/`vi.setSystemTime` (redondeo hacia arriba), de fecha pasada
  (`0`), de fecha leída del header de un 429 y de valores no parseables.
- `wow-armory-client/src/presentation/hooks/useCharacter.ts` (nuevo):
  - Devuelve `{ state, retry }`. `state` es `loading` | `success` | `not-found`
    | `invalid` | `rate-limited` (con `retryAfterSeconds?`) | `unavailable`.
  - El estado resuelto se guarda junto a una `requestKey` (reino, nombre y
    número de intento). Si no coincide con la petición actual, el estado es
    `loading`. Así nunca se pinta otro personaje.
  - El flag `isCurrent` del cleanup impide hacer `setState` con respuestas
    viejas o después de desmontar.
  - Cualquier error que no sea `CharacterError` acaba en `unavailable`.
- `.../presentation/hooks/useCharacter.test.tsx` (nuevo, 9 tests):
  - Todos los estados.
  - Nombre en minúsculas.
  - Estado `invalid` sin llamar al repositorio.
  - `retry()` vuelve a llamar.
  - Se descarta la respuesta obsoleta al cambiar de parámetros.
  - No hay `setState` tras desmontar (sin `console.error`).
- `wow-armory-client/src/presentation/utils/characterFormat.ts` (nuevo).
  Formateo en `es-ES`:
  - Números.
  - `formatKnownNumber`: `0` → "No disponible".
  - Fechas: se ignoran las inválidas.
  - Rango de hermandad: `0` → "Maestro de hermandad"; otro valor → "Rango N".
  - Miembros.
- `wow-armory-client/src/presentation/utils/searchErrorMessages.ts` (nuevo):
  traduce `InvalidSearchInput` a mensajes en español según el campo y el
  motivo.
- `wow-armory-client/src/presentation/components/CharacterSearchForm.tsx`
  (nuevo):
  - `<form role="search" aria-label="Buscar personaje">` con labels visibles
    "Reino" y "Nombre" y un botón "Buscar".
  - Valida los dos campos a la vez. Cada error queda asociado a su campo con
    `aria-invalid` + `aria-describedby`, y el foco va al primer campo inválido.
  - Navega con `useNavigate` a `/character/<enc(realm)>/<enc(name)>`.
  - Acepta `initialRealm`/`initialName`.
- `.../components/CharacterSearchForm.test.tsx` (nuevo, 5 tests, user-event).
- `wow-armory-client/src/presentation/components/Header/SearchBar.tsx`:
  - Ahora es `<form role="search" aria-label="Búsqueda rápida">`. Conserva
    `isCompact`, el aspecto y el `aria-label="Buscar personaje"` del input.
  - Usa el placeholder "Buscar: reino/nombre" y busca al pulsar Enter con
    `parseCharacterQuery`.
  - Si la entrada no es válida, muestra un `<p role="alert">` enlazado con
    `aria-describedby` y pone `aria-invalid` en el input.
  - Se eliminó la prop `onSearch`.
- `.../components/Header/SearchBar.test.tsx` (nuevo, 4 tests, user-event).
- `wow-armory-client/src/presentation/components/Header/Header.tsx`: se eliminó
  `handleSearch`.
- `CharacterBanner.tsx`, `CharacterCard.tsx` y `RecentAchievements.tsx`
  (reescritos) reciben el `Character`/`Achievement` del dominio.
  - **Banner.** El fondo es un degradado CSS y las iniciales hacen de
    placeholder. Los dos llevan `aria-hidden`. Incluye `<h1>` con el nombre y un
    resumen con raza · spec · clase.
  - **Card.** Tiene un `<dl>` con Nivel, Raza, Clase, Especialización, Reino,
    Nivel de objeto, Puntos de logro y Última conexión. Debajo va la sección
    Hermandad: nombre, reino, rango y miembros, o "Sin hermandad".
  - **Logros recientes.** Muestra nombre, puntos y fecha `es-ES`, o "Sin logros
    recientes". La key es `id-<id>` o `name-index`.
  - Todas las tarjetas usan `p-6 sm:p-8`, `dark:` y el borde y la sombra
    neo-brutalistas. Sin imágenes externas.
- `wow-armory-client/src/presentation/pages/CharacterProfilePage.tsx`:
  - Monta Header, ThemeToggle y Footer, y usa `useCharacter` con los parámetros
    de la ruta.
  - Carga: `role="status"` con "Cargando personaje…".
  - Error: `role="alert"` y un texto en español para cada estado, más el
    formulario (not-found/invalid) o "Reintentar" (rate-limited/unavailable), y
    "Volver al inicio".
- `wow-armory-client/src/presentation/pages/CharacterProfilePage.test.tsx`
  (nuevo, 11 tests). Usa `createTestDependencies` y `MemoryRouter` con
  `AppRoutes`, es decir, la ruta real.
- `wow-armory-client/src/presentation/pages/HomePage.tsx`: la home queda en
  estado vacío, con `<h1>` "Busca un personaje", una frase y
  `CharacterSearchForm`. Mantiene Header, ThemeToggle, AuthErrorBanner y
  Footer.
- `HomePage.test.tsx` y `AppRouter.test.tsx`: se adaptaron a `MemoryRouter`, al
  estado vacío y a la ficha con datos del repositorio en memoria.
- `wow-armory-client/src/presentation/pages/ProfilePage.tsx` y su test:
  - Los botones muestran "Iniciando sesión…" / "Cerrando sesión…" mientras
    `isLoading`, sin desmontarse y con `aria-busy`.
  - Se ajustó el test de login y se añadió uno de logout.
- Eliminados:
  - `presentation/data/mockCharacter.ts`.
  - `presentation/types/character.ts`.
  - `presentation/components/StatBar.tsx`.
- `Footer.tsx` y `Header/Logo.tsx`: se quitó el `import React` sin usar. Era
  preexistente, pero hacía fallar `tsc -p tsconfig.app.json --noEmit`.

## Criterios de aceptación

### Aplicación (búsqueda)

- [x] `SearchCharacter.ts` es puro (sin React, Axios ni router). Normaliza
      espacios, minúsculas, apóstrofos y `Area 52` → `area-52`. Lo cubre
      `SearchCharacter.test.ts`.
- [x] Las entradas vacías o inválidas lanzan `CharacterValidation`
      (`InvalidSearchInput`) con un mensaje y un `field` distintos para reino y
      nombre.
- [x] Existe la variante `reino/nombre` (`parseCharacterQuery`). Si no hay
      exactamente un `/` con las dos partes no vacías, lanza `field: 'query'`.
- [x] Los tests cubren normalización, apóstrofos y espacios, vacíos, `..`, `/`,
      `%2F`, espacios en el nombre, y la variante con y sin separador.

### Infraestructura

- [x] `parseRetryAfter` acepta segundos y fechas HTTP. Las fechas se redondean
      hacia arriba y nunca dan negativo (una fecha pasada da `0`). Un valor no
      parseable da `undefined`.
- [x] Hay tests con `vi.useFakeTimers`/`vi.setSystemTime`, incluida la fecha
      pasada.
- [x] No cambian `AxiosHttpClient`, `env.ts` ni `container.ts`.

### Hook de personaje

- [x] `useCharacter` usa `useUseCases().getCharacter`, normaliza a minúsculas y
      devuelve el estado discriminado más `retry()`.
- [x] Descarta las respuestas obsoletas y no hace `setState` tras desmontar
      (tests "discards a stale response…" y "does not update state after
      unmounting").
- [x] Un error que no es `CharacterError` acaba en `unavailable` (test con
      `TypeError`). El error nunca se muestra.
- [x] Los tests cubren cada estado, `retry()` y el descarte de la respuesta
      obsoleta.

### Ficha de personaje

- [x] Monta Header, ThemeToggle y Footer (test "mounts the header, theme toggle
      and footer") y no usa mocks.
- [x] Carga: `role="status"` "Cargando personaje…" sin `<h1>` de personaje.
- [x] Éxito: aparecen todos los campos, con fechas y números en `es-ES` (test
      "renders every field of a full character").
- [x] Las etiquetas están en español. Clase, raza y spec se muestran tal cual
      llegan.
- [x] `0` → "No disponible". Si faltan spec o lastLogin, se muestra
      "No disponible". El contenedor no contiene `undefined`, `NaN` ni
      `Invalid Date`.
- [x] Hermandad: nombre, reino, miembros y el rango `0` como "Maestro de
      hermandad" o `N` como "Rango N".
- [x] Sin hermandad: "Sin hermandad".
- [x] Logros: nombre, puntos y fecha, o "Sin logros recientes". Las keys son
      estables.
- [x] not-found: alerta "No encontramos a <nombre> en <reino>.", el
      formulario y "Volver al inicio".
- [x] invalid: alerta y formulario, sin llamar al repositorio.
- [x] rate-limited: mensaje con N segundos o genérico, y "Reintentar".
- [x] unavailable: mensaje y "Reintentar", que vuelve a llamar. No redirige.
- [x] Los errores no muestran mensajes en inglés ni el cuerpo del servidor
      (test con `CharacterUnavailable('raw server body')`).
- [x] Las tarjetas usan `p-6 sm:p-8` y `dark:`, sin Unsplash ni URLs
      hardcodeadas. Los placeholders son locales y llevan `aria-hidden`.

### Búsqueda

- [x] `CharacterSearchForm`: `role="search"` con nombre accesible, labels
      visibles "Reino"/"Nombre" y botón "Buscar".
- [x] Envío válido: navega a la ruta codificada. Envío inválido: no navega y
      marca el error con `aria-invalid` + `aria-describedby`. En ningún caso
      hace una petición.
- [x] `SearchBar`: `<form role="search">`. Conserva `isCompact`, el aspecto y
      el `aria-label`. Busca con Enter y `reino/nombre`, con el placeholder en
      español, y si la entrada no es válida muestra `role="alert"`.
      `handleSearch` se eliminó.
- [x] Los tests que montan `Header` usan `MemoryRouter` o `AppRoutes`.

### Home sin mocks

- [x] La home queda en estado vacío, con `<h1>` "Busca un personaje", una
      frase, el formulario y el banner `auth_error`.
- [x] Mocks eliminados. `grep -rn "mockCharacter\|types/character\|unsplash"
      wow-armory-client/src` no devuelve nada.
- [x] Banner, Card y Achievements reciben el dominio. Se eliminaron
      `StatBar` y las stats inventadas.

### Minors heredados de 008

- [x] ProfilePage: los botones muestran "Iniciando sesión…" /
      "Cerrando sesión…", siguen montados y llevan `aria-busy`. El test se
      ajustó y pasa.

### Tests y verificación

- [x] Tests de la página `CharacterProfilePage`: carga, éxito completo,
      opcionales ausentes con `0`, not-found, invalid sin llamadas,
      rate-limited con y sin segundos, unavailable con reintento y nombre en
      mayúsculas consultado en minúsculas.
- [x] Tests de `CharacterSearchForm` y `SearchBar` con user-event, con submit
      válido e inválido.
- [x] `HomePage.test.tsx` y `AppRouter.test.tsx` actualizados.
- [x] `git diff --stat main...factory/009-character-real-ui -- wow-armory-server`
      sale vacío.
- [x] Los greps de `axios|fetch(` en presentation y de imports de
      React/axios/router en domain/application salen vacíos.
- [x] lint, test y build pasan.

## Verificación

Todo se ejecutó en el worktree, en `wow-armory-client/`.

- `npm run lint`: pasa, sin errores ni warnings.
- `npm test`: pasa, 20 archivos y 137 tests. Solo aparecen los warnings de
  future flags de React Router v7, que ya existían.
- `npm run build`: pasa (`vite build`, 1908 módulos).
- `npx tsc -p tsconfig.app.json --noEmit` (comprobación extra, porque
  `vite build` no hace typecheck): pasa después de quitar los `import React`
  sin usar de `Footer.tsx` y `Logo.tsx`. Antes fallaba con TS6133 en esos dos
  archivos, que este job no había tocado.
- `grep -rn "mockCharacter\|types/character\|unsplash" wow-armory-client/src`
  no devuelve nada.
- `grep -rnE "axios|fetch\(" wow-armory-client/src/presentation` no devuelve
  nada.
- `grep -rnE "from 'react|axios|react-router" wow-armory-client/src/domain wow-armory-client/src/application`
  no devuelve nada.
- `git diff --stat main...factory/009-character-real-ui -- wow-armory-server`
  sale vacío.
- La prueba manual con el servidor y credenciales de Blizzard no se ejecutó:
  es opcional y requiere credenciales.

## Notas y decisiones

- **`parseRetryAfter`.** Ahora exige segundos enteros (`^\d+$`), como define
  RFC 9110. Antes se aceptaban `'1.5'` y `''` (que daba `0`), y ahora devuelven
  `undefined`. Los números siguen aceptándose como antes. Para las fechas solo
  se acepta IMF-fixdate, porque `Date.parse` de V8 es muy permisivo con cadenas
  arbitrarias.
- **`useCharacter`.** Pasa a minúsculas el nombre, como pide la spec, y también
  el reino. Así `/character/Grobbulus/x` funciona en lugar de dar `invalid`.
  Los slugs válidos ya son minúsculas, así que no cambia nada para ellos.
- **Mensaje de not-found.** Usa el reino y el nombre tal como aparecen en la
  URL, ya decodificados por React Router y renderizados como texto, sin HTML.
- **Dos landmarks de búsqueda.** En la ficha hay dos formularios de búsqueda:
  el del header se llama "Búsqueda rápida" y el formulario de la página se
  llama "Buscar personaje".
- **Fuera de alcance.** `Footer` sigue en inglés y con enlaces `#`. Lo
  resuelve 004.

## Feedback de la ronda

- security: primera build.
- ux: primera build.
- ui: primera build.
- code: primera build.

## Commit

`c77920d` `feat: :sparkles: real character search and profile`
