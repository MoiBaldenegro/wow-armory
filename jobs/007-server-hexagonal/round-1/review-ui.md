VERDICT: PASS

# UI review — ronda 1

## Hallazgos

- Sin superficie de UI en este cambio: el job no añade ni modifica componentes,
  `index.css`, `tailwind.config.js` ni clases Tailwind. `App.tsx` sigue
  renderizando `mockCharacter` y no hay ninguna llamada a `/auth/character` en
  el cliente: `AuthProvider.tsx` solo consume `/auth/session`, `/auth/login` y
  `/auth/logout`, y `useDetail` (`src/hooks/useDetails.ts`) no se usa. La
  retirada del endpoint legacy no rompe la ficha actual.
- [minor] Derivado de contrato para 009: `CharacterDto` cumple la forma pedida
  (`character.dto.ts:17-29`) y cubre nombre, nivel, clase, raza, spec, item
  level, logros, guild y last login, pero `GuildDto.rank` es `number`
  (`character.dto.ts:13`) mientras `types/character.ts:10` lo tipa como string
  y `CharacterBanner.tsx:38` lo muestra como texto tipo "Guild Master". En 009
  hay que mapear el rango numérico a una etiqueta o mostrar placeholder.
- [minor] Derivado de contrato para 009: `AchievementDto` usa `completedAt` y no
  incluye `description` (`character.dto.ts:3-8`), mientras
  `types/character.ts:1-6` espera `date` + `description` y
  `RecentAchievements.tsx:37,39` los renderiza. El DTO es válido para 007; 009
  debe adaptar el modelo o tratar `description` como texto vacío.
- [minor] Derivado de contrato para 009: `spec`, `guild`, `achievements` y
  `lastLogin` son opcionales en el DTO (`character.dto.ts:23-28`), pero los
  componentes actuales desreferencian guild y logros sin guardas
  (`CharacterBanner.tsx:37,42`, `CharacterCard.tsx:28,44`). La opcionalidad está
  bien modelada en el servidor; 009 debe añadir empty states/placeholders antes
  de conectar el endpoint.
- [minor] `itemLevel` y `achievementPoints` caen a `0` cuando Blizzard no los
  envía (`BlizzardMapper.ts:98-105`), de modo que la UI no podrá distinguir
  "desconocido" de "0". No bloquea 007 (la spec lo permite); 009 puede
  interpretar `0` como valor no disponible.
- [minor] `class`, `race` y `spec` llegan como strings de display sin id estable
  (`character.dto.ts:21-23`). Con `locale=en_US` fijo son suficientes para una
  tabla nombre→color/icono, pero 009 debería resolver el estilo por nombre con
  fallback o introducir un identificador estable para no depender del idioma.

## Cambios requeridos

Ninguno. No hay blocker ni major dentro del alcance de 007; las observaciones
anteriores son recomendaciones no bloqueantes para 008/009.
