# Plan: hexagonal + DDD + autenticación Battle.net

> Documento de intención y hoja de ruta.
> Última actualización: 2026-11-06.
> Se apoya en `docs/contexto-aplicacion.md` y `docs/casos-de-uso.md`.

## 1. Objetivo

1. Aplicar **arquitectura hexagonal (puertos y adaptadores)** y **DDD táctico**
   en el servidor NestJS y en el cliente React.
2. **Arreglar la autenticación con Battle.net** de extremo a extremo: login,
   callback, sesión, refresh, logout y acceso a la API de Blizzard.
3. Hacerlo **de forma incremental** (strangler), sin una reescritura big-bang
   que rompa la app mientras se migra.

## 2. Principios

- **El dominio no depende de frameworks.** Ni NestJS, ni Express, ni Axios,
  ni React pueden aparecer en `domain/`.
- **Las dependencias apuntan hacia dentro:** `infrastructure → application →
  domain`. La presentación depende de la aplicación, nunca al revés.
- **Puertos en el dominio/aplicación, adaptadores en infraestructura.**
- **Un caso de uso = una intención del usuario.** Nada de servicios
  "cajón de sastre".
- **DDD pragmático:** usar aggregates, value objects y errores de dominio
  donde aporten claridad; no crear 40 capas para un CRUD.
- **Primero el vertical slice de auth**, porque es el flujo roto y porque sirve
  de plantilla para el resto.
- **Cada job de la fábrica debe dejar tests verdes** y la app funcionando.

## 3. Arquitectura objetivo — servidor

```text
wow-armory-server/src/
├── main.ts                          # composition root / bootstrap
├── app.module.ts                    # importa módulos de contexto
├── shared/                          # kernel compartido (sin negocio)
│   ├── domain/
│   │   ├── DomainError.ts
│   │   ├── Result.ts                # opcional, si se adopta
│   │   └── ValueObject.ts
│   └── infrastructure/
│       ├── config/                  # ConfigModule validado
│       └── http/                    # filtros, interceptores, pipes
├── identity/                        # bounded context: auth
│   ├── domain/
│   │   ├── AuthSession.ts
│   │   ├── OAuthState.ts
│   │   ├── AccessToken.ts
│   │   ├── RefreshToken.ts
│   │   ├── errors/
│   │   └── ports/
│   │       ├── OAuthProvider.ts     # puerto de salida
│   │       └── SessionRepository.ts # puerto de salida
│   ├── application/
│   │   ├── StartLoginUseCase.ts
│   │   ├── CompleteLoginUseCase.ts
│   │   ├── CheckSessionUseCase.ts
│   │   ├── LogoutUseCase.ts
│   │   └── RefreshTokenUseCase.ts
│   ├── infrastructure/
│   │   ├── BattleNetOAuthAdapter.ts # implementa OAuthProvider
│   │   ├── ExpressSessionRepository.ts
│   │   └── identity.module.ts
│   └── presentation/
│       ├── AuthController.ts
│       └── dto/
└── characters/                      # bounded context: personaje
    ├── domain/
    │   ├── Character.ts             # aggregate root
    │   ├── CharacterName.ts
    │   ├── RealmSlug.ts
    │   ├── CharacterClass.ts
    │   ├── CharacterStats.ts
    │   ├── Achievement.ts
    │   ├── Guild.ts
    │   └── ports/
    │       └── CharacterRepository.ts
    ├── application/
    │   ├── GetCharacterUseCase.ts
    │   └── SearchCharacterUseCase.ts
    ├── infrastructure/
    │   ├── BlizzardCharacterAdapter.ts
    │   ├── BlizzardMapper.ts
    │   └── characters.module.ts
    └── presentation/
        ├── CharactersController.ts
        └── dto/
```

### Regla de dependencia

```text
presentation ──► application ──► domain
       │                │
       └──► infrastructure ◄──┘   (solo en el composition root / módulo Nest)
```

