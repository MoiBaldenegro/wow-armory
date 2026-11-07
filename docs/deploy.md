# Despliegue

La aplicación se despliega como dos servicios: `server` (NestJS) y `client`
(SPA estática). El servidor necesita Redis gestionado cuando
`SESSION_STORE=redis`.

## Docker Compose en un VPS

1. Instala Docker y Docker Compose.
2. Crea un archivo `.env` en la raíz del repositorio. No lo subas a Git:

```env
SESSION_SECRET=<32+ caracteres aleatorios>
REDIS_URL=rediss://default:<password>@<host>:6379
BLIZZARD_CLIENT_ID=<id>
BLIZZARD_CLIENT_SECRET=<secret>
BLIZZARD_REDIRECT_URI=https://api.example.com/auth/callback
CLIENT_URL=https://app.example.com
CORS_ORIGINS=https://app.example.com
VITE_SERVER_URI=https://api.example.com
```

3. Construye y arranca:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

4. Comprueba `https://api.example.com/health` y configura un proxy TLS
   (Caddy, Nginx o el proveedor elegido) para `api.example.com` hacia el puerto
   `3000` y `app.example.com` hacia el puerto `8080`.

El proveedor TLS debe conservar `https` en ambos dominios. La URL de callback
registrada en Battle.net debe coincidir exactamente con `BLIZZARD_REDIRECT_URI`.

## PaaS

Configura un servicio para cada carpeta (`wow-armory-server` y
`wow-armory-client`) usando su Dockerfile. En el cliente define
`VITE_SERVER_URI` como build argument. En el servidor define las mismas
variables del archivo `.env` como secretos del proveedor y deja que el
proveedor inyecte `PORT`.

En producción son obligatorias `SESSION_SECRET`, las credenciales de Blizzard,
`CLIENT_URL` HTTPS, `BLIZZARD_REDIRECT_URI` HTTPS y `REDIS_URL` cuando se usa
`SESSION_STORE=redis`. `CORS_ORIGINS` debe contener el origin exacto del
cliente. El endpoint de health es `GET /health`.

No uses valores ficticios de `.env.example` en producción ni publiques
`SESSION_SECRET`, `BLIZZARD_CLIENT_SECRET` o `REDIS_URL`.
