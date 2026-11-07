VERDICT: PASS

# Code review — ronda 2

## Hallazgos

- [minor] `wow-armory-server/test/app.e2e-spec.ts:309-321` — el e2e cross-origin es significativo (usa `Origin` permitido, fuerza el 429 con el repositorio falso y comprueba `Access-Control-Allow-Origin` y `Access-Control-Expose-Headers` con `Retry-After`), pero no verifica el caso negativo (un origen no listado no debe recibir `Access-Control-Allow-Origin`). No bloquea: el fix solo añade `exposedHeaders` y no altera la allowlist.
- [minor] `wow-armory-server/src/bootstrap.ts:57` — `exposedHeaders: ['Retry-After']` se aplica a toda la API. Es inocuo y correcto para el contrato, pero conviene recordar que cualquier futuro endpoint que escriba esa cabecera la expondrá también a navegadores de orígenes permitidos.
- [minor] `wow-armory-server/test/setup-env.ts:5` — el e2e depende de que `CORS_ORIGINS` valga `http://localhost:5173` para que el test cross-origin sea determinista; hoy está fijado en el setup, así que no hay fragilidad real, solo acoplamiento implícito entre el helper de entorno y `CLIENT_URL` en `app.e2e-spec.ts:23`.

## Cambios requeridos

Ninguno. No hay blocker ni major: el fix está en `configureApp`/`enableCors` (no en `main.ts`), mantiene `origin`, `credentials: true`, `methods` y `allowedHeaders` intactos, y el e2e pasa sin red real. Verificación ejecutada en esta ronda: `npm test -- --runInBand` → 15 suites / 96 tests OK; `npm run test:e2e` → 14 tests OK; `npm run build` OK. No se ejecutó `npm run lint` porque su script incluye `--fix`; se ejecutó `npx eslint ... --no-fix`, que solo reporta el ruido de CRLF del checkout de Windows. El commit `2edfaf3` contiene únicamente producto (`bootstrap.ts` y el e2e), sin cambios en cliente, dependencias ni artefactos de fábrica.
