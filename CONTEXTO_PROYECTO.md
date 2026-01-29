# REGLAS Y CONTEXTO DEL PROYECTO (RECEPCIÓN SUITE)

## 1. Descripción del Proyecto

- **Nombre**: Recepción Suite (Hotel Garoé).
- **Objetivo**: Aplicación web de gestión para recepción de hotel, enfocada en rapidez, diseño premium y funcionalidad offline/híbrida.
- **Tecnología**: HTML5, CSS3 (Vanilla), JavaScript ES6 Modules. No usa frameworks complejos (React/Vue) ni bundlers pesados por defecto.

## 2. Preferencias de Diseño (CRÍTICO)

- **Estética**: Diseño moderno, premium y dinámico (Glassmorphism, sombras suaves, bordes redondeados).
- **Interacción**: Animaciones sutiles, feedback visual inmediato, tooltips informativos.
- **Evitar**: Diseños planos aburridos, colores primarios estándar (azul/rojo puro), alertas nativas del navegador (usar Modales/Toasts).

### 7.3. Estética Limpia

- **Estructura de Panel Único**: Los módulos deben contenido principal en **UN solo contenedor** tipo "card" o "content-panel". **NUNCA anidar** cards dentro de cards (paneles dentro de paneles), ya que genera ruido visual y márgenes innecesarios.
- **Alineación**: Los formularios y la información principal deben tender a ocupar el ancho disponible o justificarse a la **IZQUIERDA**. Evitar el centrado de formularios (`justify-content-center`) que deja espacios vacíos a los lados innecesariamente.
- **Iconos**: Usar `bootstrap-icons`.
- **Botones**: Primarios (`btn-primary`) para acciones principales, `btn-outline-*` para alternas, `btn-light` para cancelar/limpiar. Efecto `hover-scale` para interactividad.

## 3. Arquitectura Técnica

- **Configuración**: Todas las constantes (nombres, precios, configuraciones del hotel) DEBEN estar en `config.json` y cargarse vía `Config.js`. NO harcodear valores.
- **Persistencia (Autoridad JSON)**:
  - **Ubicación**: Todos los datos residen en la carpeta `storage/` en formato `.json`. Este directorio es la **BASE DE DATOS REAL** y única fuente de verdad.
  - **Sin Caché**: La aplicación **prohíbe el uso de caché del navegador** o el acceso directo a `localStorage` como fuente persistente. Los archivos JSON en disco son la autoridad.
  - **LocalStorage Abstraction**: Es **OBLIGATORIO** usar el wrapper `core/LocalStorage.js` para cualquier persistencia temporal. El uso directo de `localStorage.getItem/setItem` está **PROHIBIDO** para mantener la coherencia arquitectónica.
  - **Timestamp Anti-Caché**: Todas las peticiones `GET` a la API deben incluir un timestamp (`?_t=...`) para forzar al navegador a ignorar su memoria caché.
- **Configurabilidad (Adaptabilidad Hotelera)**:
  - Cualquier variable o lista de opciones que sea específica de este hotel (ej: Destinos de transfer, departamentos, tipos de habitación, precios...) **DEBE SER CONFIGURABLE** desde `config.json` y editable desde el módulo de Configuración.
  - El objetivo es que la aplicación sea "multihotel" o fácilmente adaptable a otro establecimiento sin tocar código fuente.
- **Módulos**: Uso estricto de ES Modules (`import/export`).
- **CSS**: Estilos centralizados pero modulares. Evitar estilos en línea excesivos.

## 4. Flujo de Trabajo

- **Portable**: La aplicación debe ser capaz de ejecutarse en entornos con restricciones (versiones portables de Node.js).
- **Validación**: Verificar siempre que los cambios en JS no rompan la carga asíncrona de configuración.

## 5. Instrucciones para la IA

