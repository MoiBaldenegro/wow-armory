VERDICT: CHANGES

# UX review — ronda 1

## Hallazgos

- [major] `wow-armory-client/src/presentation/pages/ProfilePage.tsx:5` — La página no lee ni muestra `error` de `useAuth()`. `AuthProvider` sí genera copy en español (`AuthProvider.tsx:66`, `:115`, `:139`), pero en `/profile` nadie lo enseña. Esto deja tres fallos sin ningún aviso en la única página dedicada a la sesión:
  1. Si falla `login`, la persona pulsa "Iniciar sesión", ve "Cargando perfil…" y vuelve al mismo botón sin saber qué pasó.
  2. Si falla `logout`, sigue viendo "Sesión iniciada como …" sin saber que no se cerró.
  3. Si falla `checkSession` (red/5xx), se le dice "Inicia sesión con Battle.net para ver tu perfil." aunque el problema es del servidor y quizá ya tenga sesión.

  En la home el error sí se ve gracias a `AuthErrorBanner`, así que el comportamiento es incoherente entre páginas. El criterio de la spec pide `role="alert"` "donde corresponda" en `ProfilePage`, y este es justo ese caso.
- [minor] `wow-armory-client/src/presentation/pages/ProfilePage.tsx:12-46` — Al pulsar "Iniciar sesión" o "Cerrar sesión", `isLoading` pasa a `true` y el botón se desmonta y se sustituye por el `<p role="status">`. El foco del teclado cae en `<body>`, y tras un logout la persona de teclado o lector de pantalla tiene que volver a recorrer la página. Mejor mantener el botón montado (`disabled` + `aria-busy`, como ya hace `Header.tsx:691-697`) y reservar el estado de carga a pantalla completa para la verificación inicial.
- [minor] `wow-armory-client/src/presentation/pages/ProfilePage.test.tsx:25-69` — No hay test del estado de error de `ProfilePage`. Al añadirlo se cubre el hallazgo major.
- [minor] `wow-armory-client/src/presentation/pages/CharacterProfilePage.tsx:18-23` — `role="status"` en un texto estático que no cambia no aporta nada. Además, hace que algunos lectores lo anuncien dos veces junto al párrafo anterior. Puede ser un `<p>` normal.
- [minor] `wow-armory-client/src/presentation/pages/ErrorPage.tsx:30-34` — "Código de error: `access_denied`" es jerga técnica para la persona. Es aceptable como dato de soporte, pero conviene que sea secundario (ya lo es por tamaño y color). No bloquea.
- [minor] `wow-armory-client/src/presentation/components/ThemeToggle.tsx:11` — El toggle no tiene foco visible (`focus-visible:ring-*`) y su `hover:scale-110` no respeta `prefers-reduced-motion` (`motion-safe:`). Viene de antes y la spec pide conservar las clases, así que solo se anota para un job posterior.
- [minor] `wow-armory-client/index.html:2-3` — Ya existía: hay una línea suelta `// return commit` antes de `<html>` y `lang="en"` en una app en español. Los lectores de pantalla pronunciarán el copy con fonética inglesa. Queda fuera del diff; se anota para el backlog.

Lo que funciona bien:
- La home conserva su jerarquía, y el banner `auth_error` sigue funcionando.
- `ErrorPage` acepta `auth_error` y `code` y da copy español claro para los códigos conocidos y un mensaje genérico para el resto.
- `NotFoundPage` y `ErrorPage` tienen `h1`, enlaces con nombre accesible, foco visible y variantes `dark:`.
- El shell de `CharacterProfilePage` deja claro que la ficha llega más adelante.
- La etiqueta de `ThemeToggle` está en español y refleja la acción.

## Cambios requeridos

1. En `ProfilePage.tsx`, leer `error` de `useAuth()` y, cuando exista, mostrarlo en un bloque `role="alert"` con el mismo estilo que `AuthErrorBanner`/`ErrorPage` (`border-red-300 bg-red-50 … dark:bg-red-950 dark:text-red-200`). Debe mostrarse tanto en el estado autenticado como en el no autenticado, para que los fallos de login, logout y verificación de sesión sean visibles.
2. Añadir en `ProfilePage.test.tsx` al menos un caso en el que `checkSession` o `startLogin` rechace y se verifique que aparece el `role="alert"` con el copy en español.
