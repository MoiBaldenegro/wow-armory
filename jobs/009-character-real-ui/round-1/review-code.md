VERDICT: PASS

# Code review — ronda 1

Verificación ejecutada en el worktree `wow-armory-wt/009-character-real-ui`
(rama `factory/009-character-real-ui`), en `wow-armory-client/`:

- `npm run lint`: pasa, sin errores.
- `npm test`: 20 archivos y 137 tests, todos pasan.
- `npm run build`: pasa. `npx tsc -p tsconfig.app.json --noEmit` también pasa.
- `grep -rn "mockCharacter\|types/character\|unsplash" src`, `grep -rnE "axios|fetch\(" src/presentation`
  y `grep -rnE "from 'react|axios|react-router" src/domain src/application` no devuelven nada.
- `git diff --stat main...factory/009-character-real-ui -- wow-armory-server` sale vacío.

La verificación que reporta `build.md` es creíble y coincide con la mía.

Lo revisado cumple la spec:

- `SearchCharacter.ts` es puro. `InvalidSearchInput` extiende `CharacterValidation`, así que respeta el contrato de la spec y además da `field`/`reason` para los mensajes en español.
- `parseRetryAfter` limita las fechas a IMF-fixdate, redondea hacia arriba y nunca da negativo.
- `useCharacter` usa `requestKey` y el flag `isCurrent` para descartar las respuestas obsoletas y evitar `setState` tras desmontar. Nunca muestra el personaje anterior: cualquier clave que no coincida da `loading`. Cualquier error que no sea `CharacterError` acaba en `unavailable`.
- Las búsquedas no hacen peticiones HTTP y codifican los segmentos.
- No queda código muerto de `handleSearch`, `StatBar` ni los mocks.

## Hallazgos

- [minor] `wow-armory-client/src/presentation/hooks/useCharacter.ts:89` — el array de dependencias incluye `normalizedRealm`, `normalizedName` y `requestKey`, pero `requestKey` ya contiene los otros dos. No es un error, solo ruido. Se podría dejar `[getCharacter, requestKey]` y leer los valores desde la clave, o dejar `[getCharacter, normalizedRealm, normalizedName, attempt]` y construir la clave dentro del efecto.
- [minor] `wow-armory-client/src/application/character/SearchCharacter.ts:26-38` — `InvalidSearchInput` genera mensajes en inglés. La UI no los muestra porque `searchErrorMessages.ts` los traduce por `field`/`reason`, pero si algún consumidor futuro pinta `error.message`, el texto saldría en inglés. Basta con un comentario que indique que el mensaje es técnico y no va a la UI. No hace falta cambiarlo en este job.
- [minor] `wow-armory-client/src/presentation/pages/ProfilePage.tsx:49,64` — el texto de carga depende solo de `isLoading`. Si `useAuth` vuelve a poner `isLoading` sin que el usuario haya hecho nada (p. ej. al refrescar la sesión), el botón dirá "Iniciando sesión…"/"Cerrando sesión…" sin acción previa. Con el comportamiento actual del provider es aceptable y cumple el criterio. Se anota por si cambia el provider.

## Cambios requeridos

No aplica: el veredicto es PASS.