- Antes de planificar cambios complejos, revisa `config.json` y la estructura de módulos existente.
- Prioriza soluciones que no requieran instalar nuevas dependencias de NPM si es posible hacerlo nativamente.
- Mantén el código limpio, comentado y consistente con el estilo existente.

## 6. Estándares de Diseño y Desarrollo de Módulos

Para asegurar la consistencia visual y funcional, **todo nuevo módulo** debe seguir estas directrices:

### 6.1. Estructura Visual (HTML)

Todo módulo debe usar el contenedor `.content-panel` (si aplica estilo tarjeta) o la estructura estándar de encabezado + contenido.

```html
<!-- Encabezado del Módulo (Título Dinámico) -->
<h4 class="module-title-discrete">
  <i class="bi bi-[ICONO_DINAMICO]"></i> [NOMBRE MÓDULO]
</h4>

<!-- Barra de Herramientas y Vistas (Opcional, pero recomendada) -->
<div class="module-toolbar no-print">
  <div class="btn-group" role="group">
    <button
      class="btn btn-outline-primary active"
      id="btn[Modulo]Vista1"
      onclick="cambiarVista('vista1')"
      data-bs-toggle="tooltip"
      data-bs-title="Ver Vista Principal"
    >
      <i class="bi bi-laptop me-2"></i>Vista Trabajo
    </button>
    <button
      class="btn btn-outline-primary"
      id="btn[Modulo]Vista2"
      onclick="cambiarVista('vista2')"
      data-bs-toggle="tooltip"
      data-bs-title="Ver Vista Resumen/Rack"
    >
      <i class="bi bi-grid-3x3-gap me-2"></i>Vista Rack
    </button>
  </div>

  <!-- Botones de Acción Principal -->
  <div class="btn-print-wrapper">
    <button
      class="btn btn-primary btn-sm fw-bold shadow-sm"
      onclick="accionPrincipal()"
    >
      <i class="bi bi-save-fill me-2"></i>Guardar / Acción
    </button>
  </div>
</div>

<!-- Contenedor Principal -->
<div id="[modulo]-content-wrapper" class="content-panel animate-fade-in">
  <!-- 1. Tarjeta de Formulario / Entrada -->
  <div class="card mb-4 shadow-sm border-0">
    <div class="card-header py-3">
      <h6 class="mb-0 fw-bold text-primary">
        <!-- Subtítulo con Icono Dinámico -->
        <i class="bi bi-[ICONO_SUBTITULO] me-2"></i>Nueva Entrada
      </h6>
    </div>
    <div class="card-body">
      <!-- Formulario Standard -->
    </div>
  </div>

  <!-- 2. Tabla de Datos -->
  <div class="card shadow-sm border-0">
    <div class="card-header py-3 bg-white">
      <h6 class="mb-0 fw-bold text-muted">Registros Activos</h6>
    </div>
    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead class="table-light">
          <!-- TH Headers -->
        </thead>
        <tbody>
          <!-- JS Rendering -->
        </tbody>
      </table>
    </div>
  </div>
</div>
```

### 6.2. Patrón de Código (JS)

Usar el patrón de módulo ES6 con servicio separado si hay lógica de datos compleja.

```javascript
import { APP_CONFIG } from '../core/Config.js';
import { Utils } from '../core/Utils.js';

// Estado Local
let moduloInicializado = false;

export function inicializar[Modulo]() {
    if (moduloInicializado) return;

    // Renderizado Inicial
    renderizarInterfaz();

    // Event Listeners
    configurarEventos();

    moduloInicializado = true;
}

function renderizarInterfaz() {
    // Usar Utils.formatCurrency, Utils.formatDate, etc.
}
```

### 6.3. Paleta de Colores y Clases Clave

