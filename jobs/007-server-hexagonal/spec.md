# 007-server-hexagonal — Contexto `characters` hexagonal y retirada del legacy de auth

## Objetivo

Extraer la consulta de personajes a un bounded context `characters` con
arquitectura hexagonal, de forma que el endpoint público
`GET /characters/:realmSlug/:characterName` devuelva un DTO estable y tipado
obtenido con `client_credentials` de Blizzard. Al terminar, el código legacy de
personaje en `auth` desaparece, `AppModule` compone `CharactersModule` +
`IdentityModule` y el cliente sigue compilando sin cambios.

## Contexto

- Servidor NestJS 10 + `@nestjs/config` + `axios`; el bootstrap y la sesión
  viven en `wow-armory-server/src/main.ts` y `src/bootstrap.ts`.
- `IdentityModule` (`src/identity/infrastructure/identity.module.ts`) ya es el
  composition root de auth y exporta `TOKEN_PROVIDER` (token de usuario de
  sesión). Este job **no** lo modifica; los personajes usan un token de
  aplicación distinto (`client_credentials`).
- Legacy a eliminar: `src/auth/auth.controller.ts` (solo
  `GET /auth/character/:realmSlug/:characterName`), `auth.service.ts` (axios a
  Blizzard con `process.env` vía `ConfigService`, errores opacos), `auth.module.ts`
  y `auth.service.spec.ts`. `AppModule` los importa hoy.
- `src/config/env.validation.ts` ya expone `BLIZZARD_REGION` (default `us`),
  `BLIZZARD_NAMESPACE` (default `profile-classic-us`) y
  `BLIZZARD_CLIENT_ID`/`BLIZZARD_CLIENT_SECRET`; no se añaden variables nuevas.
- `test/app.e2e-spec.ts` contiene el assert legacy
  `GET /auth/character/... => 401` que debe desaparecer. Los fakes de auth
  viven en `src/identity/application/testing/fakes.ts`.
- El contrato que consume la UI está en
  `wow-armory-client/src/types/character.ts` y `src/data/mockCharacter.ts`; el
  DTO de este job no necesita copiar `stats`, `avatar`, `bannerImage` ni
  `playTime` (eso es 008/009). El cliente no se toca.
- Plan de referencia: `docs/plan-hexagonal-ddd-auth.md` secciones 3, 5 y Fase 2;
  casos CU-01, CU-02, CU-06 y CU-14 en `docs/casos-de-uso.md`.

## Criterios de aceptación

### Arquitectura y dependencias

- [ ] Existe `wow-armory-server/src/characters/` con `domain/`, `application/`,
      `infrastructure/`, `presentation/` y `characters.module.ts`.
- [ ] `domain/` contiene el agregado `Character`, al menos los value objects
      `CharacterName`, `RealmSlug`, `CharacterClass`, `Race`, `Specialization`,
      `ItemLevel` y `AchievementPoints`, los errores `InvalidCharacterName`,
      `InvalidRealmSlug`, `CharacterNotFound`, `BlizzardUnavailable` y
      `BlizzardRateLimited`, y el puerto `CharacterRepository` con
      `findByRealmAndName(realm: RealmSlug, name: CharacterName): Promise<Character | null>`.
- [ ] Ningún archivo de `src/characters/domain/` importa `@nestjs/*`, `axios` ni
      `express` (verificable con grep). Tampoco `src/characters/application/`
      lee `process.env`.
- [ ] `application/GetCharacterUseCase` valida `realm` y `name`, consulta
      `CharacterRepository` y devuelve `Character`; si el puerto devuelve
      `null`, lanza `CharacterNotFound`. No importa Nest ni Axios.
- [ ] `infrastructure/` contiene `BlizzardCharacterAdapter` (implementa
      `CharacterRepository` con axios), `BlizzardMapper` (JSON de Blizzard →
      dominio), `ClientCredentialsTokenProvider` y `characters.module.ts`.
      `presentation/` contiene `CharactersController` y
      `presentation/dto/character.dto.ts`.
- [ ] `characters.module.ts` registra el controlador, el caso de uso, el
      adaptador/token provider y expone un token de DI para el repositorio
      (`CHARACTER_REPOSITORY`) que los tests e2e puedan sobrescribir.
- [ ] `AppModule` importa `CharactersModule` e `IdentityModule` y **no**
      importa `AuthModule`.
