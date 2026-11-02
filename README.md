# EPMAPS – Módulo de Autenticación, Firestore, Animaciones y Uniwind

Aplicación móvil desarrollada con **Expo (React Native + TypeScript + Expo Router)** para los técnicos de campo de la **Empresa Pública Metropolitana de Agua Potable y Saneamiento (EPMAPS)**. Este documento describe las implementaciones realizadas con **Cloud Firestore**, el sistema de **Animaciones fluidas con Reanimated** y la estilización reactiva con **Uniwind**.

---

## 1. Integración con Firebase & Cloud Firestore

Se implementó una arquitectura híbrida entre **Firebase Authentication** y **Cloud Firestore** para solventar la limitación de Firebase (que solo autentica por correo) y permitir el acceso de los técnicos mediante su **Código de Empleado institucional** (`TEC-XXX`).

### Archivos Principales
- `src/config/firebase.ts`: Inicialización de Firebase con persistencia local en `AsyncStorage` y exportación de instancias de `auth` y `db` (Firestore).
- `src/services/tecnicosFirestore.ts`: Servicios para interactuar con la colección `tecnicos` de Cloud Firestore.
- `src/components/auth/RegisterComponent.tsx`: Formulario de registro con generación automática de código y verificación por correo.
- `src/presentation/session/useSessionController.ts`: Controlador de autenticación con resolución de identificador (`TEC-XXX` o correo), comprobación de correo verificado y recuperación de clave.

### Flujos Clave Implementados

1. **Generación Automática de Códigos Secuenciales (`generarSiguienteCodigoTecnico`):**
   - Al registrar un técnico, se consulta la colección `tecnicos` en Firestore.
   - Se obtiene el código numérico más alto (`TEC-001`, `TEC-002`...) y se genera de forma determinista el siguiente (`TEC-003`) con padding de ceros a la izquierda.

2. **Ficha Completa de Técnico en Firestore (`tecnicos/{uid}`):**
   - Se crea el usuario en Firebase Authentication y se guardan sus datos extendidos en Cloud Firestore:
     - `uid`: Identificador único de Firebase Auth.
     - `codigo`: Código institucional generado (`TEC-XXX`).
     - `nombre` y `apellido`: Nombre del técnico.
     - `correo`: Correo electrónico institucional.
     - `distrito`: Zona de cobertura asignada.
     - `creadoEn`: Marca temporal ISO de registro.

3. **Autenticación Inteligente por Código de Empleado:**
   - Si el técnico ingresa un código (sin `@`): la app consulta Firestore mediante una query filtrada `where('codigo', '==', 'TEC-XXX')`.
   - Recupera el documento del técnico y obtiene el correo asociado.
   - Ejecuta `signInWithEmailAndPassword` con el correo obtenido y la contraseña ingresada.
   - **Verificación de correo obligatoria:** Se evalúa `user.emailVerified`. Si aún no ha confirmado su correo desde el enlace enviado al registrarse, se le impide el acceso temporalmente y se le ofrece un botón para reenviar el correo de verificación.

4. **Recuperación de Contraseña:**
   - Modal interactivo con envío de correo de restablecimiento seguro mediante `sendPasswordResetEmail(auth, correo)`.

---

## 2. Sistema de Animaciones Reactivas (React Native Reanimated)

Se desarrollaron animaciones nativas a 60/120 fps en el hilo de interfaz de usuario (UI Thread) para mejorar la experiencia táctil y ergonomía en campo.

### A. Animación Reactiva del Teclado (`useAnimatedKeyboard` + `useAnimatedStyle`)
Ubicación: `src/app/principal.tsx`
- **Detección continua de altura:** `useAnimatedKeyboard` monitorea la apertura y cierre del teclado físico/virtual en tiempo real milímetro a milímetro.
- **Elevación proporcional del formulario:** `formKeyboardAnimatedStyle` traslada hacia arriba el formulario (`translateY: -keyboard.height.value * 0.50`), garantizando visibilidad de los campos sin aplastarse contra el encabezado.
- **Desvanecimiento del selector de pestañas:** `tabBarAnimatedStyle` oculta suavemente (`opacity: 0`, `translateY: -15`) los botones de *"Iniciar Sesión / Registro"* y deshabilita sus eventos táctiles mientras el teclado está activo.

