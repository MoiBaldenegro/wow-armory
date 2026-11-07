# Casos de uso — wow-armory

> Documento de casos de uso a grandes rasgos.
> Última actualización: 2026-11-06.
> Complementa a `docs/contexto-aplicacion.md`.

Este documento describe **qué hace** la aplicación hoy, **qué debería hacer**
y **dónde vivirá cada caso de uso** cuando se apliquen arquitectura hexagonal y
DDD. No es una spec de implementación; es el mapa funcional que guiará las
specs de la fábrica.

## 1. Actores

| Actor | Descripción |
| --- | --- |
| **Visitante** | Persona no autenticada que abre la web. |
| **Jugador** | Persona que inicia sesión con su cuenta de Battle.net. |
| **Battle.net / Blizzard** | Sistema externo que autoriza y provee los datos del personaje. |
| **Operador** | Persona que configura variables de entorno, despliega y monitoriza. |

## 2. Resumen de casos de uso

| ID | Caso de uso | Actor | Estado actual |
| --- | --- | --- | --- |
| CU-01 | Ver ficha de personaje | Visitante | ⚠️ Solo mock |
| CU-02 | Buscar personaje por reino y nombre | Visitante | ❌ Sin implementar |
| CU-03 | Iniciar sesión con Battle.net | Visitante | ⚠️ Parcial |
| CU-04 | Procesar callback OAuth | Battle.net + Servidor | ⚠️ Parcial |
| CU-05 | Verificar sesión activa | Jugador | ⚠️ Endpoint sin uso |
| CU-06 | Obtener datos reales de un personaje | Jugador | ❌ Roto |
| CU-07 | Cerrar sesión | Jugador | ⚠️ Endpoint sin UI |
| CU-08 | Cambiar tema claro/oscuro | Visitante/Jugador | ✅ |
| CU-09 | Ver logros recientes | Visitante/Jugador | ⚠️ Solo mock |
| CU-10 | Manejar errores de autenticación | Visitante | ❌ Sin implementar |
| CU-11 | Mantener la sesión y refrescar el token | Jugador | ❌ Sin implementar |
| CU-12 | Consultar un personaje público sin login | Visitante | ❌ Sin implementar (opcional) |
| CU-13 | Ver el perfil propio | Jugador | ❌ Sin ruta |
| CU-14 | Operar y desplegar la app | Operador | ⚠️ Parcial |

## 3. Casos de uso detallados

### CU-01 — Ver ficha de personaje

- **Actor:** Visitante.
- **Objetivo:** Ver una ficha con banner, nivel, clase, raza, especialización,
  estadísticas, guild y logros.
- **Precondiciones:** Ninguna.
- **Flujo principal:**
  1. El usuario abre la aplicación.
  2. La app muestra la ficha del personaje.
  3. El usuario puede cambiar el tema.
- **Flujo alternativo:** Si no hay personaje seleccionado, se muestra un
  estado vacío con un buscador.
- **Estado actual:** La UI existe y pinta `mockCharacter`; no hay estado
  vacío ni selección real.
- **Destino hexagonal/DDD:**
  - Dominio: agregado `Character` (entidad + value objects).
  - Aplicación: `GetCharacterProfileUseCase`.
  - Infraestructura: `BlizzardCharacterAdapter` (implementa
    `CharacterRepository`).
  - Presentación: página `CharacterProfilePage` + componentes de solo
    lectura.

### CU-02 — Buscar personaje por reino y nombre

- **Actor:** Visitante.
- **Objetivo:** Encontrar un personaje introduciendo reino y nombre (o solo
  nombre con autocompletado).
- **Precondiciones:** Ninguna.
- **Flujo principal:**
  1. El usuario escribe en el buscador.
  2. La app valida el formato (`realmSlug`, `characterName`).
  3. La app consulta el personaje.
  4. La app navega a la ficha o muestra resultados.
- **Flujos alternativos:**
  - Entrada inválida → mensaje de validación.
  - Personaje no encontrado (404) → estado vacío con sugerencia.
  - Error de red o cuota (429) → mensaje reintentable.
- **Estado actual:** `SearchBar` solo hace `console.log`; no hay navegación ni
  consulta.
- **Destino:**
  - Dominio: value objects `RealmSlug`, `CharacterName`.
  - Aplicación: `SearchCharacterUseCase`.
  - Infraestructura: adaptador de Blizzard + router.
  - Presentación: `SearchBar` conectado a un caso de uso.

### CU-03 — Iniciar sesión con Battle.net