NestJS se usa como **composition root**: los módulos declaran qué adaptador
implementa cada puerto con `useClass`/`useFactory`. El dominio no importa
`@nestjs/*`.

### Ejemplo de puerto y adaptador

```ts
// domain/ports/CharacterRepository.ts
export interface CharacterRepository {
  findByRealmAndName(
    realmSlug: RealmSlug,
    name: CharacterName,
  ): Promise<Character | null>;
}

// application/GetCharacterUseCase.ts
export class GetCharacterUseCase {
  constructor(private readonly repository: CharacterRepository) {}

  async execute(realm: string, name: string): Promise<Character> {
    const realmSlug = RealmSlug.create(realm);
    const characterName = CharacterName.create(name);
    const character = await this.repository.findByRealmAndName(
      realmSlug,
      characterName,
    );
    if (!character) throw new CharacterNotFoundError(characterName, realmSlug);
    return character;
  }
}
```

## 4. Arquitectura objetivo — cliente

```text
wow-armory-client/src/
├── domain/                          # núcleo puro, sin React ni Axios
│   ├── character/
│   │   ├── Character.ts
│   │   ├── CharacterName.ts
│   │   ├── RealmSlug.ts
│   │   ├── CharacterStats.ts
│   │   ├── Achievement.ts
│   │   ├── Guild.ts
│   │   └── ports/
│   │       └── CharacterRepository.ts
│   └── auth/
│       ├── Session.ts
│       └── ports/
│           └── AuthRepository.ts
├── application/                     # casos de uso (funciones puras u objetos)
│   ├── character/
│   │   ├── getCharacter.ts
│   │   └── searchCharacter.ts
│   └── auth/
│       ├── startLogin.ts
│       ├── checkSession.ts
│       └── logout.ts
├── infrastructure/                  # adaptadores concretos
│   ├── http/
│   │   ├── axiosClient.ts
│   │   ├── HttpCharacterRepository.ts
│   │   └── HttpAuthRepository.ts
│   └── config/
│       └── env.ts                   # valida VITE_SERVER_URI
├── presentation/
│   ├── providers/
│   │   ├── AuthProvider.tsx
│   │   ├── ThemeProvider.tsx
│   │   └── UseCasesProvider.tsx     # inyección de dependencias simple
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── CharacterProfilePage.tsx
│   │   ├── ProfilePage.tsx
│   │   └── ErrorPage.tsx
│   ├── components/                  # componentes de solo presentación
│   └── router/                      # react-router-dom
└── main.tsx
```

### Inyección de dependencias en el cliente

No hace falta un contenedor pesado. Basta con:

```ts
// infrastructure/container.ts
const characterRepository = new HttpCharacterRepository(httpClient);
const authRepository = new HttpAuthRepository(httpClient);

export const useCases = {
  getCharacter: new GetCharacter(characterRepository),
  checkSession: new CheckSession(authRepository),
  startLogin: new StartLogin(authRepository),
  logout: new Logout(authRepository),
};
```

Y un `UseCasesProvider` que expone `useCases` por contexto. Los hooks de
presentación (`useCharacter`, `useAuth`) consumen el caso de uso, no Axios.

## 5. Diseño de la autenticación corregida

### 5.1 Decisiones

| Tema | Decisión propuesta |
| --- | --- |
| Flujo OAuth | Authorization Code con `state`; el `client_secret` solo vive en el servidor. |
| Almacenamiento del token | Sesión del servidor (`express-session`), nunca cookie legible por JS. |
| Cookie | `httpOnly`, `secure` en producción, `sameSite` configurable; `trust proxy` en Render. |
| Sesión | `MemoryStore` en desarrollo; store externo (Redis/Upstash) en producción. |
| State | Aleatorio, guardado en sesión, comparado con `timingSafeEqual`, borrado tras usarlo. |
| Session fixation | `req.session.regenerate()` tras un login exitoso. |
| Refresh | Guardar `refresh_token` y `expires_at`; refrescar antes de llamar a Blizzard. |
| Redirect | `CLIENT_URL` configurable por entorno; nunca hardcodeado. |
| CORS | Allowlist configurable por entorno. |
| Errores | Redirigir a `CLIENT_URL/error?code=...`; el cliente traduce el código a un mensaje. |
| Logs | Nunca loggear tokens ni payloads completos de Blizzard. |
| Endpoint de personaje | Sale de `AuthController` y pasa a `CharactersController`. |
| Token para datos públicos | Evaluar `client_credentials` para permitir consultar personajes sin login (CU-12). |

