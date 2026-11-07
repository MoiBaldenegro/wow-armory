# 009-character-real-ui — Búsqueda y ficha con datos reales (sin mocks)

## Objetivo

Hoy el visitante ve siempre un personaje inventado (`mockCharacter`, "Thrall")
y el buscador del header no hace nada. Este job conecta la búsqueda por reino y
nombre con `GET /characters/:realmSlug/:characterName` a través del caso de uso
`GetCharacter` que dejó 008. La ficha (`/character/:realmSlug/:characterName`)
pinta solo datos reales, con estados de carga, vacío y error en español.
Desaparecen los mocks del cliente.

## Contexto

- Solo cambia `wow-armory-client/`. `wow-armory-server/` no se toca porque
  `010-production-hardening` trabaja en paralelo sobre él.
- Ya existe (008) y se reutiliza sin cambiar su contrato:
  - Dominio: `src/domain/character/{Character,Guild,Achievement}.ts`,
    `errors/CharacterErrors.ts` (`CharacterNotFound`, `CharacterRateLimited`
    con `retryAfterSeconds?`, `CharacterUnavailable`, `CharacterValidation`) y
    `ports/CharacterRepository.ts`.
  - `src/application/character/GetCharacter.ts` exporta `REALM_SLUG_PATTERN`
    (`^[a-z0-9-]{1,64}$`) y `CHARACTER_NAME_PATTERN` (`^[A-Za-z0-9'-]{1,64}$`).
    Valida la entrada y convierte `null` en `CharacterNotFound`.
  - `src/infrastructure/http/HttpCharacterRepository.ts` codifica los segmentos
    y mapea 404→`null`, 400→`CharacterValidation`,
    429→`CharacterRateLimited`, 5xx/red→`CharacterUnavailable`.
  - `src/infrastructure/http/HttpError.ts`: hoy `parseRetryAfter` solo acepta
    segundos. Si recibe una fecha HTTP devuelve `undefined` (minor de code en
    008).
  - `src/infrastructure/container.ts` expone `UseCases.getCharacter`;
    `src/test/fakes.ts` trae `InMemoryCharacterRepository` y
    `createTestDependencies`.
- Presentación actual:
  - `presentation/pages/HomePage.tsx` pinta `mockCharacter` con
    `CharacterBanner`, `RecentAchievements` y `CharacterCard`.
  - `presentation/pages/CharacterProfilePage.tsx` es un shell sin datos que usa
    `p-8` fijo y no monta `Header`, `ThemeToggle` ni `Footer`.
  - `presentation/components/Header/Header.tsx` tiene un `handleSearch` vacío.
  - `presentation/components/Header/SearchBar.tsx` es un `<input>` con
    `onChange → onSearch`, sin `<form>` ni submit.
  - Los mocks viven en `presentation/data/mockCharacter.ts` y
    `presentation/types/character.ts`. Ese view model incluye avatar, banner,
    stats, `playTime`, `rank` como texto y logros con `date`/`description`,
    nada de lo cual existe en el contrato real. `StatBar.tsx` solo lo usa
    `CharacterCard`.
  - Hay tests que dependen del mock. `HomePage.test.tsx` y
    `AppRouter.test.tsx` buscan "Thrall" y el copy del shell.
- Contrato real del servidor, que no se modifica
  (`wow-armory-server/src/characters/presentation/`):
  - Campos obligatorios: `name`, `realmSlug`, `level`, `class`, `race`,
    `itemLevel` y `achievementPoints`.
  - Campos opcionales: `spec`, `lastLogin` (ISO), `guild` (`name`, `realm?`,
    `rank?` numérico, `memberCount?`) y `achievements[]` (`name`, `id?`,
    `points?`, `completedAt?`).
  - Los textos de clase, raza y spec llegan en inglés (`locale=en_US`).
  - Si Blizzard no envía `itemLevel` o `achievementPoints`, llegan como `0`.
  - El endpoint es público y no usa sesión. No responde 401: el servidor
    convierte los 401/403 de Blizzard en 502.