- **Actor:** Visitante.
- **Objetivo:** Autorizar la app con la cuenta de Battle.net.
- **Precondiciones:** La app tiene `client_id`, `client_secret`,
  `redirect_uri` y `scope=wow.profile` configurados.
- **Flujo principal:**
  1. El usuario pulsa "Iniciar sesión".
  2. El cliente pide al servidor la URL de autorización.
  3. El servidor genera un `state`, lo guarda en la sesión y devuelve la URL.
  4. El cliente redirige al usuario a Battle.net.
  5. El usuario autoriza.
  6. Battle.net redirige al callback (CU-04).
- **Flujos alternativos:**
  - El usuario cancela → Battle.net devuelve `?error=access_denied`; la app
    muestra un error claro.
  - Faltan variables de entorno → el servidor responde `500` con un error
    explícito (no un redirect silencioso).
- **Estado actual:** Parcial. `Header.login` funciona con una URL hardcodeada;
  `useAuth` consulta el endpoint equivocado.
- **Destino:**
  - Dominio: `AuthSession` (estado), `OAuthState` (value object).
  - Aplicación: `StartLoginUseCase`.
  - Infraestructura: `BattleNetOAuthAdapter`.
  - Presentación: botón de login + `AuthProvider`.

### CU-04 — Procesar callback OAuth

- **Actor:** Battle.net + Servidor.
- **Objetivo:** Canjear el `code` por tokens y establecer una sesión segura.
- **Precondiciones:** Existe un `state` válido en la sesión.
- **Flujo principal:**
  1. El servidor recibe `GET /auth/callback?code=...&state=...`.
  2. Compara `state` en tiempo constante y lo consume.
  3. Canjea el `code` por `access_token`, `refresh_token`, `expires_in`.
  4. Regenera la sesión (anti session fixation).
  5. Guarda tokens y expiración en la sesión.
  6. Redirige a la URL del cliente configurada (`CLIENT_URL/profile`).
- **Flujos alternativos:**
  - `state` inválido o ausente → error `invalid_state`.
  - `code` inválido o expirado → error `auth_failed`.
  - Error de red con Battle.net → error reintentable.
- **Estado actual:** Parcial. No consume el `state`, no regenera la sesión, no
  guarda `refresh_token`/`expires_at` y redirige a una URL hardcodeada.
- **Destino:** `CompleteLoginUseCase` + `BattleNetOAuthAdapter` +
  `SessionRepository` (puerto).

### CU-05 — Verificar sesión activa

- **Actor:** Jugador.
- **Objetivo:** Saber si hay una sesión válida al cargar la app.
- **Precondiciones:** Ninguna.
- **Flujo principal:**
  1. El cliente llama a `GET /auth/session-check` con credenciales.
  2. El servidor responde `{ authenticated: boolean, user?: ... }`.
  3. El cliente muestra el estado correspondiente.
- **Flujos alternativos:**
  - Token expirado → `authenticated: false` (o intento de refresh, CU-11).
- **Estado actual:** El endpoint existe, pero el cliente no lo usa; `useAuth`
  llama a `/auth/login`.
- **Destino:** `CheckSessionUseCase` + `AuthProvider` en el cliente.

### CU-06 — Obtener datos reales de un personaje

- **Actor:** Jugador.
- **Objetivo:** Obtener la ficha real desde la API de Blizzard.
- **Precondiciones:** Sesión válida o token de aplicación disponible.
- **Flujo principal:**
  1. El cliente pide `GET /characters/:realmSlug/:characterName`.
  2. El servidor valida la entrada.
  3. El servidor obtiene un token válido (sesión o client credentials).
  4. El servidor llama a Blizzard.
  5. El servidor mapea la respuesta a un DTO de dominio.
  6. El cliente mapea el DTO a su modelo de presentación.
- **Flujos alternativos:**
  - `401` → pedir login de nuevo.
  - `404` → personaje no encontrado.
  - `429` → reintentar con backoff.
  - `5xx` → error genérico reintentable.
- **Estado actual:** Roto. El cliente lee una cookie inexistente, el servidor
  ignora el header y devuelve JSON crudo sin mapear.
- **Destino:**
  - Dominio: `Character` + value objects + `CharacterRepository` (puerto).
  - Aplicación: `GetCharacterUseCase`.
  - Infraestructura: `BlizzardCharacterAdapter` + `TokenProvider`.
  - Presentación: `useCharacter` / `CharacterProfilePage`.

### CU-07 — Cerrar sesión

