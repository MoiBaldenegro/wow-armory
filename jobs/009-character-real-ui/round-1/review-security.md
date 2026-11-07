VERDICT: PASS
# Security review — ronda 1

Alcance revisado: `git diff main...factory/009-character-real-ui` (c77920d),
solo `wow-armory-client/`. No hay cambios en `wow-armory-server/`, ni en
`package.json`/`package-lock.json` (sin dependencias nuevas), ni en
`AxiosHttpClient`, `env.ts` o `container.ts` (`baseURL`, `withCredentials` y
timeout intactos).

Comprobado sin problemas:

- Validación de entrada / path traversal: `SearchCharacter.ts:45-78` normaliza y
  valida contra `REALM_SLUG_PATTERN` y `CHARACTER_NAME_PATTERN` (ASCII, sin `.`,
  `/` ni `%`). Además, `useCharacter.ts:62-63` pasa por `GetCharacter.execute`,
  que vuelve a validar antes de llamar al repositorio. Por eso una URL manipulada
  (`/character/..%2F../x`) acaba en `invalid` sin hacer petición. La
  navegación (`SearchBar.tsx:20-24`, `CharacterSearchForm.tsx:66-70`) y el
  repositorio HTTP codifican los segmentos con `encodeURIComponent`. No hay
  SSRF posible desde el cliente: la ruta es relativa a la `baseURL` fija.
- XSS: no hay `dangerouslySetInnerHTML`, `innerHTML`, `<img>` ni `href`
  construidos con datos del servidor o de la URL. Todos los datos del personaje
  y los parámetros de ruta (`CharacterProfilePage.tsx:98`) se renderizan como
  texto en JSX. Además, para llegar a `not-found` los parámetros ya pasaron la
  validación de charset, así que no hay content spoofing útil.
- Exposición de errores internos: `useCharacter.ts:25-45` reduce cualquier error
  a un estado discriminado sin mensaje. La página solo muestra copy fijo en
  español y `retryAfterSeconds` numérico. `toHttpError` sigue sin propagar el
  cuerpo de la respuesta. Hay un test con `CharacterUnavailable('raw server
  body')`.
- `parseRetryAfter` (`HttpError.ts:38-64`): usa regex anclada sin backtracking
  problemático (no hay ReDoS) y el resultado está acotado a `>= 0`. Solo acepta
  IMF-fixdate, así que no depende del parser permisivo de `Date.parse`.
- Sesión/cookies/CSRF/CORS: sin cambios. El endpoint de personajes es público y
  `ProfilePage` solo cambia texto de botones.
- Recursos externos: se eliminaron las imágenes de Unsplash. Los placeholders son
  CSS locales.
- Tests: usan `createTestDependencies`/repositorio en memoria, sin credenciales
  reales ni llamadas de red.

## Hallazgos

- [minor] `wow-armory-client/src/presentation/pages/CharacterProfilePage.tsx:115-122`
  — En el estado `rate-limited`, el botón "Reintentar" está habilitado de
  inmediato aunque se conozca `retryAfterSeconds`. Un usuario puede
  pulsarlo repetidamente y lanzar peticiones que el servidor rechazará con 429.
  El impacto es bajo porque el rate limiting real lo aplica el servidor y cada
  reintento requiere una acción manual. Si se quiere, se puede deshabilitar el
  botón hasta que venza el plazo. El contador regresivo en vivo está fuera de
  alcance según la spec, así que no bloquea.

## Cambios requeridos

Ninguno.
