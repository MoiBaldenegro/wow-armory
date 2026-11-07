VERDICT: PASS

# Code review — ronda 1

Revisado `factory/010-production-hardening` (`e9e5c9a`) en el worktree
`wow-armory-wt/010-production-hardening`.

Verificación propia:

- Servidor:
  - `npm test -- --runInBand`: 25 suites y 185 tests en verde.
  - `npm run test:e2e`: 2 suites y 27 tests en verde.
  - `npm run build`: OK.
  - `npx eslint "{src,apps,libs,test}/**/*.ts"` con `endOfLine: auto`, sin
    `--fix`: 0 problemas.
  - `git ls-files --eol`: todos los archivos nuevos y modificados del diff
    están en LF en el índice. El ruido de `␍` sale solo del checkout con
    `autocrlf`.
- `env -i NODE_ENV=production node dist/main`: `EXIT=1`. El log JSON lista
  `SESSION_SECRET`, `BLIZZARD_*`, `CLIENT_URL` y `REDIS_URL` sin ningún valor.
- `grep console\.` en `src` fuera de los specs: no devuelve nada.
- Cliente: `npm run lint && npm test && npm run build` en verde (80 tests).
- Dependencias:
  - `@nestjs/throttler@6.7.1`: sus peerDeps aceptan Nest `^10`.
  - `connect-redis@7.x`: CJS, `require(...).default` es la clase.
  - `redis@4.7.1` y `@redis/client@1.6.1`: CJS.
  - Ninguna es ESM-only ni exige Nest 11.
- Conflictos con `main` (009 ya mergeado): `git merge-tree --write-tree`
  resuelve sin conflictos. 009 no toca el servidor ni
  `src/infrastructure/config/env.ts`.

Los criterios de aceptación están cubiertos con tests no triviales:

- Redacción y centinelas de `code`/`state` en el middleware.
- `Retry-After` sin sufijo y expuesto por CORS.
- `X-Forwarded-For` falsificado frente a `trust proxy`.
- Timeout real de 1 s en el health.
- `403` de logout sin destruir la sesión.
- Cookie `SameSite=None; Secure; HttpOnly` con Express real.

La sesión se integra sin cambiar el puerto `SessionRepository` ni los casos de
uso. Los controladores siguen delgados, con guard y decorador en
`shared/infrastructure`. No hay `any` nuevo.

## Hallazgos

- [minor] `wow-armory-server/src/shared/infrastructure/session/session-store.factory.ts:48`
  — El cliente node-redis mantiene la offline queue por defecto. Si Redis cae
  después del arranque, las lecturas y escrituras de `express-session` quedan
  en cola hasta que reconecte, así que las peticiones con sesión se cuelgan en
  lugar de fallar rápido. `/health` sí lo detecta gracias al timeout.
  - Arreglo: valorar `disableOfflineQueue: true` una vez conectado, o
    documentarlo en las notas para el job 012.
- [minor] `wow-armory-server/src/config/env.validation.ts:104` — Un origin
  válido con puerto por defecto explícito (`https://app.example.com:443`) se
  rechaza como inválido, porque se compara con `url.origin`, que elimina el
  puerto. Es conservador y el mensaje es claro.
  - Arreglo: comparar host y puerto normalizados, o mencionarlo en la guía
    del 012.
- [minor] `wow-armory-server/src/main.ts:27,46` — Con `abortOnError: false`, un
  error de configuración se registra dos veces: Nest lo escribe como
  `ExceptionHandler`, con `stack` y rutas de `dist/`, y después llega
  `Startup failed: ...`. No filtra secretos, pero añade ruido en los logs del
  PaaS. Opcional: dejar una sola línea.
- [minor] `wow-armory-server/src/config/env.validation.ts` (aviso de secreto
  efímero) — `validateEnv` se ejecuta antes de `useLogger`, así que ese `warn`
  sale con el `ConsoleLogger` por defecto y no en JSON, aunque
  `LOG_FORMAT=json`. Solo ocurre fuera de producción, donde el aviso no se
  emite en el caso real. No requiere cambio.

## Cambios requeridos

No hay cambios obligatorios. Los minors son opcionales o pueden ir a las notas
del job 012.
