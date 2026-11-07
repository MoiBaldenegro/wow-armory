VERDICT: PASS

# Security review — ronda 1

## Hallazgos

- [minor] `wow-armory-server/src/characters/presentation/CharactersController.ts:27-32` — `GET /characters/:realmSlug/:characterName` es público y no tiene rate limiting ni cuota por cliente. Cada petición válida dispara una llamada al perfil de Blizzard (el token sí se reutiliza), por lo que un atacante puede agotar la cuota de la aplicación o saturar el proceso con concurrencia. El rate limiting está explícitamente fuera de alcance (job 010); se documenta como riesgo residual, no bloqueante.
- [minor] `wow-armory-server/src/characters/infrastructure/characters.module.ts:31-35` y `wow-armory-server/src/characters/infrastructure/BlizzardCharacterAdapter.ts:40` — `BLIZZARD_REGION` se interpola directamente en el hostname (`https://${region}.api.blizzard.com`) sin allowlist. El valor proviene de entorno (superficie confiable, no del cliente HTTP), así que no es un SSRF explotable, pero una allowlist (`us|eu|kr|tw|cn`) reduciría el riesgo de mala configuración. No bloqueante.
- [minor] `wow-armory-server/src/characters/infrastructure/ClientCredentialsTokenProvider.ts:87-100` — `expires_in` solo se valida como finito y positivo, sin cota superior; un valor absurdo mantendría el token cacheado mucho más allá de su vida real. El emisor es Blizzard (confiable), por lo que no es accionable dentro de 007, pero conviene acotarlo (p. ej. 24 h) como endurecimiento futuro.
- [minor] `wow-armory-client/.env:1` — existe un `.env` versionado desde `main` (fuera de este diff) que solo contiene `VITE_SERVER_URI` (URL pública, sin secreto). No hay fuga introducida por 007; se deja constancia como higiene no bloqueante (evitar versionar `.env`).

## Verificaciones sin hallazgo

- No hay secretos hardcodeados ni credenciales reales en el código nuevo ni en tests: `ClientCredentialsTokenProvider.spec.ts` usa `client-id`/`client-secret` ficticios y el e2e sustituye `CHARACTER_REPOSITORY` por un fake, sin red real ni secretos.
- El token `client_credentials` se pide en body form-urlencoded, se lee de `ConfigService` (nunca `process.env`) en infraestructura y se cachea en memoria; no se loguea ni se devuelve al cliente. `getAccessToken()` solo se consume como cabecera `Authorization` en `BlizzardCharacterAdapter.ts:47`.
- No hay `console.*` ni `process.env` en `src/characters/domain` ni `src/characters/application`; los errores de Blizzard se traducen a `BlizzardUnavailable`/`BlizzardRateLimited` y el controlador responde mensajes genéricos `400/404/429/502` sin cuerpo crudo, stack ni datos internos (`CharactersController.ts:40-73`).
- Validación previa a cualquier llamada externa: `RealmSlug` (`^[a-z0-9-]{1,64}$`) y `CharacterName` (`^[A-Za-z0-9'-]{1,64}$`) rechazan `/`, `..`, `%`, `?`, espacios, mayúsculas en realm y longitud > 64 sobre el valor ya decodificado por Express; el adaptador además aplica `encodeURIComponent` (`BlizzardCharacterAdapter.ts:40-42`).
- `Retry-After` solo se propaga si es un número finito no negativo (`BlizzardCharacterAdapter.ts:78-89`), y se serializa con `String(number)`, sin posibilidad de inyección de cabeceras.
- La retirada de `src/auth/` es completa: el directorio no existe, `AppModule` importa `CharactersModule` + `IdentityModule`, no quedan referencias a `AuthService`/`AuthModule` y el e2e verifica que `/auth/character/grobbulus/billiemoi` responde `404`.
- Timeouts de 10 s configurados tanto en el endpoint de token como en el de perfil; el fallo de token se propaga como `BlizzardUnavailable` sin llamar a Blizzard.

## Riesgos residuales (no bloqueantes)

- Ausencia de rate limiting/anti-abuso en el endpoint público: se cubrirá en 010.
- Sin allowlist para `BLIZZARD_REGION`/`BLIZZARD_NAMESPACE`.
- Sin cota superior para `expires_in` en la caché del token.
- `.env` del cliente versionado (sin secretos) preexistente en `main`.
