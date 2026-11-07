# Build — ronda 1

## Resumen

`wow-armory-server` queda listo para un PaaS con cliente y API en dominios
distintos:

- `validateEnv` valida todas las variables, junta todos los errores en un solo
  mensaje que no repite ningún valor y aplica los defaults de la tabla.
- `express-session` puede usar Redis (`connect-redis` + `redis`) mediante una
  fábrica de store. Un helper único calcula los atributos de la cookie.
  `TRUST_PROXY` se puede configurar y `X-Powered-By` está desactivado.
- `POST /auth/logout` rechaza con `403` un `Origin` fuera de la allowlist.
- Los logs son JSON con redacción y hay un log por petición con
  `X-Request-Id`.
- Hay `GET /health`.
- Hay rate limiting global con `@nestjs/throttler`: estricto en auth y público
  en sesión y personajes.
- Cierra `003-rate-limiting` y `005-health-check`.
- En el cliente solo cambian `env.ts` y `env.test.ts`, que ahora rechazan
  `http://` en producción salvo para loopback.

Dependencias nuevas (todas CommonJS y compatibles con Nest 10):

- `@nestjs/throttler@^6.7.1`: sus peerDeps aceptan Nest 7–12.
- `connect-redis@^7.1.1`: trae build CJS en `dist/cjs` (`exports.default`).
  No uso la v8.
- `redis@^4.7.1` (node-redis v4, CJS).

## Cambios

- `wow-armory-server/package.json`, `package-lock.json` — añaden las 3
  dependencias permitidas.
- `src/config/env.validation.ts` — reescrito:
  - Junta los errores en `Invalid environment configuration: a; b; ...`.
    Cada mensaje nombra la variable y lo esperado, sin el valor.
  - Valida con enum `NODE_ENV`, `COOKIE_SAME_SITE`, `BLIZZARD_REGION`,
    `SESSION_STORE`, `LOG_LEVEL` y `LOG_FORMAT`.
  - `PORT` debe estar entre 1 y 65535. `SESSION_TTL_MS`,
    `TOKEN_REFRESH_MARGIN_MS` y `RATE_LIMIT_*` deben ser enteros positivos.
  - `TRUST_PROXY` acepta `true`, `false` o un número de saltos >= 0.
  - `COOKIE_SECURE` acepta `true/false/1/0/yes/no/on/off`; cualquier otro
    valor da error.
  - `CORS_ORIGINS` se valida como lista de origins (sin path, sin `*` y sin
    credenciales) y se normaliza. Su default es el origin de `CLIENT_URL`.
  - `REDIS_URL` debe usar `redis://` o `rediss://`.
  - Reglas de producción: `CLIENT_URL` obligatoria y `https`, redirect `https`,
    `COOKIE_SECURE=true`, CORS solo `https` e incluyendo el origin del cliente,
    y `REDIS_URL` obligatoria salvo `SESSION_STORE=memory` explícito.
  - El aviso del secreto efímero pasa por `new Logger('Config').warn`.
  - `APP_VERSION` toma por defecto la versión de `package.json`.
  - Exporta `parseOrigins`, `normalizeOrigin`, `maskRedisUrl` y los tipos.
- `src/config/env.validation.spec.ts` — ampliado a 55 tests:
  - Mantiene los casos anteriores.
  - Añade un caso por valor inválido y un caso por regla de producción.
  - Comprueba que el mensaje no contiene centinelas de `SESSION_SECRET`,
    `BLIZZARD_CLIENT_SECRET` ni de la contraseña de `REDIS_URL`.
  - Comprueba que `validateEnv({})` aplica todos los defaults.
- `src/shared/infrastructure/session/session-store.factory.ts` —
  `createSessionStore` devuelve un `SessionStoreHandle`
  (`type`, `store`, `connect`, `ping`, `close`):
  - `memory` deja `store` en `undefined`, así que se usa el MemoryStore por
    defecto. En producción emite el `warn` de sesiones no persistentes.
  - `redis` usa `connect-redis` con prefijo fijo `wow-armory:sess:` y `ttl`
    igual a `ceil(SESSION_TTL_MS / 1000)`.
  - El cliente `redis` es inyectable. Por defecto, `createDefaultRedisClient`
    falla al arrancar tras 3 intentos y, una vez conectado, reintenta con
    backoff.
  - Los errores de conexión enmascaran la contraseña: tanto la URL como el
    texto del error pasan por `maskRedisUrl` y el scrub del password.
  - `ping` tiene timeout de 1 s.
