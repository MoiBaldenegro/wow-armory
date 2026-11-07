VERDICT: PASS

# UX review — ronda 2

## Hallazgos

- Resuelto el major de la ronda 1. `wow-armory-client/src/presentation/pages/ProfilePage.tsx:20-27` ahora lee `error` de `useAuth()` y lo muestra en un bloque `role="alert"` con el mismo estilo rojo y las mismas variantes `dark:` que `AuthErrorBanner`. El bloque queda fuera del ternario, así que se ve con sesión iniciada y sin ella. Los fallos de verificación, login y logout ya llegan a la persona con copy en español y sin jerga (`AuthProvider.tsx:66`, `:115`, `:139`). Como `AuthProvider` limpia `error` al empezar cada acción (`:47`, `:98`, `:122`), al reintentar desaparece el aviso anterior.
- Resuelto el minor de los tests. `wow-armory-client/src/presentation/pages/ProfilePage.test.tsx:70-142` cubre la alerta en los tres fallos y que el botón se mantiene montado, deshabilitado y con `aria-busy` durante el login.
- Resuelto el minor del foco. `ProfilePage.tsx:7-13` reserva "Cargando perfil…" para la verificación inicial. Después, los botones siguen montados (`:45-46`, `:60-61`), igual que en `Header`.
- [minor] `wow-armory-client/src/presentation/pages/ProfilePage.tsx:45,60` — Con `disabled` nativo, algunos navegadores quitan el foco del botón mientras está deshabilitado. Además, `aria-busy` por sí solo casi ningún lector de pantalla lo anuncia, así que durante el logout no hay ningún aviso de que algo está pasando. Si se quiere afinar más adelante: usar `aria-disabled` e ignorar el clic mientras carga, o cambiar el texto del botón (por ejemplo, "Cerrando sesión…"). No bloquea.
- [minor] Siguen pendientes, fuera del diff o del alcance, los puntos ya anotados para el backlog: `role="status"` en `CharacterProfilePage.tsx`, foco visible y `motion-safe` en `ThemeToggle.tsx`, y `lang="en"` más la línea suelta en `index.html`.
