# 004-client-a11y — Mejorar foco, teclado y etiquetas ARIA del cliente

## Objetivo

Quien usa el teclado, un lector de pantalla o tiene activado
`prefers-reduced-motion` todavía se encuentra problemas en la SPA: el foco se
pierde, el popover no se cierra con Escape, hay animaciones que no respetan esa
preferencia, el texto del header apenas contrasta en tema claro y el `lang` del
documento es incorrecto. Este job reúne los minors de a11y/UI que dejaron 008 y
009, y añade lo básico que falta: skip link, landmarks, orden de foco y nombres
accesibles. Solo cambia la capa de presentación del cliente.

## Contexto

Código en `main` (después de 008 y 009). Todas las rutas son relativas a
`wow-armory-client/`.

- `index.html`:
  - Tiene una línea suelta `// return commit` antes de `<html>` y un `|` suelto
    después de `</html>`.
  - Declara `lang="en"` y `<title>Vite + React + TS</title>`.
  - Enlaza `/vite.svg`, pero no existe `public/`.
- `tailwind.config.js` declara `darkMode: 'class'`. `src/index.css` solo tiene la
  base de Tailwind.
- `src/presentation/router/AppRouter.tsx`:
  - `AppRoutes` contiene las `<Routes>` y `AppRouter` lo envuelve en
    `BrowserRouter`.
  - `CharacterProfilePage.test.tsx` usa `AppRoutes` dentro de `MemoryRouter` y
    `AppRouter.test.tsx` usa `AppRouter`.
  - Todo lo que sea global (skip link y `MotionConfig`) debe vivir en
    `AppRoutes` para que lo cubran los dos.
- Páginas: `HomePage` y `CharacterProfilePage` montan `Header`, `ThemeToggle`,
  `<main>` y `Footer`. `ProfilePage`, `ErrorPage` y `NotFoundPage` solo tienen
  `<main>`. Ningún `<main>` tiene `id` ni `tabIndex`.
- `components/Header/Header.tsx`:
  - El `motion.header` es fijo. Su fondo va de `rgba(0,0,0,0)` a
    `rgba(0,0,0,0.8)` según el scroll.
  - Con scroll 0 en tema claro, el logo, el input y el icono son blancos sobre
    `bg-gray-100`, así que no contrastan.
  - El spinner del botón de auth usa `animate-spin` sin `motion-safe`.
- `components/Header/Logo.tsx`: no es un enlace y el icono `Sword` no tiene
  `aria-hidden`.
- `components/Header/SearchBar.tsx`:
  - Popover de error `role="alert"` (líneas 72-80): no se cierra con Escape ni al
    perder el foco.
  - Placeholder `Buscar: reino/nombre` (línea 55), que se corta en móvil.
  - Input `bg-white/10 placeholder-white/50` (línea 60).
- `components/ThemeToggle.tsx`: le falta `focus-visible:ring-*` y usa
  `hover:scale-110` sin `motion-safe`.
- `components/Footer.tsx`:
  - Textos en inglés.
  - Siete enlaces `href="#"`: tres de "Quick Links" y tres de redes sociales.
    Los iconos no tienen nombre accesible.
  - Usa `h3` sin `h2` previo y el `Heart` no tiene `aria-hidden`.
- `components/CharacterBanner.tsx` (líneas 32-35): el avatar usa
  `-mt-16 sm:-mt-20` dentro de un flex `sm:items-end` y pierde el solapamiento en
  `sm+`.
- `components/RecentAchievements.tsx` (líneas 45-55): las filas sin `points` no
  reservan el hueco de 14×14 y quedan desalineadas.
- `components/CharacterBanner.tsx`, `CharacterCard.tsx`, `RecentAchievements.tsx`
  y `Footer.tsx` usan `framer-motion` y no hay ningún `MotionConfig`.
- `pages/CharacterProfilePage.tsx`:
  - El botón "Reintentar" (líneas 68-72) se desmonta al pasar a `loading` y el
    foco cae en `<body>`.
  - La carga es un `<p role="status">` sin spinner.
  - En `invalid` (línea 112), `<CharacterSearchForm />` aparece sin precarga.
