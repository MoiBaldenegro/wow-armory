# AGENTS.md

Contexto compartido por todos los agentes de este repositorio.

## Qué es este repositorio

`wow-armory` es una aplicación para consultar personajes de World of Warcraft.
Tiene dos proyectos independientes:

- `wow-armory-server/`: API REST con NestJS 10 + TypeScript. Consume la API de
  Blizzard (Profile API con token `client_credentials` y Battle.net OAuth
  para el perfil del usuario).
- `wow-armory-client/`: SPA con React 18 + Vite 5 + Tailwind CSS + TypeScript.

Ambos proyectos se prueban y despliegan con Node 20 (ver los `Dockerfile`).

## Comandos

### Servidor (`wow-armory-server/`)

- Tests unitarios (Jest): `cd wow-armory-server && npm test -- --runInBand`
- Tests e2e: `cd wow-armory-server && npm run test:e2e`
- Lint: `cd wow-armory-server && npm run lint`
- Build: `cd wow-armory-server && npm run build`
- Desarrollo: `cd wow-armory-server && npm run start:dev`

### Cliente (`wow-armory-client/`)

- Tests unitarios/componentes (Vitest + Testing Library):
  `cd wow-armory-client && npm test`
- Lint: `cd wow-armory-client && npm run lint`
- Build/typecheck: `cd wow-armory-client && npm run build`
- Desarrollo: `cd wow-armory-client && npm run dev`
- Si un cambio es solo de cliente, la verificación mínima es
  `npm run lint && npm test && npm run build`.

## Convenciones

- TypeScript estricto. Evita `any` nuevo aunque el servidor lo permita.
- Servidor: un módulo por dominio (`*.module.ts`, `*.controller.ts`,
  `*.service.ts`) y tests junto al código (`*.spec.ts`). Usa inyección de
  dependencias de Nest y mantén los controladores delgados.
- Cliente: arquitectura hexagonal con `src/domain/`, `src/application/`,
  `src/infrastructure/` y `src/presentation/`. Componentes funcionales en
  `src/presentation/components/`, páginas en `src/presentation/pages/`, hooks en
  `src/presentation/hooks/`, providers en `src/presentation/providers/`. El
  dominio no importa React ni Axios. Tests junto al código (`*.test.ts` /
  `*.test.tsx`) con Vitest + Testing Library y `jsdom`. Estilos con clases de
  Tailwind; sigue el estilo visual y el modo oscuro existentes
  (`darkMode: 'class'`).
- Prettier: comillas simples y comas finales. Lint debe pasar antes de un PR.
- Commits: estilo Conventional Commits con emoji, por ejemplo
  `feat: :sparkles: add rate limiting`. Trabaja en una rama y abre un PR; no
  commitees directamente en `main`.
- No añadas dependencias nuevas si una utilidad existente resuelve el problema.
- No commitees secretos. Las credenciales viven en variables de entorno.

## API de Blizzard

- Las rutas de la Profile API (`/profile/wow/character/{realm}/{name}`)
  exigen realm y nombre en minúsculas; usa `toBlizzardPathSegment`.
- Los namespaces (`profile-*`, `static-*`) se derivan de `BLIZZARD_REGION` en
  `src/shared/infrastructure/blizzard/blizzard-api-config.ts`; no los
  hardcodees con `-us`.
- El resumen del personaje no incluye la lista de logros: los recientes
  vienen de `/achievements` (`recent_events`).
- Las llamadas nuevas pasan por `BlizzardApiClient` (token, namespace por
  modo, cache y mapeo de errores). En tests usa `createTestBlizzardClient` y
  `mockBlizzardRoutes` de `src/shared/infrastructure/blizzard/testing.ts`.
- Plan y estado de las integraciones: `docs/plan-integraciones-blizzard.md`.