- **Principal (Brand)**: `btn-primary`, `text-primary` (Azul/Violeta corporativo).
- **Fondos**: `bg-light` (Gris suave para fondos generales), `bg-white` (Tarjetas).
- **Sombras**: `shadow-sm` (Elementos estándar), `shadow-lg` (Modales).
- **Texto**: `fw-bold` para encabezados y datos clave. `text-muted` para etiquetas secundarias.
- **Bordes**: `border-0` en tarjetas para look moderno. `rounded` o `rounded-3`.

### 6.4. Persistencia y Backup (CRÍTICO)

Para que los datos del nuevo módulo se guarden y respalden correctamente:

1.  **Clave Única**: Definir una clave única para `LocalStorage` (ej: `app_[modulo]_data`).
2.  **Servicio de Datos**: Crear un servicio que extienda la lógica de almacenamiento estándar.
3.  **Registro en BackupService**: **OBLIGATORIO**. Añadir el nuevo servicio al array `this.services` en `assets/js/services/BackupService.js`.

    ```javascript
    // Ejemplo en BackupService.js
    import { nuevoModuloService } from "./NuevoModuloService.js";

    // ... en constructor ...
    this.services = [
      // ... otros ...
      { name: "Nuevo Modulo", svc: nuevoModuloService },
    ];
    ```

4.  **Métodos Requeridos**: El servicio del módulo debe implementar `getAll()` y `save(data)` o `saveAll(data)`.

### 6.5. Componentes UI Obligatorios y Estética

El usuario exige un alto nivel de pulido visual. Cumplir estrictamente:

1.  **Títulos y Subtítulos Dinámicos**:
    - Usar siempre etiquetas `<i>` con clases de Bootstrap Icons (`bi bi-...`).
    - Los iconos deben ser semánticos (ej: `bi-pencil` para editar, `bi-trash` para borrar).

2.  **Panel de Vistas e Impresión**:
    - Si el módulo tiene visualización de datos, incluir botones para alternar vistas (Trabajo vs Rack/Resumen).
    - Siempre incluir un botón/sección de "Imprimir" o "Guardar" alineado a la derecha en la barra de herramientas.
    - Usar la clase `no-print` en contenedores que no deban salir en papel.

3.  **Ventanas Emergentes (Modales)**:
    - **No usar `alert()` nativos** salvo error crítico del navegador.
    - Usar `Modal.showAlert()`, `Modal.showConfirm()` o modales de Bootstrap personalizados.
    - Estética Modal: `shadow-lg`, bordes redondeados, headers con color de contexto (Danger para borrar, Primary para info).

### 6.6. Portabilidad y Rutas (CRÍTICO)

Para garantizar que la aplicación funcione en cualquier PC sin instalación (modo portable):

1.  **Rutas Relativas SIEMPRE**:
    - HTML: Usar `assets/img/foto.jpg` no `/assets/img/foto.jpg`.
    - JS Imports: Usar `./` o `../` (ej: `../core/Utils.js`). NUNCA imports absolutos.
    - Fetch/Cargas: Las rutas dinámicas deben ser relativas al `index.html`.

2.  **No Dependencias Globales**:
    - No asumir que Node.js o NPM están instalados en el sistema anfitrión.
    - Todo lo necesario debe estar dentro de la carpeta del proyecto.

### 6.7. Retrocompatibilidad y Seguridad de Datos (CRÍTICO)

El sistema debe ser robusto ante actualizaciones. Para evitar corromper datos de versiones anteriores:

1.  **Lectura Defensiva**:
    - Nunca asumir que un campo existe en el JSON guardado.
    - Usar asignación con valores por defecto (ej: `const valor = data.campo || "default";`).
    - Si se añade una nueva propiedad a un objeto guardado, el código debe poder funcionar si esa propiedad falta (tratándola como antigua versión).

2.  **No Borrar Claves Antiguas (Sagrado)**:
    - Si se depreca un campo, mantenerlo en el código de lectura o migrarlo suavemente, nunca borrarlo drásticamente si eso impide cargar el backup anterior.
    - Los datos introducidos por el usuario (contactos, alarmas, etc.) son el activo más valioso; ninguna actualización de código debe borrarlos o ignorarlos.