### 5.2 Contrato de endpoints propuesto

| Método | Ruta | Respuesta |
| --- | --- | --- |
| `GET` | `/auth/login` | `{ url: string }` (o `302` directo a Battle.net) |
| `GET` | `/auth/callback` | `302` a `CLIENT_URL/profile` o `CLIENT_URL/error?code=...` |
| `GET` | `/auth/session` | `{ authenticated: boolean, user?: { battletag?: string } }` |
| `POST` | `/auth/logout` | `204` y cookie limpia |
| `GET` | `/characters/:realmSlug/:characterName` | `CharacterDto` o error tipado |
| `GET` | `/characters/search?name=...` | `CharacterSummaryDto[]` (opcional) |
| `GET` | `/health` | `{ status: 'ok', uptime, version }` |

### 5.3 Secuencia corregida

```mermaid
sequenceDiagram
    participant C as Cliente
    participant S as Servidor
    participant B as Battle.net

    C->>S: GET /auth/login (withCredentials)
    S->>S: state = random; session.oauthState = state
    S-->>C: { url }
    C-->>C: location.href = url
    B-->>S: GET /auth/callback?code&state
    S->>S: timingSafeEqual(state); consume state
    S->>B: POST /token (code, client_id, client_secret, redirect_uri)
    B-->>S: access_token, refresh_token, expires_in
    S->>S: session.regenerate(); guarda tokens + expires_at
    S-->>C: 302 CLIENT_URL/profile
    C->>S: GET /auth/session
    S-->>C: { authenticated: true }
    C->>S: GET /characters/grobbulus/billiemoi
    S->>S: ensureValidToken() (refresh si expiró)
    S->>B: GET /profile/wow/character/...
    B-->>S: JSON
    S->>S: BlizzardMapper → Character → CharacterDto
    S-->>C: CharacterDto
```

### 5.4 Qué se elimina

- `useDetails` leyendo `document.cookie` y enviando `Authorization`.
- `useAuth` llamando a `/auth/login`.
- URL hardcodeada `https://wow-armory.onrender.com`.
- `console.log` de tokens y respuestas.
- `getCharacterData` devolviendo `any` crudo.
- `AuthController` con responsabilidades de personaje.

## 6. Roadmap incremental

> Cada fase es un job de la fábrica. El orden prioriza arreglar auth y
> establecer el patrón, no "reformatear todo".

### Fase 0 — Contexto y casos de uso (este entregable)

- Documentos `docs/contexto-aplicacion.md`, `docs/casos-de-uso.md` y este
  plan.
- Sin cambios de código.
- **Criterio de aceptación:** los tres documentos existen, son coherentes con
  el código y están enlazados desde `docs/README.md`.

### Fase 1 — Vertical slice de autenticación (P0)

> **Estado:** ✅ completada por `006-auth-battle-net` (merge `7440b9c`,
> 2026-11-07). El endpoint de sesión quedó como `GET /auth/session`.

- Crear el bounded context `identity` con dominio, casos de uso, puertos y
  adaptadores.
- Implementar login, callback, session, logout y refresh.
- Corregir el cliente: `AuthProvider`, `useAuth`, botón de login/logout,
  `session`, `withCredentials`.
- Configurar `CLIENT_URL`, CORS y cookie por entorno.
- Tests unitarios de casos de uso + e2e con Battle.net mockeado.
- **Criterio de aceptación:** un usuario real puede iniciar sesión, recargar
  la página y seguir autenticado, y cerrar sesión; los tests pasan.

