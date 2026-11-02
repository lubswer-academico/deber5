# MEMORY.md – EPMAPS
Memoria del proyecto entre sesiones. Máximo ~50 líneas.

## Estado actual
- Home screen actualizado con animación de salida desacoplada por botón:
  - Manejo de estado `useState` por botón (`isExitingSearch`, `isExitingQueue`, `isExitingPending`).
  - Al pulsar, el botón se desmonta y activa `SlideOutRight.duration(300).easing(Easing.inOut(Easing.quad))`.
  - En su lugar se renderiza un placeholder transparente (`opacity-0`) conservando el espacio.
  - Botón de "Cerrar sesión" en `HomeAppLayout` elevado con margen inferior dinámico seguro (`Math.max(insets.bottom + 20, 36)`).
  - El layout compartido `HomeAppLayout` se mantiene en todas las pantallas.
- Calidad: 15 suites / 153 tests pasando 100% en verde con Jest (`npx jest`) y 0 errores en TypeScript (`npx tsc --noEmit`).

## Decisiones (y por qué)
- Transición de navegación fade (`animation: 'fade'` en Stack): Desvanece la pantalla en lugar de aplicar el zoom nativo o scale de Android, permitiendo una transición suave entre rutas.
- Placeholder transparente al desmontar: En lugar de un Fragment vacío `<></>`, se coloca un placeholder transparente (`opacity-0`) con las mismas dimensiones para conservar el espacio en el flujo vertical mientras se reproduce la animación de salida.

## Aprendizajes y errores a evitar
- Para activar animaciones de `exiting` en Reanimated sin depender de la navegación nativa del router, la técnica de alternar el renderizado condicional mediante estado (`!isExiting ? <Animated.View exiting={...}> : <></>`) unmounts limpiamente el componente.

## Próximos pasos
- Probar la interacción en Expo Go (`npx expo start`).



