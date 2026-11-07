VERDICT: PASS

# UX review — ronda 2

## Hallazgos

- [minor] `wow-armory-server/src/bootstrap.ts:57` — `exposedHeaders: ['Retry-After']`
  resuelve el blocker de la ronda 1: un navegador en un origen permitido ya puede
  leer `Retry-After` en la respuesta 429, de modo que 008/009 podrán mostrar
  "reintenta en N s" y aplicar backoff. El cambio no altera el DTO ni ningún otro
  comportamiento visible del endpoint.
- [minor] `wow-armory-server/test/app.e2e-spec.ts:309-321` — el e2e es realista:
  usa `configureApp` (línea 209), un `Origin` de desarrollo
  (`http://localhost:5173`, `CLIENT_URL` en la línea 23), fuerza el 429 y
  comprueba `Access-Control-Allow-Origin` y `Access-Control-Expose-Headers` con
  `Retry-After`. Verificado en local con
  `npx jest --config ./test/jest-e2e.json -t "exposes Retry-After"` → 1 passed.
  No cubre la ejecución 200/400/404/502 de forma cruzada, pero el resto del e2e
  ya valida esos estados y el contrato no ha cambiado.
- [minor] `wow-armory-server/src/characters/presentation/CharactersController.ts:57-63`
  — sigue vigente: el cuerpo del 429 es `{ statusCode, message }` sin `error`,
  a diferencia de los 400/404/502 de Nest. La UI de 008/009 debe decidir por
  `statusCode`, no por la presencia de `error`. No bloqueante para este job.
- [minor] `wow-armory-server/src/characters/presentation/CharactersController.ts:45,49,60,68`
  — mensajes en inglés y jerga técnica sin cambios; la UI debe mapear
  `statusCode` a copy español y nunca pintar `message` crudo. No bloqueante.
- [minor] `wow-armory-client/src/types/character.ts:1-40` frente a
  `wow-armory-server/src/characters/presentation/dto/character.dto.ts:3-29` —
  persisten los desajustes de ronda 1: `guild.rank` número vs. string,
  `achievements[].completedAt` vs. `recentAchievements[].date/description`,
  opcionales del DTO que el tipo actual exige y `lastLogin` ISO completo. 008/009
  deben normalizar y definir estados vacíos para guild/especialización/logros y
  formatear `realmSlug` ("area-52" → "Area 52"). No bloqueante para 007.
- [minor] `wow-armory-server/src/characters/presentation/dto/character.dto.ts:24-25`
  — `itemLevel` y `achievementPoints` siguen cayendo a `0` cuando faltan datos;
  la ficha debe tratar `0` como "no disponible" y no afirmar un valor real.
  No bloqueante.
- [minor] `wow-armory-client/src/hooks/useDetails.ts:30-32` — el hook sigue sin
  uso y reduce cualquier error HTTP a `Error`, perdiendo `status` y ahora también
  el `Retry-After` que el servidor ya expone. Si 008 lo reutiliza, debe extenderlo
  para conservar `status` y la cabecera; su `withCredentials: true` es
  innecesario para el endpoint público. No bloqueante.
- [minor] `docs/casos-de-uso.md:162-165` — CU-06 continúa esperando un 401 que
  este endpoint no emite (los 401/403 de Blizzard se colapsan en 502); 008/009
  deben mostrar un error de servicio reintentable, no redirigir a login.
  Documentación fuera del alcance de este job.

Nota: este job no añade superficie de UI; la revisión se limita al contrato y a
las cabeceras que consumirá la SPA. El cambio `2edfaf3` solo añade CORS y un
e2e, no empeora el contrato.

## Recomendaciones no bloqueantes para 008/009

1. Al conectar la ficha, conservar `statusCode` y `Retry-After` en el hook de
   datos y mapear los estados 400/404/429/502 a copy español propio con acción
   de reintento; nunca mostrar `message` crudo.
2. Normalizar el DTO al modelo del cliente (guild/rank, logros, opcionales,
   `lastLogin`) y definir estados vacíos y "no disponible" para `itemLevel: 0`.
3. Tratar un fallo de `/characters` como indisponibilidad del servicio, no como
   sesión caducada; actualizar la expectativa de CU-06 cuando se toque `docs/`.