- `components/CharacterSearchForm.tsx` y `SearchBar.tsx`: si se envía la misma
  búsqueda que la ruta actual, se navega al mismo path y no pasa nada visible.
- `hooks/useCharacter.ts` expone `retry()`.
- `role="status"` "sobrante" (008, `review-ux.md`): se refería a un texto
  estático que 009 ya eliminó. Hoy el único `role="status"` de la ficha está en el
  estado de carga, que es dinámico y es correcto. Se mantiene.
- Tests existentes que se verán afectados:
  - `SearchBar.test.tsx:25-31` comprueba el placeholder `Buscar: reino/nombre`.
  - `CharacterProfilePage.test.tsx:97` comprueba el `role="status"` de carga.
  - `ProfilePage.test.tsx:35,142` comprueba el `role="status"` de perfil.
- Restricción de paralelismo: el job corre en paralelo con
  `010-production-hardening`, que toca `wow-armory-server/` y
  `src/infrastructure/config/env.ts`. Este job solo puede modificar:
  - `src/presentation/**`
  - `index.html`
  - `tailwind.config.js`
  - `src/index.css`

## Criterios de aceptación

### Documento (`index.html`)

- [ ] `index.html` empieza por `<!doctype html>` seguido de `<html lang="es">`.
      No quedan `// return commit` ni `|` sueltos:
      `grep -nE "return commit|^\|" wow-armory-client/index.html` no devuelve
      nada.
- [ ] El `<title>` es `WoW Armory`. Se elimina el `<link rel="icon">` a
      `/vite.svg`, que no existe, y no se añaden archivos a `public/`.

### Skip link y landmarks

- [ ] `AppRoutes` renderiza, antes de las rutas, un enlace "Saltar al contenido
      principal" con `href="#main-content"`:
  - Es el primer elemento enfocable de cada ruta: el primer `Tab` desde `<body>`
    lo enfoca.
  - Es `sr-only` y se hace visible con `focus:not-sr-only` (o equivalente).
  - Cuando es visible queda por encima del header (`z-index` mayor que `z-50`) y
    tiene anillo de foco en los dos temas.
- [ ] Las 5 páginas (`HomePage`, `CharacterProfilePage`, `ProfilePage`,
      `ErrorPage`, `NotFoundPage`) tienen un único
      `<main id="main-content" tabIndex={-1}>` con `focus:outline-none`.
- [ ] Al activar el skip link (clic o Enter), `document.activeElement` pasa a ser
      el `<main>`. No basta con cambiar el hash, porque jsdom no mueve el foco:
      hace falta un manejador que llame a `focus()`.
- [ ] En `HomePage` y `CharacterProfilePage` hay exactamente un landmark de cada
      tipo: `banner` (`Header`), `main` y `contentinfo` (`Footer`).
- [ ] Orden de tabulación en `HomePage`:
  1. Skip link.
  2. Logo/inicio.
  3. Búsqueda rápida.
  4. Botón de auth.
  5. `ThemeToggle`.
  6. Contenido de `<main>`.
  7. Enlaces del footer.

  No hay ningún `tabIndex` positivo:
  `grep -rnE "tabIndex=\{[1-9]" wow-armory-client/src/presentation` no devuelve
  nada.

### Header, logo y búsqueda rápida

- [ ] `Logo` es un `Link` de React Router a `/` con nombre accesible
      `WoW Armory, inicio`. El nombre contiene el texto visible.
  - El icono lleva `aria-hidden="true"`.
  - Tiene anillo `focus-visible:ring-*`.
- [ ] Contraste del header con scroll 0 en tema claro. El fondo es oscuro desde
      el principio: el primer valor de `useTransform` deja de ser
      `rgba(0, 0, 0, 0)` y pasa a ser un gris o negro con opacidad ≥ 0.9, por
      ejemplo `rgba(17, 24, 39, 0.95)`. Así cumplen sobre ese fondo:
  - El texto del logo y del input alcanza ≥ 4.5:1.
  - El placeholder usa como mínimo `placeholder-white/70`.
  - El borde del input y el icono de búsqueda alcanzan ≥ 3:1.

  En tema oscuro el resultado visual no empeora.
