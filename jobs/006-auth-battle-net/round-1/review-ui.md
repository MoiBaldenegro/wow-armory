VERDICT: CHANGES

# UI review — ronda 1

## Hallazgos

- [major] `wow-armory-client/src/components/Header/Header.tsx:69-81` — el header pasó de dos a tres hijos en una fila `flex` sin `flex-wrap`: `Logo` (texto `text-2xl` no compacto), `SearchBar` con `w-full md:w-96` (`SearchBar.tsx:11-13`) y el nuevo botón con `shrink-0`. En móvil no caben: a 375 px el contenedor útil es 343 px (375 − 2×16), y solo logo (~180 px), botón (~120 px) y los dos `gap-8` (64 px) ya suman ~364 px antes de contar el ancho mínimo del input. El resultado es scroll horizontal y/o un buscador comprimido hasta ser inutilizable, rompiendo el layout fijo del header. Criterio: el header debe caber en el viewport en 320/375/768 px sin desbordar ni tapar el contenido.
- [minor] `wow-armory-client/src/components/Header/Header.tsx:78` — con `scrollY=0` el header es transparente (`Header.tsx:13-17`) sobre el fondo `bg-gray-100` de `App.tsx:20-22`; el `text-white` del botón queda a ~1.1:1 de contraste y el chip `bg-white/10` se funde con el fondo gris claro, por lo que el control es casi ilegible en el primer viewport. Es un problema heredado del logo y del buscador, pero el botón es nuevo: un fondo sólido oscuro del chip (p. ej. `bg-gray-900/90` + `border-white/30`) lo haría legible tanto en reposo como tras hacer scroll.
- [minor] `wow-armory-client/src/components/Header/Header.tsx:78` — el botón no define estado de foco, mientras el `SearchBar` vecino usa `focus:outline-none focus:ring-2 focus:ring-white/30` (`SearchBar.tsx:17-19`). Añadir un `focus-visible:ring-2 focus-visible:ring-white/30` mantiene el foco visible y coherente sobre el header oscuro.
- [minor] `wow-armory-client/src/components/Header/Header.tsx:11` — el header descarta el `error` del contexto y no lo muestra en ningún sitio; `AuthProvider` lo rellena en fallos de sesión/login/logout (`AuthProvider.tsx:49-52`, `AuthProvider.tsx:77-80`, `AuthProvider.tsx:93-95`). Ante un fallo de red, el botón vuelve a su estado sin explicación. La spec solo exige el banner de `?auth_error=`, así que no bloquea, pero conviene renderizar `error` con el mismo patrón visual de `AuthErrorBanner`.

## Cambios requeridos

- [major, bloqueante] Ajustar el header para móvil: permitir que el buscador encoja (`min-w-0` en el wrapper de `SearchBar`), reducir el `gap` en pantallas pequeñas y ocultar/acortar el buscador o el texto del botón de sesión (icono con `aria-label` o etiqueta corta) para que la fila quepa sin scroll horizontal ni solapamientos. Verificar a 320, 375 y 768 px que el botón de sesión queda completamente visible.
- [minor, recomendado] Dar al botón un fondo sólido legible en el estado transparente del header y añadir un `focus-visible` coherente con el buscador.
- [minor, recomendado] Mostrar el `error` del `AuthProvider` (reutilizando el estilo del banner) para que los fallos de login/logout no sean silenciosos.
