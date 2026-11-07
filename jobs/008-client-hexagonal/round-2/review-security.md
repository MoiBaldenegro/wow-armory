VERDICT: PASS

# Security review — ronda 2

## Hallazgos

- Sin hallazgos nuevos.

Esta ronda solo cambia el commit `9fd3787` (`ProfilePage.tsx`,
`ProfilePage.test.tsx`, `ThemeProvider.tsx`, `ThemeProvider.test.tsx`). Revisión
del delta:

- `wow-armory-client/src/presentation/pages/ProfilePage.tsx:20-27` — la alerta
  muestra `error` de `useAuth()`. Ese valor solo puede ser uno de tres literales
  fijos (`AuthProvider.tsx:66`, `:115`, `:139`), nunca el cuerpo, el mensaje ni
  el stack de la respuesta del servidor ni del error de Axios. Se muestra como
  texto de React (escapado) y no hay `dangerouslySetInnerHTML`. No filtra
  detalles internos ni abre XSS.
- `wow-armory-client/src/presentation/pages/ProfilePage.tsx:45-46,60-61` — los
  botones `disabled` + `aria-busy` mientras `isLoading` es verdadero también
  impiden pedir varias veces `GET /auth/login` o `POST /auth/logout` con clics
  repetidos. Es una mejora menor frente a la ronda 1.
- `wow-armory-client/src/presentation/providers/ThemeProvider.tsx:50-62` —
  `localStorage` sigue guardando solo `wow-armory-theme` con `dark`/`light`, y
  la lectura en `:17-23` sigue validada contra esa lista blanca. No hay datos
  sensibles.
- Tests nuevos (`ProfilePage.test.tsx:70-142`, `ThemeProvider.test.tsx:41`):
  usan dobles en memoria y `new Error('network')`. No usan red real, secretos
  ni credenciales.

Los minors documentados en `round-1/review-security.md` siguen vigentes y no
bloquean (advisories de `react-router-dom@6`, `..` en `HttpCharacterRepository`
fuera del flujo validado, URL de login sin validar el host, `http://` aceptado
en producción en `env.ts`). No se repiten como hallazgos nuevos.
