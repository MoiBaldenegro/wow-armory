# 006-auth-battle-net — Autenticación Battle.net production-ready (vertical slice hexagonal)

## Objetivo

Arreglar el flujo de autenticación con Battle.net de extremo a extremo y usarlo
como primer vertical slice hexagonal del servidor. Al terminar, un visitante
puede iniciar sesión, recargar y seguir autenticado, y cerrar sesión; el error
de OAuth se muestra en el cliente sin exponer tokens. El endpoint de personaje
sigue donde está y se migrará en 007.

## Contexto

- Servidor NestJS 10 + `@nestjs/config` (ya instalado) + `express-session` +
  `cookie-parser` + `axios`. Bootstrap actual en
  `wow-armory-server/src/main.ts` con CORS y cookie hardcodeados y fallback
  inseguro de `SESSION_SECRET`.
- Auth actual en `wow-armory-server/src/auth/`:
  `auth.controller.ts` concentra login, callback, `session-check`, personaje y
  logout; `auth.service.ts` mezcla configuración, axios y negocio; no consume
  `state`, no regenera sesión, no guarda `refresh_token`/`expires_at` y redirige
  a URLs hardcodeadas.
- Tests actuales son boilerplate: `auth.service.spec.ts` y
  `test/app.e2e-spec.ts`.
- Cliente React 18 + Vite 5 + Tailwind: `App.tsx` llama a `useDetail` con URL
  hardcodeada al montar e importa `use` de `framer-motion/client`;
  `useAuth.ts` consulta `/auth/login` (siempre 200); `useDetails.ts` lee
  `document.cookie` y envía `Authorization: Bearer`; `Header.tsx` llama a
  `https://wow-armory.onrender.com` y dice "Iniciar session".
- Arquitectura objetivo y decisiones en `docs/plan-hexagonal-ddd-auth.md`
  (secciones 3, 5 y Fase 1) y contratos en `docs/casos-de-uso.md` (CU-03,
  CU-04, CU-05, CU-07, CU-10, CU-11).

## Criterios de aceptación

### Servidor — arquitectura

- [ ] Existe `wow-armory-server/src/identity/` con `domain/`, `application/`,
      `infrastructure/` y `presentation/`.
- [ ] `domain/` contiene `AuthSession`, `OAuthState`, `AccessToken`,
      `RefreshToken`, errores de dominio y los puertos `OAuthProvider`,
      `SessionRepository` y `TokenProvider`. Ningún archivo de `domain/` importa
      `@nestjs/*`, `express` ni `axios` (verificable por inspección/grep).
- [ ] `application/` contiene `StartLogin`, `CompleteLogin`, `CheckSession`,
      `Logout` y `RefreshToken` como casos de uso independientes de Nest.
- [ ] `infrastructure/` contiene `BattleNetOAuthAdapter` (axios),
      `ExpressSessionRepository` e `identity.module.ts`; `presentation/`
      contiene `AuthController` y DTOs.
- [ ] El `IdentityModule` está registrado en `AppModule`. El controlador legacy
      conserva **solo** `GET /auth/character/:realmSlug/:characterName` (y su
      servicio); no quedan handlers legacy de `login`, `callback`,
      `session-check` ni `logout` que compitan con los nuevos.

### Servidor — contrato HTTP

- [ ] `GET /auth/login` responde `200` con `{ url }`, una URL de
      `https://oauth.battle.net/authorize` con `client_id`, `redirect_uri`,
      `response_type=code`, `scope=wow.profile` y un `state` aleatorio nuevo.
- [ ] `GET /auth/callback` sin `state` o con `state` distinto responde `302` a
      `CLIENT_URL?auth_error=invalid_state`; la comparación usa
      `crypto.timingSafeEqual` (con comprobación previa de longitud) y el
      `state` se consume aunque falle.
- [ ] Reutilizar el mismo `state` en un segundo callback falla con
      `auth_error=invalid_state` (un solo uso).
- [ ] `GET /auth/callback?error=access_denied` responde `302` a
      `CLIENT_URL?auth_error=access_denied` sin canjear código ni guardar tokens.