3.  **Backups Seguros**:
    - Antes de cualquier migración de estructura de datos crítica, el sistema debe forzar un backup del estado actual.

4.  **Anti-Autofill Global**:
    - Todos los formularios e inputs deben tener `autocomplete="off"` para evitar que el navegador guarde o inyecte "basura" (como contraseñas o datos antiguos) en campos de dinero o información operativa.

### 6.8. Variables de Configuración Dinámicas (Habitaciones)

Los atributos de las habitaciones no deben estar harcodeados en el código JS ("Strings Mágicos").

1.  **Carga desde JSON**: Las listas de _Tipos_, _Vistas_ y _Características_ deben cargarse desde `APP_CONFIG.HOTEL.STATS_CONFIG.FILTROS`.
2.  **Uso en la App**:
    - Al renderizar filtros o selectores, iterar sobre estas variables de configuración.
    - No usar `if (tipo === "Doble")` si "Doble" no está definido en la configuración.

## 7. Reglas de UX/UI y "Resumen del Día" (CRÍTICO)

### 7.1. Módulos de "Resumen del Día"

Ciertos módulos generan información vital que debe revisarse nada más abrir el turno. Estos módulos DEBEN aparecer en el Dashboard o vista principal de "Novedades del Día".

- **Módulos Incluidos**: Novedades, Desayunos Temprano, Cenas Frías, **Transfers**.
- **Implementación**: Deben exponer un método o servicio que permita consultar sus registros activos para el día actual y mostrarlos en el widget de resumen.
- **Visibilidad Inteligente**: Si un módulo de resumen NO tiene registros activos (está vacío), **DEBE OCULTARSE** completamente del Dashboard (usando `d-none` en su contenedor) para no ocupar espacio inútil.

### 7.2. Orden de Vistas y Jerarquía

- **Orden de Vistas**: La **Vista de Trabajo** (Formulario para añadir/procesar) debe ser SIEMPRE la **PRIMERA VISTA** (pestaña activa por defecto). La Vista de Lista/Resumen/Rack debe ser secundaria.
  - _Razón_: La prioridad es la operativa rápida (añadir datos).
- **Barra de Herramientas**: TODO módulo debe tener explícitamente una barra de herramientas con el botón de **IMPRIMIR** visible y funcional.

### 7.3. Limpieza Visual (Estilo Flat/Glass)

- **Prohibido Paneles Blancos Anidados**: No colocar una tarjeta (`.card` / `bg-white`) dentro de otro contenedor que ya tiene fondo blanco o apariencia de panel.
  - El fondo de la aplicación ya es texturizado/gris, por lo que el primer nivel de contenedor puede ser blanco (`card`), pero su contenido NO debe estar encerrado en otros bloques con fondo blanco y sombra (`shadow`). Esto "ensucia" el diseño.
  - Mantener diseño limpio, aireado y sin excesivos bordes o cajas dentro de cajas.

### 7.4. Componentes Estándar (Selectores Globales)

Para mantener la consistencia en la selección de activos y recursos del sistema:

1.  **Selector de Iconos (Standard)**:
    - **Módulo**: `assets/js/core/IconSelector.js`.
    - **Uso**: Inocar `IconSelector.open(targetInputId)` para abrir el modal estándar con buscador de Bootstrap Icons.
    - **Propósito**: Usar siempre este selector cuando el usuario deba personalizar iconos de módulos, habitaciones o servicios.

2.  **Selector de Archivos (Local)**:
    - **Endpoint**: `/api/system/pick-file` (Requiere servidor Node.js activo).
    - **Uso**: Usar solo en configuraciones del sistema (ej: lanzadores de apps) donde se requiera una ruta absoluta local.
    - **Limitación**: Solo funciona en entorno Windows/Localhost con el servidor backend propio.

## 8. Arquitectura de Datos y API (CRUD)

