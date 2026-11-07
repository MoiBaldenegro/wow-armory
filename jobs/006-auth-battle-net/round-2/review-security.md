VERDICT: PASS

# Security review — ronda 2

## Hallazgos

- [resuelto] `wow-armory-server/src/identity/infrastructure/BattleNetOAuthAdapter.ts:40-94` — el major de la ronda 1 está cerrado: `exchangeCode` y `refresh` construyen un `URLSearchParams` y lo envían como body de `axios.post` con `Content-Type: application/x-www-form-urlencoded`; `client_secret`, `code`, `redirect_uri`, `grant_type` y `refresh_token` ya no viajan en `params`/URL. `BattleNetOAuthAdapter.spec.ts:60-76` y `:100-113` verifican que la URL de `/token` no contiene esos valores, que el body sí los contiene y que `config.params` es `undefined`; los valores usados (`super-secret`, `authorization-code`, `refresh-token-value`) son ficticios, no secretos reales.
- [resuelto] `wow-armory-server/src/config/env.validation.ts:13,87-95` — en producción `SESSION_SECRET` exige `>= 32` caracteres y ya no hay fallback silencioso; `:97-102` rechaza `COOKIE_SAME_SITE=none` con `COOKIE_SECURE=false`. Cubierto por `env.validation.spec.ts:24-57`. Ejecuté `npm test -- --runInBand` (31 tests) y `npm run test:e2e` (8 tests): ambos pasan.
- [minor residual, no nuevo] `wow-armory-server/src/auth/auth.service.ts:27` — `realmSlug`/`characterName` siguen interpolándose sin validar/codificar; preexistente y diferido a 007 (ya documentado en ronda 1).
- [minor residual, no nuevo] `wow-armory-server/src/identity/presentation/AuthController.ts:52-73` — `POST /auth/logout` sigue sin comprobación de `Origin`/CSRF; aceptado para el hardening de 010 (ya documentado en ronda 1).
- [minor residual, no nuevo] `wow-armory-client/.env:1` — sigue trackeado; solo contiene `VITE_SERVER_URI` pública, sin secreto. Pendiente de job de mantenimiento (ya documentado en ronda 1).
- [minor residual, no nuevo] `wow-armory-server/src/config/env.validation.ts:87-95` — se exige longitud mínima pero no entropía/complejidad del `SESSION_SECRET`; sin impacto bloqueante, el criterio de longitud pedido en ronda 1 queda cubierto.

Sin blockers ni majors nuevos. No se observan fugas nuevas en logs, respuestas, redirects ni tests: los redirects solo usan códigos fijos (`AuthController.ts:75-85`), los errores de OAuth se tragan sin loguear (`CompleteLogin.ts:50-56`, `RefreshToken.ts:23-31`), y no hay `console.log` de tokens ni credenciales en el diff de esta ronda.
