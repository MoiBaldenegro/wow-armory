VERDICT: PASS

# UI review — ronda 2

## Hallazgos

Verificación estática (el entorno no expone navegador headless): el major de la
ronda 1 queda resuelto. `Header.tsx:78-97` usa `gap-3 sm:gap-6`, `Logo` con
`shrink-0` y texto `hidden sm:inline` (`Logo.tsx:10-15`), buscador dentro de un
wrapper `min-w-0 flex-1` con input `w-full min-w-0` (`SearchBar.tsx:11,16`) y
botón `shrink-0` icon-only en móvil. A 320 px el contenido útil es 288 px
(320 − 2×16): 32 px de logo + 24 px de gaps + ~42 px de botón dejan ~190 px
para el input, sin overflow ni solapamiento; a 375 y 768 px hay más holgura.
El botón tiene fondo sólido legible (`bg-gray-900/90`, `text-white`), borde
`border-white/30`, `focus-visible:ring-2 ring-white/40` coherente con el
buscador, `disabled:opacity-60` y spinner de carga; su `aria-label` incluye el
battletag (`Header.tsx:60-66,83-97`). El banner tiene `role="alert"`, contraste
alto en claro y oscuro y consume el `error` del `AuthProvider`
(`AuthErrorBanner.tsx:36-59`). Jerarquía del header coherente en desktop (logo
a la izquierda, búsqueda flexible, acción de sesión a la derecha) y en móvil.

- [minor] `wow-armory-client/tailwind.config.js:2-8` / `AuthErrorBanner.tsx:57` — no se define `darkMode: 'class'`, así que las variantes `dark:` del banner (y del resto de la SPA) compilan como `@media (prefers-color-scheme: dark)` y no responden al `ThemeToggle` que añade `.dark` a `<html>`. El banner sigue siendo legible en ambos temas; es una inconsistencia heredada, no bloqueante.
- [minor] `wow-armory-client/src/components/Header/Header.tsx:90` / `SearchBar.tsx:16-18` — en móvil el botón icon-only mide ~34 px de alto (`py-2` + icono `h-4`) frente a los ~42 px del input (`py-2` + texto base), por lo que los dos controles de la misma fila no comparten altura; un `py-2.5`/`h-10` los alinearía. Solo estético.
