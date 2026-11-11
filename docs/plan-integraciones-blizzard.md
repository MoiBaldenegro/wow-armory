# Plan de trabajo — Integraciones nuevas con la API de Blizzard

> Fecha: 2026-11-11. Fuente: documentación oficial del Battle.net Developer
> Portal (WoW Classic Profile APIs, WoW Classic Game Data APIs y WoW Profile
> APIs). Todos los endpoints elegidos están documentados para Classic
> (`profile-classic-*`, `static-classic-*`, `dynamic-classic-*`) y para Retail.

## Objetivo

Enriquecer la ficha del personaje y añadir páginas nuevas (hermandad,
leaderboards) sin superar el límite de la API de Blizzard (≈36 000
peticiones/hora y 100/s por cliente).

## Fase 0 — Base técnica

- [x] **Cache en memoria con TTL** (`BlizzardCache`) para todas las llamadas
      de Game Data y Profile: deduplica peticiones en vuelo y limita el
      tamaño. Es por instancia (en Vercel cada lambda tiene la suya).
- [x] **Cliente HTTP de Blizzard compartido** (`BlizzardApiClient`): token de
      aplicación, namespaces por región/modo, nombres en minúsculas, mapeo de
      errores 404/429/5xx a errores de dominio y cache.
- [x] **Manejo de errores HTTP compartido** para todos los controladores.

## Fase 1 — Ficha del personaje (endpoints de Profile)

| # | Feature | Endpoint | Estado |
| --- | --- | --- | --- |
| 1 | Render completo del personaje | `character-media` (`main-raw` → `main` → `inset` → `avatar`) | [x] |
| 2 | Tooltips de equipo (stats, encantamientos, set, requisitos, durabilidad) | `equipment` | [x] |
| 3 | Hoja de estadísticas | `statistics` | [x] |
| 4 | Talentos / especializaciones | `specializations` | [x] |
| 5 | PvP: kills honorables y brackets de arena | `pvp-summary`, `pvp-bracket/{bracket}` | [x] |
| 5b | Mascotas de cazador | `hunter-pets` | [x] |
| 8 | Validación del personaje (renombrado/borrado) | `status` | [x] |

## Fase 2 — Páginas nuevas (endpoints de Game Data)

| # | Feature | Endpoint | Estado |
| --- | --- | --- | --- |
| 6 | Página de hermandad: escudo, roster, actividad y logros | `guild`, `guild/roster`, `guild/activity`, `guild/achievements`, `media/guild-crest/*` | [x] |
| 7 | Autocompletado de reinos en la búsqueda | `realm/index` (`dynamic-*`) | [x] |
| 9 | Precio en la casa de subastas del equipo del personaje | `realm/{slug}`, `connected-realm/{id}/auctions[/index]` | [x] |
| 10 | Leaderboards de arena | `pvp-season/index`, `pvp-region/...`/`pvp-season/.../pvp-leaderboard/{bracket}` | [x] |

## Nuevos endpoints del servidor

| Método | Ruta |
| --- | --- |
| GET | `/characters/:realm/:name/details` (ampliado) |
| GET | `/characters/:realm/:name/statistics` |
| GET | `/characters/:realm/:name/talents` |
| GET | `/characters/:realm/:name/pvp` |
| GET | `/characters/:realm/:name/hunter-pets` |
| GET | `/guilds/:realm/:guildSlug` |
| GET | `/realms` |
| GET | `/auctions/:realm/prices?items=1,2&faction=horde` |
| GET | `/leaderboards/pvp/:bracket` |

Todos aceptan `?mode=classic|retail` y usan la política de rate limit
`public`.

## Decisiones

- **Best effort por sección:** cada sección nueva se carga por separado en el
  cliente; si un endpoint no existe para ese personaje (p. ej. `hunter-pets`
  para no cazadores, o PvP sin datos) la sección simplemente no aparece.
- **Subastas:** la respuesta de Blizzard es enorme y se actualiza cada hora,
  así que el servidor solo guarda en cache un mapa `itemId → precio mínimo`
  por casa de subastas durante 30 minutos.
- **Clases del roster:** el roster solo trae `playable_class.id`; el cliente
  traduce los IDs con una tabla fija (los IDs de clase son estables).
- **Sin dependencias nuevas.**

## Riesgos y pendientes

- No hay credenciales de Blizzard en el entorno de desarrollo: los mapeos se
  basan en la documentación y en la forma conocida de las respuestas, y los
  tests usan fixtures. Validar en staging cada sección.
- Reinos de Classic Era (`profile-classic1x-*`) siguen sin modo propio en la UI.
- El cache es por instancia; si el tráfico crece, moverlo a Redis.