### Fase 2 — Contexto de personaje en el servidor

- Crear `characters/` con `Character`, value objects, `CharacterRepository`,
  `GetCharacterUseCase` y `BlizzardCharacterAdapter`.
- Mapear la respuesta de Blizzard a un DTO estable.
- Validar `realmSlug` y `characterName`.
- Errores de dominio (`CharacterNotFound`, `BlizzardUnavailable`,
  `RateLimited`).
- Mover el endpoint a `CharactersController`.
- Tests del mapper y del caso de uso.
- **Criterio de aceptación:** `GET /characters/:realm/:name` devuelve un DTO
  tipado y testeado; el token se obtiene vía `TokenProvider`.

### Fase 3 — Cliente hexagonal

- Separar `domain`, `application`, `infrastructure`, `presentation`.
- `CharacterRepository` y `AuthRepository` como puertos.
- Adaptadores HTTP con Axios.
- `AuthProvider`, `ThemeProvider`, `UseCasesProvider`.
- Router (`/`, `/character/:realm/:name`, `/profile`, `/error`).
- Eliminar `mockCharacter` del flujo principal (dejarlo solo como fixture de
  tests/storybook si se quiere).
- **Criterio de aceptación:** la UI consume casos de uso; no hay Axios ni
  `fetch` dentro de componentes; `lint && build` pasa.

### Fase 4 — Búsqueda y ficha real

- Conectar `SearchBar` con validación y navegación.
- Renderizar datos reales de Blizzard con estados de carga, vacío y error.
- Manejar 401/404/429/5xx con mensajes claros.
- **Criterio de aceptación:** buscar "grobbulus / billiemoi" muestra la ficha
  real; un personaje inexistente muestra un estado vacío.

### Fase 5 — Hardening

- `ConfigModule` con validación de variables (sin fallbacks inseguros).
- Store de sesión para producción (Redis/Upstash).
- `trust proxy`, cookies correctas, CORS por entorno.
- Rate limiting en `/auth/*` (puede absorber el job `003-rate-limiting`).
- `GET /health`.
- Logging estructurado sin secretos.
- `.env.example` en servidor y cliente; dejar de trackear el `.env` del
  cliente.
- **Criterio de aceptación:** checklist de seguridad y despliegue documentado
  y verificado.

### Fase 6 — Refinamiento DDD (solo si aporta)

- Value objects restantes, errores de dominio, domain events si hay
  integraciones.
- Tests de dominio.
- ADRs de decisiones clave.
- **Criterio de aceptación:** el dominio se puede testear sin Nest/React.

## 7. Backlog propuesto

> No he modificado `backlog.md` todavía. Estas son las líneas que propongo
> añadir (los IDs son sugerencias; los tres ítems existentes se mantienen).

```md
- [ ] 006-auth-battle-net — Arreglar login/callback/sesión/refresh con Battle.net (vertical slice hexagonal)
- [ ] 007-server-character-context — Extraer el contexto de personaje con puertos/adaptadores y DTO
- [ ] 008-client-hexagonal — Separar dominio/aplicación/infraestructura/presentación en el cliente
- [ ] 009-character-search-ui — Búsqueda y ficha con datos reales, estados de carga/error
- [ ] 010-auth-hardening — Config validada, store de sesión, cookies, CORS, logs y rate limiting
- [ ] 011-ddd-refinements — Value objects y tests de dominio restantes + ADRs
```

Relación con el backlog actual:

- `003-rate-limiting` encaja en la Fase 5 (`010-auth-hardening`), pero puede
  ejecutarse antes si se quiere cerrar rápido.
- `004-client-a11y` encaja en la Fase 3/4.
- `005-health-check` encaja en la Fase 5.

## 8. Criterios de aceptación globales

