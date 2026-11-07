VERDICT: PASS

# UI review — ronda 2

## Hallazgos

- Sin superficie de UI nueva en esta ronda. El único cambio respecto a la
  ronda 1 es `fix: :bug: expose retry-after to cors clients` (`2edfaf3`), que
  toca solo servidor: `wow-armory-server/src/bootstrap.ts:57` añade
  `exposedHeaders: ['Retry-After']` y `test/app.e2e-spec.ts:309-322` añade un
  e2e cross-origin. No hay cambios en componentes, `index.css`,
  `tailwind.config.js` ni clases Tailwind.
- Sin regresión visual ni de contrato. `git diff main...factory/007-server-hexagonal`
  no incluye ningún archivo de `wow-armory-client/`; el cliente sigue
  renderizando `mockCharacter` (`App.tsx:27-29`) y no consume
  `/characters/:realmSlug/:characterName` (grep sin resultados en
  `wow-armory-client/src`). La retirada de `/auth/character` sigue sin afectar
  a la ficha actual: `AuthProvider` solo usa `/auth/session`, `/auth/login` y
  `/auth/logout`, y `useDetail` (`hooks/useDetails.ts:13`) no está conectado.
- `CharacterDto` permanece igual (`presentation/dto/character.dto.ts:17-29`),
  por lo que las recomendaciones no bloqueantes de la ronda 1 para 009 siguen
  vigentes sin cambios:
  - [minor] `GuildDto.rank` es `number` (`character.dto.ts:13`) frente a
    `rank: string` en `types/character.ts:10`, que `CharacterBanner.tsx:38`
    pinta como etiqueta textual ("Guild Master"). 009 debe mapear el rango
    numérico a etiqueta o mostrar placeholder.
  - [minor] `AchievementDto` expone `completedAt` y no `description`
    (`character.dto.ts:3-8`), mientras `types/character.ts:1-6` espera
    `date` + `description` y `RecentAchievements.tsx:37,39` los renderiza.
    009 debe adaptar el modelo o tratar `description` como vacío.
  - [minor] `spec`, `guild`, `achievements` y `lastLogin` siguen siendo
    opcionales (`character.dto.ts:23-28`), pero los componentes desreferencian
    guild y logros sin guardas (`CharacterBanner.tsx:37,42`,
    `CharacterCard.tsx:28,44`). 009 debe añadir empty states/placeholders antes
    de conectar el endpoint.
  - [minor] `itemLevel` y `achievementPoints` siguen cayendo a `0` cuando
    Blizzard no los envía (`infrastructure/BlizzardMapper.ts:98-105`); 009
    puede interpretar `0` como "no disponible".
  - [minor] `class`, `race` y `spec` siguen llegando como strings de display
    sin id estable (`character.dto.ts:21-23`); 009 debe resolver color/icono por
    nombre con fallback o introducir un identificador estable.

## Cambios requeridos

Ninguno. No hay blocker ni major dentro del alcance de 007. Las observaciones
anteriores son recomendaciones no bloqueantes para 008/009.
