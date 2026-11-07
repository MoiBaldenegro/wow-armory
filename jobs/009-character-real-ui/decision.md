APPROVE
# Decision — 009-character-real-ui

## Resumen

La búsqueda (home, ficha y header) y la ficha `/character/:realmSlug/:characterName`
usan datos reales a través de `GetCharacter`, con estados de carga, vacío y error
en español, y sin mocks. Las 4 revisiones de la ronda 1 son PASS sin blockers ni
majors, y lint, tests, build y los greps del plan se reproducen en verde sobre
`c77920d`.

## Evidencia

- Aplicación (búsqueda): `src/application/character/SearchCharacter.ts` es puro
  (`searchCharacter`, `parseCharacterQuery`, `InvalidSearchInput extends
  CharacterValidation` con `field`/`reason`). `SearchCharacter.test.ts` (21 tests)
  cubre la normalización, apóstrofos, espacios, vacíos, `..`, `/`, `%2F`, espacio
  en el nombre y la variante `reino/nombre` con y sin separador.
- Infraestructura: `parseRetryAfter` acepta segundos y fechas IMF-fixdate, con
  `ceil` y nunca negativo. `HttpError.test.ts` usa `vi.setSystemTime` y prueba una
  fecha pasada (resultado `0`). `container.ts`, `env.ts`, `AxiosHttpClient.ts` y
  `package*.json` no cambian (diff vacío, comprobado).
- Hook: `useCharacter.ts` pasa los parámetros a minúsculas, devuelve el estado
  discriminado más `retry()`, descarta respuestas obsoletas con `requestKey` y
  `isCurrent`, y convierte cualquier error que no sea `CharacterError` en
  `unavailable`. `useCharacter.test.tsx` tiene 9 tests (estados, retry, respuesta
  obsoleta, desmontaje).
- Ficha: `CharacterProfilePage.test.tsx` tiene 11 tests sobre la ruta real con
  `createTestDependencies`: carga `role="status"`, éxito completo, opcionales
  ausentes con `0` ("No disponible", "Sin hermandad", "Sin logros recientes", sin
  `undefined`), not-found, invalid sin llamadas al repositorio, rate-limited con y
  sin segundos, unavailable con "Reintentar" y nombre en mayúsculas consultado en
  minúsculas. Monta Header, ThemeToggle y Footer, y usa `p-6 sm:p-8` y `dark:`.
- Búsqueda: `CharacterSearchForm` (`role="search"`, labels "Reino"/"Nombre",
  "Buscar", `aria-invalid` + `aria-describedby`) y `SearchBar` como
  `<form role="search">` con `reino/nombre`. Tienen tests con user-event (5 + 4).
  `handleSearch` se eliminó.
- Home sin mocks: `HomePage` muestra el estado vacío "Busca un personaje" con el
  formulario y `AuthErrorBanner`. Se eliminaron `mockCharacter.ts`,
  `types/character.ts` y `StatBar.tsx`.
- Minor heredado de 008: `ProfilePage` muestra "Iniciando sesión…" / "Cerrando
  sesión…" con el botón montado y `aria-busy`, y tiene tests de login y logout.
- Tests (reejecutados en el worktree, `wow-armory-client/`):
  - `npm run lint`: OK, sin errores.
  - `npm test`: 20 archivos y 137 tests, todos pasan.
  - `npm run build`: OK.
  - `npx tsc -p tsconfig.app.json --noEmit`: OK.
  - `grep -rn "mockCharacter\|types/character\|unsplash" src`: vacío.
  - `grep -rnE "axios|fetch\(" src/presentation`: vacío.
  - `grep -rnE "from 'react|axios|react-router" src/domain src/application`:
    vacío.
  - `git diff --stat main...factory/009-character-real-ui -- wow-armory-server`:
    vacío.
- Revisiones (round-1): security PASS, ux PASS, ui PASS, code PASS. Solo hay
  minors.
- Fuera del alcance estricto, pero aceptado: se quitaron los `import React` sin
  usar de `Footer.tsx` y `Logo.tsx` (dos líneas) para que pase el typecheck. Es
  trivial y no cambia el comportamiento.
- No verificado: la prueba manual con servidor y credenciales de Blizzard, que la
  spec marca como opcional.

## Riesgos residuales / seguimiento

Nada bloquea el merge. Quedan estos minors para jobs posteriores.

### Para 004 (accesibilidad y UI general)

- ux/ui `SearchBar.tsx:60`: en tema claro, con scroll 0, el input del header
  (`bg-white/10 text-white placeholder-white/50`) apenas contrasta sobre
  `bg-gray-100`. El problema ya existía, pero ahora el campo es funcional.
- ux `CharacterBanner.tsx`, `CharacterCard.tsx`, `RecentAchievements.tsx`: las
  animaciones de `framer-motion` no respetan `prefers-reduced-motion` (falta
  `MotionConfig reducedMotion="user"`).
- ux `CharacterProfilePage.tsx:68-85`: al pulsar "Reintentar", el botón se
  desmonta y el foco cae en `<body>`. Habría que mover el foco al nuevo estado
  (`tabIndex={-1}`) o mantener el botón montado y deshabilitado.
- ux `SearchBar.tsx:72-80`: el popover de error de la búsqueda rápida no se
  cierra con `Escape` ni al hacer blur, y puede tapar contenido.
- ux `CharacterProfilePage.tsx:112`: en el estado `invalid`, precargar el
  formulario con los parámetros de la URL.
- ux `CharacterSearchForm.tsx:53-70` / `SearchBar.tsx:20-31`: si se repite la
  búsqueda de la ruta actual, no hay respuesta visible. Se podría llamar a
  `retry()`.
- ui `CharacterBanner.tsx:32-35`: el avatar pierde el solapamiento en `sm+`
  (probar `sm:self-start`).
- ui `RecentAchievements.tsx:45-55`: las filas sin `points` quedan desalineadas.
  Se podría reservar el hueco con un placeholder `aria-hidden`.
- ui `CharacterProfilePage.tsx:76-84`: añadir un `Loader2` `animate-spin`
  `aria-hidden` al estado de carga.
- ui `SearchBar.tsx:55`: el placeholder puede cortarse en móvil (usar
  "reino/nombre").
- `Footer` sigue en inglés y con enlaces `#`, como ya estaba previsto para 004.

### Para 011 (dominio, value objects y contrato)

- code `SearchCharacter.ts:26-38`: los mensajes de `InvalidSearchInput` están en
  inglés. Hay que documentar que son técnicos y no van a la UI, o integrarlo en
  los value objects `RealmSlug`/`CharacterName`.
- Riesgos de la spec que siguen abiertos:
  - El servidor no pasa el nombre a minúsculas (`BlizzardCharacterAdapter`).
  - Los patrones ASCII rechazan nombres y reinos no ASCII.
  - `itemLevel`/`achievementPoints` llegan como `0` en vez de ausentes.
  - Clase, raza y spec llegan en `en_US`.

### Otros (code/security, sin job asignado)

- code `useCharacter.ts:89`: el array de dependencias es redundante
  (`requestKey` ya incluye el reino y el nombre normalizados).
- code `ProfilePage.tsx:49,64`: el texto de carga depende solo de `isLoading`.
  Hay que revisarlo si el provider empieza a refrescar la sesión en segundo plano.
- security `CharacterProfilePage.tsx:115-122`: en `rate-limited`, "Reintentar"
  está habilitado aunque se conozca `retryAfterSeconds`. Se podría deshabilitar
  hasta que venza el plazo (el contador en vivo queda fuera de alcance).
