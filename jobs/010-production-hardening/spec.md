# 010-production-hardening — Config validada, sesión persistente, cookies/CORS, logs, health y rate limiting

## Objetivo

Dejar `wow-armory-server` listo para desplegarse en un PaaS con cliente y
servidor en dominios distintos: la configuración se valida al arrancar y falla
con un error claro, la sesión sobrevive a reinicios y a varias instancias con un
Redis gestionado de capa gratuita (Upstash o similar), las cookies y CORS se
configuran por entorno, los logs son JSON estructurado sin secretos y existen
`GET /health` y rate limiting. Este job **absorbe y cierra** los ítems de deuda
`003-rate-limiting` y `005-health-check`. También fija la lista definitiva de
variables de entorno que usará el job 012 para la guía de despliegue.

## Contexto

Estado actual en `main` (tras 006, 007 y 008):

- `wow-armory-server/src/config/env.validation.ts` (`validateEnv`, conectado en
  `src/app.module.ts` vía `ConfigModule.forRoot({ validate })`):
  - En producción ya exige `SESSION_SECRET` (>= 32 caracteres) y las
    credenciales de Blizzard, y rechaza `COOKIE_SAME_SITE=none` sin
    `COOKIE_SECURE=true`.
  - Fuera de producción genera un secreto efímero y avisa con `console.warn`.
  - Los valores inválidos caen en silencio a un default: un `COOKIE_SAME_SITE`
    desconocido pasa a `lax` y un `PORT` no numérico a `3000`.
  - En producción, `CLIENT_URL` y `CORS_ORIGINS` caen a `http://localhost:5173`.
    No se valida ni el formato de las URLs ni `BLIZZARD_REGION`.
  - Tests en `src/config/env.validation.spec.ts`.
- `src/bootstrap.ts` (`configureApp`, compartido por `src/main.ts` y el e2e):
  - Pone `trust proxy` a `1` solo si `NODE_ENV=production` (no es configurable).
  - Configura `cookie-parser` y `express-session` con el `MemoryStore` por
    defecto, cookie `wow_session` (`SESSION_COOKIE_NAME` en
    `src/shared/infrastructure/session.constants.ts`) y `maxAge` de 24 h
    hardcodeado.
  - Configura CORS con allowlist `CORS_ORIGINS`, `credentials: true` y
    `exposedHeaders: ['Retry-After']`.
- `src/identity/presentation/AuthController.ts` (`POST /auth/logout`) repite a
  mano las opciones de la cookie al limpiarla, con defaults distintos de los del
  bootstrap (`secure` por defecto `false`). No comprueba `Origin`: el CSRF quedó
  diferido a 010 en `jobs/006-auth-battle-net/decision.md`.
- `src/identity/infrastructure/ExpressSessionRepository.ts` implementa el puerto
  `SessionRepository` sobre `req.session`. Cambiar el store de `express-session`
  no exige tocar el puerto ni los casos de uso.
- Logs: no hay logger propio. Solo existe el `console.warn` de `validateEnv` y
  `src/main.ts` usa el logger por defecto de Nest. No se registran peticiones.
- No hay rate limiting propio. El único `429` es el que se propaga desde
  Blizzard en `src/characters/presentation/CharactersController.ts`, con
  `Retry-After`.
- No existe `GET /health`. `src/app.controller.ts` solo expone `GET /`
  ("Hello World!"). La forma propuesta en `docs/plan-hexagonal-ddd-auth.md`
  (sección 5.2) es `{ status: 'ok', uptime, version }`.
- `jobs/003-rate-limiting/` está vacío: no hay trabajo previo que reutilizar.
- E2E: `test/app.e2e-spec.ts` con `test/setup-env.ts` (`NODE_ENV=test`). Las
  variables se leen al importar `AppModule`, así que no se pueden cambiar entre
  bloques `describe` modificando `process.env`.
- Cliente: `wow-armory-client/src/infrastructure/config/env.ts`
  (`resolveServerUri`) acepta `http://` en producción. Es un minor de security
  pendiente de `jobs/008-client-hexagonal/decision.md`.
- Dependencias del servidor: no hay `@nestjs/throttler`, `connect-redis` ni
  `redis`.
