# Guía Técnica Detallada: Cómo y Dónde se Resolvió cada Requerimiento (R1 a R10)

Este documento explica a fondo, requerimiento por requerimiento (**R1 a R10**), **cuál es la solución implementada**, **en qué archivos exactos vive cada parte del código**, **por qué se tomó esa decisión técnica (ADRs y arquitectura)**, **cómo fluyen los datos entre pantallas** y **cómo comprobarlo** (tanto en código con pruebas unitarias como manualmente en el teléfono).

---

## Resumen Rápido de las 4 Capas del Proyecto

Antes de revisar cada requisito, recuerda cómo se divide el trabajo en [`src/`](../src):

1. **[`src/domain/`](../src/domain) (El cerebro / Reglas puras):**
   - `types.ts`: Define **la forma** de los datos (interfaces).
   - `*Rules.ts`: Recibe un dato, **lo valida o calcula** y devuelve el resultado. No sabe nada de React, ni de internet, ni de memoria.
2. **[`src/storage/`](../src/storage) (La libreta interna del teléfono):**
   - Guarda y lee JSON en la memoria permanente del teléfono (`AsyncStorage`) para que nada se pierda sin internet o si se cierra la app.
3. **[`src/services/`](../src/services) (La conexión con el exterior y hardware):**
   - Habla con MockAPI por internet (`Axios`), abre la cámara física (`expo-image-picker`) y guarda archivos `.jpg` en el disco (`expo-file-system`).
4. **[`src/presentation/`](../src/presentation) y [`src/app/`](../src/app) (El director de orquesta y las pantallas):**
   - Los hooks `use...Controller.ts` en `presentation/` conectan las reglas de `domain/` con `storage/` y `services/`, y les entregan datos listos a las pantallas de `app/`.

---

## R1. Identificación del Técnico y Persistencia de Sesión

> **Enunciado:** *Al iniciar la jornada, el técnico se identifica en la app con su código de empleado y una clave. La aplicación lo recuerda hasta que cierre sesión (En esta prueba, se puede manejar datos quemados, no es necesario administrar la gestión de usuarios).*

### 1. ¿Cuál fue la solución y por qué se hizo así?
- **Datos quemados desacoplados en el Dominio:** Se creó un catálogo constante `DEFAULT_TECHNICIANS_CATALOG` (`TEC-001` / `1234`, `TEC-002` / `5678`, `TEC-003` / `9012`) dentro de [`src/domain/session/sessionRules.ts`](../src/domain/session/sessionRules.ts). Así el login funciona **100% offline** incluso si el técnico abre la app en un sótano sin cobertura.
- **¿Dónde se guarda el estado de que hay sesión iniciada?**
  Se guarda en **dos niveles**:
  1. **Nivel Físico (Disco del teléfono):** Usando `@react-native-async-storage/async-storage` (avalado por **[ADR-001](./adr/ADR-001-async-storage-sesion.md)**) bajo la clave `'epmaps_active_session'`. En Android esto se escribe en una base SQLite interna del sistema operativo que no se borra al cerrar la app ni al reiniciar el teléfono.
  2. **Nivel en Memoria RAM (React):** El hook [`useSessionController.ts`](../src/presentation/session/useSessionController.ts) mantiene `const [activeSession, setActiveSession] = useState(...)`.
- **¿Cómo se comparte el técnico entre pantallas?**
  Cualquier pantalla de la app que llame a `const { activeSession } = useSessionController()` lee inmediatamente de `AsyncStorage` quién es el técnico activo (`name` y `employeeCode`).

### 2. Archivos donde está programado
- **Molde de datos:** [`src/domain/session/types.ts`](../src/domain/session/types.ts) (`TechnicianCredentials`, `AuthenticatedTechnician`, `AuthResult`).
- **Reglas y catálogo quemado:** [`src/domain/session/sessionRules.ts`](../src/domain/session/sessionRules.ts)
  - `sanitizeEmployeeCode(code)`: Quita espacios accidentales al inicio o final (`" TEC-001 "` $\rightarrow$ `"TEC-001"`).
  - `validateCredentialsFormat(code, pin)`: Verifica que ningún campo esté vacío.
  - `authenticateTechnician(code, pin)`: Compara contra el catálogo quemado y devuelve `{ success: true, technician }`.
- **Guardado físico en el teléfono:** [`src/storage/session/sessionStorage.ts`](../src/storage/session/sessionStorage.ts)
  - `saveSession(technician)`: Guarda el JSON en `AsyncStorage`.
  - `getSession()`: Recupera el técnico. **Extra defensivo:** Si el JSON estuviera corrupto, lo limpia automáticamente con `removeItem` en lugar de romper la app.
  - `clearSession()`: Borra la clave `'epmaps_active_session'` cuando el técnico cierra turno.
