VERDICT: PASS

# Code review — ronda 1

## Hallazgos

- [minor] `wow-armory-server/src/characters/infrastructure/BlizzardCharacterAdapter.ts:38` — la obtención del token queda fuera del `try`; como `ApplicationTokenProvider` solo lanza `BlizzardUnavailable` hoy, el comportamiento es correcto y los tests lo cubren, pero un fallo no domain-typed de una implementación futura escaparía como `500`. No bloquea.
- [minor] `wow-armory-server/src/characters/infrastructure/BlizzardCharacterAdapter.ts:85-88` — `parseRetryAfter` usa `Number(rawValue)`, por lo que una cabecera vacía (`''`) o `null` se interpretaría como `0` y se propagaría `Retry-After: 0`. Es un caso improbable y no exigido por la spec; considerar comprobar primero que el valor sea string no vacío.
- [minor] `wow-armory-server/src/characters/infrastructure/ClientCredentialsTokenProvider.ts:9` — `DEFAULT_TOKEN_REFRESH_MARGIN_SECONDS` se exporta pero el módulo no conecta `TOKEN_REFRESH_MARGIN_MS` (que ya existe en `env.validation.ts` y usa `IdentityModule`). La spec fija 60 s, así que es consistencia futura, no un defecto.
- [minor] `wow-armory-server/src/characters/infrastructure/BlizzardMapper.ts:92` — el nombre devuelto por Blizzard se revalida con el regex ASCII de entrada (`CharacterName.create`); cualquier nombre no ASCII se convertiría en `502`. Es coherente con el riesgo asumido en la spec (el endpoint ya rechaza esos nombres en la petición), pero conviene recordarlo si se amplía el regex.

Observaciones de verificación (sin hallazgos bloqueantes):

- Arquitectura y dependencias limpias comprobadas: `domain/` no importa `@nestjs`, `axios` ni `express`; `domain/` y `application/` no leen `process.env`; no hay `any` nuevo ni `console.*` en `characters/`.
- Retirada del legacy completa: `src/auth/` no existe, `AppModule` compone `CharactersModule` + `IdentityModule` y el e2e verifica `404` en `/auth/character/...`.
- Contrato y errores correctos: validación en el caso de uso antes del puerto, `400`/`404`/`429` con `Retry-After`/`502` genérico, sin sesión y sin filtrar cuerpos de Blizzard.
- `BlizzardMapper`, token provider (form-urlencoded, caché con margen de 60 s, concurrencia) y adaptador (URL/namespace/locale, `Bearer`, 404/429/401/403/5xx/red) cumplen la spec y están cubiertos con mocks, sin red real.
- Verificación ejecutada: `npm test -- --runInBand` → 15 suites / 96 tests OK; `npm run test:e2e` → 13 tests OK; `npm run build` OK. El lint directo sin `--fix` solo reporta CRLF en todo el checkout de Windows (ruido de entorno, no del cambio); no se ejecutó `npm run lint` para no mutar archivos.
- Alcance y commits: un único commit `bdd56b6` solo con producto; sin cambios en cliente, dependencias ni artefactos de fábrica (`jobs/`, `factory/`, `build.md` untracked).