- El servidor no pasa el nombre a minúsculas antes de llamar a Blizzard
  (`BlizzardCharacterAdapter.ts`), y Blizzard espera nombres en minúsculas. Por
  eso el cliente debe normalizar el nombre.
- Minors que 008 dejó para este job y que se incluyen:
  - `role="status"` en la ficha.
  - Texto de carga en los botones de login/logout de `ProfilePage`.
  - `Retry-After` en formato fecha HTTP.
  - `p-6 sm:p-8` en la ficha.
  - Header/ThemeToggle/Footer en la ficha.
- Restricciones:
  - TypeScript estricto y sin `any` nuevo.
  - Comillas simples y comas finales.
  - Ninguna dependencia nueva.
  - `domain/` y `application/` no importan React, Axios ni
    `react-router-dom`.
  - Copy en español, clases Tailwind con variantes `dark:` y el estilo
    "neo-brutalista" existente (bordes negros y sombras desplazadas).

## Criterios de aceptación

### Aplicación (búsqueda)

- [ ] Existe `src/application/character/SearchCharacter.ts`, sin React, Axios
      ni router. Expone una función o clase pura que recibe
      `(realmInput, nameInput)` y devuelve `{ realmSlug, characterName }`
      normalizados. La normalización:
  - Recorta espacios en ambos campos.
  - Pasa el reino a minúsculas, convierte los espacios internos en `-` y
    elimina los apóstrofos (`"Area 52"` → `area-52`, `"Kel'Thuzad"` →
    `kelthuzad`).
  - Pasa el nombre a minúsculas (`"Thrall"` → `thrall`).
- [ ] Si la entrada está vacía o no cumple `REALM_SLUG_PATTERN` /
      `CHARACTER_NAME_PATTERN` tras normalizar, lanza `CharacterValidation`
      con un mensaje que distingue reino y nombre.
- [ ] La misma utilidad tiene una variante para una única cadena
      `reino/nombre` (p. ej. `"grobbulus/Billiemoi"` →
      `{ realmSlug: 'grobbulus', characterName: 'billiemoi' }`).
  - Si no hay exactamente un `/` con ambas partes no vacías, lanza
    `CharacterValidation`.
- [ ] `SearchCharacter.test.ts` cubre:
  - Normalización de reino y nombre.
  - Apóstrofos y espacios.
  - Entradas vacías.
  - Caracteres inválidos (`..`, `/`, `%2F`, espacios en el nombre).
  - La variante `reino/nombre`, con y sin separador.

### Infraestructura

- [ ] `parseRetryAfter` (en `HttpError.ts`) acepta segundos (comportamiento
      actual) y también una fecha HTTP (`Retry-After: Wed, 21 Oct 2026
      07:28:00 GMT`). La fecha se convierte en segundos restantes, redondeados
      hacia arriba y nunca negativos (una fecha pasada da `0`).
  - Un valor no parseable sigue dando `undefined`.
- [ ] `HttpError.test.ts` cubre el formato fecha con reloj controlado
      (`vi.useFakeTimers`/`vi.setSystemTime`) y la fecha pasada.
- [ ] No cambian `AxiosHttpClient`, `env.ts`, `container.ts` (salvo registrar
      `SearchCharacter` si se modela como caso de uso), `baseURL`,
      `withCredentials` ni el timeout.

### Hook de personaje

- [ ] Existe `src/presentation/hooks/useCharacter.ts`. Recibe
      `(realmSlug, characterName)` y usa `useUseCases().getCharacter`.
  - Normaliza el nombre a minúsculas antes de llamar, para que
    `/character/grobbulus/Billiemoi` funcione.
  - Devuelve un estado discriminado: `loading` | `success` (con `Character`) |
    `not-found` | `invalid` | `rate-limited` (con `retryAfterSeconds?`) |
    `unavailable`, además de una función `retry()`.
- [ ] El hook descarta las respuestas obsoletas. Si los parámetros cambian o el
      componente se desmonta antes de que resuelva la petición anterior, el
      resultado viejo no se pinta ni provoca `setState` tras desmontar.
- [ ] Cualquier error que no sea `CharacterError` acaba en `unavailable`. Ese
      error nunca se muestra en crudo.