- [ ] El placeholder de `SearchBar` es `reino/nombre` y el nombre accesible del
      input sigue siendo `Buscar personaje`. Se actualiza el test existente.
- [ ] Con el popover de error visible, pulsar `Escape` en el input lo oculta.
      `aria-invalid` vuelve a `false`, desaparece `aria-describedby` y el foco
      sigue en el input.
- [ ] Si el foco sale del formulario de búsqueda rápida (blur hacia un elemento
      fuera del `<form>`), el popover se oculta. El texto escrito no se borra.
- [ ] El spinner del botón de auth usa `motion-safe:animate-spin` en lugar de
      `animate-spin`.

### ThemeToggle y movimiento reducido

- [ ] `ThemeToggle` tiene `focus-visible:outline-none`, `focus-visible:ring-*` y
      `focus-visible:ring-offset-*`, y el anillo se ve en los dos temas.
  - `hover:scale-110` pasa a ser `motion-safe:hover:scale-110`.
  - Se mantienen el `aria-label` y el `title` actuales.
- [ ] `AppRoutes` envuelve todo su contenido en
      `<MotionConfig reducedMotion="user">` de `framer-motion`, que ya es
      dependencia. Comprobación:
      `grep -n "reducedMotion=\"user\"" wow-armory-client/src/presentation/router/AppRouter.tsx`
      devuelve una línea.
- [ ] Ninguna clase `animate-spin`, `transition-all` o `hover:scale-*` nueva queda
      sin el prefijo `motion-safe:`. Las `transition-colors` existentes pueden
      quedarse como están.

### Ficha del personaje (`CharacterProfilePage`)

- [ ] Estado de carga: el `<p role="status">` "Cargando personaje…" sigue
      existiendo y ahora va acompañado de un icono `Loader2` de `lucide-react`
      con `aria-hidden="true"` y `motion-safe:animate-spin`. El texto accesible
      del `status` sigue siendo exactamente "Cargando personaje…".
- [ ] Foco al reintentar: después de pulsar "Reintentar" en `unavailable` o
      `rate-limited`, el foco nunca queda en `<body>`.
  - Mientras carga, el foco está en el contenedor de carga (`tabIndex={-1}`).
  - Cuando llega la respuesta, el foco pasa al `<h1>` del nuevo estado
    (`tabIndex={-1}`): el nombre del personaje en `success`, o el título del
    problema en los estados de error.
  - En la carga inicial de la ruta, sin reintento, no se mueve el foco por
    programa.
- [ ] Estado `invalid`: `CharacterSearchForm` se precarga con `realmSlug` y
      `characterName` de la URL, igual que ya ocurre en `not-found`.
- [ ] Repetir la búsqueda actual: si desde `SearchBar` o `CharacterSearchForm` se
      busca el mismo reino y nombre que la ruta activa (sin distinguir
      mayúsculas), la consulta se relanza. Se vuelve a ver el estado de carga y
      el repositorio recibe una segunda llamada.
  - Interpretación conservadora: navegar al mismo path genera una nueva
    `location.key`, y `CharacterProfilePage` reacciona a su cambio, sin contar
    el montaje inicial, llamando a `retry()`.
  - Si se hace de otra forma, el comportamiento observable debe ser el mismo.
  - No se modifica `useCharacter.ts` salvo que sea imprescindible. Si se toca,
    sus 9 tests deben seguir pasando.

### Componentes de la ficha

- [ ] `CharacterBanner`: en `sm+` el avatar sigue solapando el degradado
      (`sm:self-start` o equivalente, manteniendo `sm:-mt-20`). En móvil no
      cambia.
- [ ] `RecentAchievements`: cuando un logro no tiene `points`, se renderiza un
      hueco `h-14 w-14 shrink-0` con `aria-hidden="true"` para que el nombre
      quede alineado con el de las filas que sí tienen puntos. El texto
      accesible de la fila no cambia: no aparece "puntos" ni "0".

### Footer

- [ ] Todo el texto visible del `Footer` está en español: descripción,
      encabezados, enlaces y copyright.
