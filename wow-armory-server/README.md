# wow-armory-server

API REST (NestJS 10) de WoW Armory. Hace de proxy hacia la API de Blizzard y
gestiona el login con Battle.net.

## Endpoints

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/health` | Estado y versión del servicio. |
| GET | `/characters/:realmSlug/:characterName?mode=classic\|retail` | Resumen del personaje, guild y logros recientes. |
| GET | `/characters/:realmSlug/:characterName/details?mode=classic\|retail` | Render, imágenes y equipo con datos de tooltip. |
| GET | `/characters/:realmSlug/:characterName/statistics` | Hoja de estadísticas. |
| GET | `/characters/:realmSlug/:characterName/talents` | Talentos (árboles de Classic o loadouts de Retail). |
| GET | `/characters/:realmSlug/:characterName/pvp` | Muertes con honor y brackets de arena. |
| GET | `/characters/:realmSlug/:characterName/hunter-pets` | Mascotas de cazador (`[]` para otras clases). |
| GET | `/guilds/:realmSlug/:guildSlug` | Hermandad: escudo, roster, actividad y logros. |
| GET | `/realms` | Lista de reinos del modo. |
| GET | `/auctions/:realmSlug/prices?items=1,2&faction=horde` | Precio mínimo por unidad en la casa de subastas (cobre). |
| GET | `/leaderboards/pvp/:bracket?region=` | Top 100 de arena de la temporada actual (`2v2`, `3v3`, `5v5`, `rbg`). |
| GET | `/auth/login` | URL de autorización de Battle.net. |
| GET | `/auth/callback` | Callback OAuth; redirige a `CLIENT_URL`. |
| GET | `/auth/session` | Sesión actual. |
| POST | `/auth/logout` | Cierra la sesión. |
| GET | `/profile/user/wow` | Personajes de la cuenta Battle.net (requiere sesión). |

## Configuración

Copia `.env.example` a `.env`. En desarrollo el servidor arranca sin
variables; en producción exige las credenciales de Blizzard, `SESSION_SECRET`,
`CLIENT_URL` y `CORS_ORIGINS`. Los namespaces de Blizzard se derivan de
`BLIZZARD_REGION`.

Las respuestas de Blizzard se guardan en un cache en memoria por instancia
(5 min perfiles, 15 min hermandades y leaderboards, 30 min subastas, 6 h
reinos, 24 h media) para no superar el límite de la API.

Todas las rutas aceptan `?mode=classic|retail` (por defecto `classic`).

## Comandos

```bash
npm ci
npm run start:dev      # desarrollo
npm test -- --runInBand
npm run test:e2e
npm run lint
npm run build
```