- `src/shared/infrastructure/session/session.module.ts` — módulo global con el
  token `SESSION_STORE`. `SessionStoreLifecycle` (`OnApplicationShutdown`)
  cierra el cliente Redis.
- `src/shared/infrastructure/session/session-cookie.ts` —
  `buildSessionCookieOptions(config)` devuelve `httpOnly`, `secure`,
  `sameSite`, `domain`, `path` y `maxAge = SESSION_TTL_MS`.
  `buildClearSessionCookieOptions` devuelve los mismos atributos sin `maxAge`,
  porque Express 4 reemitiría la cookie viva si lo recibe.
- `src/shared/infrastructure/logging/redact.ts` — `redact()` profundo, sin
  distinguir mayúsculas, para `token`, `accessToken`, `refreshToken`,
  `secret`, `password`, `authorization`, `cookie`, `code` y `state`.
  Protege contra ciclos.
- `src/shared/infrastructure/logging/app-logger.ts` — `AppLogger`
  implementa `LoggerService`:
  - `json` escribe una línea por evento con `timestamp` ISO, `level`,
    `context`, `message`, la metadata redactada y `stack` en los errores. La
    metadata no puede pisar los campos base.
  - `pretty` delega en `ConsoleLogger` con `setLogLevels`.
  - Respeta `LOG_LEVEL`.
  - `fromEnv()` es una variante tolerante para el arranque.
- `src/shared/infrastructure/logging/logging.module.ts` — provider global de
  `AppLogger` construido desde `ConfigService`.
- `src/shared/infrastructure/logging/request-logging.middleware.ts` — escribe
  una línea por petición al terminar la respuesta, con `method`, `path` (sin
  query), `statusCode`, `durationMs` y `requestId`.
  - Acepta un `X-Request-Id` entrante si cumple `[A-Za-z0-9-]{1,128}`; si no,
    genera uno con `randomUUID()`.
  - Devuelve el id en la cabecera `X-Request-Id`.
  - No registra cabeceras, cookies, cuerpo ni query.
- `src/shared/infrastructure/rate-limit/rate-limit.ts` — decorador
  `@RateLimit('auth' | 'public')` y `buildThrottlerOptions()`:
  - Un único throttler llamado `default`, así la cabecera es exactamente
    `Retry-After` y no `Retry-After-<name>`.
  - `limit` depende de la política de la ruta y `skipIf` excluye las rutas sin
    política.
  - `errorMessage` es fijo y el tracker es el del throttler, `req.ip`.
- `src/shared/infrastructure/http/allowed-origin.guard.ts` —
  `AllowedOriginGuard`: si el `Origin` no está en `CORS_ORIGINS`, devuelve
  `403` antes del handler. Sin `Origin`, deja pasar.
- `src/health/health.module.ts`, `health.controller.ts`,
  `health.service.ts` — `GET /health` con `@SkipThrottle()`.
  - Responde `{ status, uptime, version, sessionStore: { type, status } }`.
  - Si el ping falla, lanza `ServiceUnavailableException(report)`, que da
    `503` con `status: 'error'` y `sessionStore.status: 'down'`.
- `src/app.module.ts` — importa `ThrottlerModule.forRootAsync` (límites desde
  `ConfigService`) y registra `APP_GUARD` con `ThrottlerGuard`, además de
  `LoggingModule`, `SessionModule` y `HealthModule`.
- `src/bootstrap.ts` — aplica `trust proxy` desde `TRUST_PROXY` y
  `disable('x-powered-by')`.
  - Monta el middleware de peticiones.
  - Configura `express-session` con el store de la fábrica y la cookie del
    helper. Ya no hay constante de 24 h.
  - CORS: la allowlist ya viene normalizada. Añade `X-Request-Id` a las
    cabeceras permitidas y expuestas, y mantiene `Retry-After`.
- `src/main.ts`:
  - Importa `AppModule` en diferido y crea la app con `bufferLogs: true`,
    `abortOnError: false` y logger de arranque `AppLogger.fromEnv`.
  - Después hace `app.useLogger(app.get(AppLogger))` y
    `enableShutdownHooks()`.
  - Espera `SESSION_STORE.connect()` antes de `listen`.
  - Ante cualquier error escribe `Startup failed: ...` con el logger, cierra
    la app y termina con `exitCode = 1`, con un `process.exit(1)` de respaldo
    a 1 s.
