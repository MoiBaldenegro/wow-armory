APPROVE
# Decision — 006-auth-battle-net

## Resumen

La ronda 2 tiene los cuatro reviews en `VERDICT: PASS` y el diff implementa el
vertical slice de autenticación Battle.net (dominio/aplicación/infraestructura/
presentación) más el `AuthProvider` y el banner del cliente, sin contradicciones
con la spec. Los tests, el e2e, el lint y los builds de ambos proyectos pasan en
una reejecución local.

## Evidencia

- **Arquitectura hexagonal servidor** → existen `src/identity/{domain,application,infrastructure,presentation}`; `domain/` define `AuthSession`, `OAuthState`, `AccessToken`, `RefreshToken`, errores y puertos, y `grep "@nestjs|axios|express"` sobre `identity/domain` no devuelve resultados. `IdentityModule` está registrado en `AppModule` y el controlador legacy conserva solo `GET /auth/character/:realmSlug/:characterName`.
- **Login** → `StartLogin` genera `OAuthState` (32 bytes) y `BattleNetOAuthAdapter.buildAuthorizationUrl` devuelve `https://oauth.battle.net/authorize` con `client_id`, `redirect_uri`, `response_type=code`, `scope=wow.profile` y `state`; e2e comprueba los parámetros y que el state tiene 64 caracteres.
- **Callback y state de un solo uso** → `CompleteLogin` consume el state antes de validar; `OAuthState.matches` usa `timingSafeEqual` con comprobación de longitud previa. E2E: state ausente/incorrecto → `302 ?auth_error=invalid_state`; segundo callback con el mismo state falla y solo se canjea el código una vez.
- **`?error=`** → solo `access_denied` se mapea a `access_denied`; el resto a `auth_failed`; `error=access_denied` no canjea código ni guarda tokens (e2e y unit test).
- **Callback correcto / fallo de canje** → llama a `regenerate()`, guarda `access_token`, `refresh_token` opcional y `expires_at`, y redirige a `CLIENT_URL`; el fallo de canje limpia la sesión y redirige a `?auth_error=auth_failed`.
- **Sesión y refresh** → `GET /auth/session` devuelve `{ authenticated }` y `user.battletag` opcional; `CheckSession` refresca dentro del margen y, si el refresh falla, `RefreshToken` limpia la sesión y responde `{ authenticated: false }`. Cubierto por tests unitarios de `CheckSession` y `RefreshToken`.
- **Logout y rutas viejas** → `POST /auth/logout` destruye la sesión, responde `204` y limpia la cookie (`Expires=Thu, 01 Jan 1970`/`Max-Age=0` verificado en e2e); `GET /auth/session-check` y `GET /auth/logout` responden `404`; el endpoint de personaje sigue en su ruta (401 sin sesión).
- **Configuración y seguridad** → `validateEnv` expone las variables requeridas con sus defaults, falla en producción sin `SESSION_SECRET`/credenciales y exige `SESSION_SECRET >= 32`; rechaza `COOKIE_SAME_SITE=none` sin `COOKIE_SECURE=true`. `bootstrap.ts` aplica `trust proxy` en producción, cookie `wow_session` con `httpOnly`, `secure`/`sameSite`/`domain` configurables, y CORS con `credentials: true` y allowlist. No hay lecturas de `process.env` en `src/` ni logs de tokens.
- **Cliente** → `AuthProvider` envuelve la app y expone `isAuthenticated`, `isLoading`, `error`, `user`, `login` y `logout`; consulta `/auth/session` con `withCredentials`, `login` redirige a `data.url`, `logout` hace `POST` con credenciales. `Header` consume `useAuth`, no contiene la URL de Render, alterna "Iniciar sesión"/"Cerrar sesión", deshabilita el botón y expone `aria-busy`. `App.tsx` ya no llama a `useDetail`, no importa `use` de `framer-motion/client`, no tiene `console.log` y usa `mockCharacter`. `useDetails` usa `withCredentials` y no lee `document.cookie` ni envía `Authorization`. El banner `role="alert"` muestra los códigos y el error del provider, y limpia `auth_error` con `history.replaceState`.
- **Revisiones (ronda 2)** → `review-security.md`: `VERDICT: PASS`; `review-ux.md`: `VERDICT: PASS`; `review-ui.md`: `VERDICT: PASS`; `review-code.md`: `VERDICT: PASS`. Los majors de la ronda 1 (credenciales en URL, error del provider silencioso, overflow del header) y los minors de code quedan cerrados.
- **Tests (reejecutados)**:
  - `cd wow-armory-server && npm test -- --runInBand` → 9 suites, 31 tests, all pass.
  - `cd wow-armory-server && npm run test:e2e` → 1 suite, 8 tests, all pass.
  - `cd wow-armory-server && npm run lint` → pass (exit 0).
  - `cd wow-armory-server && npm run build` → pass.
  - `cd wow-armory-client && npm run lint` → pass (exit 0).
  - `cd wow-armory-client && npm run build` → pass (Vite build correcto).
- **Alcance del commit** → `git diff --name-only main...factory/006-auth-battle-net` solo contiene rutas de `wow-armory-server/` y `wow-armory-client/`; ni `343a72c` ni `e217336` tocan `factory/`, `jobs/`, `docs/`, `backlog.md`, `AGENTS.md`, `.opencode/`, `opencode.json` ni `.env`. No se añadieron dependencias (`package.json` sin cambios).

## Riesgos residuales / seguimiento

No bloquean el merge; quedan documentados y diferidos:

- Validación/codificación de `realmSlug`/`characterName` en el endpoint legacy → job 007.
- Comprobación de `Origin`/CSRF en `POST /auth/logout` → hardening 010.
- `wow-armory-client/.env` sigue trackeado en `main` (solo contiene `VITE_SERVER_URI`, sin secreto) → job de mantenimiento.
- `darkMode` de Tailwind no está configurado como `'class'`; inconsistencia heredada, el banner es legible en ambos temas.
- Sin navegador headless: la verificación responsive del header es estática sobre clases Tailwind; conviene confirmarla en navegador real antes de desplegar.
- `MemoryStore` de `express-session` pierde sesiones al reiniciar; aceptado hasta el store externo de 010.
