APPROVE
# Decision — 007-server-hexagonal

## Resumen

La rama entrega el contexto hexagonal `characters`, retira el legacy `auth/` y
resuelve el único cambio requerido en la ronda 1: `Retry-After` ya se expone por
CORS y un e2e cross-origin lo verifica de extremo a extremo. Los cuatro
revisores de la ronda 2 dan PASS y no quedan blockers ni majors.

## Evidencia

- Criterio de aceptación → arquitectura: `src/characters/{domain,application,infrastructure,presentation}` + `characters.module.ts`; `AppModule` compone `CharactersModule` + `IdentityModule`; `src/auth/` eliminado (`git diff --name-status` muestra solo borrados) y el e2e comprueba `404` en `/auth/character/grobbulus/billiemoi`.
- Criterio de aceptación → contrato: `CharactersController` responde el `CharacterDto` estable; validación `^[a-z0-9-]{1,64}$` / `^[A-Za-z0-9'-]{1,64}$` antes del puerto; `404`, `429` con `Retry-After` y `502` genérico cubiertos en unitarios y e2e; sin sesión/cookie.
- Criterio de aceptación → anti-corruption y token: `BlizzardMapper` tolera campos ausentes y no filtra JSON crudo; `ClientCredentialsTokenProvider` usa `ConfigService`, body form-urlencoded, caché con margen de 60 s y concurrencia; adaptador con `Bearer`, región/namespace/locale y timeouts.
- Cambio de ronda 1 aplicado de verdad: `bootstrap.ts:57` añade `exposedHeaders: ['Retry-After']` y `test/app.e2e-spec.ts:309-321` envía `Origin: http://localhost:5173`, fuerza el `429` y comprueba `Access-Control-Allow-Origin` y `Access-Control-Expose-Headers`; `git show 2edfaf3` confirma que ese commit solo toca `bootstrap.ts` y el e2e.
- Tests (reejecutados en esta revisión): `npm test -- --runInBand` → 15 suites / 96 tests OK; `npm run test:e2e` → 14 tests OK; `npm run build` OK. El lint del plan no se ejecutó porque el script incluye `--fix`; las revisiones ejecutaron `eslint --no-fix` con solo ruido CRLF del checkout Windows. El cliente no se modificó en el diff (`lint && build` reportado como PASS en `build.md`).
- Revisiones: ronda 2 security PASS, ux PASS, ui PASS, code PASS. El `ux CHANGES` de ronda 1 quedó cerrado y los minors restantes están diferidos a 008/009/010.
- Commits: solo `bdd56b6` (producto) y `2edfaf3` (fix CORS + e2e). El diff no incluye `jobs/`, `factory/`, `docs/`, `backlog.md`, `AGENTS.md`, `.opencode/`, `.env`, dependencias ni lockfiles; el escaneo de secretos solo encuentra credenciales ficticias (`client-secret`) en tests.

## Riesgos residuales / seguimiento

No bloquean el merge: rate limiting público y `/health` → 010; allowlist de
`BLIZZARD_REGION`/namespace y cota superior de `expires_in` → endurecimiento
futuro; `.env` del cliente ya versionado en `main` (sin secreto); desajustes de
contrato (`GuildDto.rank` numérico vs string, `AchievementDto.completedAt` vs
`date`/`description`, opcionales y copy en inglés) → 008/009; `itemLevel: 0`
cuando falta el dato → 009. Sin acción en 007.

## Merge

Head de la rama: `2edfaf3`. El orquestador puede mergear con:

```bash
git checkout main
git merge --no-ff factory/007-server-hexagonal
```

El SHA del commit de merge lo genera ese comando; el job puede marcarse `[x]`.