- **Controlador y Pantallas:**
  - [`src/presentation/session/useSessionController.ts`](../src/presentation/session/useSessionController.ts): Une las reglas con el almacenamiento.
  - [`src/app/index.tsx`](../src/app/index.tsx): Al abrir la app, revisa `isAuthenticated`. Si es `true`, redirige directo a `/home`; si es `false`, envía a `/login`.
  - [`src/app/login.tsx`](../src/app/login.tsx): Pantalla de ingreso de credenciales.
  - [`src/app/home.tsx`](../src/app/home.tsx): Muestra los datos del técnico y el botón **"Cerrar Turno"**.

### 3. ¿Cómo se comprueba?
- **Pruebas automatizadas:**
  - [`src/domain/session/__tests__/sessionRules.test.ts`](../src/domain/session/__tests__/sessionRules.test.ts)
  - [`src/storage/session/__tests__/sessionStorage.test.ts`](../src/storage/session/__tests__/sessionStorage.test.ts)
- **Prueba manual:** Inicia sesión con `TEC-001` y clave `1234` $\rightarrow$ cierra completamente la app desde el selector de tareas de Android $\rightarrow$ vuelve a abrirla y verás que entra directo a Inicio sin pedir clave $\rightarrow$ presiona **"Cerrar Turno"** y comprobarás que vuelve a pedir login.

---

## R2. Formato de Código `MED-XXXXXX` y Bloqueo de Consultas Incompletas

> **Enunciado:** *El técnico identifica cada medidor escribiendo el código (etiqueta), que tiene el formato MED- seguido de seis dígitos numéricos. La aplicación no debe consultar el sistema de la oficina con un código incompleto.*

### 1. ¿Cuál fue la solución y por qué se hizo así?
- **Validación en tiempo real antes de tocar la red:** Se creó una expresión regular estricta (`/^MED-\d{6}$/`) en el dominio puro.
- **Autocompletado ergonómico para trabajo en campo (`normalizeMeterCode`):** Para ahorrarle tiempo al técnico en la calle, si el técnico escribe solo los números (por ejemplo `100201`), la función le antepone automáticamente el prefijo `MED-` convirtiéndolo en `MED-100201`.
- **Doble barrera para impedir consultas incompletas:**
  1. **Barrera en la Interfaz ([`meter-search.tsx`](../src/app/meter-search.tsx)):** El botón **"Consultar Medidor"** tiene `disabled={!isValidCode || isSearching}`. Mientras el código no tenga exactamente el formato `MED-XXXXXX`, el botón está deshabilitado y muestra un aviso en español debajo del campo.
  2. **Barrera en el Controlador ([`useMeterSearchController.ts`](../src/presentation/meter/useMeterSearchController.ts)):** Dentro de `searchMeter()`, antes de llamar a `Axios` o a la caché, vuelve a ejecutar `if (!validateMeterCodeFormat(normalizedCode)) return;`. Así es imposible que salga una petición HTTP con un código incompleto.

### 2. Archivos donde está programado
- **Reglas puras:** [`src/domain/meter/meterRules.ts`](../src/domain/meter/meterRules.ts)
  - `METER_CODE_REGEX = /^MED-\d{6}$/`
  - `normalizeMeterCode(rawInput)`: Limpia espacios, pasa a mayúsculas y agrega `MED-` si el usuario solo tecleó dígitos.
  - `validateMeterCodeFormat(code)`: Devuelve `true` solo si cumple exactamente `MED-` + 6 dígitos.
- **Controlador:** [`src/presentation/meter/useMeterSearchController.ts`](../src/presentation/meter/useMeterSearchController.ts) (`handleCodeChange` y guarda de seguridad en `searchMeter`).
- **Pantalla:** [`src/app/meter-search.tsx`](../src/app/meter-search.tsx) (campo de texto con `maxLength={10}` y botón bloqueado si `!isValidCode`).

### 3. ¿Cómo se comprueba?
- **Pruebas automatizadas:** [`src/domain/meter/__tests__/meterRules.test.ts`](../src/domain/meter/__tests__/meterRules.test.ts) (prueba códigos cortos `MED-123`, letras inválidas `MED-12345A`, códigos vacíos y autocompletado numérico).
- **Prueba manual:** En **Buscar Medidor**, escribe `123` y verás que se formatea a `MED-123`, aparece el mensaje *"Formato requerido: MED-XXXXXX (6 dígitos)"* y el botón **Consultar Medidor** permanece desactivado hasta completar los 6 dígitos (ej. `MED-100201`).

---

## R3. Consulta en Línea (7 Campos) y Caché Local de Jornada

> **Enunciado:** *Con señal, la aplicación consulta y muestra los datos del medidor que envía el sistema de la oficina: dirección, sector, número de cuenta, estado, última lectura con su fecha y consumo promedio mensual. Si el técnico vuelve a consultar el mismo medidor durante la jornada, no debe esperar una nueva descarga (la app debe guardar en caché lo que ya consultó).*

