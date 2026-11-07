VERDICT: PASS

# UX review — ronda 2

## Hallazgos

Los dos majors de la ronda 1 quedan resueltos. El `error` del `AuthProvider` se
muestra en `AuthErrorBanner` (`wow-armory-client/src/components/AuthErrorBanner.tsx:37-48`,
con `role="alert"` y mensajes en español) y se limpia al reintentar
(`wow-armory-client/src/providers/AuthProvider.tsx:40,78,99`). El header ya no
desborda: el buscador encoje con `min-w-0 flex-1`
(`wow-armory-client/src/components/Header/Header.tsx:80-82`), el logo es compacto
(`Logo.tsx:10-18`), los gaps son responsive (`Header.tsx:78`) y el botón es
icon-only con `aria-label` por debajo de `sm` (`Header.tsx:88-96`); a 320/375/768
la fila cabe y el botón queda visible según el análisis de clases. También están
cubiertos el battletag accesible, el fondo sólido y `focus-visible` del botón
(`Header.tsx:88-90`) y el reset de `isLoading` en bfcache
(`AuthProvider.tsx:62-74`).

- [minor] `wow-armory-client/src/components/AuthErrorBanner.tsx:48` — `urlError ?? error`
  hace que el mensaje de `?auth_error=` gane siempre. Si la persona vuelve con
  `access_denied` y después reintenta el login y este falla, el banner sigue
  mostrando la cancelación antigua y oculta el fallo nuevo; conviene limpiar
  `urlError` al reintentar o priorizar el error más reciente.
- [minor] `wow-armory-client/src/components/Header/Header.tsx:80-82` y
  `wow-armory-client/src/components/Header/SearchBar.tsx:11` — al pasar a
  `flex-1`, el buscador ocupa todo el ancho restante también en escritorio
  (antes tenía `md:w-96`), por lo que en pantallas grandes queda mucho más ancho
  que el patrón anterior. No impide usarlo, pero si el ancho completo no es
  intencional conviene acotarlo.
- [minor] `wow-armory-client/src/components/Header/SearchBar.tsx:14` — el
  placeholder sigue en inglés ("Search character...") mientras el `aria-label`
  (`:15`) y el resto de la UI están en español; unifica el copy.
- [minor] No hay navegador headless en el entorno: la verificación de 320/375/768
  es estática sobre las clases Tailwind, así que conviene confirmar el header en
  un navegador o dispositivo real antes de cerrar la parte visual.