- **Actor:** Jugador.
- **Objetivo:** Invalidar la sesión y limpiar cookies.
- **Precondiciones:** Sesión activa.
- **Flujo principal:**
  1. El usuario pulsa "Cerrar sesión".
  2. El cliente llama a `POST /auth/logout`.
  3. El servidor destruye la sesión y limpia la cookie.
  4. El cliente vuelve al estado de visitante.
- **Estado actual:** El endpoint existe (`GET /auth/logout`), pero no hay UI y
  debería ser `POST` para no ser cacheable/prefetchable.
- **Destino:** `LogoutUseCase` + `SessionRepository` + botón en el header.

### CU-08 — Cambiar tema claro/oscuro

- **Actor:** Visitante/Jugador.
- **Objetivo:** Alternar entre tema claro y oscuro.
- **Precondiciones:** Ninguna.
- **Flujo principal:** El usuario pulsa el toggle; se actualiza la clase
  `dark` en `<html>` y el estado visual.
- **Estado actual:** ✅ Funciona, pero el estado no persiste entre recargas.
- **Destino:** `ThemeProvider` en presentación (no es dominio).

### CU-09 — Ver logros recientes

- **Actor:** Visitante/Jugador.
- **Objetivo:** Ver los logros recientes del personaje.
- **Precondiciones:** Hay datos de personaje.
- **Flujo principal:** La ficha muestra los logros con nombre, descripción,
  puntos y fecha.
- **Estado actual:** ⚠️ Funciona con mock; no hay datos reales.
- **Destino:** Parte del agregado `Character` o un submodelo
  `Achievement` dentro del mismo bounded context.

### CU-10 — Manejar errores de autenticación

- **Actor:** Visitante.
- **Objetivo:** Entender qué falló y poder reintentar.
- **Flujos:** `access_denied`, `invalid_state`, `auth_failed`, sesión
  expirada, error de red.
- **Estado actual:** ❌ El servidor redirige a `/error?message=...` en
  producción, pero el cliente no tiene esa ruta ni componente.
- **Destino:** `ErrorPage` + errores tipados en el dominio.

### CU-11 — Mantener la sesión y refrescar el token

- **Actor:** Jugador.
- **Objetivo:** No tener que volver a iniciar sesión cada vez que caduca el
  access token.
- **Precondiciones:** Existe `refresh_token`.
- **Flujo principal:**
  1. Antes de llamar a Blizzard, el servidor comprueba `expires_at`.
  2. Si expiró, usa `refresh_token` para obtener uno nuevo.
  3. Actualiza la sesión y continúa.
- **Flujos alternativos:** El refresh falla → sesión inválida, pedir login.
- **Estado actual:** ❌ No se guarda ni se usa el refresh token.
- **Destino:** `TokenProvider` (puerto) + `RefreshTokenUseCase` +
  `BattleNetOAuthAdapter`.

### CU-12 — Consultar un personaje público sin login (opcional)

- **Actor:** Visitante.
- **Objetivo:** Ver la ficha de cualquier personaje sin cuenta.
- **Precondiciones:** Token de aplicación (`client_credentials`) válido.
- **Flujo principal:** Igual que CU-06, pero con un token de aplicación en
  lugar del token de usuario.
- **Estado actual:** ❌ No existe.
- **Destino:** `ClientCredentialsTokenProvider` (adaptador) y
  `GetPublicCharacterUseCase`. Decidir si el producto lo quiere.

### CU-13 — Ver el perfil propio

- **Actor:** Jugador.
- **Objetivo:** Ver los personajes de su cuenta o su perfil.
- **Precondiciones:** Sesión válida.
- **Flujo principal:** El usuario entra en `/profile` y ve su información.
- **Estado actual:** ❌ El callback redirige a `/profile`, pero no existe la
  ruta ni la pantalla.
- **Destino:** `ProfilePage` + `GetCurrentUserUseCase`.

### CU-14 — Operar y desplegar la app

- **Actor:** Operador.
- **Objetivo:** Configurar entornos, desplegar y diagnosticar.
- **Flujo principal:**
  1. Configura variables de entorno del servidor y del cliente.
  2. Registra la redirect URI en Battle.net.
  3. Despliega el servidor (Render) y el cliente (Cloudflare Pages).
  4. Verifica `/health` y logs.
- **Estado actual:** ⚠️ Existen despliegues, pero no hay `/health`, no hay
  `.env.example` del servidor y las URLs están hardcodeadas.
- **Destino:** `HealthModule` (infraestructura) + configuración validada con
  `@nestjs/config`.

## 4. Trazabilidad: caso de uso → código actual → destino