- [ ] `useCharacter.test.tsx` (o los tests de la página) cubren:
  - Cada estado.
  - `retry()`, que vuelve a llamar al repositorio.
  - El descarte de la respuesta obsoleta al cambiar de parámetros.

### Ficha de personaje (`/character/:realmSlug/:characterName`)

- [ ] `CharacterProfilePage` monta `Header`, `ThemeToggle` y `Footer`, como la
      home, y usa `useCharacter` con los parámetros de la ruta. No usa
      `mockCharacter` ni el view model mock.
- [ ] Carga: muestra un elemento `role="status"` con el texto
      "Cargando personaje…" y no muestra datos de otro personaje.
- [ ] Éxito. Muestra:
  - `name` como `<h1>`.
  - Nivel.
  - Raza.
  - Clase.
  - Especialización, si existe.
  - Reino.
  - Item level.
  - Puntos de logro.
  - Última conexión formateada con `Intl.DateTimeFormat('es-ES')`, si existe.
- [ ] Las etiquetas de la ficha están en español ("Nivel", "Nivel de objeto",
      "Puntos de logro", "Última conexión"). Los valores de clase, raza y spec se
      muestran tal cual llegan.
- [ ] Ausencias y valores desconocidos:
  - Si `itemLevel` o `achievementPoints` valen `0`, se muestran como
    "No disponible", no como `0`.
  - Si falta `spec` o `lastLogin`, se omite el dato o se muestra
    "No disponible". En ningún caso aparecen `undefined`, `NaN` ni
    "Invalid Date".
- [ ] Hermandad, si existe:
  - Muestra el nombre y, si existen, el reino y el número de miembros.
  - El `rank` numérico se muestra como "Maestro de hermandad" si es `0` y como
    "Rango N" en otro caso.
- [ ] Hermandad ausente: muestra "Sin hermandad" y no rompe la página.
- [ ] Logros recientes:
  - Si `achievements` existe y no está vacío, muestra cada logro con su
    nombre, los puntos si existen y la fecha `completedAt` formateada en
    `es-ES` si existe.
  - Si `achievements` falta o está vacío, muestra el estado vacío "Sin logros
    recientes".
  - Las claves de React son estables: `id` si existe y, si no, `name` + índice.
- [ ] `not-found` (`role="alert"`): muestra "No encontramos a <nombre> en
      <reino>." junto con el formulario de búsqueda (ver más abajo) para
      intentarlo de nuevo, y un enlace "Volver al inicio".
- [ ] `invalid` (`role="alert"`): explica que el reino o el nombre no tienen un
      formato válido y ofrece el formulario de búsqueda. No llama al
      repositorio, porque `GetCharacter` valida antes.
- [ ] `rate-limited` (`role="alert"`): "Demasiadas consultas. Inténtalo de
      nuevo en N segundos." si se conoce `retryAfterSeconds`, o un texto
      genérico si no.
  - Incluye un botón "Reintentar" que llama a `retry()`.
- [ ] `unavailable` (`role="alert"`): dice que los datos no están disponibles
      ahora mismo e incluye un botón "Reintentar". No redirige a login.
- [ ] Ningún estado de error muestra mensajes en inglés del dominio ni el
      cuerpo del servidor.
- [ ] La tarjeta usa `p-6 sm:p-8`, variantes `dark:` y el borde/sombra
      existentes. No hay imágenes externas (Unsplash) ni URLs hardcodeadas: el
      avatar/banner, si se conserva, es un placeholder local (iniciales o
      degradado CSS) con `alt` o `aria-hidden` adecuado.

### Búsqueda

- [ ] Existe un formulario de búsqueda reutilizable en
      `src/presentation/components/` (p. ej. `CharacterSearchForm.tsx`) con:
  - `role="search"` o un `<form>` con nombre accesible.
  - Dos campos con `<label>` visible: "Reino" y "Nombre".
  - Un botón submit "Buscar".
