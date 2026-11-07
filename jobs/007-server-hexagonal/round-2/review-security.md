VERDICT: PASS

# Security review — ronda 2

## Hallazgos

- [minor] `wow-armory-server/test/app.e2e-spec.ts:309-321` — el e2e valida origen permitido, `Access-Control-Allow-Origin` y `Access-Control-Expose-Headers` en el 429, pero no comprueba que un `Origin` no listado *no* reciba `Access-Control-Allow-Origin` ni cubre un preflight `OPTIONS`. No es una regresión: el comportamiento de CORS ya estaba definido en `main` y el cambio añade solo `exposedHeaders`; se documenta como cobertura de test mejorable, no bloqueante.
- [minor] `wow-armory-server/src/bootstrap.ts:57` — `exposedHeaders: ['Retry-After']` aplica a toda la API, incluidos los endpoints de `identity`. Es inocuo: únicamente expone al navegador una cabecera que el servidor escriba explícitamente y hoy solo se escribe con un número saneado (`CharactersController.ts:53-55`, `BlizzardCharacterAdapter.ts:78-89`); no expone `Set-Cookie`, `Authorization` ni datos internos. No requiere acción.

## Verificaciones sin hallazgo

- El diff del fix (`2edfaf3`) solo añade una línea a `configureApp` y un caso e2e; no cambia `origin`, `credentials: true`, `methods` ni `allowedHeaders`, y no toca controladores, adaptador, token provider ni `AppModule`. No se ha relajado ninguna protección previa.
- El origen permitido sigue viniendo de `CORS_ORIGINS` con default `http://localhost:5173` (`bootstrap.ts:7,50-53`); no hay wildcard ni eco de `Origin` arbitrario. `credentials: true` no se combina con `*`.
- `Retry-After` propagado sigue siendo un número finito no negativo serializado con `String(...)` (`BlizzardCharacterAdapter.ts:78-89`, `CharactersController.ts:54`), sin vector de inyección de cabeceras.
- El e2e demuestra el comportamiento real: fija `Origin` de otro origen permitido y comprueba `Access-Control-Allow-Origin` y la presencia de `Retry-After` en `Access-Control-Expose-Headers` sobre la respuesta 429 (build.md registra que el test falla sin el cambio y pasa con él).
- No hay secretos nuevos, `.env` versionado, `console.*` en superficie de red ni tokens en respuestas; los tests siguen usando credenciales ficticias y el e2e sustituye `CHARACTER_REPOSITORY`, sin red real. No se añadieron dependencias (`package.json`/lock sin cambios).

## Riesgos residuales (no bloqueantes)

- Sin rate limiting/anti-abuso en `GET /characters/...`: se cubrirá en 010 (sin cambios desde ronda 1).
- Sin allowlist para `BLIZZARD_REGION`/`BLIZZARD_NAMESPACE` (entorno confiable, no SSRF desde cliente).
- Sin cota superior para `expires_in` en la caché del token.
- `.env` del cliente versionado en `main` (solo `VITE_SERVER_URI`, sin secreto), preexistente.
