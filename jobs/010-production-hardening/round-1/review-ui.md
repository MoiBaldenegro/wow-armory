VERDICT: PASS
# UI review — ronda 1

## Hallazgos

- Sin superficie de UI en este cambio. El diff `main...factory/010-production-hardening` en `wow-armory-client/` toca solo `src/infrastructure/config/env.ts` (validación de `VITE_SERVER_URI`: exige https en producción salvo loopback) y su test `src/infrastructure/config/env.test.ts`. No cambian componentes, páginas, hooks, `index.css`, `tailwind.config.js` ni clases Tailwind, así que no hay impacto en jerarquía visual, paleta, modo oscuro, responsive ni estados visuales.
- El error nuevo de `env.ts:60` se lanza al cargar la configuración en build/arranque de producción mal configurado, no es un mensaje que se muestre en la interfaz. No requiere tratamiento visual.
