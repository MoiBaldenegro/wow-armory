# Build — ronda 2

## Resumen

Refactorización completa de `wow-armory-client` a arquitectura hexagonal: dominio
puro de personaje y autenticación, casos de uso, adaptadores HTTP con Axios,
configuración de entorno validada y composition root. La presentación se movió a
`presentation/`, se añadió React Router v6 con `/`, `/character/:realmSlug/:characterName`,
`/profile`, `/error` y 404, y se incorporaron `UseCasesProvider`, `AuthProvider`
(sin Axios ni `VITE_SERVER_URI`) y `ThemeProvider` con tema oscuro persistente.
Se añadió Vitest + Testing Library y una batería de 72 tests sin red real.

La home conserva el mismo contenido, jerarquía y clases que antes; el único
cambio funcional visible es que el toggle ahora aplica y persiste el tema.

## Cambios

- `src/domain/character/{Character,Guild,Achievement}.ts`,
  `errors/CharacterErrors.ts`, `ports/CharacterRepository.ts` — modelo y puerto
  de personaje.
- `src/domain/auth/{Session}.ts`, `errors/AuthErrors.ts`,
  `ports/AuthRepository.ts` — modelo y puerto de autenticación.
- `src/application/character/GetCharacter.ts` — validación de `realmSlug` y
  `characterName`, `null` → `CharacterNotFound`, propagación de errores.
- `src/application/auth/{CheckSession,StartLogin,Logout}.ts` — casos de uso que
  delegan en el puerto.
- `src/infrastructure/http/{HttpClient,AxiosHttpClient,HttpError}.ts` — cliente
  tipado, instancia Axios con timeout 10 s/credenciales y normalización segura
  de errores (400/404/429/5xx/red).
- `src/infrastructure/http/{CharacterDto,CharacterMapper}.ts` — DTO y mapeo a
  dominio (`class`→`characterClass`, `spec`→`specialization`, fechas ISO
  tolerantes, `rank` numérico).
- `src/infrastructure/http/{HttpCharacterRepository,HttpAuthRepository}.ts` —
  adaptadores con codificación de segmentos y traducción de errores.
- `src/infrastructure/config/env.ts` — función pura `resolveServerUri` con
  fallback local en dev/test y error claro en producción.
- `src/infrastructure/container.ts` — `createUseCases()` y tipo `UseCases`.
- `src/presentation/providers/{UseCasesProvider,AuthProvider,ThemeProvider}.tsx`
  + contextos — inyección de dependencias, sesión/bfcache y tema oscuro.
- `src/presentation/hooks/{useUseCases,useAuth,useTheme}.ts` — hooks con error
  explícito fuera del provider.
- `src/presentation/pages/{HomePage,CharacterProfilePage,ProfilePage,ErrorPage,NotFoundPage}.tsx`
  — rutas y estados; `ErrorPage` acepta `auth_error` y `code`.
- `src/presentation/router/AppRouter.tsx` — `BrowserRouter` y rutas.
- `src/main.tsx` — `StrictMode > UseCasesProvider > ThemeProvider > AuthProvider > AppRouter`.
- `src/presentation/components/**`, `types/character.ts`,
  `data/mockCharacter.ts` — movidos desde `src/components|types|data` con imports
  actualizados; `console.log` eliminado de `Header`.
- `src/presentation/components/ThemeToggle.tsx` — consume `useTheme`, conserva
  aspecto y etiqueta accesible en español.
- `tailwind.config.js` — `darkMode: 'class'`.
- `package.json` / `package-lock.json` — `react-router-dom@^6`, Vitest + jsdom +
  Testing Library, scripts `test` y `test:watch`.
- `vite.config.ts` — configuración de Vitest (`jsdom`, `setupFiles`).
- `src/test/{setup.ts,fakes.ts}` — setup de jsdom y fakes de repositorios/casos
  de uso.
- Tests: mapper, `GetCharacter`, repositorios HTTP, `HttpError`,
  `AxiosHttpClient`, `env`, casos de uso de auth, providers/hooks, `AuthProvider`,
  `ProfilePage`, `ErrorPage`, `AppRouter`, `ThemeProvider` y humo de la home.

## Criterios de aceptación

