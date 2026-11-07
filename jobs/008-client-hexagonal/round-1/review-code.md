VERDICT: PASS

# Code review — ronda 1

Verificación local reproducida en `factory/008-client-hexagonal` (commit `23d43e3`):
`npm run lint` limpio, `npm test` con 15 archivos y 72 tests en verde, y `npm run build`
correcto. Los greps de arquitectura del plan de pruebas salen limpios: dominio y
aplicación sin React, Axios, router, `import.meta.env` ni `window`;
`VITE_SERVER_URI` solo aparece en `infrastructure/config/env.ts`; no queda ninguna
URL de Render ni `console.log`; no hay Axios ni `fetch` en `presentation/`; no hay
`any` nuevo; el diff de `wow-armory-server/` está vacío. El contenido legacy está
migrado, `App.tsx` se eliminó y `main.tsx` monta
`StrictMode > UseCasesProvider > ThemeProvider > AuthProvider > AppRouter`.

Contratos revisados frente a la spec, todos correctos: puertos, errores de
dominio, validación previa en `GetCharacter`, mapeo 404/400/429/5xx/red en
`HttpCharacterRepository`, 4xx frente a red/5xx en `HttpAuthRepository`,
`HttpError` sin el cuerpo crudo, mapper tolerante a ISO inválido y `env.ts` como
función pura. `AuthProvider` conserva su API, el manejo de `pageshow` y la guarda
de desmontaje (también funciona con el doble montaje de `StrictMode`). Los tests
usan fakes y cubren los criterios con aserciones reales.

## Hallazgos

- [minor] `wow-armory-client/src/presentation/providers/ThemeProvider.tsx:45-53` — el efecto guarda el tema en `localStorage` ya en el primer render, aunque venga de `prefers-color-scheme`. A partir de ahí, la preferencia del sistema operativo queda congelada como si el usuario la hubiera elegido. Cumple la spec ("persiste la elección"), pero lo más limpio es persistir solo desde `toggleTheme`. Opcional.
- [minor] `wow-armory-client/package.json:35` — `jsdom@^31.0.0` exige Node `^22.22.2 || ^24.15.0 || >=26` (según `package-lock.json`). Con Node 20 o un Node 22 antiguo, la suite no arrancaría en CI o en otro equipo. Conviene fijar una versión con soporte de Node más amplio (por ejemplo, la línea `^25` que usa Vitest 2) o documentar el requisito de Node. Opcional.
- [minor] `wow-armory-client/src/infrastructure/http/HttpError.ts:29-36` — `parseRetryAfter` solo acepta segundos; si `Retry-After` llega como fecha HTTP, devuelve `undefined`. Hoy el servidor envía segundos, así que no bloquea. Habría que tenerlo en cuenta en `009` al mostrar el contador.
- [minor] `wow-armory-client/src/presentation/router/AppRouter.tsx:25` — React Router v6 emite en cada test avisos de las flags futuras `v7_startTransition` y `v7_relativeSplatPath`, y ese ruido tapa la salida de la suite. Se puede activar `future={{ v7_startTransition: true, v7_relativeSplatPath: true }}` en `BrowserRouter` y `MemoryRouter`. Opcional.
