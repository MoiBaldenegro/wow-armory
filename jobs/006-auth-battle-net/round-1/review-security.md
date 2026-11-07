VERDICT: CHANGES

# Security review — ronda 1

## Hallazgos

- [major] `wow-armory-server/src/identity/infrastructure/BattleNetOAuthAdapter.ts:42-49` (y `:64-70`) — el canje y el refresh envían `client_secret`, `code` y `refresh_token` como query string (`params` de axios) en lugar del cuerpo. Aunque el transporte es TLS, esas URLs quedan expuestas en logs de acceso de proxies/CDN/APM, trazas de error o herramientas de depuración; un `client_secret` filtrado permite suplantar la aplicación y un `refresh_token` filtrado da acceso a la cuenta. Es el único punto donde se incumple el objetivo de no exponer secretos en logs.
- [minor] `wow-armory-server/src/auth/auth.service.ts:27` — el endpoint legacy sigue interpolando `realmSlug`/`characterName` sin validar ni codificar en la URL de Blizzard; con `%2F`, `..` o `?` se pueden alcanzar otras rutas del mismo host o consumir cuota con el token del usuario. El host es fijo (`<region>.api.blizzard.com`), así que no es SSRF arbitrario. Es comportamiento preexistente y la spec lo difiere a 007: se documenta, no bloquea.
- [minor] `wow-armory-server/src/identity/presentation/AuthController.ts:52-72` — `POST /auth/logout` no comprueba `Origin`/`Referer` ni CSRF. Con `COOKIE_SAME_SITE=none` (necesario para el cliente cross-site en producción), una página de terceros puede enviar el POST con la cookie y forzar el cierre de sesión. Impacto bajo (logout CSRF); añadir validación de origen o token CSRF en el hardening.
- [minor] `wow-armory-server/src/config/env.validation.ts:76-85` — en producción solo se exige que `SESSION_SECRET` no esté vacío; no hay longitud ni entropía mínima. Un secreto débil facilita forjar o adivinar cookies de sesión. Recomendado exigir, por ejemplo, >= 32 caracteres y rechazar valores triviales.
- [minor] `wow-armory-server/src/bootstrap.ts:38-42` — no se valida que `COOKIE_SAME_SITE=none` implique `secure: true`; con `COOKIE_SECURE=false` el navegador descarta la cookie (fallo de login) y en el caso `none` se abre la exposición CSRF anterior. Fallar en el arranque o forzar `secure` cuando `sameSite=none`.
- [minor] `wow-armory-client/.env:1` — el archivo sigue trackeado en git; hoy solo contiene `VITE_SERVER_URI` (URL pública, sin secreto), pero es un riesgo de proceso ya documentado en `docs/contexto-aplicacion.md` §11.2. Conviene destrackearlo y añadir `.env` al `.gitignore` del cliente en un job de mantenimiento.

## Cambios requeridos

1. [major] En `BattleNetOAuthAdapter.exchangeCode` y `BattleNetOAuthAdapter.refresh`, mover `client_id`, `client_secret`, `code`, `refresh_token`, `redirect_uri` y `grant_type` a un body `application/x-www-form-urlencoded` (o usar autenticación Basic para el cliente) en lugar de `params`; añadir un test que compruebe que la URL de la petición a `/token` no contiene `client_secret`, `code` ni `refresh_token`.
2. (menor, no bloqueante) Validar `realmSlug`/`characterName` (allowlist `[A-Za-z0-9-]`, longitud máxima y codificación) al migrar el endpoint en 007.
3. (menor, no bloqueante) Añadir comprobación de `Origin`/CSRF a `POST /auth/logout`.
4. (menor, no bloqueante) Exigir una longitud/entropía mínima a `SESSION_SECRET` en producción.
5. (menor, no bloqueante) Rechazar en el arranque `COOKIE_SAME_SITE=none` con `secure=false` (o forzar `secure`).
6. (menor, no bloqueante) Destrackear `wow-armory-client/.env` y añadirlo a `.gitignore`.
