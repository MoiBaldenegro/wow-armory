VERDICT: PASS

# UI review — ronda 1

## Hallazgos

- Home sin regresión estructural: los componentes movidos a `presentation/`
  (`Header`, `AuthErrorBanner`, `CharacterBanner`, `RecentAchievements`,
  `CharacterCard`, `StatBar`, `Footer`) conservan clases y contenido; el único
  cambio en `Header` es la eliminación del `console.log`. `HomePage.tsx:12`
  reproduce el wrapper anterior (`bg-gray-100 dark:bg-gray-900` equivale al
  condicional por estado) y mantiene orden, jerarquía, spacing y tipografía.
- `tailwind.config.js:3` declara `darkMode: 'class'` y `ThemeProvider.tsx:45-48`
  aplica la clase en `document.documentElement`; las variantes `dark:` de la
  home y de las páginas nuevas resuelven correctamente y no he detectado doble
  fondo ni contraste roto por clases. El toggle persiste en `localStorage` y
  respeta `prefers-color-scheme` al inicializar.
- [minor] `wow-armory-client/src/presentation/providers/ThemeProvider.tsx:43-54`
  — el tema se aplica en un `useEffect`, después del primer render, y
  `index.html` no tiene bootstrap previo; con tema oscuro persistido o
  `prefers-color-scheme: dark` habrá un destello claro en la primera carga. No
  bloquea (el tema termina aplicándose y persistiendo), pero para 009/010
  conviene fijar la clase antes del primer paint.
- [minor] `wow-armory-client/src/presentation/pages/ProfilePage.tsx:5` — no
  consume `error` de `useAuth`; si falla `checkSession`, la página cae en el
  estado no autenticado sin explicación. La spec sólo exige
  loading/autenticado/no autenticado, así que no bloquea; añadir el estado de
  error en 009.
- [minor] `wow-armory-client/src/presentation/pages/CharacterProfilePage.tsx:11`
  — usa `p-8` fijo frente a `p-6 sm:p-8` del resto de páginas; a 320 px reduce el
  ancho útil y rompe la consistencia de espaciado. Cambiar a `p-6 sm:p-8`.
- [minor] `ProfilePage.tsx:8`, `ErrorPage.tsx:21`, `NotFoundPage.tsx:5` y
  `CharacterProfilePage.tsx:10` — las páginas nuevas no montan
  `Header`/`Footer`/`ThemeToggle`. Como páginas standalone la tarjeta y la
  paleta son coherentes con la home, pero se pierde el control de tema y la
  navegación global; para 009 conviene un layout compartido y un enlace visible
  a `/profile`.
- [minor] `wow-armory-client/src/presentation/components/ThemeToggle.tsx:8-13`
  — conserva iconos, posición, clases, sombra y etiqueta accesible en español,
  pero no declara `focus-visible` explícito y depende del outline del navegador;
  añadir un ring consistente con `Header` en 009.

No hay navegador visual disponible: el veredicto se basa en clases y estructura.
No puedo verificar el destello real, el solapamiento del toggle fijo en
320/375 px con el header/banner, la transparencia del header al hacer scroll, las
animaciones de framer-motion ni ratios de contraste medidos.

Observación fuera del diff: `wow-armory-client/index.html:2` y `:15` contienen
texto suelto preexistente (`// return commit`, `|`) que no se imputa a esta
ronda, pero conviene limpiar en 010.
