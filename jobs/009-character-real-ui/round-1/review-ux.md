VERDICT: PASS

# UX review — ronda 1

## Hallazgos

Flujo revisado en el worktree `wow-armory-wt/009-character-real-ui` (commit
`c77920d`): home vacía, búsqueda de dos campos, búsqueda rápida del header,
ficha en carga, éxito, no encontrado, inválido, rate limit y no disponible, y
reintento. Cubre la spec: copy en español sin jerga, `role="status"` en la
carga, `role="alert"` en los errores, labels visibles, `aria-invalid` +
`aria-describedby` en los campos, foco al primer campo inválido, los dos
landmarks de búsqueda con nombres distintos ("Búsqueda rápida" / "Buscar
personaje"), foco visible en botones, inputs y enlace, variantes `dark:`,
`p-6 sm:p-8`, placeholders locales con `aria-hidden` y ningún
`undefined`/`NaN`/"Invalid Date". No hay blockers ni majors.

- [minor] `wow-armory-client/src/presentation/pages/CharacterProfilePage.tsx:68-72,74-85` — Al pulsar "Reintentar" en `rate-limited` o `unavailable`, la tarjeta de error se sustituye por la de carga. El botón se desmonta y el foco cae en `<body>`, así que quien usa teclado tiene que volver a recorrer el header para llegar al resultado o a "Reintentar". Es el mismo patrón que 008 corrigió en `ProfilePage`. Posible arreglo: mover el foco al `<h1>`/alerta del nuevo estado (con `tabIndex={-1}`) o dejar el botón montado y deshabilitado mientras carga.
- [minor] `wow-armory-client/src/presentation/components/CharacterSearchForm.tsx:53-70` y `components/Header/SearchBar.tsx:20-31` — Si se envía la misma búsqueda que ya muestra la ficha (por ejemplo, tras "Personaje no encontrado" se pulsa "Buscar" sin cambiar nada), `navigate` va a la misma ruta y no pasa nada visible: no se vuelve a consultar ni hay ninguna respuesta. Basta con aceptarlo o, si se quiere afinar, llamar a `retry()` cuando la ruta destino coincide con la actual.
- [minor] `wow-armory-client/src/presentation/pages/CharacterProfilePage.tsx:112` — En el estado `invalid` el formulario aparece vacío. Precargarlo con `realmSlug`/`characterName` de la URL (como en `not-found`, `:100-103`) ayudaría a ver y corregir el dato erróneo.
- [minor] `wow-armory-client/src/presentation/components/Header/SearchBar.tsx:72-80` — El error de la búsqueda rápida es una capa absoluta bajo el header fijo. Solo desaparece al escribir o al buscar con éxito: si se pierde el foco o se hace scroll, sigue tapando el contenido. Se podría cerrar con `Escape` o al hacer blur.
- [minor] `wow-armory-client/src/presentation/components/Header/SearchBar.tsx:60` — Viene de antes: en tema claro y con scroll 0 el header es transparente sobre `bg-gray-100`, así que `text-white` / `placeholder-white/50` casi no contrastan. Ahora que el placeholder "Buscar: reino/nombre" explica el formato, esa pista apenas se ve. Para un job de UI/a11y (004).
- [minor] `wow-armory-client/src/presentation/components/CharacterBanner.tsx:22-24`, `CharacterCard.tsx:40-42` y `RecentAchievements.tsx:14-16` — Las animaciones de entrada de `framer-motion` (fade + `y: 20`) no respetan `prefers-reduced-motion`, porque no hay `MotionConfig reducedMotion="user"` ni `useReducedMotion`. Viene de los componentes anteriores; sigue el mismo criterio que `ThemeToggle` (004).

## Cambios requeridos

Ninguno. Los minors son opcionales o quedan para el backlog.
