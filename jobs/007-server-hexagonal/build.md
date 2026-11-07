# Build — ronda 1

## Resumen

Se extrajo la consulta de personajes a un bounded context `characters` con
arquitectura hexagonal (`domain` / `application` / `infrastructure` /
`presentation`) y se retiró por completo el legacy `src/auth/`. El nuevo
endpoint público `GET /characters/:realmSlug/:characterName` valida la entrada
en dominio, obtiene un token de aplicación con `client_credentials`, consulta
Blizzard a través de un adaptador con anti-corruption layer y devuelve un
`CharacterDto` estable. `AppModule` compone ahora `CharactersModule` +
`IdentityModule`. El cliente no se ha tocado.

## Cambios

- `wow-armory-server/src/characters/domain/` — agregado `Character`, value
  objects (`CharacterName`, `RealmSlug`, `CharacterClass`, `Race`,
  `Specialization`, `ItemLevel`, `AchievementPoints`), entidades opcionales
  `Guild`/`Achievement`, errores de dominio y puerto `CharacterRepository`.
- `wow-armory-server/src/characters/application/` — `GetCharacterUseCase`
  (valida `RealmSlug`/`CharacterName`, consulta el puerto y lanza
  `CharacterNotFound` ante `null`), puerto `ApplicationTokenProvider` y fakes de
  testing.
- `wow-armory-server/src/characters/infrastructure/` —
  `BlizzardCharacterAdapter`, `BlizzardMapper`, `ClientCredentialsTokenProvider`
  y `characters.module.ts`.
- `wow-armory-server/src/characters/presentation/` — `CharactersController` y
  `dto/character.dto.ts` con el mapeo dominio → DTO.
- `wow-armory-server/src/characters/characters.tokens.ts` — tokens
  `CHARACTER_REPOSITORY` y `CHARACTER_TOKEN_PROVIDER`.
- `wow-armory-server/src/app.module.ts` — importa `CharactersModule` +
  `IdentityModule`; elimina `AuthModule`.
- `wow-armory-server/src/auth/` — eliminados `auth.controller.ts`,
  `auth.service.ts`, `auth.module.ts` y `auth.service.spec.ts`.
- `wow-armory-server/test/app.e2e-spec.ts` — elimina el assert legacy
  `GET /auth/character/... => 401` y añade los e2e de personajes con
  `CHARACTER_REPOSITORY` falso.

## Criterios de aceptación

### Arquitectura y dependencias

- [x] Existe `src/characters/` con `domain/`, `application/`,
      `infrastructure/`, `presentation/` y `characters.module.ts`.
- [x] El dominio contiene el agregado `Character`, los value objects y errores
      pedidos, y el puerto `CharacterRepository.findByRealmAndName(...)`.
- [x] `domain/` no importa `@nestjs/*`, `axios` ni `express`;
      `application/` no lee `process.env` (grep vacío).
- [x] `GetCharacterUseCase` valida, consulta el repositorio y lanza
      `CharacterNotFound` si devuelve `null`; no importa Nest ni Axios.
- [x] `infrastructure/` contiene adaptador, mapper, token provider y módulo;
      `presentation/` contiene controlador y DTO.
- [x] `characters.module.ts` registra controlador, caso de uso, adaptador y
      token provider, y expone el token `CHARACTER_REPOSITORY` (sobrescribible
      en e2e).
- [x] `AppModule` importa `CharactersModule` + `IdentityModule` y no importa
      `AuthModule`.
- [x] `src/auth/` se eliminó completo. No quedan referencias al legacy
      `AuthService`, `AuthModule` ni a la ruta `auth/character`; el
      `AuthController` que permanece pertenece a `identity` (job 006) y no al
      legacy eliminado.

### Contrato HTTP y validación

- [x] `GET /characters/:realmSlug/:characterName` responde `200` con
      `CharacterDto` (`name`, `realmSlug`, `level`, `class`, `race`, `spec?`,
      `itemLevel`, `achievementPoints`, `lastLogin?`, `guild?`,
      `achievements?`).
- [x] `realmSlug` usa `^[a-z0-9-]{1,64}$` y `characterName`
      `^[A-Za-z0-9'-]{1,64}$`; se rechazan `/`, `..`, `%2F`, `%`, `?`,
      espacios y longitudes > 64 sin consultar el repositorio.
- [x] Entrada inválida → `400` con mensaje genérico.
- [x] Blizzard `404` → `CharacterNotFound` → `404`.
- [x] Blizzard `429` → `BlizzardRateLimited` → `429`; `Retry-After` numérico se
      propaga como cabecera.
- [x] `401`/`403`, fallo de token, `5xx`, red/timeout → `BlizzardUnavailable`
      → `502` genérico.
- [x] El controlador no exige sesión ni cookie.
- [x] `GET /auth/character/:realmSlug/:characterName` responde `404`.

### Mapeo anti-corruption