### 1. ¿Cuál fue la solución y por qué se hizo así?
- **Estrategia *Cache-First* (Primero Caché, luego Red):**
  Cuando el técnico busca un medidor válido (`MED-100201`):
  1. Primero revisa en la memoria local del teléfono ([`meterCacheStorage.ts`](../src/storage/meter/meterCacheStorage.ts)) bajo la clave `'epmaps_meter_cache'`.
  2. **Si ya existe en el caché de la jornada:** Lo muestra de inmediato en `< 10 ms` con la etiqueta **"Memoria de Jornada"** sin hacer ninguna llamada HTTP a MockAPI (incluso si sí hay señal).
  3. **Si NO está en el caché y hay señal:** Consulta MockAPI usando `Axios` (**[ADR-004](./adr/ADR-004-axios-cliente-http.md)**) en [`officeApi.ts`](../src/services/officeApi.ts), muestra los 7 campos con la etiqueta **"Oficina en Línea"** y **guarda inmediatamente una copia en `meterCacheStorage`** para que la próxima consulta sea instantánea.
- **Traducción garantizada al español:** Como la API puede devolver estados en inglés (`active`, `suspended`, `inactive`), la función `formatMeterStatusLabel` en [`meterRules.ts`](../src/domain/meter/meterRules.ts) los traduce a **`Activo`**, **`Suspendido`** e **`Inactivo`**.

### 2. Archivos donde está programado
- **Molde de los 7 campos (`MeterRecord`):** [`src/domain/meter/types.ts`](../src/domain/meter/types.ts) (`code`, `address`, `sector`, `accountNumber`, `status`, `lastReading: { value, date }`, `averageConsumption`).
- **Caché de jornada en `AsyncStorage`:** [`src/storage/meter/meterCacheStorage.ts`](../src/storage/meter/meterCacheStorage.ts) (`saveMeterToCache`, `getMeterFromCache` indexado por código de medidor en un diccionario JSON).
- **Cliente HTTP hacia MockAPI:** [`src/services/officeApi.ts`](../src/services/officeApi.ts) (`fetchMeterFromOffice` con `timeout: 10000`).
- **Orquestador Cache-First:** [`src/presentation/meter/useMeterSearchController.ts`](../src/presentation/meter/useMeterSearchController.ts) (líneas 94-135).
- **Ficha visual de 7 campos:** [`src/app/meter-search.tsx`](../src/app/meter-search.tsx) (líneas 167-249).

### 3. ¿Cómo se comprueba?
- **Pruebas automatizadas:**
  - [`src/storage/meter/__tests__/meterCacheStorage.test.ts`](../src/storage/meter/__tests__/meterCacheStorage.test.ts)
  - [`src/services/__tests__/officeApi.test.ts`](../src/services/__tests__/officeApi.test.ts)
- **Prueba manual:** Con internet activo, busca `MED-100201`. La primera vez dirá **"Oficina en Línea"** y mostrará los 7 campos. Vuelve a tocar **"Consultar Medidor"** (o sal y vuelve a buscar `MED-100201`): responderá al instante sin tiempo de carga y la insignia superior cambiará a **"Memoria de Jornada"**.

---

## R4. Contingencia Sin Señal y Verificación Diferida

> **Enunciado:** *Sin señal, el técnico puede registrar la lectura de datos de todos modos. La lectura queda marcada como pendiente de verificar y se compara con la anterior cuando se recupera la conexión.*

### 1. ¿Cuál fue la solución y por qué se hizo así?
- **Captura a ciegas permitida (`hasNoPreviousData = true`):**
  Si el técnico está sin internet (`Sin señal`) y busca un medidor que nunca antes había consultado en el día (no está en caché):
  1. En [`meter-search.tsx`](../src/app/meter-search.tsx) aparece un aviso naranja claro (**"Sin Cobertura de Red"**) con el botón **"Continuar a captura sin datos previos"**.
  2. Al entrar al asistente de lectura ([`reading-wizard.tsx`](../src/app/reading-wizard.tsx)) con `hasNoPreviousData = true`, como no conocemos la lectura anterior ni el promedio, la app le permite registrar la lectura actual y al guardar le asigna el estado especial **`PENDING_VERIFICATION` (*Pendiente de verificar*)** en lugar de `PENDING_SYNC`.
- **Reconciliación automática cuando vuelve la señal (`evaluateDeferredReading`):**
  Cuando el teléfono recupera internet, el motor de sincronización ([`syncService.ts`](../src/services/syncService.ts)) detecta que la lectura está en `PENDING_VERIFICATION` y antes de enviarla:
  1. Descarga de MockAPI los datos reales del medidor (`fetchMeterFromOffice`).
  2. Ejecuta `evaluateDeferredReading(reading, officeMeter)` en [`syncRules.ts`](../src/domain/sync/syncRules.ts) para comparar la lectura capturada contra la `lastReading.value` y `averageConsumption` de la oficina.
  3. **Si todo es normal (o si ya traía foto de respaldo):** La promueve a verificada y la envía a MockAPI automáticamente.
  4. **Si al comparar descubre que la lectura es menor a la anterior o supera $3\times$ el promedio y NO tiene foto:** No la envía a ciegas; la marca como **`REQUIRES_ATTENTION` (*Requiere atención en campo*)** explicando el motivo exacto para que el técnico la revise o adjunte la foto desde su bandeja.