La aplicación utiliza un sistema de persistencia **JSON-agnóstico**. El backend no tiene esquemas fijos; simplemente guarda y entrega archivos JSON según lo solicite el frontend.

### 8.1. Endpoints Modulares (Express)

Desde la **Iteración 5**, el servidor utiliza **Express.js** con rutas modulares para mayor escalabilidad y limpieza.

| Área         | Prefijo API         | Descripción                                                           |
| :----------- | :------------------ | :-------------------------------------------------------------------- |
| **STORAGE**  | `/api/storage/:key` | CRUD de archivos JSON en `storage/`. Source of Truth.                 |
| **SYSTEM**   | `/api/system/`      | Comandos de SO: `launch` (ejecutar apps) y `list-files` (explorador). |
| **HEARTBIT** | `/api/heartbeat/`   | Mantiene el servidor activo (timeout de 24h para cierre automático).  |
| **HEALTH**   | `/api/health/`      | Estado del servidor y versión.                                        |

### 8.2. BaseService (Capa de Servicio Evolucionada)

Todos los servicios de datos extienden de `BaseService.js`. Tras la refactorización, el servicio incluye métodos semánticos que eliminan la necesidad de manipular arrays manualmente en cada módulo:

- `init()`: Carga inicial y sincronización automática con el servidor.
- `add(item)`: Añade un elemento a la lista (Array).
- `update(id, data, idField)`: Busca y actualiza un registro en un array. Si no existe, lo añade.
- `delete(id, idField)`: Elimina un registro de un array.
- `getByKey(key)`: Para datos tipo objeto, recupera el valor de una clave.
- `setByKey(key, value)`: Para datos tipo objeto, establece o actualiza una clave.
- `removeByKey(key)`: Elimina una clave de un objeto de datos.
- `syncWithServer()`: Sincronización en segundo plano con prioridad al disco (JSON Authority).

### 8.4. Capa de Validación (Schema) [NUEVO]

Para garantizar la integridad de los datos, `BaseService` permite definir un `schema` en sus clases hijas. El sistema valida automáticamente los tipos de datos antes de cualquier operación de guardado.

```javascript
// Ejemplo en ChildService.js
this.schema = {
  id: "number",
  concepto: "string",
  importe: "number",
};
```

### 8.3. Esquema de Datos (Flexible)

No existe un "JSON maestro" de especificación porque cada módulo define su propia estructura. Sin embargo, el estándar seguido por los módulos (ej: `AgendaService`, `NotesService`) es:

```json
[
  {
    "id": 1674829302,
    "fecha": "2026-01-27",
    "autor": "Nombre Recepcionista",
    "datos": { ... campos específicos del módulo ... }
  }
]
```

> [!NOTE]
> La lógica de negocio (filtrado, ordenación, validación) reside 100% en el **Frontend** antes de enviar el paquete JSON final al servidor para su persistencia física.

## 9. Rendimiento y Carga de Datos (Lazy Load)

Dado que la aplicación puede manejar miles de registros y eventualmente se conectará a una base de datos real, es **IMPERATIVO** que los módulos de listado (Agenda, Clientes, Histórico) implementen estrategias de carga diferida ("Lazy Loading").

1.  **Prohibido "Cargar Todo" en el DOM**:
    - Nunca volcar 1000 filas `<tr>` de golpe en una tabla. El navegador se congelará.
    - Usar **Paginación** o **Scroll Infinito** (Infinite Scroll).

2.  **Scroll Infinito (Recomendado)**:
    - Utilizar `IntersectionObserver` para detectar cuando el usuario llega al final del scroll.
    - Cargar/Mostrar bloques pequeños (ej: 50 elementos).
    - Usar `append` para añadir los nuevos elementos al DOM, **nunca** repintar toda la lista (`innerHTML +=`) ya que eso destruye y recrea todos los nodos previos.