- [ ] Al enviar el formulario:
  - Con entrada válida, normaliza con `SearchCharacter` y navega con
    `useNavigate` a `/character/<realmSlug>/<characterName>`, codificando los
    segmentos.
  - Con entrada inválida, no navega y muestra el error en español asociado al
    campo (`aria-invalid` + `aria-describedby`).
  - En ambos casos, enviar no hace ninguna petición HTTP; la petición la hace
    la ficha.
- [ ] `SearchBar` del header pasa a ser un `<form role="search">`.
  - Conserva su aspecto, la firma de props de `isCompact` y el `aria-label`.
  - Busca al pulsar Enter usando la variante `reino/nombre` y navega a la
    ficha. El placeholder es en español y explica el formato
    (p. ej. "reino/nombre").
  - Con entrada inválida, no navega y muestra un mensaje accesible (texto
    visible o `aria-describedby` con `role="alert"`).
  - `Header.handleSearch` deja de estar vacío o se elimina; no queda código
    muerto.
- [ ] `Header` ya no puede renderizarse fuera de un router. Los tests que lo
      monten usan `MemoryRouter` o el `AppRouter`.

### Home sin mocks

- [ ] `HomePage` ya no muestra personaje mock. Mantiene `Header`,
      `ThemeToggle`, `AuthErrorBanner` y `Footer`, y muestra un estado vacío:
  - Un `<h1>` en español (p. ej. "Busca un personaje").
  - Una frase breve.
  - `CharacterSearchForm`.
- [ ] Se eliminan `src/presentation/data/mockCharacter.ts` y
      `src/presentation/types/character.ts`. `grep -rn "mockCharacter\|types/character" wow-armory-client/src`
      no devuelve nada.
- [ ] `CharacterBanner`, `CharacterCard` y `RecentAchievements` pasan a recibir
      el `Character` del dominio (`src/domain/character/Character.ts`), o se
      sustituyen por componentes nuevos que lo reciban. `StatBar` y las stats
      inventadas se eliminan si dejan de usarse; no se muestran stats que el
      contrato no trae.

### Minors heredados de 008

- [ ] En `ProfilePage`, mientras `isLoading` está activo tras una acción, los
      botones muestran texto de carga ("Iniciando sesión…" /
      "Cerrando sesión…").
  - Siguen montados y con `aria-busy`.
  - El test "keeps the button mounted, disabled and busy while logging in"
    se ajusta y sigue pasando.

### Tests y verificación

- [ ] Hay tests de página para `CharacterProfilePage`, con
      `createTestDependencies` y `MemoryRouter` en la ruta real:
  - Carga (`role="status"`).
  - Éxito con todos los campos.
  - Éxito con los opcionales ausentes y `itemLevel: 0`: sin `undefined`,
    "Sin hermandad", "Sin logros recientes" y "No disponible".
  - `not-found`.
  - `invalid` sin llamadas al repositorio.
  - `rate-limited` con y sin segundos.
  - `unavailable` con "Reintentar" que vuelve a llamar.
  - Un nombre con mayúsculas en la URL se consulta en minúsculas.
- [ ] Hay tests de `CharacterSearchForm` y `SearchBar` con `user-event`:
  - Un submit válido navega a la ruta esperada.
  - Un submit inválido muestra el error y no navega.
- [ ] `HomePage.test.tsx` y `AppRouter.test.tsx` se actualizan:
  - La home muestra el estado vacío con búsqueda y sigue mostrando el banner
    `auth_error`.
  - La ruta de ficha pinta los datos del repositorio en memoria.
- [ ] `git diff --stat main...factory/009-character-real-ui -- wow-armory-server`
      sale vacío.
- [ ] `grep -rnE "axios|fetch\(" wow-armory-client/src/presentation` y
      `grep -rnE "from 'react|axios|react-router" wow-armory-client/src/domain wow-armory-client/src/application`
      no devuelven nada.
- [ ] `npm run lint`, `npm test` y `npm run build` pasan en `wow-armory-client`.

## Plan de pruebas

- `cd wow-armory-client && npm run lint`
- `cd wow-armory-client && npm test`
- `cd wow-armory-client && npm run build`
- `grep -rn "mockCharacter\|types/character\|unsplash" wow-armory-client/src`
  (debe salir vacío)