### 2. Archivos donde está programado
- **Regla al guardar sin datos previos:** [`src/presentation/reading/useReadingWizardController.ts`](../src/presentation/reading/useReadingWizardController.ts) (asigna `status: hasNoPreviousData ? 'PENDING_VERIFICATION' : 'PENDING_SYNC'`).
- **Algoritmo de contraste tardío:** [`src/domain/sync/syncRules.ts`](../src/domain/sync/syncRules.ts) (`evaluateDeferredReading`, líneas 34-127).
- **Ejecución al recuperar red:** [`src/services/syncService.ts`](../src/services/syncService.ts) (líneas 26-59).

### 3. ¿Cómo se comprueba?
- **Pruebas automatizadas:** [`src/domain/sync/__tests__/syncRules.test.ts`](../src/domain/sync/__tests__/syncRules.test.ts) y [`src/services/__tests__/syncService.test.ts`](../src/services/__tests__/syncService.test.ts).
- **Prueba manual:** Pon el celular en **Modo Avión** $\rightarrow$ busca un medidor no cacheado (ej. `MED-100205`) $\rightarrow$ toca **"Continuar a captura sin datos previos"** $\rightarrow$ registra la lectura. En la Bandeja aparecerá en morado como **"Pendiente de verificar"**. Al desactivar el Modo Avión, se contrastará sola contra MockAPI.

---

## R5. Reglas de Obligatoriedad según Condición Física del Medidor

> **Enunciado:** *Al registrar, el técnico indica el estado del medidor: normal, inaccesible o dañado. Si es normal, la lectura es obligatoria. Si es inaccesible, el motivo es obligatorio y no se registra lectura. Si está dañado, la descripción del daño es obligatoria y la lectura es opcional.*

### 1. ¿Cuál fue la solución y por qué se hizo así?
Se diseñó una matriz de obligatoriedad pura en [`getStepRequirements`](../src/domain/reading/readingRules.ts) que gobierna tanto la validación de avance como lo que se muestra en pantalla:

| Estado del Medidor (`MeterCondition`) | Lectura en $\text{m}^3$ | Observación / Motivo | Fotografía |
| :--- | :--- | :--- | :--- |
| **`NORMAL`** | **Obligatoria** | Opcional | Opcional (salvo anomalía $> 3\times$) |
| **`INACCESSIBLE`** (*Inaccesible*) | **Bloqueada / No se registra** (`readingBlocked = true`) | **Obligatoria** (motivo de inaccesibilidad) | Opcional |
| **`DAMAGED`** (*Dañado*) | **Opcional** (puede dejarse vacía o ingresarse) | **Obligatoria** (descripción del daño) | **Obligatoria** (según R7) |

- **Limpieza automática al cambiar a Inaccesible:** Si el técnico había escrito un número en el Paso 2 y regresa al Paso 1 para cambiar el estado a **Inaccesible**, el controlador limpia `readingValue = ''` y oculta el teclado numérico en el Paso 2, mostrando un aviso claro de que no se toma lectura por inaccesibilidad.

### 2. Archivos donde está programado
- **Reglas de obligatoriedad y validación por paso:** [`src/domain/reading/readingRules.ts`](../src/domain/reading/readingRules.ts)
  - `getStepRequirements(condition, isAnomaly)` (líneas 84-119).
  - `validateStepCompletion(step, draft, isAnomaly, isNegativeConsumption)` (líneas 125-204).
- **Pantalla del asistente en 3 pasos:** [`src/app/reading-wizard.tsx`](../src/app/reading-wizard.tsx) (Paso 1: selección de estado físico; Paso 2: lectura u omisión por inaccesibilidad; Paso 3: foto y observación).

### 3. ¿Cómo se comprueba?
- **Pruebas automatizadas:** [`src/domain/reading/__tests__/readingRules.test.ts`](../src/domain/reading/__tests__/readingRules.test.ts) (verifica las 3 combinaciones y sus bloqueos).
- **Prueba manual:** En el asistente de lectura, prueba elegir **Inaccesible**: verás que en el Paso 2 no pide lectura y en el Paso 3 no te deja guardar hasta escribir el motivo. Prueba elegir **Dañado**: te deja pasar el Paso 2 sin lectura, pero en el Paso 3 exige foto y descripción del daño.

---

## R6. Cálculo de Consumo Mensual y Alerta de Anomalía ($> 3\times$ Promedio)

