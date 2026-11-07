VERDICT: CHANGES

# UX review — ronda 1

## Hallazgos

- [major] `wow-armory-server/src/bootstrap.ts:50-57` — la CORS no declara
  `exposedHeaders`, así que el navegador oculta `Retry-After` a la SPA aunque el
  controlador la escriba (`CharactersController.ts:54`) y el e2e la vea en
  servidor (`test/app.e2e-spec.ts:306`). El cliente consume desde otro origen
  (`AuthProvider.tsx:15-16` usa `VITE_SERVER_URI`; en desarrollo 5173 frente a
  3000), por lo que 008/009 no podrán leer el tiempo de espera del 429 y el
  "reintentar con backoff" de CU-02 quedará a ciegas. Efecto para la persona:
  no se puede mostrar "reintenta en N s" ni respetar la cuota de Blizzard.
- [minor] `wow-armory-server/src/characters/presentation/CharactersController.ts:57-63`
  — el cuerpo del 429 es `{ statusCode, message }`, mientras que los 400/404/502
  de Nest incluyen además `error`. Un manejador genérico que lea `error` o que
  espere una forma uniforme fallará solo en el 429; conviene unificar la forma o
  documentar que la UI debe usar exclusivamente `statusCode`.
- [minor] `wow-armory-server/src/characters/presentation/CharactersController.ts:45,49,60,68`
  — los mensajes son en inglés y con jerga técnica ("rate limit exceeded",
  "temporarily unavailable"). Si 008 pinta `message` directamente, la UI en
  español mostrará texto en inglés; la UI debe mapear el `statusCode` a copy
  propio y no mostrar el mensaje crudo.
- [minor] `wow-armory-client/src/types/character.ts:1-40` frente a
  `character.dto.ts:3-29` — hay desajustes que 008/009 tendrán que normalizar:
  `guild.rank` es `number` en el DTO y `string` ("Guild Master") en el cliente;
  los logros llegan como `achievements[{completedAt?}]` y el cliente espera
  `recentAchievements[{date, description}]`; `spec`, `guild` y `lastLogin` son
  opcionales en el DTO pero obligatorios en el tipo actual; y `lastLogin` pasa
  de fecha corta en el mock ("2024-03-20") a ISO completo. Hoy no rompe nada
  porque ningún componente llama al endpoint, pero la ficha necesitará estados
  para guild/especialización/logros ausentes y formatear `realmSlug`
  ("area-52" → "Area 52").
- [minor] `wow-armory-server/src/characters/presentation/dto/character.dto.ts:24-25`
  — `itemLevel` y `achievementPoints` caen a `0` cuando Blizzard no los envía
  (`BlizzardMapper.ts:118-126`), de modo que `0` significa "desconocido" o
  "valor real" indistintamente. En la ficha conviene tratar `itemLevel: 0` como
  dato no disponible ("—") y no afirmar "0 puntos de logro" si faltaba el dato.
- [minor] `wow-armory-client/src/hooks/useDetails.ts:30-32` — el hook está sin
  uso (no aparece importado en `wow-armory-client/src`) y reduce cualquier fallo
  HTTP a un `Error` genérico, perdiendo `status` y `Retry-After`. Si 008 lo
  reutiliza, no podrá distinguir 400/404/429/502; conviene sustituirlo o
  extenderlo antes de conectar la ficha. Su `withCredentials: true` es
  innecesario para el endpoint público, aunque no rompe.
- [minor] `docs/casos-de-uso.md:162-165` — CU-06 sigue esperando `401 → pedir
  login`, pero el endpoint público no devuelve 401: los 401/403 de Blizzard se
  colapsan en 502. La UI de 008/009 no debe redirigir a login cuando falle
  `/characters`; debe mostrar un error de servicio reintentable.

Nota de verificación: los 400 (validación antes de Blizzard), 404 (personaje
inexistente), 429 y 502 sí son distinguibles por `statusCode`
(`CharactersController.ts:41-70`; e2e `test/app.e2e-spec.ts:282-314`), y el
endpoint responde sin sesión ni cookie. La retirada de `/auth/character` no
rompe expectativas activas: no hay referencias a esa ruta en el cliente y
`useDetails` no está importado en ningún componente. Este job no añade
pantallas ni estados visuales; la revisión se limita al contrato que consumirá
la UI.

## Cambios requeridos

1. Exponer `Retry-After` al navegador en `configureApp`
   (`wow-armory-server/src/bootstrap.ts:50-57`) con
   `exposedHeaders: ['Retry-After']`, y añadir una comprobación e2e con `Origin`
   de otro origen que verifique que `Access-Control-Expose-Headers` incluye
   `Retry-After`; el assert actual del header en servidor no cubre este caso.
2. Para 008/009 (no bloqueante de este job): mapear `statusCode` a copy español
   en la UI, normalizar guild/logros/`spec`/`lastLogin` al modelo del cliente y
   definir los estados vacíos y el tratamiento de `0` como dato desconocido.