| Caso | Código actual | Destino propuesto |
| --- | --- | --- |
| CU-01 | `App.tsx`, `mockCharacter.ts`, `CharacterBanner`, `CharacterCard` | `presentation/character/CharacterProfilePage` |
| CU-02 | `Header/SearchBar.tsx` | `presentation/search/SearchBar` + `application/SearchCharacterUseCase` |
| CU-03 | `Header.tsx` (`login`), `auth.controller.ts` (`/login`) | `application/StartLoginUseCase` + `infrastructure/BattleNetOAuthAdapter` |
| CU-04 | `auth.controller.ts` (`/callback`), `auth.service.ts` | `application/CompleteLoginUseCase` + `SessionRepository` |
| CU-05 | `auth.controller.ts` (`/session-check`), `hooks/useAuth.ts` | `application/CheckSessionUseCase` + `AuthProvider` |
| CU-06 | `hooks/useDetails.ts`, `auth.service.ts` (`getCharacterData`) | `domain/Character` + `application/GetCharacterUseCase` + `BlizzardCharacterAdapter` |
| CU-07 | `auth.controller.ts` (`/logout`) | `application/LogoutUseCase` + botón en header |
| CU-08 | `ThemeToggle.tsx`, `App.tsx` | `presentation/theme/ThemeProvider` |
| CU-09 | `RecentAchievements.tsx` | `presentation/character/RecentAchievements` (datos del dominio) |
| CU-10 | `auth.controller.ts` (redirects a `/error`) | `presentation/errors/ErrorPage` + errores tipados |
| CU-11 | — | `domain/ports/TokenProvider` + `application/RefreshTokenUseCase` |
| CU-12 | — | `application/GetPublicCharacterUseCase` (opcional) |
| CU-13 | — | `presentation/profile/ProfilePage` |
| CU-14 | `main.ts`, `package.json`, despliegues | `HealthModule` + `ConfigModule` validado |

## 5. Bounded contexts propuestos

### 5.1 Identity & Access (autenticación)

- **Responsabilidad:** login, callback, sesión, tokens, logout, refresh.
- **Agregado:** `AuthSession` (usuario autenticado + tokens + expiración).
- **Value objects:** `OAuthState`, `AccessToken`, `RefreshToken`,
  `BattlenetAccountId`.
- **Puertos:** `OAuthProvider`, `SessionRepository`, `TokenProvider`.
- **Casos de uso:** `StartLogin`, `CompleteLogin`, `CheckSession`,
  `Logout`, `RefreshToken`.

### 5.2 Character Profile (personaje)

- **Responsabilidad:** obtener y modelar la ficha del personaje.
- **Agregado:** `Character` (raíz).
- **Entidades/value objects:** `CharacterName`, `RealmSlug`, `CharacterClass`,
  `Race`, `Specialization`, `ItemLevel`, `CharacterStats`, `Achievement`,
  `Guild`.
- **Puertos:** `CharacterRepository` (salida), `GetCharacterUseCase` (entrada).
- **Casos de uso:** `GetCharacter`, `SearchCharacter` (si la búsqueda es
  parte de este contexto).

### 5.3 Presentation / Experience (frontend)

- **Responsabilidad:** tema, layout, estados de carga/error, navegación,
  accesibilidad.
- **No es un bounded context de negocio**: es la capa de presentación.

### 5.4 Operación (transversal)

- **Responsabilidad:** configuración, salud, observabilidad, rate limiting.
- **No es dominio**: es infraestructura transversal.

## 6. Reglas de negocio a preservar

1. El `state` de OAuth debe ser aleatorio, de un solo uso y comparado en
   tiempo constante.
2. El `client_secret` nunca sale del servidor.
3. El access token nunca se expone a JavaScript del navegador.
4. Un personaje se identifica por `(realmSlug, characterName)`.
5. `realmSlug` y `characterName` deben validarse antes de llamar a Blizzard.
6. Los errores de Blizzard se traducen a errores de dominio (`NotFound`,
   `Unauthorized`, `RateLimited`, `UpstreamError`).
7. El cliente no debe inventar datos: si no hay datos, muestra estado
   vacío/error, no mock.

## 7. Fuera de alcance (por ahora)

- Buscador global con autocompletado y ranking.
- Leaderboards.
- Comparación de personajes.
- Historial de progreso.
- Notificaciones.
- Multilenguaje (hoy `locale=en_US` fijo).
- Soporte multi-región (hoy `us` + `profile-classic-us` fijo).

Estos pueden entrar más adelante, pero conviene no diseñarlos todavía.