- Restricción de paralelismo: `009-character-real-ui` trabaja a la vez en
  `wow-armory-client/` (búsqueda y ficha). En el cliente, este job solo puede
  tocar `wow-armory-client/src/infrastructure/config/env.ts` y `env.test.ts`.

Decisiones de diseño (las más pequeñas y conservadoras):

- **Sesión persistente**: se mantiene `express-session` y el puerto
  `SessionRepository`, y solo cambia el store.
  - Con `SESSION_STORE=redis` se usa `connect-redis` + `redis` (node-redis),
    compatible con Upstash/Redis Cloud de capa gratuita.
  - `memory` sigue siendo el default en desarrollo y test. En producción hay
    que elegirlo explícitamente.
- **Rate limiting**: con `@nestjs/throttler` (oficial de Nest), en memoria por
  instancia.
- **Logs**: un `LoggerService` propio que escribe JSON sin dependencias nuevas.
- Dependencias nuevas permitidas: `@nestjs/throttler`, `connect-redis` y
  `redis`, todas en versiones compatibles con Nest 10 y CommonJS. No se permite
  ninguna otra.

## Criterios de aceptación

### Configuración validada (fail-fast)

- [ ] `validateEnv` junta **todos** los errores en un solo
      `Error('Invalid environment configuration: ...')`, que nombra cada
      variable afectada. El mensaje **nunca** incluye el valor de
      `SESSION_SECRET`, `BLIZZARD_CLIENT_SECRET` ni la contraseña de
      `REDIS_URL`. Tests en `env.validation.spec.ts`.
- [ ] Los valores inválidos dan error en lugar de caer a un default en silencio.
      Hay un test por caso:
  - `NODE_ENV` fuera de `development|test|production`.
  - `PORT` que no sea un entero entre 1 y 65535.
  - `COOKIE_SAME_SITE` fuera de `lax|strict|none`.
  - `BLIZZARD_REGION` fuera de `us|eu|kr|tw`.
  - `TRUST_PROXY` inválido.
  - `SESSION_STORE` fuera de `memory|redis`.
  - `LOG_LEVEL` fuera de `error|warn|log|debug|verbose`.
  - `LOG_FORMAT` fuera de `json|pretty`.
  - `SESSION_TTL_MS`, `TOKEN_REFRESH_MARGIN_MS` o `RATE_LIMIT_*` que no sean
    enteros positivos.
- [ ] Con `NODE_ENV=production`, además de lo que ya se exige, la validación
      falla con un mensaje claro en cada uno de estos casos (un test por caso):
  - Falta `CLIENT_URL`, o no es una URL `https://` absoluta.
  - `BLIZZARD_REDIRECT_URI` no es una URL `https://` absoluta.
  - `COOKIE_SECURE=false`.
  - Alguna entrada de `CORS_ORIGINS` no es un origin `https://` válido. Un origin
    válido tiene esquema, host y puerto opcional, sin path y sin `*`.
  - El origin de `CLIENT_URL` no está en `CORS_ORIGINS`.
  - No hay `REDIS_URL` y `SESSION_STORE` no vale `memory` de forma explícita.
- [ ] En cualquier entorno, `CORS_ORIGINS` rechaza `*` y las entradas que no
      sean un origin válido.
- [ ] Si no se define `CORS_ORIGINS`, su valor es el origin de `CLIENT_URL`.
- [ ] Con `SESSION_STORE=redis` es obligatorio `REDIS_URL` con esquema
      `redis://` o `rediss://`.
- [ ] Desarrollo y test siguen arrancando sin `.env`: `validateEnv({})` no
      lanza, aplica los defaults de la tabla de variables y genera el secreto
      efímero con aviso. Los tests actuales de `env.validation.spec.ts` siguen
      pasando o se ajustan sin perder cobertura.
- [ ] `src/main.ts` captura el error de arranque, lo escribe con el logger y
      termina con código distinto de 0. Se puede comprobar con
      `NODE_ENV=production node dist/main`: el proceso termina sin quedarse
      escuchando y el mensaje lista las variables que faltan, sin valores.

### Sesión persistente