- [ ] Se elimina `wow-armory-server/src/auth/` completo (controlador, servicio,
      módulo y spec) y no queda ninguna referencia a `AuthService`,
      `AuthController` o `AuthModule` en `src/` ni en `test/`.

### Contrato HTTP y validación

- [ ] `GET /characters/:realmSlug/:characterName` responde `200` con un
      `CharacterDto` estable con esta forma mínima:
      `{ name, realmSlug, level, class, race, spec?, itemLevel,
      achievementPoints, lastLogin?, guild?, achievements? }`.
      `lastLogin` es ISO 8601; `guild` es
      `{ name, realm?, rank?, memberCount? }`; `achievements` es un array de
      `{ id?, name, points?, completedAt? }`.
- [ ] `realmSlug` se valida como `^[a-z0-9-]{1,64}$` y `characterName` como
      `^[A-Za-z0-9'-]{1,64}$`. Se rechaza cualquier valor con `/`, `..`,
      `%2F`, `%`, `?`, espacios o longitud superior a 64, sin consultar a
      Blizzard.
- [ ] Entrada inválida responde `400` con un mensaje genérico de validación,
      sin stack, sin cuerpo crudo de Blizzard y sin secretos.
- [ ] Blizzard `404` se traduce en `CharacterNotFound` → `404`.
- [ ] Blizzard `429` se traduce en `BlizzardRateLimited` → `429`; si el
      upstream envía `Retry-After` numérico, se propaga como cabecera
      `Retry-After` de la respuesta.
- [ ] Blizzard `401`/`403`, fallo al obtener el token de aplicación, `5xx` de
      Blizzard y errores de red/timeout se traducen en
      `BlizzardUnavailable` → `502` con mensaje genérico; nunca `500` con
      stack ni cuerpo crudo.
- [ ] El controlador no requiere sesión ni cookie para responder (consulta
      pública con `client_credentials`).
- [ ] `GET /auth/character/:realmSlug/:characterName` responde `404` tras el
      cambio.

### Mapeo anti-corruption

- [ ] `BlizzardMapper` mapea al menos: `name`, `level`, `character_class.name`,
      `race.name`, `active_spec.name`, `equipped_item_level` o
      `average_item_level` como `itemLevel`, `achievement_points`,
      `last_login_timestamp`, `guild` (`name`, `realm.name`, `rank`,
      `member_count`) y `achievements` si el payload los trae.
- [ ] El mapper tolera campos opcionales ausentes (`active_spec`, guild,
      logros, item level, `achievement_points`, `last_login_timestamp`) sin
      lanzar y sin inventar datos: los omite o usa `0`/`undefined` según el
      DTO.
- [ ] El mapper no depende de Nest ni Axios y no registra ni devuelve el JSON
      crudo de Blizzard.

### Configuración y token de aplicación

- [ ] `ClientCredentialsTokenProvider` hace `POST` a
      `https://oauth.battle.net/token` con
      `Content-Type: application/x-www-form-urlencoded` y body
      `grant_type=client_credentials&client_id=...&client_secret=...`, leídas
      de `ConfigService`; no lee `process.env` directamente.
- [ ] El token se cachea en memoria y se reutiliza hasta `expires_in` menos un
      margen de 60 s; al vencer se solicita uno nuevo. No se loguea ni se
      expone el token.
- [ ] El adaptador construye la URL
      `https://{BLIZZARD_REGION}.api.blizzard.com/profile/wow/character/{realmSlug}/{characterName}`
      con `namespace={BLIZZARD_NAMESPACE}` y `locale=en_US`, usando
      `Authorization: Bearer <token de aplicación>`.
- [ ] Un fallo del token o del adaptador produce `BlizzardUnavailable` y el
      `502` descrito arriba; no se filtran cuerpos de error de Blizzard.

### Tests

- [ ] Hay tests unitarios de `RealmSlug`/`CharacterName` (válidos, inválidos,
      límites de longitud, caracteres prohibidos) e `ItemLevel`/
      `AchievementPoints` si se implementan como value objects.
- [ ] Hay test unitario de `BlizzardMapper` con un fixture JSON realista
      (campos anidados) y casos de campos ausentes, guild/logros opcionales y
      `last_login_timestamp`.
- [ ] Hay test unitario de `GetCharacterUseCase` con un `CharacterRepository`
      falso: camino feliz, `null` → `CharacterNotFound`, entrada inválida que
      no llega al repositorio, y propagación de `BlizzardRateLimited`/
      `BlizzardUnavailable`.
