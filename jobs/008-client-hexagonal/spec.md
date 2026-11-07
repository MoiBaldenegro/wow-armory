# 008-client-hexagonal — Fundaciones hexagonales del cliente, router y AuthProvider

## Objetivo

Refactorizar `wow-armory-client` a arquitectura hexagonal (dominio, aplicación,
infraestructura y presentación) y dejar las fundaciones production-ready:
router, cliente HTTP tipado, casos de uso, providers y tema oscuro real. La
home debe conservar exactamente su contenido y aspecto actual, y la ficha real
de personaje/búsqueda queda para `009`.

## Contexto

- Cliente React 18 + Vite 5 + TypeScript estricto + Tailwind 3. Hoy no tiene
  runner de tests (`wow-armory-client/package.json`) ni router; `App.tsx` es el
  root y concentra el estado de tema.
- `src/providers/AuthProvider.tsx` importa `axios` directamente, lee
  `VITE_SERVER_URI` con fallback a `http://localhost:3000` y maneja
  `pageshow`/bfcache. `src/hooks/useAuth.ts` consume ese contexto.
- `src/hooks/useDetails.ts` hace `axios` directo y no se usará en este job.
- `src/components/**` contiene `Header`, `SearchBar`, `ThemeToggle`,
  `CharacterBanner`, `CharacterCard`, `RecentAchievements`, `StatBar`,
  `AuthErrorBanner` y `Footer`. `SearchBar` mantiene `onSearch`; `Header` tiene
  un `console.log` en `handleSearch` que debe desaparecer.
- `src/types/character.ts` y `src/data/mockCharacter.ts` son el view model mock
  de la home. Deben moverse a `presentation/` sin cambiar sus datos ni la UI.
- `tailwind.config.js` no declara `darkMode`; `index.css` ya define
  `.dark { color-scheme: dark; }`.
- Contrato servidor (no se modifica):
  - `GET /auth/login` → `{ url: string }`; `GET /auth/session` →
    `{ authenticated: boolean, user?: { battletag?: string } }`;
    `POST /auth/logout` → `204`.
  - `GET /characters/:realmSlug/:characterName` → `CharacterDto` con `name`,
    `realmSlug`, `level`, `class`, `race`, `spec?`, `itemLevel`,
    `achievementPoints`, `lastLogin?` (ISO), `guild?`
    (`name`, `realm?`, `rank?`, `memberCount?`) y `achievements?`
    (`id?`, `name`, `points?`, `completedAt?` ISO).
  - `wow-armory-server/src/bootstrap.ts` expone `Retry-After` por CORS;
    `CharactersController` responde `400`, `404`, `429` y `502`.
  - El callback de auth redirige hoy a `CLIENT_URL?auth_error=<code>`, no a
    `/error?code=`.
- Rutas y estructura de referencia: `docs/plan-hexagonal-ddd-auth.md` §4, §5.2,
  §6 y decisiones 3-4; `docs/casos-de-uso.md` CU-12, CU-13 y CU-14.
- Restricciones del repo: sin `any` nuevo, comillas simples/comas finales,
  dominio y aplicación sin React/Axios, y `lint && test && build` en verde.

## Criterios de aceptación

### Arquitectura y límites

- [ ] Existe `wow-armory-client/src/` con `domain/character/`, `domain/auth/`,
      `application/character/`, `application/auth/`, `infrastructure/http/`,
      `infrastructure/config/`, `presentation/{providers,hooks,pages,components,router,types,data}/`.
- [ ] `src/domain/**` y `src/application/**` no importan `react`, `react-dom`,
      `axios`, `react-router-dom` ni leen `import.meta.env` (verificable con
      grep). No contienen lógica de presentación.
- [ ] Solo `src/infrastructure/http/**` importa `axios`; ningún componente,
      página, provider ni hook hace `axios`/`fetch` directo.
- [ ] `VITE_SERVER_URI` solo se lee en `src/infrastructure/config/env.ts`; no
      queda ninguna URL de Render hardcodeada en `src/`.
- [ ] El contenido legacy `src/components/`, `src/hooks/`, `src/providers/`,
      `src/types/` y `src/data/` se migra o elimina; no quedan copias
      duplicadas. `src/App.tsx` se elimina o deja de ser el root y `main.tsx`
      no lo importa.