- [ ] Una fábrica en `src/shared/infrastructure/session/` construye el store de
      `express-session` según `SESSION_STORE`: `memory` usa el store por
      defecto y `redis` usa `connect-redis` con un cliente `redis` creado a
      partir de `REDIS_URL`. La fábrica tiene tests unitarios y el de `redis`
      usa un cliente inyectado o simulado, sin Redis real.
- [ ] En el store Redis, las claves usan el prefijo fijo `wow-armory:sess:` y
      el TTL coincide con `SESSION_TTL_MS`. El `maxAge` de la cookie también sale
      de `SESSION_TTL_MS`, que sustituye a la constante hardcodeada de 24 h.
- [ ] Con `SESSION_STORE=redis`, `main.ts` espera a conectar el cliente antes
      de `listen`. Si no conecta, el proceso termina con código distinto de 0 y
      un mensaje en el que la contraseña de `REDIS_URL` está enmascarada.
- [ ] Con `SESSION_STORE=memory` y `NODE_ENV=production`, se registra al
      arrancar un `warn` que avisa de que las sesiones se pierden al reiniciar
      y no se comparten entre instancias.
- [ ] `app.enableShutdownHooks()` está activo y, al recibir `SIGTERM`, el
      cliente Redis se cierra si existe.
- [ ] El puerto `SessionRepository`, los casos de uso de `src/identity/` y el
      contrato HTTP de `/auth/*` no cambian. Todos los e2e de autenticación
      existentes pasan sin modificar sus aserciones, con el store en memoria.

### Cookies, CORS y proxy

- [ ] Un helper compartido en `src/shared/infrastructure/session/` calcula las
      opciones de la cookie de sesión a partir del `ConfigService`: `httpOnly`,
      `secure`, `sameSite`, `domain`, `path` y `maxAge`. Lo usan `bootstrap.ts`
      y `AuthController.logout` para limpiar la cookie con los mismos
      atributos. Un test unitario lo comprueba.
- [ ] Con `COOKIE_SAME_SITE=none` y `COOKIE_SECURE=true`, la cookie
      `wow_session` emitida tras el login lleva `SameSite=None`, `Secure` y
      `HttpOnly`. Se cubre con un test unitario del helper o con un e2e.
- [ ] `TRUST_PROXY` es configurable y acepta `true`, `false` o un número entero
      de saltos >= 0. Por defecto vale `1` en producción y `false` fuera de
      ella. `configureApp` lo aplica con `app.set('trust proxy', ...)`.
- [ ] Se desactiva la cabecera `X-Powered-By`, y un e2e comprueba que no
      aparece.
- [ ] `POST /auth/logout` con una cabecera `Origin` fuera de la allowlist
      responde `403`, no destruye la sesión ni limpia la cookie. Si el `Origin`
      está permitido o no viene, el comportamiento es el actual (`204`). Hay un
      e2e para cada caso.
- [ ] Los e2e existentes de CORS siguen pasando, incluido el de `Retry-After`
      expuesto en el `429` cross-origin.

### Logs estructurados sin secretos

- [ ] Hay un `LoggerService` propio en `src/shared/infrastructure/logging/`
      que `main.ts` registra con `bufferLogs: true` y `app.useLogger(...)`.
  - Con `LOG_FORMAT=json` escribe una línea JSON por evento, con al menos
    `timestamp` (ISO), `level`, `context` y `message`.
  - Con `pretty` delega en el formato por defecto de Nest.
  - Respeta `LOG_LEVEL`.
  - Tiene tests unitarios.
- [ ] Un middleware de peticiones registra una línea por petición con
      `method`, `path` (sin query string), `statusCode`, `durationMs` y
      `requestId`.
  - `requestId` sale de una cabecera `X-Request-Id` entrante válida (por
    ejemplo, hasta 128 caracteres `[A-Za-z0-9-]`) o se genera con
    `crypto.randomUUID()`, y se devuelve en la cabecera `X-Request-Id` de la
    respuesta.
  - No registra cabeceras, cookies, cuerpo ni query.
  - Un test unitario comprueba que, para
    `/auth/callback?code=SECRET_CODE&state=SECRET_STATE`, la salida no contiene
    `SECRET_CODE` ni `SECRET_STATE`.
- [ ] Una función de redacción reemplaza por `[REDACTED]` las claves sensibles
      (sin distinguir mayúsculas) de cualquier metadato que se registre:
      `token`, `accessToken`, `refreshToken`, `secret`, `password`,
      `authorization`, `cookie`, `code` y `state`. Tiene tests unitarios.
