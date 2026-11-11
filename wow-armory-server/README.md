# wow-armory-server

API REST (NestJS 10) de WoW Armory. Hace de proxy hacia la API de Blizzard y
gestiona el login con Battle.net.

## Endpoints

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/health` | Estado y versión del servicio. |
| GET | `/characters/:realmSlug/:characterName?mode=classic\|retail` | Resumen del personaje, guild y logros recientes. |
| GET | `/characters/:realmSlug/:characterName/details?mode=classic\|retail` | Imágenes del personaje y equipo. |
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

## Comandos

```bash
npm ci
npm run start:dev      # desarrollo
npm test -- --runInBand
npm run test:e2e
npm run lint
npm run build
```
