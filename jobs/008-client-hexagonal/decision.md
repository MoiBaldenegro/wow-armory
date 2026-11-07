APPROVE
# Decision — 008-client-hexagonal

## Resumen

El cliente queda refactorizado a arquitectura hexagonal (dominio, aplicación, infraestructura y presentación) con React Router v6, `UseCasesProvider`, `AuthProvider` sin Axios y `ThemeProvider` con tema oscuro persistente. La home no cambia. La ronda 2 resolvió el único `CHANGES` (ux, ronda 1) y los cuatro revisores dan PASS.

## Evidencia

- Arquitectura y límites: lo comprobé en `9fd3787`.
  - `src/` solo contiene `domain/`, `application/`, `infrastructure/`, `presentation/`, `test/`, `main.tsx`, `index.css` y `vite-env.d.ts`. El código legacy y `App.tsx` ya no existen.
  - Las búsquedas de React, Axios, `react-router-dom` e `import.meta.env` en `domain/` y `application/` no devuelven nada.
  - `VITE_SERVER_URI` solo aparece en `infrastructure/config/env.ts`.
  - No hay URL de Render ni `console.log` en `src/`, ni `axios`/`fetch(` en `presentation/`.
- Alcance: el diff de `main...factory/008-client-hexagonal` (74 archivos) solo toca `wow-armory-client/`. El diff de `wow-armory-server` está vacío.
- Dominio, aplicación e infraestructura: `build.md` marca todos los criterios con evidencia en archivos y tests. Las suites cubren `CharacterMapper`, `GetCharacter`, `HttpCharacterRepository`, `HttpAuthRepository`, `HttpError`, `AxiosHttpClient`, `env` y los casos de uso de auth. Los revisores de code y security los confirmaron.
- Presentación, router y auth: hay tests de `UseCasesProvider`/`useUseCases` (también el error fuera del provider), `AuthProvider` (sesión, login con redirect, logout, error y `pageshow`), `ProfilePage` (loading, autenticado, no autenticado y alertas de error de la ronda 2), `ErrorPage` (`auth_error`/`code`), `AppRouter` (rutas y 404), `ThemeProvider` y una prueba de humo de la home.
- Tema: `tailwind.config.js` declara `darkMode: 'class'`.
- Dependencias: `package.json` incluye `react-router-dom@^6.30.6` y los scripts `test` (`vitest run`) y `test:watch` (`vitest`).
- Tests: los volví a ejecutar en `wow-armory-client`.
  - `npm run lint`: limpio.
  - `npm test`: 15 archivos y 76 tests, todos pasan.
  - `npm run build`: compila sin errores.
- Revisiones (ronda 2): security PASS, ux PASS, ui PASS, code PASS. En la ronda 1, ux pidió `CHANGES` por un major: `ProfilePage` no mostraba los errores. Se resolvió en `9fd3787` con un bloque `role="alert"` y 4 tests nuevos.

## Riesgos residuales / seguimiento

Ninguno bloquea el merge. Son minors que dejaron los revisores para 009/010:

- **ux**: `aria-disabled` o texto de carga en los botones de login/logout; `role="status"` en `CharacterProfilePage`; foco visible y `motion-safe` en `ThemeToggle`; `lang="en"` en `index.html`.
- **ui**: destello de tema en la primera carga; layout compartido con `Header`/`ThemeToggle` en las páginas nuevas; `disabled:hover` en los botones.
- **security**:
  - Advisories de `react-router-dom@6`.
  - `env.ts` acepta `http://` en producción.
  - No se valida el host de la URL de login.
  - `HttpCharacterRepository` no filtra `..` en los segmentos, aunque eso queda fuera del flujo validado.
- **code**: `jsdom@^31` y la versión de Node que exige; `Retry-After` como fecha HTTP; flags futuras de React Router v7 (salen como avisos en los tests).
- El fallback SPA para los deep links con `BrowserRouter` queda para 010.
