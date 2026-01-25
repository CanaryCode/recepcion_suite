# REGLAS Y CONTEXTO DEL PROYECTO (RECEPCIÓN SUITE)

## 1. Descripción del Proyecto

- **Nombre**: Recepción Suite (Hotel Garoé).
- **Objetivo**: Aplicación web de gestión para recepción de hotel, enfocada en rapidez, diseño premium y funcionalidad offline/híbrida.
- **Tecnología**: HTML5, CSS3 (Vanilla), JavaScript ES6 Modules. No usa frameworks complejos (React/Vue) ni bundlers pesados por defecto.

## 2. Preferencias de Diseño (CRÍTICO)

- **Estética**: Diseño moderno, premium y dinámico (Glassmorphism, sombras suaves, bordes redondeados).
- **Interacción**: Animaciones sutiles, feedback visual inmediato, tooltips informativos.
- **Evitar**: Diseños planos aburridos, colores primarios estándar (azul/rojo puro), alertas nativas del navegador (usar Modales/Toasts).

## 3. Arquitectura Técnica

- **Configuración**: Todas las constantes (nombres, precios, configuraciones del hotel) DEBEN estar en `config.json` y cargarse vía `Config.js`. NO harcodear valores.
- **Persistencia**: Sistema híbrido (LocalStorage + Backup en JSON).
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

2.  **No Borrar Claves Antiguas**:
    - Si se depreca un campo, mantenerlo en el código de lectura o migrarlo suavemente, nunca borrarlo drásticamente si eso impide cargar el backup anterior.

3.  **Backups Seguros**:
    - Antes de cualquier migración de estructura de datos crítica, el sistema debe forzar un backup del estado actual.

### 6.8. Variables de Configuración Dinámicas (Habitaciones)

Los atributos de las habitaciones no deben estar harcodeados en el código JS ("Strings Mágicos").

1.  **Carga desde JSON**: Las listas de _Tipos_, _Vistas_ y _Características_ deben cargarse desde `APP_CONFIG.HOTEL.STATS_CONFIG.FILTROS`.
2.  **Uso en la App**:
    - Al renderizar filtros o selectores, iterar sobre estas variables de configuración.
    - No usar `if (tipo === "Doble")` si "Doble" no está definido en la configuración.