### Dominio y aplicación

- [ ] `domain/character/Character.ts`, `Guild.ts`, `Achievement.ts` y
      `ports/CharacterRepository.ts` existen. `Character` expone `name`,
      `realmSlug`, `level`, `characterClass`, `race`, `specialization?`,
      `itemLevel`, `achievementPoints`, `lastLogin?`, `guild?` y
      `achievements?`; `Guild.rank` es `number | undefined`;
      `Achievement.completedAt` es `Date | undefined`.
- [ ] `domain/character/errors` contiene `CharacterNotFound`,
      `CharacterRateLimited` (con `retryAfterSeconds?: number`),
      `CharacterUnavailable` y `CharacterValidation`.
- [ ] `CharacterRepository` declara
      `findByRealmAndName(realmSlug: string, characterName: string): Promise<Character | null>`;
      devolver `null` significa no encontrado.
- [ ] `domain/auth/Session.ts` y `domain/auth/ports/AuthRepository.ts` existen;
      el puerto declara `getSession(): Promise<Session>`,
      `getLoginUrl(): Promise<string>` y `logout(): Promise<void>`.
- [ ] `domain/auth/errors` contiene `AuthError` como base, `AuthUnavailable`
      para red/timeout/5xx y un error para respuestas inválidas/4xx.
- [ ] `application/character/GetCharacter.ts` valida `realmSlug`
      (`^[a-z0-9-]{1,64}$`) y `characterName` (`^[A-Za-z0-9'-]{1,64}$`) antes
      de llamar al puerto. Entrada inválida lanza `CharacterValidation` y no
      invoca al repositorio; `null` del puerto lanza `CharacterNotFound`;
      propaga `CharacterRateLimited` y `CharacterUnavailable`.
- [ ] `application/auth/CheckSession.ts`, `StartLogin.ts` y `Logout.ts` existen,
      delegan en `AuthRepository` y no contienen React, Axios ni `window`
      (la redirección es responsabilidad del provider).

### Infraestructura

- [ ] `infrastructure/http/HttpClient.ts` define `get` y `post` tipados;
      `AxiosHttpClient` crea una instancia axios con `baseURL` validado,
      `withCredentials: true` y `timeout: 10_000`.
- [ ] `HttpError` expone `status: number`, `retryAfterSeconds?: number` y
      `code?: string`; se lanza ante respuestas no exitosas o errores de red
      (`status: 0`) sin filtrar el cuerpo crudo del servidor.
- [ ] `HttpCharacterRepository` implementa `CharacterRepository` y hace
      `GET /characters/{realmSlug}/{characterName}` codificando ambos segmentos
      con `encodeURIComponent`. Mapea `404 → null`, `400 → CharacterValidation`,
      `429 → CharacterRateLimited(retryAfterSeconds)`,
      `502/5xx/red → CharacterUnavailable`.
- [ ] `HttpAuthRepository` implementa `AuthRepository` contra
      `/auth/session`, `/auth/login` y `/auth/logout`; mapea 4xx a error de auth
      y red/5xx a `AuthUnavailable`. No accede a cookies ni a `window`.
- [ ] `CharacterMapper` convierte `CharacterDto → Character`: mapea `class` a
      `characterClass`, `spec` a `specialization`, conserva `rank` numérico y
      convierte `lastLogin`/`completedAt` ISO a `Date`. Campos opcionales
      ausentes quedan `undefined`; fechas ISO inválidas no rompen el mapeo.
- [ ] `infrastructure/config/env.ts` valida `VITE_SERVER_URI` como URL
      `http`/`https`. En dev/test hace fallback a `http://localhost:3000`; en
      producción (`import.meta.env.PROD`) lanza un error claro si falta o es
      inválida. La lógica está en una función pura testeable.
- [ ] `infrastructure/container.ts` crea `AxiosHttpClient`, repositorios y casos
      de uso; exporta `createUseCases()` y el tipo `UseCases` con
      `getCharacter`, `checkSession`, `startLogin` y `logout`.

### Presentación, router y auth

- [ ] `presentation/providers/UseCasesProvider.tsx` acepta casos de uso
      inyectados (fakes en tests) y expone `useUseCases()`; el hook lanza un
      error claro fuera del provider.