- [ ] `cd wow-armory-server && npm test -- --runInBand` pasa.
- [ ] `cd wow-armory-server && npm run test:e2e` pasa.
- [ ] `cd wow-armory-server && npm run lint && npm run build` pasa.
- [ ] `cd wow-armory-client && npm run lint && npm run build` pasa.
- [ ] El flujo real de Battle.net funciona en local y en producción.
- [ ] No hay secretos ni tokens en el repositorio ni en logs.
- [ ] El dominio no importa NestJS, Axios, React ni Express.
- [ ] Los casos de uso tienen tests.
- [ ] La UI no usa datos mock en el flujo principal.

## 9. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| Cookies de terceros bloqueadas | Login no persiste entre `pages.dev` y `onrender.com` | Proxy same-site (Cloudflare Pages Functions/custom domain) o token de sesión de corta duración; decidir en Fase 1. |
| Refactor demasiado grande | Se rompe la app y no se termina | Strangler por contexto, un job por fase, tests antes de mover. |
| Cuota de Blizzard | 429 en producción | Cachear respuestas, rate limiting, backoff, token de aplicación. |
| `MemoryStore` en producción | Pérdida de sesiones al reiniciar | Redis/Upstash en Fase 5. |
| Diferencia Classic/Retail | Namespace incorrecto | `BLIZZARD_NAMESPACE` y `BLIZZARD_REGION` configurables. |
| Falta de tests del cliente | Regresiones visuales/lógicas | Añadir Vitest + Testing Library en Fase 3 (decisión pendiente). |

## 10. Decisiones adoptadas (delegadas) y pendientes

El usuario delegó la toma de decisiones el **2026-11-06**. Estas son las
decisiones por defecto; se pueden revisar antes de la fase correspondiente.

1. **Retail vs Classic:** se hace **configurable** con `BLIZZARD_REGION` y
   `BLIZZARD_NAMESPACE`. Por defecto se conserva el comportamiento actual
   (`us` + `profile-classic-us`) para no romper el personaje que ya se consulta.
   El mock de la UI no se usa como fuente de verdad.
2. **Acceso a personajes:** se permite **consulta pública** con
   `client_credentials`; el login con Battle.net se reserva para el perfil
   propio y datos privados. Esto evita obligar a login para ver una ficha.
3. **Router del cliente:** sí, se añade `react-router-dom` en `008` para tener
   `/`, `/character/:realm/:name`, `/profile` y `/error`.
4. **Tests del cliente:** sí, se añade **Vitest + Testing Library** en `008`
   (hoy no hay runner). Antes de esa fase hay que actualizar `AGENTS.md` y el
   prompt del builder para que la verificación incluya los tests.
5. **Sesión en producción:** se implementa un puerto `SessionRepository` con
   adaptador en memoria para desarrollo y adaptador Redis/Upstash para
   producción en `010`. `MemoryStore` solo se acepta en local.
6. **Prioridad:** el fix de autenticación (`006`) va antes que
   `003-rate-limiting`, que se absorbe en `010`.

### Pendiente de confirmar más adelante

- Proveedor concreto de Redis/Upstash y su configuración de despliegue.
- Si se quiere soportar varias regiones/namespaces desde la UI o solo por
  configuración del servidor.
- Si el perfil propio mostrará la lista de personajes de la cuenta (requiere
  endpoints adicionales de Blizzard) o solo el estado de sesión.

## 11. ADRs sugeridos

| ADR | Tema | Propuesta |
| --- | --- | --- |
| ADR-001 | Estilo arquitectónico | Hexagonal + DDD pragmático por bounded context |
| ADR-002 | Sesión | Cookie `httpOnly` + sesión de servidor; no token en JS |
| ADR-003 | OAuth | Authorization Code + `state`; sin PKCE salvo que Battle.net lo requiera |
| ADR-004 | Datos | `client_credentials` para perfiles públicos, user token para datos privados |
| ADR-005 | Cliente | Puertos/adaptadores + providers; router para páginas |
| ADR-006 | Tests | Jest en servidor; Vitest + Testing Library en cliente (a confirmar) |

## 12. Enlaces

- Contexto: `docs/contexto-aplicacion.md`
- Casos de uso: `docs/casos-de-uso.md`
- Convenciones: `AGENTS.md`