- [ ] Callback correcto: canjea el código, llama a `req.session.regenerate()`,
      guarda `access_token`, `refresh_token` (si Battle.net lo devuelve) y
      `expires_at`, y responde `302` a `CLIENT_URL` (sin path hardcodeado).
- [ ] Fallo al canjear el código responde `302` a
      `CLIENT_URL?auth_error=auth_failed` sin dejar tokens en sesión.
- [ ] `GET /auth/session` responde `{ authenticated: boolean }`; cuando hay
      sesión válida añade `user?: { battletag?: string }`. Sin sesión responde
      `{ authenticated: false }` con `200`.
- [ ] Si el access token caduca dentro del margen configurado, `CheckSession`
      refresca con `RefreshToken` antes de responder. Si el refresh falla,
      limpia la sesión y responde `{ authenticated: false }`.
- [ ] `POST /auth/logout` destruye la sesión y responde `204` con la cookie de
      sesión limpiada. `GET /auth/logout` ya no responde éxito.
- [ ] `GET /auth/session-check` responde `404`.
- [ ] `GET /auth/character/:realmSlug/:characterName` conserva el
      comportamiento y la ruta actuales (no se mueve en este job).

### Servidor — configuración y seguridad

- [ ] `@nestjs/config` expone `BLIZZARD_CLIENT_ID`, `BLIZZARD_CLIENT_SECRET`,
      `BLIZZARD_REDIRECT_URI`, `BLIZZARD_REGION` (default `us`),
      `BLIZZARD_NAMESPACE` (default `profile-classic-us`), `CLIENT_URL` (default
      `http://localhost:5173`), `CORS_ORIGINS`, `SESSION_SECRET`, `NODE_ENV`,
      `PORT`, `COOKIE_SECURE`, `COOKIE_SAME_SITE` y `COOKIE_DOMAIN`; ningún
      secreto se lee directamente de `process.env` dentro de dominio/aplicación.
- [ ] Con `NODE_ENV=production` y sin `SESSION_SECRET` (o sin las variables de
      Blizzard requeridas) el arranque falla con un error explícito; no existe
      el fallback `'tu-secreto-temporal'`.
- [ ] Cookie de sesión `httpOnly: true`, `secure` según `COOKIE_SECURE`
      (default `true` en producción), `sameSite` según `COOKIE_SAME_SITE`
      (default `lax`), `domain` solo si `COOKIE_DOMAIN` está definido y nombre
      `wow_session`.
- [ ] `trust proxy` activado en producción y CORS con `credentials: true` y
      allowlist parseada de `CORS_ORIGINS` (default `http://localhost:5173`).
- [ ] No hay logs de `access_token`, `refresh_token`, códigos OAuth ni payloads
      completos de Battle.net.

### Servidor — tests

- [ ] Hay tests unitarios para los 5 casos de uso usando puertos falsos (sin
      red), cubriendo camino feliz y errores: `state` inválido/reutilizado,
      `?error=`, fallo de canje, sesión ausente, refresh antes de expirar y
      fallo de refresh, logout/destrucción.
- [ ] Hay test e2e/integración con un `OAuthProvider` falso inyectado (sin
      llamadas de red) que cubre login → callback → session → logout y los
      redirects `?auth_error=`.
- [ ] `cd wow-armory-server && npm test -- --runInBand` pasa.
- [ ] `cd wow-armory-server && npm run test:e2e` pasa.
- [ ] `cd wow-armory-server && npm run lint` pasa.
- [ ] `cd wow-armory-server && npm run build` pasa.

### Cliente

- [ ] Existe `AuthProvider` (p. ej. `src/providers/AuthProvider.tsx`) que
      envuelve la app y expone por contexto `isAuthenticated`, `isLoading`,
      `error`, `user?`, `login` y `logout`.
- [ ] Al montar, `useAuth` consulta `GET ${VITE_SERVER_URI}/auth/session` con
      `withCredentials: true`; `login` llama a `GET /auth/login` con
      `withCredentials` y redirige a `data.url`; `logout` llama a
      `POST /auth/logout` con `withCredentials` y deja el estado no autenticado.
- [ ] `Header.tsx` consume `useAuth` (no `fetch` directo), no contiene la URL
      de Render y muestra "Iniciar sesión" o "Cerrar sesión" según el estado,
      deshabilitando el botón y exponiendo `aria-busy`/texto de carga mientras
      la acción está en curso.