- [ ] El aviso de secreto efímero de `validateEnv` deja de usar `console.*`
      directo y pasa por `Logger` de `@nestjs/common` (o por un callback
      inyectado). `grep -rn "console\." wow-armory-server/src --include=*.ts`
      no devuelve nada fuera de `*.spec.ts`.

### `GET /health` (cierra `005-health-check`)

- [ ] Un módulo `src/health/` (`health.module.ts`, `health.controller.ts` y
      `health.service.ts`) se importa en `AppModule`.
- [ ] `GET /health` responde `200` con
      `{ status: 'ok', uptime: <segundos, número>, version: <string>, sessionStore: { type: 'memory' | 'redis', status: 'up' } }`.
      `version` vale `APP_VERSION` si está definida y, si no, la `version` de
      `wow-armory-server/package.json`.
- [ ] Si el store es Redis y no responde (un `PING` falla o tarda más de
      1 s), `GET /health` responde `503` con `status: 'error'` y
      `sessionStore.status: 'down'`. Hay un test unitario del servicio con un
      cliente simulado.
- [ ] `GET /health` no llama a Blizzard, no emite `Set-Cookie`, no expone
      secretos ni configuración y no le afecta el rate limiting. El e2e lo
      comprueba con más peticiones que el límite configurado.

### Rate limiting (cierra `003-rate-limiting`)

- [ ] `@nestjs/throttler` se registra de forma global, con límites leídos del
      `ConfigService`:
  - `GET /auth/login`, `GET /auth/callback` y `POST /auth/logout` usan el
    límite estricto `RATE_LIMIT_AUTH_LIMIT` por ventana `RATE_LIMIT_TTL_MS` y
    por IP del cliente.
  - `GET /auth/session` y `GET /characters/:realmSlug/:characterName` usan el
    límite público `RATE_LIMIT_PUBLIC_LIMIT` en la misma ventana.
- [ ] Al superar el límite, la respuesta es `429` con cuerpo
      `{ statusCode: 429, message: <string> }` y cabecera `Retry-After` en
      segundos enteros. La cabecera se llama exactamente `Retry-After`, sin
      sufijo de nombre de throttler, y CORS la expone.
- [ ] Hay e2e que demuestran el `429` en `/auth/login` al pasar el límite
      estricto y en `/characters/...` al pasar el límite público.
  - Usan una instancia de app propia con límites bajos (override de la
    configuración o de las opciones del throttler).
  - Ningún otro e2e se ve afectado. Por ejemplo, `test/setup-env.ts` puede fijar
    límites altos para el resto.
- [ ] La IP de rate limiting respeta `trust proxy`: detrás del proxy se usa
      `req.ip`, no la IP del balanceador. Un test o una nota en `build.md` lo
      justifica con la configuración usada.

### Configuración de ejemplo y cliente

- [ ] Existe `wow-armory-server/.env.example` con todas las variables de la
      tabla siguiente y valores de ejemplo ficticios, sin secretos reales. Está
      versionado y no lo ignora `.gitignore`.
- [ ] `wow-armory-client/src/infrastructure/config/env.ts` rechaza en
      producción las URLs `http://`, salvo que el host sea `localhost` o
      `127.0.0.1`. El mensaje de error es claro y hay tests nuevos en
      `env.test.ts`. No se toca ningún otro archivo de `wow-armory-client/`.

### Variables de entorno resultantes (fuente para el job 012)

La implementación debe coincidir exactamente con esta tabla (nombres,
obligatoriedad y defaults). Si el builder necesita desviarse, debe actualizar
la tabla en `build.md` y justificarlo.

