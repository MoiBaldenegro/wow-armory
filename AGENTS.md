# AGENTS.md

Contexto compartido por todos los agentes de este repositorio.

## Qué es este repositorio

`wow-armory` es una aplicación para consultar personajes de World of Warcraft.
Tiene dos proyectos independientes:

- `wow-armory-server/`: API REST con NestJS 10 + TypeScript.
- `wow-armory-client/`: SPA con React 18 + Vite 5 + Tailwind CSS + TypeScript.

Además, el repositorio contiene una fábrica de software mínima basada en
subagentes de Claude Code (ver "Fábrica de software" más abajo).

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
  `feat: :sparkles: add rate limiting`. El builder commitea en `factory/<job-id>`,
  nunca directamente en `main`.
- No añadas dependencias nuevas si una utilidad existente resuelve el problema.
- No commitees secretos. Las credenciales viven en variables de entorno.

## Fábrica de software

- Orquestador: la sesión principal de Claude Code (los subagentes no pueden
  lanzar subagentes). Es el único que escribe `factory/board.json`.
- Subagentes: `.claude/agents/` (`spec-writer`, `builder`, `security`, `ux`,
  `ui-design`, `code`, `approver`). Heredan el modelo de la sesión.
- La skill `.claude/skills/factory-orchestrator/` describe el bucle completo.
- Comando: `/factory` (procesa el siguiente ítem, o `aprobar <id>` /
  `reelaborar <id>`).
- Backlog: `backlog.md`.
- Trabajos y artefactos: `jobs/<job-id>/`.
- Dashboard: `factory/dashboard.html`, servido desde `factory/` con
  `python3 -m http.server`.
- Regla clave: una ronda de revisión termina solo cuando existen los 4 archivos
  (`review-security.md`, `review-ux.md`, `review-ui.md`, `review-code.md`).
- Límite: 2 rondas de revisión por trabajo antes de escalar a `needs-human`.