- `git diff --stat main...factory/009-character-real-ui -- wow-armory-server`
  (debe salir vacío)
- Manual opcional, con el servidor en marcha y credenciales de Blizzard:
  1. `cd wow-armory-client && npm run dev`.
  2. Buscar un personaje existente, uno inexistente y uno con formato inválido.
  3. Probar los temas claro y oscuro.

## Fuera de alcance

- Cualquier cambio en `wow-armory-server/`: contrato, lowercasing del nombre,
  locale, nuevos campos (avatar, media, stats) o endpoints de búsqueda y
  autocompletado. Todo eso corresponde a 010/011 o a un job posterior.
- Configuración de entorno y HTTP del cliente (`env.ts`, `AxiosHttpClient`,
  `container.ts` salvo el registro mínimo), fallback SPA para deep links,
  `index.html` (`lang`, bootstrap del tema) y CORS/cookies: todo eso es de 010
  o 012.
- Value objects del cliente (`RealmSlug`/`CharacterName` como clases) y ADRs
  (011).
- Accesibilidad general: foco y `motion-safe` de `ThemeToggle`, enlaces `#`
  del `Footer`, navegación por teclado global y layout compartido para
  `ProfilePage`, `ErrorPage` y `NotFoundPage` (004).
- Despliegue (012).
- Soporte de nombres o reinos con caracteres no ASCII (acentos, alfabetos no
  latinos) y elección de región.
- Caché de respuestas, contador regresivo en vivo del `Retry-After` y
  autocompletado.

## Riesgos

- **Nombres no ASCII.** `CHARACTER_NAME_PATTERN` es ASCII, igual que en el
  servidor, así que nombres reales como "Thrallë" se rechazan como inválidos.
  Interpretación conservadora: mantener el patrón compartido y mostrar el
  mensaje de validación. Ampliarlo exige cambiar el servidor (011 o un job
  posterior) y queda documentado.
- **Minúsculas en el servidor.** El servidor no normaliza el nombre a
  minúsculas. Si se llama al endpoint directamente con mayúsculas, Blizzard
  puede responder 404. Mitigación en el cliente: normalizar siempre (búsqueda y
  hook). Propuesta para 010/011, que no se exige aquí: hacer lowercase en
  `CharacterName` o en `BlizzardCharacterAdapter`.
- **Slug del reino.** La normalización es heurística (minúsculas, espacios→`-`,
  sin apóstrofos). Reinos con acentos o paréntesis (p. ej.
  "Aggra (Português)") no se resuelven. El usuario recibe un error de
  validación y puede escribir el slug directamente.
- **Ambigüedad de la búsqueda.** El backlog no fija el formato. Interpretación
  más pequeña: dos campos en la home y en la ficha, y `reino/nombre` en el
  header compacto. No hay búsqueda solo por nombre ni autocompletado (CU-02
  los deja abiertos).
- **Datos que el contrato no trae.** Sin avatar, banner ni stats, la ficha
  será más austera que el mock. Se acepta mostrar solo datos reales con
  placeholders locales. Añadir media o stats requiere un endpoint nuevo en el
  servidor.
- **`0` como desconocido.** Un `itemLevel` o `achievementPoints` de `0` legítimo
  (personaje recién creado) se mostrará como "No disponible". El riesgo es
  bajo y lo correcto sería que el servidor enviara `undefined`.
- **Textos en inglés.** Clase, raza y spec llegan en inglés (`en_US`) y se
  mostrarán mezclados con etiquetas en español. Traducirlos o pedir `es_ES`
  queda fuera de alcance.
- **Conflictos con 010.** Si 010 cambia cabeceras (p. ej. el formato de
  `Retry-After` del rate limiting propio), el parser de fecha HTTP de este job
  ya lo cubre. No se tocan `env.ts` ni el cliente HTTP para evitar conflictos
  de merge.
- **Tests con router.** Al usar `useNavigate`, `Header`/`SearchBar` exigen un
  router. Los tests existentes que monten la home fuera de un router fallarán y
  deben envolverse en `MemoryRouter`.