- `src/identity/presentation/AuthController.ts`:
  - `@RateLimit('auth')` en login, callback y logout; `@RateLimit('public')`
    en session.
  - `@UseGuards(AllowedOriginGuard)` en logout.
  - `clearCookie` usa el helper compartido.
  - No cambian los casos de uso ni el contrato.
- `src/characters/presentation/CharactersController.ts` —
  `@RateLimit('public')`.
- `test/setup-env.ts` — `LOG_LEVEL=warn` y límites altos (10000) para que los
  e2e generales no reciban `429`.
- `test/app.e2e-spec.ts` — no toco ninguna aserción existente. Añado e2e de
  logout con `Origin` no permitido (`403`, sesión intacta, sin
  `Set-Cookie`), con `Origin` permitido (`204`) y sin `Origin` (`204`), y un
  e2e de atributos de la cookie.
- `test/hardening.e2e-spec.ts` (nuevo):
  - `/health`, `X-Powered-By`, `X-Request-Id` y su exposición CORS.
  - App propia con `overrideProvider(getOptionsToken())` y límites bajos
    (auth 2, public 3):
    - `429` en `/auth/login` y en `/characters/...`.
    - `Retry-After` entero, sin cabeceras `retry-after-*` y expuesto por CORS.
    - Un `X-Forwarded-For` falsificado no evita el `429`.
    - `/health` responde `200` nueve veces seguidas.
  - Una segunda app con `trust proxy = 1` comprueba que el tracker usa la IP
    del cliente (`req.ip`).
- `wow-armory-server/.env.example` (nuevo, versionado, no ignorado) — todas
  las variables de la tabla con valores ficticios.
- `wow-armory-client/src/infrastructure/config/env.ts` — en producción
  rechaza `http://` salvo `localhost` o `127.0.0.1`, con un mensaje claro.
- `wow-armory-client/src/infrastructure/config/env.test.ts` — 4 tests nuevos:
  http no loopback, `localhost.example.com` (que no cuenta como loopback),
  loopback permitido y http fuera de producción.

## Criterios de aceptación

### Configuración validada

- [x] Todos los errores salen en un único
      `Error('Invalid environment configuration: ...')` sin valores secretos.
      Lo cubren `reports every problem in a single error` y
      `lists every missing variable without echoing secret values`.
- [x] Hay un test por cada valor inválido (`it.each` de 19 casos): `NODE_ENV`,
      `PORT` (abc/0/65536/decimal), `COOKIE_SAME_SITE`, `BLIZZARD_REGION`,
      `TRUST_PROXY` (maybe/-1), `SESSION_STORE`, `LOG_LEVEL`, `LOG_FORMAT`,
      `SESSION_TTL_MS`, `TOKEN_REFRESH_MARGIN_MS`, `RATE_LIMIT_*` y
      `COOKIE_SECURE`.
- [x] Hay un test por cada regla de producción (`describe('production requirements')`):
      `CLIENT_URL` ausente o no https, redirect no https,
      `COOKIE_SECURE=false`, CORS con http o con path, `CLIENT_URL` fuera de
      CORS y falta de `REDIS_URL` sin `memory` explícito.
- [x] `CORS_ORIGINS` rechaza `*` y los origins inválidos en cualquier entorno
      (7 casos).
- [x] Sin `CORS_ORIGINS`, su valor es el origin de `CLIENT_URL`, en desarrollo
      y en producción.
- [x] `SESSION_STORE=redis` exige `REDIS_URL` con `redis://` o `rediss://`.
- [x] `validateEnv({})` no lanza, aplica todos los defaults y genera el secreto
      efímero con `Logger.warn`. Los tests previos siguen pasando; el del aviso
      ahora espía `Logger.prototype.warn` en lugar de `console.warn`.
- [x] `main.ts` captura el error, lo registra y termina con código distinto
      de 0. Con `NODE_ENV=production node dist/main` sale `EXIT=1` y un log
      JSON que lista `SESSION_SECRET`, `BLIZZARD_CLIENT_ID`,
      `BLIZZARD_CLIENT_SECRET`, `BLIZZARD_REDIRECT_URI`, `CLIENT_URL` y
      `REDIS_URL`, sin valores.