- [ ] `presentation/providers/AuthProvider.tsx` conserva la API
      `isAuthenticated/isLoading/error/user/login/logout`, usa
      `checkSession`/`startLogin`/`logout` de `useUseCases()` y no importa
      axios, no lee `VITE_SERVER_URI` ni hace HTTP directo.
- [ ] `AuthProvider` mantiene `pageshow`/bfcache, evita `setState` tras
      desmontar, muestra errores en español, `login` obtiene `{ url }` y
      redirige con `window.location.assign`, y `logout` limpia el estado.
- [ ] `presentation/providers/ThemeProvider.tsx` y
      `presentation/hooks/useTheme.ts` existen; `AuthProvider`/`ThemeProvider`
      viven en `presentation/providers/` y `useAuth`/`useUseCases`/`useTheme`
      en `presentation/hooks/`.
- [ ] `presentation/pages/HomePage.tsx` conserva el contenido actual de la home
      con `mockCharacter`; `CharacterProfilePage.tsx` es un shell que lee
      `realmSlug`/`characterName` y muestra estado vacío sin llamar al servidor;
      `ProfilePage.tsx` cubre loading/autenticado (battletag + logout)/no
      autenticado (login); `ErrorPage.tsx` traduce códigos a español y enlaza a
      inicio; `NotFoundPage.tsx` existe.
- [ ] `AppRouter` usa `BrowserRouter` (o equivalente) y declara `/`,
      `/character/:realmSlug/:characterName`, `/profile`, `/error` y `*`.
      `main.tsx` renderiza
      `UseCasesProvider > ThemeProvider > AuthProvider > AppRouter` dentro de
      `StrictMode`.
- [ ] `Header` y `SearchBar` conservan su UI y la firma `onSearch`; se elimina
      el `console.log` y no se inventan endpoints ni búsqueda real.
- [ ] La home sigue mostrando el banner de `auth_error` de la URL y
      `ErrorPage` acepta tanto `/error?auth_error=<code>` como
      `/error?code=<code>`. Códigos conocidos (`access_denied`,
      `invalid_state`, `auth_failed`) tienen copy español; los desconocidos
      muestran un mensaje genérico.
- [ ] `ProfilePage` y `ErrorPage` son responsive, usan clases `dark:` y son
      accesibles: encabezado principal, `role="status"` o `role="alert"` donde
      corresponda, botones/enlaces con nombre accesible y foco visible.

### Tema y regresión visual

- [ ] `tailwind.config.js` declara `darkMode: 'class'`.
- [ ] `ThemeProvider` inicializa desde `localStorage` o
      `prefers-color-scheme`, añade/quita la clase `dark` en
      `document.documentElement` y persiste la elección.
- [ ] `ThemeToggle` consume `useTheme`, no recibe props de tema y conserva su
      aspecto (iconos `Sun`/`Moon`, posición, clases y sombra). Su etiqueta
      accesible pasa a español y refleja la acción.
- [ ] La home mantiene la misma jerarquía, contenido, clases y layout que
      antes: `Header`, `AuthErrorBanner`, `CharacterBanner`,
      `RecentAchievements`, `CharacterCard` y `Footer` con `mockCharacter`; el
      único cambio funcional visible es que el toggle persiste y aplica el tema.

### Dependencias, tests y verificación

- [ ] `package.json` añade `react-router-dom` v6 compatible con React 18 y
      devDeps `vitest`, `jsdom`, `@testing-library/react`,
      `@testing-library/jest-dom`, `@testing-library/user-event`; scripts
      `test` (`vitest run`) y `test:watch` (`vitest`).
- [ ] `vite.config.ts` (o `vitest.config.ts`) configura `environment: 'jsdom'`
      y un `setupFiles` que importa `@testing-library/jest-dom/vitest` y
      prepara `matchMedia`/limpieza de `localStorage` y clase `dark`.