3.  **Filtrado Eficiente**:
    - Al filtrar por búsqueda, resetear la vista y mostrar solo el primer bloque de coincidencias.

## 10. Core API (`Ui.js`)

Para evitar duplicidad de código y asegurar consistencia, se ha creado una API central (`assets/js/core/Ui.js`) que maneja patrones de interfaz comunes.

1.  **Infinite Scroll (Estándar)**:
    - **NO** implementar `IntersectionObserver` manualmente en los módulos.
    - Usar `Ui.infiniteScroll({ onLoadMore: miFuncion, sentinelId: 'mi-id' })`.
    - Esto gestiona automáticamente la desconexión y reconexión segura del observador.

2.  **Spinners y Sentinels**:
    - Usar `Ui.createSentinelRow(id, texto, colspan)` para generar filas de carga estandarizadas.
    - Usar `Ui.renderTable(tbodyId, data, rowRenderer, emptyMsg, append)` para generar tablas de forma limpia y consistente.
    - Usar `Ui.updateDashboardWidget(moduleName, data, rowRenderer)` para actualizar contadores y tablas del dashboard.
    - Usar `Ui.setupViewToggle({ buttons: [...] })`: Gestiona el cambio entre vista "Trabajo" y "Listado/Rack" automáticamente, manejando clases `active` y `d-none`.
    - Usar `Ui.initRoomAutocomplete(datalistId)`: Popula rápidamente selectores de habitación con datos de `Config.js`.

3.  **Gestión de Formularios (Standard submission)**:
    - Usar `Ui.handleFormSubmission({ formId, service, idField, mapData, onSuccess })`.
    - Este helper automatiza: Validación de usuario (recaudador), extracción de `FormData`, validación de habitación (si el `idField` es una hab), timestamp de actualización y notificación de éxito.
    - Soporta mapeo personalizado de datos y callbacks de éxito para refrescar la UI.

4.  Notificaciones y Confirmaciones:

- Usar `Ui.showToast(message, type)`: Muestra una alerta visual no bloqueante (success, warning, error, info). Sustituye `window.showAlert`.
- Usar `Ui.showConfirm(message)`: Muestra un diálogo de confirmación asíncrono. Sustituye al `confirm()` nativo.
- Usar `Ui.showPrompt(message, type)`: Solicita entrada de texto al usuario (ej: contraseñas). Sustituye al `prompt()` nativo.

5. Reportes e Impresión (PdfService):

- Usar `Ui.preparePrintReport({ dateId, memberId, memberName, extraMappings })`: Centraliza la preparación de metadatos de impresión.
- Usar `PdfService.generateReport({ title, author, htmlContent, filename, metadata })`: **ESTÁNDAR OBLIGATORIO** para generar reportes PDF profesionales. Sustituye la lógica manual de `html2pdf.js` en los módulos. Centraliza cabeceras, logos y pie de página.

6.  **Vistas Complejas (RackView)**:
    - **Módulo**: `assets/js/core/RackView.js`.
    - **Uso**: `RackView.render(containerId, itemRenderer, floorRenderer, floorFilter)` para pintar el estado del hotel (habitaciones). Soporta filtros.

## 11. Solución de Problemas (Troubleshooting)

### 11.1. SmartScreen (Pantalla Azul "Windows protegió su PC")

Si al ejecutar `RecepcionSuite.exe` Windows bloquea la aplicación por falta de firma digital:

1.  Abrir **PowerShell** como Administrador.
2.  Ejecutar el comando de desbloqueo:
    ```powershell
    Unblock-File -Path ".\RecepcionSuite.exe"
    ```

### 11.2. Error de Conexión ("Server Lost")

Si aparece la pantalla negra de "Conexión Perdida":

- **Causa**: El servidor Node.js se detuvo (timeout de 24h o suspensión del PC).
- **Solución**: Ejecutar nuevamente el acceso directo del escritorio y pulsar "Reconectar" en el navegador.
