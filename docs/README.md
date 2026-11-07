# Documentación de wow-armory

Documentos de contexto y planificación que guían el trabajo de la fábrica de
software. No son specs de implementación: son la base para escribirlas.

| Documento | Para qué sirve |
| --- | --- |
| [`contexto-aplicacion.md`](./contexto-aplicacion.md) | Qué es la app, stack, estructura, arquitectura actual, flujo de autenticación, hallazgos y riesgos. |
| [`casos-de-uso.md`](./casos-de-uso.md) | Actores, casos de uso actuales y objetivo, trazabilidad al código y bounded contexts propuestos. |
| [`plan-hexagonal-ddd-auth.md`](./plan-hexagonal-ddd-auth.md) | Arquitectura objetivo (hexagonal + DDD), diseño del fix de Battle.net, roadmap por fases, backlog propuesto y decisiones pendientes. |

## Orden de lectura recomendado

1. `contexto-aplicacion.md` — entender qué hay.
2. `casos-de-uso.md` — entender qué hace y qué debería hacer.
3. `plan-hexagonal-ddd-auth.md` — entender cómo migraremos y qué falta decidir.

## Estado

- Contexto y casos de uso basados en el código a fecha **2026-11-06**.
- **2026-11-07:** job `006-auth-battle-net` aprobado y mergeado en `main`
  (`7440b9c`). La autenticación Battle.net ya usa el vertical slice hexagonal
  (`src/identity/`), sesión con `state` de un solo uso, refresh y
  `AuthProvider` en el cliente.
- Backlog actualizado: `006` marcado; siguiente job propuesto:
  `007-server-hexagonal`.
- Las fases del plan están pensadas para ejecutarse como jobs de la fábrica,
  una por una.