| Variable | Proyecto | Obligatoria | Default | Ejemplo |
| --- | --- | --- | --- | --- |
| `NODE_ENV` | servidor | No | `development` | `production` |
| `PORT` | servidor | No (el PaaS suele inyectarla) | `3000` | `10000` |
| `SESSION_SECRET` | servidor | Sí en producción (>= 32 caracteres) | efímero aleatorio fuera de producción | `<64 hex de openssl rand -hex 32>` |
| `SESSION_STORE` | servidor | Sí en producción si no hay `REDIS_URL` (valor `memory` explícito) | `redis` si hay `REDIS_URL`; si no, `memory` | `redis` |
| `REDIS_URL` | servidor | Sí si `SESSION_STORE=redis` | — | `rediss://default:<password>@<host>.upstash.io:6379` |
| `SESSION_TTL_MS` | servidor | No | `86400000` | `86400000` |
| `BLIZZARD_CLIENT_ID` | servidor | Sí en producción | `''` | `abc123` |
| `BLIZZARD_CLIENT_SECRET` | servidor | Sí en producción | `''` | `<secret>` |
| `BLIZZARD_REDIRECT_URI` | servidor | Sí en producción (`https://`) | `''` | `https://api.example.com/auth/callback` |
| `BLIZZARD_REGION` | servidor | No (`us`, `eu`, `kr`, `tw`) | `us` | `eu` |
| `BLIZZARD_NAMESPACE` | servidor | No | `profile-classic-us` | `profile-eu` |
| `CLIENT_URL` | servidor | Sí en producción (`https://`) | `http://localhost:5173` | `https://app.example.com` |
| `CORS_ORIGINS` | servidor | No (lista separada por comas) | origin de `CLIENT_URL` | `https://app.example.com,https://www.example.com` |
| `COOKIE_SECURE` | servidor | No (en producción debe ser `true`) | `true` en producción; si no, `false` | `true` |
| `COOKIE_SAME_SITE` | servidor | No (`lax`, `strict`, `none`) | `lax` | `none` (cliente y API en sitios distintos) |
| `COOKIE_DOMAIN` | servidor | No | sin definir (host de la API) | `.example.com` |
| `TRUST_PROXY` | servidor | No (`true`, `false` o número de saltos) | `1` en producción; si no, `false` | `1` |
| `TOKEN_REFRESH_MARGIN_MS` | servidor | No | `60000` | `60000` |
| `LOG_LEVEL` | servidor | No (`error`, `warn`, `log`, `debug`, `verbose`) | `log` | `warn` |
| `LOG_FORMAT` | servidor | No (`json`, `pretty`) | `json` en producción; si no, `pretty` | `json` |
| `RATE_LIMIT_TTL_MS` | servidor | No | `60000` | `60000` |
| `RATE_LIMIT_AUTH_LIMIT` | servidor | No | `10` | `10` |
| `RATE_LIMIT_PUBLIC_LIMIT` | servidor | No | `60` | `120` |
| `APP_VERSION` | servidor | No | `version` de `package.json` | `1.2.0` o el SHA del commit |
| `VITE_SERVER_URI` | cliente (build) | Sí en el build de producción (`https://`, salvo loopback) | `http://localhost:3000` fuera de producción | `https://api.example.com` |

## Plan de pruebas

- `cd wow-armory-server && npm test -- --runInBand`
- `cd wow-armory-server && npm run test:e2e`
- `cd wow-armory-server && npm run lint`. El script lleva `--fix`. Para
  revisar sin modificar, usa `npx eslint "{src,apps,libs,test}/**/*.ts"`.
- `cd wow-armory-server && npm run build`
- Comprobación de arranque fallido, después del build:
  `cd wow-armory-server && NODE_ENV=production node dist/main`. Debe terminar
  con código distinto de 0 y listar las variables que faltan sin mostrar
  valores.
- Comprobación de que no queda `console.*`:
  `grep -rn "console\." wow-armory-server/src --include=*.ts | grep -v "\.spec\.ts"`.
  No debe devolver nada.
- `cd wow-armory-client && npm run lint && npm test && npm run build`. Es una
  regresión del único cambio en `env.ts`.
- Tests nuevos esperados:
  - `env.validation.spec.ts` ampliado.
  - Specs de la fábrica de store y del helper de cookie.
  - Specs del logger, de la redacción y del middleware de peticiones.
  - `health.service.spec.ts`.
  - E2E de `/health`, del `429` en auth y en characters, de `Origin` en logout,
    de `X-Request-Id` y de `X-Powered-By`.
  - `env.test.ts` del cliente ampliado.

## Fuera de alcance