### Sesión persistente

- [x] La fábrica vive en `src/shared/infrastructure/session/` y tiene tests
      para `memory` y para `redis` con un cliente falso inyectado.
- [x] Prefijo `wow-armory:sess:` y TTL igual a `SESSION_TTL_MS`. El test
      comprueba `client.set('wow-armory:sess:sid-1', ..., { EX: 7200 })`. El
      `maxAge` de la cookie también sale de `SESSION_TTL_MS`.
- [x] `main.ts` espera `connect()` antes de `listen`. Probado con
      `REDIS_URL=redis://default:PWSENTINEL@127.0.0.1:6390`: `EXIT=1` con
      `Could not connect to Redis at redis://default:****@127.0.0.1:6390: ...`.
      Hay además un test unitario de enmascarado.
- [x] Con `memory` en producción se emite el `warn`. Probado en arranque real
      (log `SessionStore` en JSON) y con un test unitario.
- [x] `app.enableShutdownHooks()` está activo en `main.ts` y
      `SessionStoreLifecycle.onApplicationShutdown` cierra el handle (test
      unitario). No probé la señal `SIGTERM` real porque en Windows no se
      entrega igual que en Linux.
- [x] El puerto `SessionRepository`, los casos de uso y el contrato de
      `/auth/*` no cambian. Los e2e de auth existentes pasan sin tocar sus
      aserciones, con el store en memoria.

### Cookies, CORS y proxy

- [x] El helper compartido lo usan `bootstrap.ts` y `AuthController.logout`.
      Hay test unitario.
- [x] Con `SameSite=None` y `Secure`, el helper produce una cookie con
      `SameSite=None`, `Secure` y `HttpOnly`. Un test unitario lo comprueba
      con una app Express real y `supertest`; también verifica que la limpieza
      conserva esos atributos y no lleva `Max-Age`.
- [x] `TRUST_PROXY` vale `true`, `false` o un número; por defecto `1` en
      producción y `false` fuera. `configureApp` lo aplica con
      `express.set('trust proxy', ...)`.
- [x] `X-Powered-By` desactivado, con e2e.
- [x] Logout con `Origin` no permitido devuelve `403` y la sesión sigue
      autenticada, sin `Set-Cookie`. Con `Origin` permitido o sin `Origin`
      devuelve `204`. Hay 3 e2e.
- [x] Los e2e de CORS existentes pasan, incluido `Retry-After` expuesto en el
      `429` de Blizzard.

### Logs

- [x] `LoggerService` propio con `bufferLogs: true` y `app.useLogger(...)`.
      Formatos JSON y pretty, respeta `LOG_LEVEL` y tiene tests unitarios.
- [x] Middleware de peticiones con test de centinelas: para
      `/auth/callback?code=SECRET_CODE&state=SECRET_STATE` (más cookie,
      authorization y cuerpo con centinelas), la salida no contiene ninguno.
      Las claves del JSON se limitan a las esperadas.
- [x] Función de redacción con tests: claves sensibles en distintas
      mayúsculas, objetos anidados, arrays, sin mutar la entrada y con ciclos.
- [x] No queda `console.*` fuera de los specs: el grep del plan no devuelve
      nada.

### Health

- [x] El módulo `src/health/` está importado en `AppModule`.
- [x] `GET /health` responde `200` con la forma exigida. `version` sale de
      `APP_VERSION` o, si no está, de `package.json` (`0.0.1`).
- [x] Con Redis caído o lento (>1 s), `503` con `status: 'error'` y `down`.
      Hay test unitario del servicio con cliente simulado, incluido un
      timeout real de 1 s con fake timers, y test del controlador para el
      `503`.
- [x] `/health` no llama a Blizzard (el e2e comprueba que el repositorio no se
      invoca), no emite `Set-Cookie` y no expone configuración. El rate
      limiting no le afecta: el e2e hace 9 peticiones con límite 3.

### Rate limiting

- [x] `@nestjs/throttler` global (`APP_GUARD`) con límites del
      `ConfigService`: auth en login, callback y logout; public en session y
      characters.
- [x] El `429` lleva cuerpo `{ statusCode: 429, message }` y `Retry-After` en
      segundos enteros, sin sufijo y expuesto por CORS. Lo verifica un e2e.