- [ ] Hay test unitario de `ClientCredentialsTokenProvider` (HTTP falso): primera
      petición, reutilización desde caché y renovación al expirar; fallo → error
      de dominio.
- [ ] Hay test unitario del adaptador con axios mockeado para `404`, `429`,
      `5xx` y error de red (sin red real).
- [ ] `test/app.e2e-spec.ts` ya no contiene el assert legacy de
      `/auth/character` y existe un e2e/integración de personajes que, con un
      `CharacterRepository` falso, cubre: `200` con DTO, `400` por entrada
      inválida, `404`, `429` con `Retry-After`, y `404` en
      `/auth/character/grobbulus/billiemoi`. El e2e no hace llamadas reales a
      Blizzard ni usa secretos reales.
- [ ] `cd wow-armory-server && npm test -- --runInBand` pasa.
- [ ] `cd wow-armory-server && npm run test:e2e` pasa.
- [ ] `cd wow-armory-server && npm run lint` pasa.
- [ ] `cd wow-armory-server && npm run build` pasa.
- [ ] El cliente no se modifica y `cd wow-armory-client && npm run lint && npm run build`
      sigue pasando.

## Plan de pruebas

```bash
cd wow-armory-server && npm test -- --runInBand
cd wow-armory-server && npm run test:e2e
cd wow-armory-server && npm run lint
cd wow-armory-server && npm run build
cd wow-armory-client && npm run lint && npm run build
```

Comprobaciones de dependencias (desde la raíz):

```bash
grep -rn "@nestjs\|axios\|express" wow-armory-server/src/characters/domain
grep -rn "process.env" wow-armory-server/src/characters/domain wow-armory-server/src/characters/application
grep -rn "AuthService\|AuthController\|AuthModule\|auth/character" wow-armory-server/src wow-armory-server/test
```

Las dos primeras deben salir vacías (o solo comentarios justificados); la
última no debe encontrar referencias activas al legacy.

## Fuera de alcance

- Búsqueda por nombre/autocompletado (`009`), router/UI real del cliente
  (`008`/`009`) y cambio de `wow-armory-client/src/types/character.ts`.
- Rate limiting (`010`), `/health` (`005`/`010`), Redis, cache distribuida y
  sesión persistente.
- Refresh del token de usuario para personajes: este endpoint usa
  `client_credentials` público.
- Multi-región/namespace desde la UI; solo configuración del servidor.
- Media/avatar/banner, estadísticas detalladas y tiempo de juego.
- Modificar `docs/`, `backlog.md`, `AGENTS.md`, `factory/`, `jobs/`,
  `.opencode/`, `opencode.json` o `.env`.
- Añadir dependencias nuevas.

## Riesgos

- **Item level y logros no siempre vienen en el resumen de perfil.** La API de
  Blizzard reparte equipo y logros en endpoints adicionales. Interpretación
  conservadora: mapear solo lo que traiga el mismo payload
  (`equipped_item_level`/`average_item_level`, `achievement_points`,
  `achievements` si existe), sin llamadas extra; lo ausente queda opcional o a
  `0`. Completarlo será trabajo de `009`.
- **Códigos 401/403 y 5xx.** El enunciado admite `502`/`503`; se elige `502`
  de forma determinista para todos los fallos de upstream/token. Si el revisor
  prefiere `503` para indisponibilidad, debe aplicarse de forma consistente y
  actualizar los tests.
- **Nombres con acentos u otros alfabetos.** El regex ASCII pedido rechaza
  personajes como `José`; se mantiene por ser la interpretación más pequeña.
  Si se necesita soporte real, ampliar el regex y sus tests en otro job.
- **Codificación de rutas (`%2F`, `..`).** Express puede decodificar el parámetro
  antes de validarlo; la validación debe aplicarse al valor ya decodificado y
  rechazar explícitamente `/`, `..` y `%` para evitar path traversal.
- **Caché de token concurrente.** Varias peticiones simultáneas podrían lanzar
  varias peticiones al endpoint de token. No es obligatorio, pero se recomienda
  cachear la promesa en vuelo para evitar duplicados.
- **Tokens/secretos en logs.** Cualquier `console.log` del adaptador o del token
  provider debe eliminarse; los errores HTTP deben devolver mensajes genéricos.
  Revisar que los tests no impriman credenciales.
- **Retirada del módulo legacy.** Borrar `auth/` puede dejar imports rotos;
  el build y el grep de referencias son la red de seguridad.