> **Enunciado:** *La lectura actual se compara con la anterior para calcular el consumo del mes. Si el consumo supera el triple del promedio mensual del medidor, la aplicación lo advierte, el técnico debe confirmar que revisó el medidor de agua y agregar la foto del medidor pasa a ser obligatoria.*

### 1. ¿Cuál fue la solución y por qué se hizo así?
- **Fórmula pura en [`readingRules.ts`](../src/domain/reading/readingRules.ts):**
  $$\text{Consumo} = \text{Lectura Actual} - \text{Lectura Anterior}$$
  $$\text{Es Anomalía} \iff \text{Consumo} > (\text{Promedio Mensual} \times 3)$$
- **Bloqueo en el Paso 2 hasta confirmar revisión física:**
  Cuando `isAnomaly === true`:
  1. En el Paso 2 de [`reading-wizard.tsx`](../src/app/reading-wizard.tsx) se despliega una tarjeta de alerta amarilla/ámbar (**"Alerta de Consumo Anómalo (> 3x promedio)"**) indicando el consumo calculado frente al promedio histórico.
  2. Aparece una casilla de verificación táctil: **"Confirmo que revisé físicamente el medidor de agua y el valor es correcto"** (`anomalyConfirmed`).
  3. Si el técnico no marca esa casilla, `validateStepCompletion(2, ...)` bloquea el botón **"Siguiente Paso"**.
  4. Al pasar al Paso 3, `getStepRequirements` cambia automáticamente `photoRequired: true`, obligando a tomar la fotografía del medidor antes de poder finalizar.

### 2. Archivos donde está programado
- **Cálculo y detección:** [`src/domain/reading/readingRules.ts`](../src/domain/reading/readingRules.ts) (`calculateConsumption` y `checkConsumptionAnomaly`, líneas 41-79).
- **Controlador reactivo:** [`src/presentation/reading/useReadingWizardController.ts`](../src/presentation/reading/useReadingWizardController.ts) (`consumptionResult`, `toggleAnomalyConfirmation`).
- **Interfaz visual:** [`src/app/reading-wizard.tsx`](../src/app/reading-wizard.tsx) (líneas 293-336).

### 3. ¿Cómo se comprueba?
- **Pruebas automatizadas:** [`src/domain/reading/__tests__/readingRules.test.ts`](../src/domain/reading/__tests__/readingRules.test.ts) (prueba valores exactos en el límite $3\times$ y por encima de $3\times$).
- **Prueba manual:** En un medidor con lectura anterior `1250` y promedio `18`, ingresa en el Paso 2 una lectura de `1350` (consumo = `100`, que supera $3 \times 18 = 54$). Verás aparecer la alerta de anomalía, la casilla obligatoria de confirmación y en el Paso 3 la foto pasará a decir **"Obligatoria"**.

---

## R7. Evidencia Fotográfica Duradera en Disco y Manejo de Permisos de Cámara

> **Enunciado:** *La foto del medidor de agua es obligatoria cuando el consumo es anómalo (más del triple del promedio, según R6) o si el medidor está dañado, y opcional en los demás casos. La foto debe conservarse en el teléfono aunque pasen varios días hasta que no se envíe la lectura. Si el técnico no concede el permiso de cámara, la aplicación debe explicarle por qué lo necesita y permitirle continuar en los casos en que la foto no es obligatoria.*

### 1. ¿Cuál fue la solución y por qué se hizo así?
- **¿Por qué no basta con guardar la ruta que da la cámara ni guardar Base64 en AsyncStorage?**
  - Cuando tomas una foto con la cámara del celular (`expo-image-picker`, **[ADR-005](./adr/ADR-005-expo-image-picker-camara.md)**), Android la guarda en la carpeta temporal `cacheDirectory`. Si pasan varios días o el teléfono tiene poca memoria, **Android borra automáticamente la carpeta de caché** y la foto se perdería antes de enviarse.
  - Y si guardáramos la foto en Base64 dentro de `AsyncStorage`, reventaría el límite de 2 MB de `CursorWindow` en Android.
- **Solución con `expo-file-system` ([ADR-006](./adr/ADR-006-expo-file-system-fotos.md)):**
  En [`photoStorageService.ts`](../src/services/photo/photoStorageService.ts), apenas el técnico toma la foto:
  1. Se crea una carpeta permanente en el almacenamiento protegido de documentos de la app: `Paths.document/epmaps_photos/`.
  2. Se copia el archivo físico `.jpg` con el nombre `MED-XXXXXX_<timestamp>.jpg`. Esa carpeta **nunca es purgada por el sistema operativo**, conservando la foto durante días o semanas.
  3. En `AsyncStorage` solo se guarda la ruta de texto (`file:///.../epmaps_photos/MED-100201_179320.jpg`).