- Dockerfiles, `docker-compose` y la guía de despliegue (job 012).
- `.env.example` del cliente, dejar de versionar `wow-armory-client/.env` y el
  fallback de rutas SPA para enlaces directos. Son configuración del hosting
  estático y van al job 012.
- Actualizar `react-router-dom` por sus advisories. Toca
  `wow-armory-client/package.json` y el lockfile, que chocarían con 009 en
  paralelo. Queda para un job posterior.
- Cualquier cambio en `wow-armory-client/` fuera de
  `src/infrastructure/config/env.ts` y `env.test.ts`.
- Cambios en el puerto `SessionRepository`, en los casos de uso de identity o
  characters, o en los DTOs y contratos HTTP existentes (salvo el `403` de
  logout con `Origin` no permitido y las cabeceras nuevas).
- Rate limiting distribuido (store Redis para el throttler), `helmet`, tokens
  CSRF, rotación de `SESSION_SECRET`, caché de respuestas de Blizzard y métricas
  o tracing.
- Eliminar `GET /` (`AppController`).
- Tocar `backlog.md`, `factory/`, `jobs/` (salvo `build.md`), `docs/` y
  `AGENTS.md`.

## Riesgos

- **Cookies de terceros bloqueadas**: con cliente y API en sitios distintos
  (por ejemplo `*.pages.dev` y `*.onrender.com`), `SameSite=None; Secure` puede
  no bastar en Safari (ITP) ni en Chrome si se bloquean las cookies de
  terceros. Mitigación: este job hace la configuración correcta y validable, y
  el job 012 debe recomendar subdominios del mismo sitio (`app.example.com` y
  `api.example.com`) con `SameSite=lax`. No se implementa proxy ni tokens
  alternativos.
- **Compatibilidad de `connect-redis`, `redis` y `@nestjs/throttler`**: algunas
  versiones mayores recientes son solo ESM o requieren Nest 11. Mitigación:
  fijar versiones con CommonJS y compatibles con Nest 10, y dejar las elegidas
  en `build.md`. Si `connect-redis` da problemas, se acepta un store mínimo
  propio sobre `redis` que implemente `get`/`set`/`destroy`/`touch` de
  `express-session` con TTL, con tests.
- **Nombre de la cabecera del throttler**: `@nestjs/throttler` v6 añade el
  nombre del throttler a las cabeceras (`Retry-After-<name>`) cuando no es
  `default`. Mitigación: el criterio exige `Retry-After` exacto y un e2e lo
  verifica.
- **Rate limiting en memoria por instancia**: con N instancias, el límite
  efectivo es N veces el configurado. Se acepta para la capa gratuita y se
  documenta en `build.md` para el job 012.
- **IP del cliente tras el proxy**: un `TRUST_PROXY` mal configurado hace que
  todos compartan la IP del balanceador (bloqueos masivos) o permite falsear
  `X-Forwarded-For`. Mitigación: el default `1` cubre el caso típico de un PaaS
  con un único proxy, y el valor se documenta en la tabla.
- **Validación más estricta**: puede romper despliegues que hoy arrancan con
  valores laxos (`CLIENT_URL` sin definir o `COOKIE_SAME_SITE` inválido).
  Mitigación: los mensajes nombran la variable y el valor esperado, y desarrollo
  y test siguen funcionando sin `.env`.
- **Variables leídas al importar `AppModule`**: no se puede variar
  `process.env` entre bloques del e2e. Mitigación: usar overrides de proveedor
  o de opciones del throttler en una app separada para los tests de `429`.
- **Fuga de secretos en logs**: el callback OAuth lleva `code` y `state` en la
  query, y `REDIS_URL` lleva la contraseña. Mitigación: el path se registra sin
  query, existe la función de redacción y hay tests que buscan valores
  centinela.
- **Ambigüedad de alcance de "sesión persistente"**: se interpreta como un
  store externo opcional (Redis) sin cambiar el modelo de sesión. Se descarta la
  sesión sin estado en cookie cifrada, porque supone criptografía propia y
  cambiaría el adaptador de identity.
- **Paralelismo con 009**: el único archivo de cliente que se toca
  (`src/infrastructure/config/env.ts`) no forma parte de la búsqueda ni de la
  ficha. Si 009 lo modifica, el builder hace rebase y conserva ambos cambios.
