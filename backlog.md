# Backlog

Cola de features de la fábrica. El orquestador toma el primer ítem sin marcar y
lo mueve por el bucle: `spec-writer -> builder -> 4 revisores -> approver`.

Formato: `- [ ] <job-id> — <título>`. Al terminar (merge en `main`), marca el
ítem con `[x]`. No borres ítems: el historial es parte del tablero.

## Prioridad: production ready

- [x] 006-auth-battle-net — Autenticación Battle.net production-ready (vertical slice hexagonal)
- [x] 007-server-hexagonal — Fundaciones hexagonales del servidor + contexto de personaje
- [x] 008-client-hexagonal — Fundaciones hexagonales del cliente + router + AuthProvider
- [x] 009-character-real-ui — Búsqueda y ficha con datos reales (sin mocks)
- [x] 010-production-hardening — Config validada, sesión persistente, cookies/CORS, logs, health y rate limiting
- [ ] 011-ddd-refinements — Value objects, tests de dominio y ADRs
- [ ] 012-deploy-guide — Guía de despliegue (PaaS con capa gratuita + VPS), variables de entorno y archivos Docker/compose
- [ ] 013-deps-security — Actualizar dependencias con advisories (proxy-addr/express/qs/axios en servidor, react-router-dom en cliente) sin romper tests

## Deuda previa (se conserva)

- [ ] 003-rate-limiting — Rate limiting en los endpoints de autenticación (absorbido por 010 si aún no se ha hecho)
- [ ] 004-client-a11y — Mejorar foco, teclado y etiquetas ARIA del cliente
- [ ] 005-health-check — Endpoint `GET /health` con estado del servidor (absorbido por 010 si aún no se ha hecho)