- [ ] `App.tsx` elimina la llamada a `useDetail` con URL hardcodeada, el
      `import { use } from 'framer-motion/client'` y los `console.log`; la
      ficha sigue usando `mockCharacter` hasta 007/009.
- [ ] `useDetails.ts` ya no lee `document.cookie` ni envía
      `Authorization: Bearer`; si se conserva el hook, usa
      `withCredentials: true` y no loguea tokens.
- [ ] `?auth_error=` se muestra como banner simple, accesible (`role="alert"`)
      con mensaje para `access_denied`, `invalid_state`, `auth_failed` y un
      mensaje genérico; después se limpia el parámetro con
      `history.replaceState` sin recargar y sin mostrarse si no existe.
- [ ] No se añade router ni test runner en este job.

### Cliente — verificación

- [ ] `cd wow-armory-client && npm run lint` pasa.
- [ ] `cd wow-armory-client && npm run build` pasa.

## Plan de pruebas

```bash
cd wow-armory-server && npm test -- --runInBand
cd wow-armory-server && npm run test:e2e
cd wow-armory-server && npm run lint
cd wow-armory-server && npm run build
cd wow-armory-client && npm run lint
cd wow-armory-client && npm run build
```

Comprobaciones manuales de revisión (sin red):

- `rg "@nestjs|axios|express" wow-armory-server/src/identity/domain` no
  devuelve resultados.
- `rg "tu-secreto-temporal|wow-armory.onrender.com|document.cookie" wow-armory-server/src wow-armory-client/src`
  no devuelve resultados.
- En el e2e, `GET /auth/session-check` devuelve `404` y
  `GET /auth/character/grobbulus/billiemoi` sigue existiendo.

## Fuera de alcance

- Contexto/dominio de personaje, mapper de Blizzard y `CharactersController`
  (007); el endpoint de personaje no se mueve ni se refactoriza.
- Router, páginas `/profile` y `/error`, y Vitest/Testing Library en el cliente
  (008). El callback redirige a `CLIENT_URL` raíz.
- Búsqueda y datos reales de personaje (009); la ficha sigue con mock.
- Rate limiting (003/010), Redis o store de sesión externo (010), `GET /health`
  (005/010), logs estructurados y `.env.example`.
- Dependencias nuevas, cambios de `AGENTS.md`, `backlog.md`, `factory/`,
  `jobs/`, `docs/` u `opencode.json`.

## Riesgos

- **Cookies cross-site:** `sameSite=none` exige `secure` y los navegadores
  bloquean cookies de terceros. Mitigación: valores por entorno
  (`COOKIE_SAME_SITE`, `COOKIE_DOMAIN`, `COOKIE_SECURE`) y documentar que el
  despliegue real puede necesitar proxy same-site; el default local es `lax`.
- **`MemoryStore` en producción:** las sesiones se pierden al reiniciar. Se
  acepta en este job porque Redis es 010; queda documentado como limitación.
- **Forma de `user`:** la spec no exige `userinfo` de Battle.net. Interpretación
  mínima: `user` es opcional y solo incluye `battletag` si el proveedor lo
  entrega; si no, se omite. No se inventan datos de cuenta.
- **Semántica del refresh en `CheckSession`:** no hay endpoint de personaje que
  lo dispare en este job; se refresca al consultar la sesión con un margen
  corto. Si el refresh falla, se invalida la sesión para no devolver `true` con
  un token muerto.
- **Bootstrap duplicado en e2e:** `main.ts` no se usa al crear la app de test;
  el e2e debe registrar `express-session` + `cookie-parser` o extraer un
  bootstrap reutilizable. Mantener ambos caminos sincronizados.
- **Fallback de configuración:** exigir `SESSION_SECRET` en producción puede
  romper despliegues existentes si la variable no está configurada. Es
  intencional (fail-fast) y debe comprobarse antes de desplegar.
- **Error de OAuth filtrado:** solo se redirigen códigos fijos
  (`access_denied`, `invalid_state`, `auth_failed`), nunca el mensaje crudo de
  Battle.net ni tokens.