- [x] `BlizzardMapper` mapea nombre, nivel, clase, raza, especialización,
      item level (`equipped_item_level`/`average_item_level`), puntos de logro,
      `last_login_timestamp`, guild y logros cuando están presentes.
- [x] Tolera campos opcionales ausentes sin lanzar ni inventar datos.
- [x] El mapper no depende de Nest/Axios ni registra/devuelve el JSON crudo.

### Configuración y token de aplicación

- [x] `ClientCredentialsTokenProvider` hace `POST` a
      `https://oauth.battle.net/token` con body form-urlencoded
      (`grant_type=client_credentials&client_id=...&client_secret=...`), leyendo
      las credenciales de `ConfigService`.
- [x] El token se cachea en memoria hasta `expires_in - 60 s`, se renueva al
      vencer y se comparte entre peticiones concurrentes; no se loguea.
- [x] El adaptador usa
      `https://{BLIZZARD_REGION}.api.blizzard.com/profile/wow/character/{realmSlug}/{characterName}`
      con `namespace={BLIZZARD_NAMESPACE}`, `locale=en_US` y
      `Authorization: Bearer <token>`.
- [x] Fallos de token o adaptador se traducen a `BlizzardUnavailable`/`502` sin
      filtrar cuerpos de error de Blizzard.

### Tests

- [x] Tests de `RealmSlug`/`CharacterName` (válidos, inválidos, límites,
      caracteres prohibidos) y de `ItemLevel`/`AchievementPoints`.
- [x] Test de `BlizzardMapper` con fixture realista, campos opcionales ausentes,
      guild/logros y `last_login_timestamp`.
- [x] Test de `GetCharacterUseCase`: camino feliz, `null`, entrada inválida sin
      llamada al repositorio y propagación de errores de Blizzard.
- [x] Test de `ClientCredentialsTokenProvider`: primera petición, caché,
      renovación, concurrencia y fallo → error de dominio.
- [x] Test de `BlizzardCharacterAdapter` con axios mockeado para éxito, `404`,
      `429`, `401`/`403`, `5xx`, red y fallo de token.
- [x] `test/app.e2e-spec.ts` cubre `200`, `400`, `404`, `429` con
      `Retry-After`, `502`, `404` en la ruta legacy y la exposición de
      `Retry-After` vía CORS para un origen permitido, sin red real.
- [x] `npm test -- --runInBand` pasa (96 tests).
- [x] `npm run test:e2e` pasa (14 tests).
- [x] `npm run lint` pasa.
- [x] `npm run build` pasa.
- [x] El cliente sigue compilando sin cambios (`lint && build`).

## Verificación

- `cd wow-armory-server && npm test -- --runInBand` → pass (15 suites, 96 tests).
- `cd wow-armory-server && npm run test:e2e` → pass (1 suite, 14 tests).
- `cd wow-armory-server && npm run lint` → pass.
- `cd wow-armory-server && npm run build` → pass.
- `cd wow-armory-client && npm run lint && npm run build` → pass. Aviso no
  bloqueante de `caniuse-lite` desactualizado durante el build de Vite.
- `npx jest --config ./test/jest-e2e.json -t "exposes Retry-After"` sin
  `exposedHeaders` → fail (`access-control-expose-headers` ausente); con
  `exposedHeaders: ['Retry-After']` → pass.
- `grep -rn "@nestjs\|axios\|express" wow-armory-server/src/characters/domain`
  → sin resultados.
- `grep -rn "process.env" wow-armory-server/src/characters/domain wow-armory-server/src/characters/application`
  → sin resultados.
- `grep -rn "AuthService\|AuthController\|AuthModule\|auth/character" wow-armory-server/src wow-armory-server/test`
  → solo `AuthController` de `identity` (job 006) y el e2e que comprueba que
  `/auth/character/grobbulus/billiemoi` devuelve `404`; sin legacy activo.

## Feedback de la ronda

- security: PASS. Se documentan como riesgos residuales el rate limiting del
  endpoint público (010), la falta de allowlist de `BLIZZARD_REGION` y la cota
  superior de `expires_in`; no se tocan en este cambio.
- ux: CHANGES resuelto. `configureApp` declara
  `exposedHeaders: ['Retry-After']` y el e2e comprueba con `Origin`
  `http://localhost:5173` que el 429 devuelve `Access-Control-Allow-Origin`
  correcto y `Access-Control-Expose-Headers` con `Retry-After`. El test se
  verificó en rojo sin el cambio y en verde con él. El resto de minors
  (`statusCode` → copy, normalización de guild/logros/`spec`, estados vacíos,
  `itemLevel: 0`) quedan para 008/009.
- ui: PASS. Sin superficie de UI modificada; recomendaciones de contrato
  derivadas a 009.
- code: PASS. Minors no bloqueantes (token fuera del `try`, `Retry-After`
  vacío, margen configurable, nombres no ASCII) se dejan como riesgos
  residuales.

## Commit

- `bdd56b6` `feat: :sparkles: add hexagonal characters context`
- `2edfaf3` `fix: :bug: expose retry-after to cors clients`