- [ ] No queda ningún `href="#"`:
      `grep -n 'href="#"' wow-armory-client/src/presentation/components/Footer.tsx`
      no devuelve nada.
  - Los enlaces internos son `Link` de React Router: "Inicio" → `/` y
    "Mi perfil" → `/profile`, dentro de `<nav aria-label="Pie de página">`.
  - Se eliminan "Leaderboards" y los iconos de redes sociales sin destino real.
- [ ] Los encabezados del footer son `h2`. El icono `Heart` lleva
      `aria-hidden="true"` y la frase se lee completa sin el icono, con un texto
      `sr-only` si hace falta.
- [ ] Los enlaces del footer tienen un anillo `focus-visible:ring-*` que se ve
      sobre `bg-gray-900`.

### Tests nuevos o ajustados (Vitest + Testing Library + user-event)

- [ ] `AppRouter.test.tsx`:
  - En `/`, el primer `userEvent.tab()` enfoca "Saltar al contenido principal".
  - Al activarlo, el foco queda en `#main-content`.
  - Cada una de las 5 rutas tiene exactamente un `main` con `id="main-content"`.
- [ ] `SearchBar.test.tsx`:
  - Placeholder `reino/nombre`.
  - Escape cierra el error y el foco sigue en el input.
  - El blur fuera del formulario cierra el error.
- [ ] `CharacterProfilePage.test.tsx`:
  - Foco tras "Reintentar": un primer `CharacterUnavailable` seguido de éxito
    deja el foco en el `<h1>` "Billiemoi".
  - Precarga del formulario en `invalid`.
  - Volver a enviar la búsqueda de la ruta actual hace 2 llamadas al
    repositorio.
  - El `role="status"` de carga mantiene su texto.
  - Existe el enlace `WoW Armory, inicio` y apunta a `/`.
- [ ] `Footer.test.tsx` (nuevo, con `MemoryRouter`):
  - No hay ningún enlace con `href="#"`.
  - Existen los enlaces "Inicio" (`/`) y "Mi perfil" (`/profile`).
  - El landmark `contentinfo` está presente.
- [ ] `RecentAchievements.test.tsx` (nuevo): un logro sin `points` renderiza el
      hueco `aria-hidden` y su `listitem` no contiene "puntos".
- [ ] Los tests existentes siguen pasando, incluidos los 137 de 009 o su número
      actualizado, y no se elimina ningún test sin sustituirlo por uno
      equivalente.

### Alcance y verificación

- [ ] `git diff --name-only main...factory/004-client-a11y` solo lista archivos
      de:
  - `wow-armory-client/src/presentation/`
  - `wow-armory-client/index.html`
  - `wow-armory-client/tailwind.config.js`
  - `wow-armory-client/src/index.css`
  - `jobs/004-client-a11y/`

  No cambian `package.json`, `package-lock.json`, `src/domain/`,
  `src/application/`, `src/infrastructure/`, `src/main.tsx`, `src/test/` ni
  `wow-armory-server/`.
- [ ] Ningún `any` nuevo. `npm run lint`, `npm test` y `npm run build` pasan en
      `wow-armory-client/`.

## Plan de pruebas

- `cd wow-armory-client && npm run lint`
- `cd wow-armory-client && npm test`
- `cd wow-armory-client && npm run build`
- `cd wow-armory-client && npx tsc -p tsconfig.app.json --noEmit`
- `grep -nE "return commit|^\|" wow-armory-client/index.html` (debe salir
  vacío)
- `grep -n 'lang="es"' wow-armory-client/index.html` (1 línea)
- `grep -n 'href="#"' wow-armory-client/src/presentation/components/Footer.tsx`
  (vacío)
- `grep -rnE "tabIndex=\{[1-9]" wow-armory-client/src/presentation` (vacío)
- `grep -rnE "(^|[\"' {])(animate-spin|hover:scale-)" wow-armory-client/src/presentation`
  (vacío: todas las coincidencias deben llevar `motion-safe:`)
- `grep -n 'reducedMotion="user"' wow-armory-client/src/presentation/router/AppRouter.tsx`
  (1 línea)
- `git diff --stat main...factory/004-client-a11y -- wow-armory-server wow-armory-client/package.json wow-armory-client/package-lock.json wow-armory-client/src/infrastructure wow-armory-client/src/domain wow-armory-client/src/application`
  (vacío)