- **Manejo amigable cuando el técnico niega el permiso de cámara:**
  - En [`useReadingWizardController.ts`](../src/presentation/reading/useReadingWizardController.ts) y [`reading-wizard.tsx`](../src/app/reading-wizard.tsx), si `cameraPermissionDenied === true`:
    - Se muestra un recuadro explicativo en español indicando por qué EPMAPS necesita la cámara (respaldo visual ante auditorías, daños o consumos elevados).
    - **Si la foto era opcional** (ej. medidor `NORMAL` sin anomalía): El botón **"Finalizar y Guardar"** sigue habilitado para que el técnico continúe su trabajo sin bloquearse.
    - **Si la foto era obligatoria** (dañado o anomalía): Le explica que para ese caso la evidencia es indispensable y le permite volver a solicitar el permiso con el botón de cámara.

### 2. Archivos donde está programado
- **Captura con cámara nativa y permisos:** [`src/services/photo/cameraService.ts`](../src/services/photo/cameraService.ts).
- **Copia permanente a disco (`epmaps_photos/`):** [`src/services/photo/photoStorageService.ts`](../src/services/photo/photoStorageService.ts) (`savePhotoToPermanentStorage`, `deletePhotoFromStorage`).
- **Interfaz en el Paso 3:** [`src/app/reading-wizard.tsx`](../src/app/reading-wizard.tsx) (líneas 350-445).

### 3. ¿Cómo se comprueba?
- **Pruebas automatizadas:** [`src/services/photo/__tests__/photoServices.test.ts`](../src/services/photo/__tests__/photoServices.test.ts) (verifica permisos denegados, copia al directorio permanente y borrado de fotos huérfanas).

---

## R8. Registro Multipantalla (3 Pasos) y Recuperación de Borrador ante Cierre

> **Enunciado:** *El registro completo de una lectura puede ocupar varias pantallas. Si la aplicación se cierra a mitad de un proceso de registro, al abrirla de nuevo, la aplicación ofrece continuar la captura pendiente o descartarla.*

### 1. ¿Cuál fue la solución y por qué se hizo así?
- **Asistente dividido en 3 pasos claros (`currentStep: 1 | 2 | 3`):**
  - **Paso 1:** Estado físico del medidor (`Normal`, `Inaccesible`, `Dañado`).
  - **Paso 2:** Ingreso de lectura en $\text{m}^3$, cálculo de consumo en vivo y confirmación de anomalía.
  - **Paso 3:** Captura de fotografía (con vista previa en miniatura) y observaciones de campo.
- **Autoguardado instantáneo en cada toque (`READING_DRAFT_KEY`):**
  Cada vez que el técnico cambia de paso, escribe un dígito, marca una casilla o toma una foto en [`useReadingWizardController.ts`](../src/presentation/reading/useReadingWizardController.ts), un `useEffect` guarda automáticamente el objeto `ReadingDraft` en `AsyncStorage` bajo la clave `'epmaps_reading_draft'` ([`readingDraftStorage.ts`](../src/storage/reading/readingDraftStorage.ts)).
- **Detección de borrador al reabrir (`hasPendingDraftPrompt`):**
  Si la app se cierra a mitad de camino y el técnico vuelve a entrar a registrar una lectura:
  1. El controlador detecta al arrancar que existe `'epmaps_reading_draft'` en `AsyncStorage`.
  2. Muestra un banner destacado: **"Borrador pendiente detectado (MED-XXXXXX - Paso X)"** con dos botones:
     - **"Continuar captura":** Restaura exactamente el paso, el estado físico, los números escritos y la foto que ya había tomado.
     - **"Descartar borrador":** Borra el borrador de `AsyncStorage`, elimina del disco cualquier foto huérfana que hubiera tomado en ese borrador y empieza limpio desde el Paso 1.

### 2. Archivos donde está programado
- **Persistencia del borrador:** [`src/storage/reading/readingDraftStorage.ts`](../src/storage/reading/readingDraftStorage.ts) (`saveDraft`, `getDraft`, `clearDraft`).
- **Lógica de autoguardado y restauración:** [`src/presentation/reading/useReadingWizardController.ts`](../src/presentation/reading/useReadingWizardController.ts) (líneas 96-175 y `resumePendingDraft` / `discardPendingDraft`).
- **Banner visual de recuperación:** [`src/app/reading-wizard.tsx`](../src/app/reading-wizard.tsx) (líneas 105-146).

### 3. ¿Cómo se comprueba?
- **Pruebas automatizadas:**
  - [`src/storage/reading/__tests__/readingDraftStorage.test.ts`](../src/storage/reading/__tests__/readingDraftStorage.test.ts)
  - [`src/presentation/reading/__tests__/useReadingWizardController.test.ts`](../src/presentation/reading/__tests__/useReadingWizardController.test.ts)
- **Prueba manual:** Entra a registrar una lectura $\rightarrow$ avanza al Paso 2 y escribe un número $\rightarrow$ sal de la pantalla o cierra la app forzosamente $\rightarrow$ vuelve a entrar a registrar lectura y verás aparecer el cuadro **"Borrador pendiente detectado"** con las opciones **Descartar borrador** y **Continuar captura**.