- [x] Estructura `domain/`, `application/`, `infrastructure/` y `presentation/` — verificada con `find src`.
- [x] Dominio/aplicación sin React, Axios, router ni `import.meta.env` — grep vacío.
- [x] Solo `infrastructure/http/**` importa Axios — grep de `axios` en `presentation` vacío.
- [x] `VITE_SERVER_URI` solo se lee en `infrastructure/config/env.ts` — grep.
- [x] Legacy migrado/eliminado y `App.tsx` fuera del root — `main.tsx` usa `AppRouter`.
- [x] Dominio de personaje y auth con puertos/errores solicitados — archivos y tests.
- [x] `GetCharacter` valida antes del puerto — tests de entrada inválida sin llamada al repo.
- [x] Casos de uso de auth delegan sin React/Axios/`window` — tests y grep.
- [x] `HttpClient`, `AxiosHttpClient`, `HttpError` con status/retry/code — tests.
- [x] Repositorios HTTP con mapeo 400/404/429/5xx/red — tests dedicados.
- [x] `CharacterMapper` con DTO completo, opcionales y fechas inválidas — tests.
- [x] `env.ts` con fallback y error en producción — tests puros.
- [x] `container.ts` expone `createUseCases()` y `UseCases`.
- [x] `UseCasesProvider`/`useUseCases` y error fuera del provider — tests.
- [x] `AuthProvider` con API conservada, sesión/pageshow/login/logout/errores — tests.
- [x] `ThemeProvider`/`useTheme` con localStorage, `prefers-color-scheme`, clase `dark` y persistencia — tests.
- [x] Páginas, router y 404 — tests de `AppRouter`, `ProfilePage`, `ErrorPage` y home.
- [x] Home con `mockCharacter` y banner `auth_error` — test de humo.
- [x] `tailwind.config.js` con `darkMode: 'class'` y `ThemeToggle` accesible en español.
- [x] Dependencias/scripts/config de Vitest y suite sin red — `npm test` en verde.
- [x] `lint`, `test` y `build` pasan; servidor sin cambios.

## Verificación

- `cd wow-armory-client && npm run lint` → pass.
- `cd wow-armory-client && npm test` → pass, 15 archivos y 72 tests.
- `cd wow-armory-client && npm run build` → pass (Vite 5.4.8, 1905 módulos).
- `git diff --stat -- wow-armory-server` → vacío.
- Greps de arquitectura: dominio/aplicación sin React/Axios/router/`import.meta.env`;
  sin `VITE_SERVER_URI` fuera de `env.ts`; sin URL de Render en `src`; sin
  `console.log`; sin Axios en `presentation` → todos limpios.
- Nota: React Router v6 emite avisos de futuras flags v7 durante los tests; no
  afectan al resultado.

## Ronda 1 → cambios

Atiende el `CHANGES` de `round-1/review-ux.md` y dos minors opcionales
(ux y code). Security, ui y code dieron PASS en la ronda 1.

- `src/presentation/pages/ProfilePage.tsx` — lee `error` de `useAuth()` y lo
  muestra en un bloque `role="alert"` con el mismo estilo rojo que
  `AuthErrorBanner` (`border-red-300 bg-red-50 text-red-800 dark:border-red-800
  dark:bg-red-950 dark:text-red-200`), visible tanto con sesión iniciada como
  sin ella (fallos de comprobación de sesión, login y logout). [major ux]
- `src/presentation/pages/ProfilePage.tsx` — el estado "Cargando perfil…" a
  pantalla completa solo se usa en la verificación inicial; durante login/logout
  el botón sigue montado con `disabled` + `aria-busy` (como `Header`), para no
  perder el foco. [minor ux, opcional]
- `src/presentation/pages/ProfilePage.test.tsx` — 4 tests nuevos: alerta si
  falla `checkSession` ("No se pudo verificar la sesión."), si falla
  `startLogin` ("No se pudo iniciar sesión con Battle.net.", botón rehabilitado),
  si falla `logout` con sesión iniciada ("No se pudo cerrar la sesión.", battletag
  visible), y botón montado/deshabilitado/`aria-busy` durante el login. [minor ux]
- `src/presentation/providers/ThemeProvider.tsx` — el tema se persiste en
  `localStorage` solo desde `toggleTheme`; la preferencia del sistema ya no se
  congela en el primer render. Test ajustado: con `prefers-color-scheme` no se
  escribe nada en storage. [minor code, opcional]

No abordados (fuera de alcance o fuera del diff, anotados por los revisores para
jobs posteriores): `role="status"` en `CharacterProfilePage`, foco visible y
`motion-safe` en `ThemeToggle`, `lang="en"`/línea suelta en `index.html`,
requisito de Node de `jsdom@^31`, `Retry-After` como fecha HTTP y flags futuras
de React Router.

Verificación ronda 2:

- `cd wow-armory-client && npm run lint` → pass.
- `cd wow-armory-client && npm test` → pass, 15 archivos y 76 tests.
- `cd wow-armory-client && npm run build` → pass (1905 módulos).
- Servidor sin cambios.

## Feedback de la ronda

- ronda 1 → ronda 2: ver sección anterior. ux: alerta de error en `ProfilePage`
  + tests + botón `disabled`/`aria-busy`. code: persistencia del tema solo al
  alternar. security/ui: PASS, sin cambios pedidos.
- security (ronda 1): primera build. Sin Axios/`fetch` en presentación ni URLs hardcodeadas;
  `HttpError` no expone el cuerpo crudo del servidor.
- ux: primera build. Home intacta, estados de perfil/error con copy en español y
  `pageshow`/bfcache conservado.
- ui: primera build. Tema oscuro real con `darkMode: 'class'`, persistencia y
  toggle con etiqueta accesible.
- code: primera build. Fronteras hexagonales verificadas; 72 tests sin red real.

## Commit

- `9fd3787` `fix: :bug: surface auth errors on profile page` (ronda 2)
- `23d43e3` `feat: :sparkles: add hexagonal client foundation, router and auth provider`