- Manual, opcional (`npm run dev`):
  - Recorrer `/` y `/character/<reino>/<nombre>` solo con teclado, en tema claro
    y en tema oscuro.
  - Activar "Reducir movimiento" en el sistema operativo y comprobar que las
    tarjetas aparecen sin desplazamiento.
  - Comprobar el contraste del header con scroll 0 usando las DevTools.

## Fuera de alcance

- `src/infrastructure/`, `src/domain/`, `src/application/`, `src/main.tsx`,
  `src/test/`, `package.json` y `package-lock.json`. No se añaden dependencias,
  tampoco `axe` ni `jest-axe`.
- `wow-armory-server/` y todo lo que hace 010 (incluido `env.ts`).
- 011: value objects, ADRs, contrato del servidor y mensajes en inglés de
  `InvalidSearchInput`. 012: deploy.
- Títulos de documento por ruta (`document.title` dinámico), el destello de tema
  en la primera carga y el contador en vivo de `retryAfterSeconds`.
- Deshabilitar "Reintentar" mientras dura `retryAfterSeconds` (es un minor de
  seguridad de 009 sin job asignado).
- Rediseñar el layout: no se crea un layout compartido nuevo ni se añaden
  `Header` y `Footer` a `ProfilePage`, `ErrorPage` o `NotFoundPage`.
- Traducir clase, raza y especialización, que llegan en `en_US` desde el
  servidor.

## Riesgos

- **Header con fondo oscuro desde scroll 0.** Cambia la estética del header
  transparente. Es la vía más pequeña para que contraste, porque mantiene la
  paleta blanca actual sin estilos distintos por tema en `motion values`. El
  revisor de UI debe validar el resultado en los dos temas. Una alternativa
  aceptable es usar clases claras y oscuras según `useTheme`, siempre que cumpla
  los mismos ratios.
- **`MotionConfig reducedMotion="user"` no cubre todo.** Solo desactiva las
  animaciones de transformación y layout: la opacidad sigue animándose, y los
  `useTransform` del header (fondo y padding ligados al scroll) no se ven
  afectados. Se acepta porque no son movimientos espaciales autónomos. No hay
  que reescribir el header.
- **Repetir la búsqueda de la misma ruta.** Depende de que `navigate()` a un path
  idéntico genere una nueva `location.key` en `BrowserRouter`/`MemoryRouter` de
  React Router 6.30. Si no lo hace, el builder puede pasar
  `state: { refresh: <nonce> }` o avisar a la página mediante otro mecanismo
  dentro de `presentation/`. El criterio se comprueba por comportamiento: hay 2
  llamadas al repositorio. Además, el efecto que reacciona al cambio no debe
  dispararse en el montaje, para no duplicar la consulta inicial, ni con
  StrictMode.
- **Gestión de foco tras reintentar.** Mover el foco en cada cambio de estado
  podría robarlo en la carga inicial. Por eso solo se mueve si el usuario ha
  pulsado "Reintentar" o ha repetido la búsqueda. Hay que usar un ref o flag en
  presentación y limpiarlo después de usarlo.
- **Blur del popover.** Debe usar `relatedTarget`/`contains` sobre el `<form>`.
  Si no, al pulsar el propio botón o el input se cerraría antes de tiempo. jsdom
  sí rellena `relatedTarget` con `userEvent.tab()`.
- **Eliminar enlaces del footer.** Se pierden las redes sociales y
  "Leaderboards". Se eligió la interpretación más conservadora porque no hay
  URLs reales en el repositorio y un enlace `#` es peor que no tener enlace. Si
  se quieren URLs reales, debería ser otro ítem.
- **Ambigüedad del `role="status"` "sobrante" de 008.** El texto estático al que
  se refería ya no existe. Se interpreta como resuelto y se mantiene el `status`
  dinámico de carga. No hay que añadir más regiones `status` ni `alert`.
- **Paralelismo con 010.** Ninguno de los dos jobs toca archivos del otro.
  Cualquier cambio fuera de los paths permitidos debe tratarse como bloqueo en
  la revisión de código.
