VERDICT: PASS

# Security review — ronda 1

## Hallazgos

- [minor] `wow-armory-client/package.json:20` (lock en `package-lock.json:4117-4136`) — `react-router-dom@6.30.6` entra con advisories moderados de `npm audit` (open redirect vía backslash en `<Link>`/`useNavigate` y deserialización en SSR). No es explotable en este job: todas las navegaciones son literales (`ErrorPage.tsx:35-39`, `ProfilePage.tsx:48-53`, `NotFoundPage.tsx:11-13`), se usa `BrowserRouter` sin SSR y ningún destino se deriva de la URL ni del servidor. El fix disponible exige `react-router-dom@7`, prohibido por la spec (v6 para React 18). Se documenta, no bloquea.
- [minor] `wow-armory-client/src/infrastructure/http/HttpCharacterRepository.ts:20-22` — `encodeURIComponent` no codifica `.`, así que un segmento literal `..` sobrevive si se invoca el adaptador sin pasar por `GetCharacter`. En el flujo real `GetCharacter.ts:8-21` rechaza `..` en `realmSlug` (`^[a-z0-9-]`) y en `characterName` (`^[A-Za-z0-9'-]`) antes del puerto, y el adaptador no está expuesto a la URL; además `encodeURIComponent` sí codifica `/`, `?` y `#`, evitando inyección de path/query. Riesgo residual de defensa en profundidad, no explotable hoy.
- [minor] `wow-armory-client/src/presentation/providers/AuthProvider.tsx:95-108` — el destino de `window.location.assign` viene de `GET /auth/login` (`HttpAuthRepository.ts:45-57`) sin validar esquema/host. No hay input de usuario y el origen es la API propia, por lo que no es un open redirect controlable por terceros; cumple la spec. Endurecimiento opcional: aceptar solo `https:` y el host de Battle.net antes de redirigir.
- [minor] `wow-armory-client/src/infrastructure/config/env.ts:8-15` — en producción se acepta `http://` además de `https://`. Con `withCredentials: true` (`AxiosHttpClient.ts:24-29`), una mala configuración a HTTP podría intentar enviar la cookie de sesión en claro; el servidor la marca `secure` en producción (`wow-armory-server/src/bootstrap.ts:38`) y el navegador no la enviaría, por lo que el impacto es bajo. Endurecimiento para `010`: exigir `https` cuando `isProduction`.

## Verificaciones sin hallazgo

- Sin secretos ni tokens: no hay `document.cookie`, `Authorization`, `Bearer`, tokens ni credenciales en `src/`; el contexto de auth solo expone `isAuthenticated/isLoading/error/user.battletag/login/logout` (`auth-context.ts:3-14`). `localStorage` solo guarda `wow-armory-theme` con `dark`/`light` (`ThemeProvider.tsx:10,18,50`).
- Cookies/sesión: `withCredentials: true` y `timeout: 10_000` en el único cliente (`AxiosHttpClient.ts:24-29`); la cookie `httpOnly` del servidor no se lee en cliente. CORS del servidor no se toca.
- XSS/inyección: no hay `dangerouslySetInnerHTML` ni `innerHTML`; `battletag` (`ProfilePage.tsx:23`, `Header.tsx:62-63`), `realmSlug`/`characterName` (`CharacterProfilePage.tsx:14-16`), códigos de error (`ErrorPage.tsx:18,30-33`) y mensajes (`AuthErrorBanner.tsx:33,48,59`) se renderizan como texto React (escapado). `ErrorPage` solo usa el código como clave de un mapa fijo.
- `window.location`/redirects: `AuthErrorBanner.tsx:24-31` reconstruye el `nextUrl` con `pathname`/`hash` de la misma origen y `history.replaceState`; no hay redirect a destinos externos ni `postMessage`.
- Validación/errores: `GetCharacter.ts:8-21` valida antes del puerto; `HttpError.ts:52-75` solo conserva `status`, `retryAfterSeconds` y `code` y no propaga el cuerpo crudo (test en `HttpError.test.ts:29-35`); no hay `console.*` en `src/`.
- Config: `VITE_SERVER_URI` solo se lee en `env.ts:55`; en producción falla si falta o no es URL http(s) (`env.ts:27-51`); sin URLs de Render hardcodeadas en `src/` (grep limpio). El diff no añade ni modifica `.env`.
- Dependencias: solo `react-router-dom` y el stack Vitest/Testing Library, coherentes con la spec. `npm audit --omit=dev` reporta además vulnerabilidades preexistentes de `axios@1.7.9`/`form-data@4.0.1`/`follow-redirects@1.15.9` que ya estaban en `main` y cuyas entradas de lock no cambian en este diff.
- Regresión de auth: `logout` limpia `isAuthenticated` y `user` en éxito (`AuthProvider.tsx:125-133`); login/logout no exponen tokens; sin `postMessage`. Los tests usan URLs ficticias (`https://oauth.battle.net/authorize?state=abc`) sin secretos reales.
- Alcance del servidor: `git diff --stat -- wow-armory-server` vacío; el refactor no toca backend.

## Riesgos residuales (no bloqueantes)

- `.env` del cliente sigue versionado en `main` (`wow-armory-client/.env:1`, solo `VITE_SERVER_URI` pública, sin secreto); preexistente y fuera del alcance de este job. Pendiente de job de mantenimiento.
- Sin rate limiting ni CSRF del lado cliente; el hardening de endpoints y despliegue corresponde a `010`.