### B. Barra Animada de Fortaleza de Contraseña (`zxcvbn` + Reanimated)
Ubicaciones: `src/components/auth/RegisterComponent.tsx` y `src/components/auth/PasswordStrengthBar.tsx`
- **Evaluación industrial:** Análisis en tiempo real de contraseñas mediante `zxcvbn-typescript` retornando un puntaje de seguridad de 0 a 4 (Débil a Muy Segura).
- **Medición física en pantalla:** `useAnimatedRef` y `measure` calculan las dimensiones exactas del contenedor en píxeles.
- **Transición por tiempo y física:** `withTiming` con curva cúbica `Easing.out(Easing.cubic)` para suavizar el avance de la barra durante 380 ms.
- **Transición cromática dinámica:** `interpolateColor` mezcla los tonos gradualmente de gris -> rojo -> ámbar -> verde claro -> verde esmeralda.
- **Crecimiento simétrico:** Al utilizar alineación centrada, la barra se expande desde el centro hacia ambos extremos.

### C. Animaciones de Navegación y Botones del Home
Ubicación: `src/app/home.tsx` y `src/app/_layout.tsx`
- **Animación de salida por botón (`SlideOutRight`):** Al presionar *Buscar Medidor*, *Bandeja de Lecturas* o *Lecturas en Cola*, el botón se desmonta y se desliza a la derecha con `Easing.inOut(Easing.quad)`.
- **Preservación del layout:** Se coloca un placeholder transparente (`opacity-0`) con las mismas dimensiones para que los demás botones no salten mientras dura la animación.
- **Transición suave de pantalla (`animation: 'fade'`):** Navegación fluida y sin saltos ni zoom del sistema operativo.

---

## 3. Estilización con Uniwind

Toda la interfaz visual fue diseñada y estilizada utilizando **Uniwind** (Tailwind CSS en React Native):

- **Archivo global:** `global.css` configurado como punto de entrada de estilos.
- **Metro Bundler:** Integrado en `metro.config.js` con el transformador CSS de Uniwind.
- **Tipado TypeScript:** Archivo de definición de tipos `uniwind-types.d.ts` para soporte de la propiedad `className` en componentes de React Native (`View`, `Text`, `TouchableOpacity`, `ScrollView`, etc.).
- **Paleta y tokens EPMAPS:** Uso de clases semánticas (`bg-[#245FA8]`, `text-[#003366]`, `border-slate-200/90`, `rounded-2xl`, sombras y layouts en flexbox adaptativos).

---

## 4. Configuración de Variables de Entorno

Crear un archivo `.env` basado en `.env_example`:

```env
# MockAPI / Backend de Oficina EPMAPS
EXPO_PUBLIC_OFFICE_API_URL="https://tu-api.mockapi.io/api/v1"

# Configuración de Firebase (Auth y Cloud Firestore)
EXPO_PUBLIC_FIREBASE_API_KEY="AIzaSy..."
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN="tu-proyecto.firebaseapp.com"
EXPO_PUBLIC_FIREBASE_PROJECT_ID="tu-proyecto"
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET="tu-proyecto.firebasestorage.app"
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="123456789012"
EXPO_PUBLIC_FIREBASE_APP_ID="1:123456789012:web:abcdef123456"
```

---

## 5. Comandos de Ejecución

- **Iniciar la aplicación:**
  ```bash
  npx expo start
  ```
- **Verificación de tipos TypeScript:**
  ```bash
  npx tsc --noEmit
  ```
- **Ejecutar pruebas unitarias:**
  ```bash
  npx jest
  ```
