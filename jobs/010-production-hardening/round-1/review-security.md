VERDICT: PASS

# Security review — ronda 1

Revisado `git diff main...factory/010-production-hardening` (commit `e9e5c9a`)
en el worktree `wow-armory-wt/010-production-hardening`.

Comprobado sin hallazgos:

- Los errores de `validateEnv` nombran variables y nunca valores.
- Las conexiones de Redis enmascaran la URL y el password, también en los
  errores en tiempo de ejecución.
- La cookie se construye desde un único helper con `httpOnly: true` fijo. En
  producción se exige `Secure` y `SameSite=none` requiere `Secure`. La limpieza
  en logout usa los mismos atributos.
- CORS usa una allowlist normalizada, sin `*`, sin credenciales en el origin y
  con `https` obligatorio en producción.
- El guard de `Origin` responde `403` antes del handler. `Origin: null` también
  se rechaza.
- El middleware de peticiones registra el path sin query. `X-Request-Id` se
  valida con `[A-Za-z0-9-]{1,128}`, así que no admite inyección en logs ni
  cabeceras.
- `redact()` es case-insensitive y protege contra ciclos.
- `/health` solo expone `status`, `uptime`, `version` y el tipo y estado del
  store, sin `Set-Cookie` y sin throttling.
- El tracker del throttler es `normalizeIp(req.ip)`, que respeta
  `trust proxy`. El e2e demuestra que un `X-Forwarded-For` falsificado no
  evita el `429` con `trust proxy=false`.
- Las 3 dependencias nuevas son las permitidas (`@nestjs/throttler@6.7.1`,
  `connect-redis@7.1.1` y `redis@4.7.1`) y ninguna aparece en `npm audit`.
- `.env.example` y los tests solo usan valores ficticios.
- El `env.ts` del cliente rechaza `http://` no loopback en producción.

## Hallazgos

- [minor] `wow-armory-server/src/config/env.validation.ts:315-329` — en
  producción se acepta `TRUST_PROXY=true`. Con ese valor Express toma como
  `req.ip` la IP más a la izquierda de `X-Forwarded-For`, que controla el
  cliente. Un atacante puede rotar esa cabecera en cada petición y saltarse el
  rate limiting de `/auth/*` y `/characters/*`. Es configuración explícita del
  operador y el default (`1`) es correcto. Aun así, convendría un `warn` al
  arrancar en producción con `true`, o documentarlo como inseguro en el job 012.
- [minor] `wow-armory-server/src/config/env.validation.ts:349-354` — en
  producción se acepta `REDIS_URL` con `redis://` (sin TLS). Así, el password
  de Redis y los datos de sesión, que incluyen los tokens de Battle.net,
  viajan en claro si el Redis gestionado no está en red privada. La spec
  permite ambos esquemas. Se recomienda que el job 012 indique `rediss://`, o
  emitir un `warn` en producción con `redis://`.
- [minor] `wow-armory-server/src/config/env.validation.ts:120-132` —
  `maskRedisUrl` solo enmascara `url.password`. Con una URL que lleva el
  secreto como usuario (`redis://<token>@host:6379`), el token aparecería en
  `Could not connect to Redis at ...`. Además, `scrubSecret`
  (`session-store.factory.ts:70-80`) tampoco lo cubre. Es un formato poco
  habitual (Upstash usa `default:<password>@`). Bastaría con enmascarar también
  `url.username` cuando no sea `default`.
- [minor] `wow-armory-server/src/shared/infrastructure/http/allowed-origin.guard.ts:186-188`
  — la ausencia de `Origin` deja pasar el logout. Los navegadores modernos
  siempre envían `Origin` en un POST cross-site, así que el riesgo residual se
  limita a navegadores antiguos con `SameSite=none` y el impacto es solo un
  logout forzado. La spec lo pide así; queda documentado.
- [minor] (preexistente, fuera de alcance) `wow-armory-server/package-lock.json`
  — `npm audit --omit=dev` marca `proxy-addr` con un advisory crítico
  (GHSA-jqcg-44mw-7w3h, spoofing con subredes de confianza IPv4-mapped IPv6) y
  otros en `express`, `path-to-regexp`, `qs` y `axios`. No afecta a la
  configuración actual de `trust proxy` (hops o booleano, sin subredes), y
  ninguno lo introduce este job. `proxy-addr` tiene un fix no rompedor con
  `npm audit fix`. Se recomienda un job de actualización de dependencias.

## Cambios requeridos

Ninguno bloqueante. Los minor quedan documentados para el job 012 o un job
posterior de actualización de dependencias.