---

## R9. Sincronización Automática, Idempotencia ante Cortes y Barra de Estado Global

> **Enunciado:** *Las lecturas se envían solas cuando hay conexión, sin duplicarse aunque la señal se corte en medio de un envío. En todas las pantallas el técnico ve si tiene conexión y cuántas lecturas le quedan por enviar.*

### 1. ¿Cuál fue la solución y por qué se hizo así?
Este requerimiento tiene **tres pilares técnicos**:

1. **Barra de Estado Global en todas las pantallas ([`GlobalStatusBar.tsx`](../src/components/GlobalStatusBar.tsx)):**
   - Usa `@react-native-community/netinfo` (**[ADR-002](./adr/ADR-002-netinfo-conectividad.md)**) en [`networkMonitor.ts`](../src/presentation/session/networkMonitor.ts) para detectar cambios de red en tiempo real ($< 500\text{ ms}$) sin gastar batería.
   - Muestra a la izquierda el chip **"Con señal"** / **"Sin señal"** y a la derecha el chip **"Pendientes [X]"** consultando `getPendingReadingsCount()`. Está montada en `home.tsx`, `meter-search.tsx`, `reading-wizard.tsx`, `reading-queue.tsx` y `reading-detail.tsx`.
2. **Envío automático en segundo plano ([`useSyncEngine.ts`](../src/presentation/sync/useSyncEngine.ts)):**
   - Está montado en la raíz de la aplicación ([`src/app/_layout.tsx`](../src/app/_layout.tsx) a través de `<SyncInitializer />`), por lo que vigila permanentemente sin importar en qué pantalla esté el técnico.
   - Dispara `syncAllPendingReadings()` automáticamente cuando:
     - El teléfono pasa de `Sin señal` a `Con señal`.
     - Hay lecturas pendientes en la cola (ciclo periódico con *backoff* exponencial si el servidor falla: $5\text{ s}, 10\text{ s}, 20\text{ s}\dots$).
3. **¿Cómo se evita que se duplique una lectura si la señal se corta a mitad del envío? (Idempotencia + Candado Mutex):**
   - **Candado de concurrencia (`isSyncingLock` en [`useSyncEngine.ts`](../src/presentation/sync/useSyncEngine.ts)):** Impide que dos procesos de sincronización corran al mismo tiempo si la señal parpadea.
   - **Clave de Idempotencia única (`clientReadingId: reading.id`) y actualización sobre el recurso (`PUT /medidores/:id`):**
     Cada lectura genera un UUID local único (`reading.id`) en el momento en que se guarda en el teléfono. Al enviar a MockAPI ([`officeApi.ts`](../src/services/officeApi.ts)), se actualiza el registro del medidor incluyendo ese `clientReadingId`. Si la conexión se cae justo después de que el servidor recibió el dato pero antes de que el teléfono reciba el `200 OK`, en el siguiente reintento se envía exactamente el mismo `clientReadingId` sobre el mismo medidor, sobrescribiendo de forma idempotente sin crear registros duplicados.

### 2. Archivos donde está programado
- **Barra global y monitor de red:** [`src/components/GlobalStatusBar.tsx`](../src/components/GlobalStatusBar.tsx), [`src/presentation/session/useGlobalStatusController.ts`](../src/presentation/session/useGlobalStatusController.ts) y [`src/presentation/session/networkMonitor.ts`](../src/presentation/session/networkMonitor.ts).
- **Reglas de idempotencia y backoff:** [`src/domain/sync/syncRules.ts`](../src/domain/sync/syncRules.ts) (`buildCommercialPayload`, `calculateBackoffDelayMs`, `acquireSyncLock`).
- **Servicio y Motor de Sincronización:** [`src/services/syncService.ts`](../src/services/syncService.ts) y [`src/presentation/sync/useSyncEngine.ts`](../src/presentation/sync/useSyncEngine.ts).
- **Montaje global:** [`src/app/_layout.tsx`](../src/app/_layout.tsx).

### 3. ¿Cómo se comprueba?
- **Pruebas automatizadas:**
  - [`src/domain/sync/__tests__/syncRules.test.ts`](../src/domain/sync/__tests__/syncRules.test.ts)
  - [`src/services/__tests__/syncService.test.ts`](../src/services/__tests__/syncService.test.ts)
  - [`src/presentation/sync/__tests__/useSyncEngine.test.ts`](../src/presentation/sync/__tests__/useSyncEngine.test.ts)

---

## R10. Edición de Pendientes, Inmutabilidad de Enviadas y Unicidad Mensual

> **Enunciado:** *Mientras una lectura no se haya enviado, el técnico puede corregirla. Una vez enviada, ya no. Tampoco se puede registrar dos veces el mismo medidor en el mismo mes.*

### 1. ¿Cuál fue la solución y por qué se hizo así?
Se implementaron **dos candados de integridad de dominio**:

1. **Edición permitida antes de enviar vs. Inmutabilidad estricta tras enviar (`canEditReading`):**
   - En [`queueRules.ts`](../src/domain/readingQueue/queueRules.ts), la función `canEditReading(status)` devuelve `true` únicamente si el estado es `PENDING_SYNC`, `PENDING_VERIFICATION` o `REQUIRES_ATTENTION`, y devuelve **`false` si el estado es `SUBMITTED` (*Enviada*)**.
   - **Doble protección:**
     - En la pantalla de detalle ([`reading-detail.tsx`](../src/app/reading-detail.tsx)), si la lectura aún no se envió, muestra el botón **"Corregir / Editar Lectura"** (que abre el asistente precargando todos los datos con `editingReadingId`). Si ya está **`Enviada`**, oculta el botón de edición y muestra un sello de bloqueo: *"Lectura sincronizada con oficina (Inmutable — solo consulta)"*.
     - Además, en la capa de almacenamiento ([`readingDraftStorage.ts`](../src/storage/reading/readingDraftStorage.ts)), la función `updateConsolidatedReading` verifica `if (existing.status === 'SUBMITTED') return null;`, impidiendo por código alterar una lectura ya enviada.

2. **Prohibición de registrar dos veces el mismo medidor en el mismo mes (`checkMonthlyDuplicate`):**
   - En [`meterRules.ts`](../src/domain/meter/meterRules.ts), cada vez que el técnico consulta un medidor en [`useMeterSearchController.ts`](../src/presentation/meter/useMeterSearchController.ts), se ejecuta `checkMonthlyDuplicate(meterCode, currentYearMonth, localQueue, meterRecord)`:
     - Revisa tanto la cola local del teléfono como la fecha de última lectura que reporta la oficina (`lastReading.date`) comparando el año y mes (`YYYY-MM`).
     - **Caso A – Ya existe una lectura este mes y ya fue `Enviada` (o figura en oficina este mes):** Bloquea por completo el botón de registrar nueva lectura y muestra una alerta roja (**"Bloqueo por Duplicidad Mensual"**).
     - **Caso B – Ya existe una lectura este mes en el teléfono pero todavía está `Pendiente` (no enviada):** Bloquea la creación de un segundo registro duplicado, pero le muestra el botón **"Corregir Lectura Pendiente"** para que edite la lectura que ya había tomado este mes.

### 2. Archivos donde está programado
- **Regla de unicidad mensual:** [`src/domain/meter/meterRules.ts`](../src/domain/meter/meterRules.ts) (`checkMonthlyDuplicate`, líneas 82-151).
- **Regla de editabilidad e inmutabilidad:** [`src/domain/readingQueue/queueRules.ts`](../src/domain/readingQueue/queueRules.ts) (`canEditReading`, líneas 16-18).
- **Candado en almacenamiento:** [`src/storage/reading/readingDraftStorage.ts`](../src/storage/reading/readingDraftStorage.ts) (`updateConsolidatedReading`, líneas 146-172).
- **Pantallas:**
  - [`src/app/meter-search.tsx`](../src/app/meter-search.tsx) (líneas 251-297: bloqueo por duplicidad mensual o redirección a editar la pendiente).
  - [`src/app/reading-queue.tsx`](../src/app/reading-queue.tsx) y [`src/app/reading-detail.tsx`](../src/app/reading-detail.tsx) (bandeja local y vista de detalle con botón de edición o sello inmutable).

### 3. ¿Cómo se comprueba?
- **Pruebas automatizadas:**
  - [`src/domain/meter/__tests__/meterRules.test.ts`](../src/domain/meter/__tests__/meterRules.test.ts) (prueba bloqueo mensual cuando está enviada vs. permiso de editar cuando está pendiente, y permite lecturas de meses anteriores).
  - [`src/domain/readingQueue/__tests__/queueRules.test.ts`](../src/domain/readingQueue/__tests__/queueRules.test.ts) y [`src/presentation/readingQueue/__tests__/useReadingQueueController.test.ts`](../src/presentation/readingQueue/__tests__/useReadingQueueController.test.ts).
- **Prueba manual:**
  1. Con el celular **Sin señal**, registra una lectura para `MED-100201`.
  2. Ve a **Bandeja de Lecturas**, toca esa lectura (que está *Pendiente*) y verás que puedes tocar **"Corregir / Editar Lectura"** y cambiar su valor.
  3. Vuelve a **Buscar Medidor** y busca otra vez `MED-100201`: verás que no te deja crear un duplicado, sino que te ofrece **"Corregir Lectura Pendiente"**.
  4. Activa el internet para que la lectura pase a estado **"Enviada"**: al entrar a su detalle verás que ya no se puede editar, y si buscas `MED-100201` en **Buscar Medidor**, aparecerá bloqueado por **"Bloqueo por Duplicidad Mensual"**.

