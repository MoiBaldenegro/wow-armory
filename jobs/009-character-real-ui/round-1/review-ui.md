VERDICT: PASS

# UI review — ronda 1

## Hallazgos

- [minor] `wow-armory-client/src/presentation/components/CharacterBanner.tsx:32-35` — En `sm+` el contenedor pasa a `sm:flex-row sm:items-end` y el avatar se alinea por abajo con el bloque de texto. Con `-mt-20` el margen negativo solo reduce su caja de margen. El borde superior queda unos 8 px por debajo del degradado y se pierde el solapamiento que sí se ve en móvil (`-mt-16`, en columna). No se rompe nada, pero el banner se ve distinto según el breakpoint. Bastaría con `sm:self-start` en el avatar, o con alinear la fila por arriba y bajar el texto con `sm:self-end`.
- [minor] `wow-armory-client/src/presentation/components/Header/SearchBar.tsx:60` — La barra del header sigue siendo blanca translúcida (`bg-white/10 text-white placeholder-white/50`). Con scroll 0 el header es transparente (`Header.tsx:14-18`) y, en tema claro, queda sobre `bg-gray-100`, así que el campo, el placeholder y el logo casi no se ven. Esto ya pasaba en `main` y la spec pide conservar el aspecto, así que no se exige aquí. Lo que cambia es que ahora el campo es funcional, y conviene llevarlo a 004 (fondo sólido del header en claro o variantes `dark:` para el input).
- [minor] `wow-armory-client/src/presentation/components/RecentAchievements.tsx:45-55` — Si un logro no trae `points`, su fila no tiene la ficha de 56 px. El nombre arranca entonces más a la izquierda que en las filas con puntos y la columna sale desalineada en listas mixtas. Se podría reservar el hueco con un placeholder neutro (p. ej. un "—" con `aria-hidden`).
- [minor] `wow-armory-client/src/presentation/pages/CharacterProfilePage.tsx:76-84` — La carga es solo texto gris dentro de la tarjeta. El header ya usa `Loader2` con `animate-spin` para su estado ocupado (`Header.tsx:62,88`). Un icono igual con `aria-hidden` haría el estado más reconocible y coherente con el resto de la SPA. No bloquea.
- [minor] `wow-armory-client/src/presentation/components/Header/SearchBar.tsx:55` — En móvil el campo del header es estrecho (`flex-1` entre el logo y el botón de sesión, con `pl-10`), así que el placeholder "Buscar: reino/nombre" puede cortarse. Es aceptable, pero un texto más corto ("reino/nombre") cabría mejor.

Lo verificado, sin problemas:

- La ficha, la home y los estados de error reutilizan el patrón neo-brutalista existente: `border-4 border-black`, sombra `8px_8px` y `rounded-xl`, con su versión `dark:` en blanco. Usan `p-6 sm:p-8` y `bg-gray-100`/`dark:bg-gray-900`. La alerta usa el mismo estilo que `AuthErrorBanner`, y el botón primario copia el de `ProfilePage`.
- La jerarquía tipográfica es coherente: `h1 text-3xl/4xl font-black`, `h2 text-2xl font-black` con icono de `lucide` `aria-hidden` y etiquetas `text-sm font-bold`. Los valores van en `text-lg font-black`.
- Responsive: `dl` con `grid-cols-1 sm:grid-cols-2`, tarjeta `lg:grid-cols-[2fr_1fr]` y formulario `sm:grid-cols-[1fr_1fr_auto]`. El `sm:mt-6` del botón lo alinea con los inputs debajo de la etiqueta y `sm:items-start` lo mantiene en su sitio cuando aparece un error. Hay `break-words`/`min-w-0` en los nombres largos.
- Estados visuales: el foco es visible (`focus-visible:ring-*`, también en `dark:`), los inputs inválidos llevan `aria-[invalid=true]:border-red-*` (la variante `dark:` gana por especificidad) y el error de la barra del header es un popover con borde y sombra en los dos temas. Los botones de `ProfilePage` muestran texto de carga sin cambiar de clases.
- No hay imágenes externas. El banner es un degradado CSS y el avatar usa iniciales, los dos `aria-hidden`. Las clases `purple-950`, `red-950` y `aria-*` están soportadas por Tailwind 3.4.13.

## Cambios requeridos

Ninguno.
