VERDICT: CHANGES

# UX review — ronda 1

## Hallazgos

- [major] `wow-armory-client/src/providers/AuthProvider.tsx:52` — `error` se guarda en el contexto (también en `:79` y `:94`) pero ningún componente lo muestra: `Header.tsx:11` no lo consume y `AuthErrorBanner` solo lee `?auth_error=`. Si falla `/auth/session`, `/auth/login` o `/auth/logout` (red caída, 5xx, CORS), la persona vuelve a ver "Iniciar sesión"/"Cerrar sesión" sin ningún aviso y cree que el clic no hizo nada; en logout el estado sigue autenticado pero la UI no lo explica.
- [major] `wow-armory-client/src/components/Header/Header.tsx:69` — la fila fija ahora tiene Logo + `SearchBar` (`SearchBar.tsx:11-13` usa `w-full`, sin `min-w-0`) + botón `shrink-0` y sin breakpoints. En ~360-390 px el input no puede encogerse por debajo de su ancho intrínseco y el botón queda empujado fuera del viewport (o el header desborda horizontalmente); el control de sesión deja de ser visible/usables en móvil.
- [minor] `wow-armory-client/src/components/Header/Header.tsx:77` — el battletag solo se expone en `title`, así que solo aparece con ratón; en táctil y teclado no hay forma de ver con qué cuenta se ha iniciado sesión (y `title` no forma parte del nombre accesible del botón, que es correctamente "Cerrar sesión").
- [minor] `wow-armory-client/src/components/Header/Header.tsx:78` — el botón hereda texto blanco + `bg-white/10` sobre un header transparente; con el tema claro por defecto (`App.tsx:22`, `bg-gray-100`) y sin scroll el contraste del texto es prácticamente nulo, y `disabled:opacity-60` lo empeora durante "Cargando…". Es un patrón heredado del header, pero afecta al nuevo control.
- [minor] `wow-armory-client/src/providers/AuthProvider.tsx:76` — `login` deja `isLoading` en `true` tras redirigir y no lo resetea si se vuelve con el botón Atrás (restauración desde bfcache): el header puede quedarse en "Cargando…" deshabilitado de forma permanente (`Header.tsx:53-55`), sin forma de reintentar salvo recargar.

## Cambios requeridos

1. Mostrar el `error` del contexto cuando fallen `login`, `logout` o la verificación de sesión: renderizarlo en `AuthErrorBanner` (o en un aviso equivalente dentro del flujo visible), limpiarlo al reintentar y usar los mensajes en español ya definidos en `AuthProvider`.
2. Corregir el header para tres elementos en móvil: permitir que `SearchBar` encoja (`min-w-0`/`flex-1`), y ocultar/compactar logo o búsqueda en pantallas pequeñas para que el botón de sesión siga visible y pulsable. Verificar a 360, 375 y 390 px con "Iniciar sesión" y "Cerrar sesión".
3. (menor) Mostrar el battletag de forma accesible cuando exista, o dejar de exponerlo solo en `title`.
4. (menor) Asegurar contraste del botón en tema claro y en estado "Cargando…" (fondo sólido/tema-aware en lugar de blanco translúcido).
5. (menor) Resetear el estado de carga al volver a la página tras la redirección de login (p. ej. `pageshow`), para evitar un "Cargando…" permanente.