- [x] Hay e2e de `429` en `/auth/login` y en `/characters/...` con una app
      propia y límites bajos. El resto usa los límites altos de
      `setup-env.ts`.
- [x] La IP respeta `trust proxy`. El tracker por defecto del throttler es
      `req.ip`, que Express calcula según `trust proxy`.
  - Con `trust proxy = false` (test), un `X-Forwarded-For` falsificado no
    evita el `429`.
  - Con `trust proxy = 1`, dos IP de cliente distintas detrás del proxy
    tienen contadores separados.
  - En producción el default `TRUST_PROXY=1` cubre un PaaS con un único
    proxy.

### Configuración de ejemplo y cliente

- [x] `wow-armory-server/.env.example` está versionado.
      `git check-ignore` no lo marca como ignorado.
- [x] El `env.ts` del cliente rechaza `http://` no loopback en producción y
      tiene tests nuevos. No se tocó ningún otro archivo del cliente.

## Tabla de variables

Coincide con la de la spec en nombres, obligatoriedad y defaults. Tres
matices de implementación, ninguno contradice la tabla:

- `COOKIE_SECURE` también acepta `1/0/yes/no/on/off`; cualquier otro valor da
  error.
- `CORS_ORIGINS` se normaliza a origins (`https://a.com/` pasa a
  `https://a.com`).
- `BLIZZARD_REDIRECT_URI` y `CLIENT_URL`, si se definen fuera de producción,
  deben ser URLs http(s) válidas.

## Notas para el job 012

- El rate limiting vive en memoria por instancia: con N instancias, el límite
  efectivo es N veces el configurado.
- Cada ruta tiene su propio contador por IP. Por ejemplo, login y callback no
  comparten cubo, así que un flujo de login completo no consume dos veces el
  mismo límite.
- `express-session` imprime con su propio `console.warn` el aviso
  "MemoryStore is not designed for a production environment" cuando
  `NODE_ENV=production` y el store es `memory`. Sale de la librería, no de
  `src/`. Además se emite nuestro `warn` estructurado.
- Recomendar subdominios del mismo sitio con `SameSite=lax` (riesgo ITP de la
  spec).

## Verificación

Todo se ejecutó dentro del worktree
`C:\Users\Moises\Desktop\wow-armory-wt\010-production-hardening`.

- `cd wow-armory-server && npx jest` (equivale a
  `npm test -- --runInBand`) → **pass**, 25 suites y 185 tests.
- `cd wow-armory-server && npm run test:e2e` → **pass**, 2 suites y 27 tests.
- `cd wow-armory-server && npx eslint "{src,apps,libs,test}/**/*.ts" --rule '{"prettier/prettier": ["error", {"endOfLine": "auto"}]}'`
  → **pass**, 0 problemas.
  - **Entorno**: el worktree tiene `core.autocrlf=true`, así que git
    materializa los archivos que ya existían con CRLF y
    `npx eslint "{src,apps,libs,test}/**/*.ts"` sin override da miles de
    `Delete ␍`, también en archivos que no toqué.
  - No ejecuté `npm run lint` (lleva `--fix`) para no reescribir los finales
    de línea de todo el repo.
  - Mis archivos están formateados con Prettier (LF) y git los normaliza al
    commitear.
- `cd wow-armory-server && npm run build` → **pass**.
- `NODE_ENV=production node dist/main`, con el entorno limpio vía `env -i` →
  `EXIT=1` y log JSON con las variables que faltan, sin valores.
- Producción con `REDIS_URL` inalcanzable → `EXIT=1` y la contraseña
  enmascarada (`****`).
- Producción con `SESSION_STORE=memory` y config completa → arranca, emite el
  `warn` y `GET /health` devuelve `200`
  `{"status":"ok","uptime":3,"version":"0.0.1","sessionStore":{"type":"memory","status":"up"}}`
  con `X-Request-Id`, sin `X-Powered-By` y con una línea JSON de petición.
- `grep -rn "console\." wow-armory-server/src --include=*.ts | grep -v "\.spec\.ts"`
  → sin resultados.
- `cd wow-armory-client && npm run lint && npm test && npm run build` →
  **pass**, lint limpio, 15 archivos y 80 tests, build OK.

## Feedback de la ronda

- security: primera build.
- ux: primera build.
- ui: primera build.
- code: primera build.

## Commit

`e9e5c9a` `feat: :sparkles: harden server config, sessions, logs, health and rate limiting`