- [ ] Tests sin red real, usando fakes de `HttpClient`/casos de uso:
      `CharacterMapper` (DTO completo, opcionales, guild, logros, rank
      numérico e ISO), `GetCharacter` (éxito, `null`→404, 429, entrada
      inválida sin llamada al repo), `HttpCharacterRepository` (URL codificada,
      mapeo y errores), `HttpAuthRepository` (session/login/logout), `HttpError`
      (400/404/429 con `Retry-After`, 502 y red), `env.ts` (fallback y error en
      producción), `UseCasesProvider`/`useUseCases`, `AuthProvider` (sesión,
      redirect de login, logout, error y `pageshow` si aplica), `ProfilePage`
      (loading/autenticado/no autenticado), `ErrorPage` (códigos y
      `auth_error`/`code`), `AppRouter` (rutas y 404) y `ThemeProvider`
      (toggle, persistencia y clase `dark`).
- [ ] Los hooks lanzan error fuera de su provider y hay test que lo verifica.
- [ ] `cd wow-armory-client && npm run lint && npm test && npm run build` pasa.
- [ ] `wow-armory-server/` no se modifica (diff vacío).

## Plan de pruebas

```bash
cd wow-armory-client && npm install
cd wow-armory-client && npm run lint
cd wow-armory-client && npm test
cd wow-armory-client && npm run build
```

Comprobaciones de arquitectura desde la raíz:

```bash
grep -rn "from 'react'\|from \"react\"\|axios\|react-router-dom" wow-armory-client/src/domain wow-armory-client/src/application
grep -rn "import.meta.env" wow-armory-client/src/domain wow-armory-client/src/application
grep -rn "VITE_SERVER_URI" wow-armory-client/src
grep -rn "wow-armory.onrender.com" wow-armory-client/src
grep -rn "console.log" wow-armory-client/src
grep -rn "axios" wow-armory-client/src/presentation
git diff --stat -- wow-armory-server
```

Las dos primeras deben mostrar solo `infrastructure/config/env.ts` para
`VITE_SERVER_URI`; el resto debe salir vacío. `git diff` del servidor debe
estar vacío.

## Fuera de alcance

- Cualquier cambio en `wow-armory-server/`, incluido el redirect de auth.
- Datos reales de personaje, `useCharacter`, búsqueda real, navegación desde
  `SearchBar` y estados visuales completos de `CharacterProfilePage` (`009`).
- Redis/sesión persistente, rate limiting, `.env` del cliente y hardening de
  despliegue (`010`).
- Añadir dependencias fuera de `react-router-dom` y el stack de testing.
- Cambios en `factory/`, `jobs/`, `docs/`, `backlog.md`, `AGENTS.md`,
  `.opencode/`, `opencode.json` o `.env`.
- Cambiar el contenido del view model mock o la apariencia de la home.

## Riesgos

- **Redirect de auth inconsistente con el plan.** El servidor redirige hoy a
  `CLIENT_URL?auth_error=` (home), mientras el plan menciona `/error?code=`.
  Interpretación conservadora: mantener el banner en la home y aceptar ambos
  parámetros en `ErrorPage`; no tocar el servidor.
- **`Date` vs ISO en el dominio.** Se elige `Date` para `lastLogin` y
  `completedAt`; el mapper tolera valores ausentes o ISO inválidos
  (`undefined`) para no romper la ficha futura. Si el revisor prefiere strings
  ISO, debe ajustarse el tipo, el mapper y sus tests de forma consistente.
- **Validación de entorno.** El `.env` actual apunta a Render y no se toca; la
  regla de fallo en producción se prueba con la función pura, no con
  `vite build`, porque Vite no evalúa el módulo durante el build.
- **Deep links con `BrowserRouter`.** En hosting estático, `/profile` o
  `/character/...` necesitan fallback SPA; la configuración de despliegue es de
  `010`. En este job el router funciona en dev y tests.
- **jsdom + framer-motion.** Puede requerir mocks de `matchMedia`/
  `ResizeObserver`; se evitan snapshots de animaciones y se prueba contenido
  estable.
- **Bfcache en tests.** `jsdom` no reproduce bfcache real; se prueba el handler
  `pageshow` con `persisted: true` o se documenta verificación manual sin
  bloquear el job.
- **Regresión visual de la home.** Al mover componentes y tema se pueden
  alterar clases del wrapper. Mitigación: conservar exactamente las clases y el
  contenido de `CharacterBanner`, `RecentAchievements`, `CharacterCard`,
  `Header` y `Footer`, y añadir un test de humo de la home.
- **`react-router-dom` v7.** Se fija v6 para compatibilidad con React 18 y se
  evita introducir v7 por accidente.
