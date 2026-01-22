import { APP_CONFIG } from '../core/Config.js';
import { ayudaService } from '../services/AyudaService.js';
import { sessionService } from '../services/SessionService.js';
import { Utils } from '../core/Utils.js';

/**
 * Módulo de Ayuda y Guías Operativas
 * Gestiona checklists interactivos por turno.
 */

let modoEdicion = false;
let turnoActual = 'noche'; // Estado del turno seleccionado
let inputFoco = null; // Variable para saber qué campo se está editando
const PASSWORD_EDICION = "1234"; // Contraseña para proteger la edición

// ==========================================
// 1. INICIALIZACIÓN
// ==========================================

/**
 * Inicializa el módulo de ayuda, asegurando el contenedor, configurando eventos
 * y renderizando la guía inicial.
 */
export function inicializarAyuda() {
    // Auto-reparación básica: Crear contenedor si no existe en el HTML
    asegurarContenedorAyuda();

    // Configurar evento de cambio de turno
    const select = document.getElementById('select-guia-ayuda');
    if (select) {
        select.removeEventListener('change', manejarCambioGuia); // Evitar duplicados
        select.addEventListener('change', manejarCambioGuia);
        // Establecer valor inicial si ya tiene
        if (select.value) turnoActual = select.value;
    }

    // Botón Imprimir
    document.getElementById('btnImprimirAyuda')?.addEventListener('click', imprimirGuia);

    // Inyectar Barra de Herramientas Flotante (Sofisticada)
    inyectarToolbarFlotante();

    renderGuia();
}

/**
 * Maneja el evento de cambio del selector de guía.
 * @param {Event} e - El evento de cambio.
 */
function manejarCambioGuia(e) {
    cambiarGuia(e.target.value);
}

/**
 * Asegura que el contenedor principal de la ayuda exista en el DOM.
 * Si no existe, lo crea y lo añade a un elemento padre adecuado.
 */
function asegurarContenedorAyuda() {
    if (!document.getElementById('ayuda-content')) {
        const tabContent = document.querySelector('.tab-content') || document.getElementById('main-content') || document.querySelector('main');
        if (tabContent) {
            const div = document.createElement('div');
            div.id = 'ayuda-content';
            div.className = 'tab-pane fade';
            div.setAttribute('role', 'tabpanel');
            tabContent.appendChild(div);
        }
    }
}

/**
 * Inyecta la barra de herramientas flotante para edición de texto en el DOM.
 */
function inyectarToolbarFlotante() {
    if (!document.getElementById('editor-toolbar')) {
        const toolbar = document.createElement('div');
        toolbar.id = 'editor-toolbar';
        toolbar.className = 'position-absolute bg-dark text-white rounded shadow p-1 d-none align-items-center gap-1';
        toolbar.style.zIndex = '9999';
        toolbar.style.transition = 'opacity 0.2s, top 0.1s, left 0.1s';
        toolbar.innerHTML = `
            <div class="btn-group btn-group-sm" role="group">
                <button type="button" class="btn btn-dark border-0" onmousedown="event.preventDefault()" onclick="aplicarFormato('bold')" title="Negrita"><i class="bi bi-type-bold"></i></button>
                <button type="button" class="btn btn-dark border-0" onmousedown="event.preventDefault()" onclick="aplicarFormato('italic')" title="Cursiva"><i class="bi bi-type-italic"></i></button>
                <button type="button" class="btn btn-dark border-0" onmousedown="event.preventDefault()" onclick="aplicarFormato('underline')" title="Subrayado"><i class="bi bi-type-underline"></i></button>
                <button type="button" class="btn btn-dark border-0" onmousedown="event.preventDefault()" onclick="aplicarFormato('strikeThrough')" title="Tachado"><i class="bi bi-type-strikethrough"></i></button>
            </div>
            <div class="vr bg-secondary mx-1 opacity-50"></div>
            <div class="btn-group btn-group-sm" role="group">
                <button type="button" class="btn btn-dark border-0" onmousedown="event.preventDefault()" onclick="aplicarFormato('foreColor', '#dc3545')" title="Rojo"><i class="bi bi-circle-fill" style="color: #dc3545;"></i></button>
                <button type="button" class="btn btn-dark border-0" onmousedown="event.preventDefault()" onclick="aplicarFormato('foreColor', '#0d6efd')" title="Azul"><i class="bi bi-circle-fill" style="color: #0d6efd;"></i></button>
                <button type="button" class="btn btn-dark border-0" onmousedown="event.preventDefault()" onclick="aplicarFormato('hiliteColor', '#ffc107')" title="Resaltar"><i class="bi bi-highlighter" style="color: #ffc107;"></i></button>
            </div>
            <div class="vr bg-secondary mx-1 opacity-50"></div>
            <div class="btn-group btn-group-sm" role="group">
                <button type="button" class="btn btn-dark border-0" onmousedown="event.preventDefault()" onclick="insertarIcono('warning')" title="Alerta"><i class="bi bi-exclamation-triangle"></i></button>
                <button type="button" class="btn btn-dark border-0" onmousedown="event.preventDefault()" onclick="insertarIcono('info')" title="Info"><i class="bi bi-info-circle"></i></button>
                <button type="button" class="btn btn-dark border-0" onmousedown="event.preventDefault()" onclick="insertarIcono('check')" title="Check"><i class="bi bi-check-lg"></i></button>
            </div>
        `;
        document.body.appendChild(toolbar);
    }
}

// ==========================================
// 2. RENDERIZADO
// ==========================================

/**
 * Renderiza la guía de pasos en el contenedor principal.
 * Adapta la vista según el modo de edición (lectura o edición).
 */
function renderGuia() {
    const lista = ayudaService.getGuia(turnoActual, obtenerGuiaPorDefecto(turnoActual));

    const container = document.getElementById('lista-pasos-container');
    const formAgregar = document.getElementById('form-agregar-paso');
    const infoFooter = document.getElementById('info-footer');
    const btnEdicion = document.getElementById('texto-btn-edicion');
    const iconEdicion = document.getElementById('icono-candado');

    if (!container) return;

    const tituloEl = document.getElementById('titulo-guia');
    if (tituloEl) {
        const iconos = { noche: '🌙', mañana: '☕', tarde: '☀️' };
        tituloEl.innerHTML = `<i class="bi bi-list-check me-2"></i>Checklist: Turno de ${turnoActual.charAt(0).toUpperCase() + turnoActual.slice(1)} ${iconos[turnoActual] || ''}`;
    }

    container.innerHTML = '';

    if (lista.length === 0) {
        container.innerHTML = '<div class="p-4 text-center text-muted">No hay pasos definidos. Activa el modo edición para agregar uno.</div>';
    }

    lista.forEach((paso, index) => {
        let itemHtml = '';

        if (modoEdicion) {
            itemHtml = `
                <div class="guide-item d-flex align-items-center p-3 mb-2 rounded bg-white shadow-sm border-start border-4 border-warning"
                    draggable="true"
                    ondragstart="handleDragStart(event, ${index})" 
                    ondragover="handleDragOver(event)" 
                    ondrop="handleDrop(event, ${index})"
                    ondragenter="handleDragEnter(event)"
                    ondragleave="handleDragLeave(event)">
                    <span class="text-muted me-3 fw-bold"><i class="bi bi-grip-vertical"></i> ${index + 1}.</span>
                    <div contenteditable="true" class="form-control me-2 bg-white" 
                        onfocus="setFoco(this); mostrarToolbar()" 
                        onmouseup="actualizarPosicionToolbar()" 
                        onkeyup="actualizarPosicionToolbar()" 
                        onblur="ocultarToolbar(); actualizarTextoPaso(${paso.id}, this.innerHTML)" 
                        style="min-height: 38px; display: flex; align-items: center;">${paso.texto}</div>
                    <button class="btn btn-outline-danger btn-sm" onclick="eliminarPasoGuia(${paso.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            `;
        } else {
            const checked = paso.hecho ? 'checked' : '';
            const textClass = paso.hecho ? 'text-decoration-line-through text-muted' : 'fw-bold text-dark lead';
            const statusClass = paso.hecho ? 'done' : 'pending';
            const icon = paso.hecho ? '<i class="bi bi-check-circle-fill text-success fs-4"></i>' : '<i class="bi bi-circle text-muted fs-4"></i>';

            itemHtml = `
                <label class="guide-item ${statusClass} d-flex align-items-center p-3 mb-3 rounded shadow-sm cursor-pointer w-100" style="cursor: pointer;">
                    <div class="me-3 d-flex align-items-center">${icon}</div>
                    <input class="d-none" type="checkbox" ${checked} onchange="toggleCheckPaso(${paso.id})">
                    <div class="${textClass}" style="font-size: 1.05rem;">${paso.texto}</div>
                </label>
            `;
        }
        container.innerHTML += itemHtml;
    });

    actualizarUIEdicion(formAgregar, infoFooter, btnEdicion, iconEdicion);
}

/**
 * Actualiza los elementos de la interfaz de usuario (formulario, footer, botones)
 * según el estado del modo de edición.
 * @param {HTMLElement} formAgregar - El formulario para agregar pasos.
 * @param {HTMLElement} infoFooter - El elemento del pie de página con información.
 * @param {HTMLElement} btnEdicion - El botón para activar/desactivar el modo de edición.
 * @param {HTMLElement} iconEdicion - El icono del candado en el botón de edición.
 */
function actualizarUIEdicion(formAgregar, infoFooter, btnEdicion, iconEdicion) {
    if (modoEdicion) {
        formAgregar?.classList.remove('d-none');
        if (infoFooter) infoFooter.innerHTML = "<strong>Modo Edición:</strong> Selecciona texto para ver la barra de formato flotante.";

        // Restaurar input simple para guías
        if (formAgregar) {
            formAgregar.innerHTML = `
                <div class="d-flex gap-2 align-items-start">
                <div id="nuevo-paso-texto" contenteditable="true" class="form-control bg-white" onfocus="setFoco(this); mostrarToolbar()" onmouseup="actualizarPosicionToolbar()" onkeyup="actualizarPosicionToolbar()" onblur="ocultarToolbar()" style="min-height: 38px;"></div>
                <button onclick="agregarPasoGuiaManual()" class="btn btn-primary px-4"><i class="bi bi-plus-lg"></i> Añadir</button>
            </div>`;
        }

        const divNuevo = document.getElementById('nuevo-paso-texto');
        if (divNuevo) {
            divNuevo.setAttribute('onfocus', 'setFoco(this); mostrarToolbar()');
            divNuevo.setAttribute('onmouseup', 'actualizarPosicionToolbar()');
            divNuevo.setAttribute('onkeyup', 'actualizarPosicionToolbar()');
            divNuevo.setAttribute('onblur', 'ocultarToolbar()');
        }
        if (btnEdicion) btnEdicion.innerText = "Salir Edición";
        if (iconEdicion) iconEdicion.className = "bi bi-unlock-fill me-1";
    } else {
        formAgregar?.classList.add('d-none');
        if (infoFooter) infoFooter.innerText = "Modo Lectura: Marca las casillas a medida que completes las tareas. Se guardan automáticamente.";
        if (btnEdicion) btnEdicion.innerText = "Editar Guía";
        if (iconEdicion) iconEdicion.className = "bi bi-lock-fill me-1";
    }
}

// ==========================================
// 3. DATOS PROPORCIONADOS
// ==========================================

/**
 * Obtiene la guía de pasos por defecto para un turno específico.
 * @param {string} turno - El turno ('mañana', 'tarde', 'noche').
 * @returns {Array<Object>} Una lista de objetos de pasos.
 */
function obtenerGuiaPorDefecto(turno) {
    if (turno === 'mañana') {
        return [
            { id: 1, texto: "Revisar <b class='text-primary'>correos urgentes</b> y reservas del día.", hecho: false },
            { id: 2, texto: "Verificar desayunos especiales y dietas.", hecho: false },
            { id: 3, texto: "Gestión de <span class='text-danger fw-bold'>Check-outs</span> y facturación.", hecho: false }
        ];
    } else if (turno === 'tarde') {
        return [
            { id: 1, texto: "Gestión de <b class='text-success'>Check-ins</b> y registro de policías.", hecho: false },
            { id: 2, texto: "Revisar asignación de habitaciones para mañana.", hecho: false }
        ];
    } else {
        return [
            // 1. Tareas Preparatorias
            { id: 1, texto: "<h6 class='mb-1 text-primary fw-bold'>1. Tareas Preparatorias</h6><b>Novedades:</b> Revisar novedades del turno de tarde y apagar luces.", hecho: false },
            { id: 2, texto: "<b>Material:</b> Reponer material (folios, grapas, etc.).", hecho: false },
            { id: 3, texto: "<b>Desayunos:</b> Comunicar despertadores y desayunos (Marcos/Antonio).", hecho: false },
            { id: 4, texto: "<b>Seguridad:</b> Cerrar accesos sistema (salvo puesto trabajo) y oficina.", hecho: false },
            { id: 5, texto: "<b>Datáfonos:</b> Realizar operaciones comercio y cierre antes 00:00.", hecho: false },
            { id: 6, texto: "<b>Control:</b> Firma de control de llaves de recepción.", hecho: false },

            // 2. Gestión de Llegadas y Reservas
            { id: 7, texto: "<h6 class='mb-1 text-primary fw-bold mt-2'>2. Gestión Llegadas y Reservas</h6><b>Archivo Viajeros:</b> Archivar partes de llegada en casilleros.", hecho: false },
            { id: 8, texto: "<b>Auditoría Datos:</b> Revisar datos sistema vs reservas físicas (hab, pensión, localizador).", hecho: false },
            { id: 9, texto: "<b>Verif. Valoración:</b> Opción 1: Listado llegadas (grapar). Opción 2: Búsqueda reservas > Valoración total.", hecho: false },
            { id: 10, texto: "<b>Archivo Reservas:</b> Archivar al chequeadas en baúles verde/azul por fecha salida.", hecho: false },
            { id: 11, texto: "<b>Discrepancias:</b> Corregir fallos. Si duda precio, dejar pendiente turno mañana.", hecho: false },
            { id: 12, texto: "<b>Documentación:</b> Resto información a carpeta documentos sobrante.", hecho: false },

            // 3. Liquidación y Libro de Caja
            { id: 13, texto: "<h6 class='mb-1 text-primary fw-bold mt-2'>3. Liquidación y Libro Caja</h6><b>Bar Hall:</b> Buscar cta restaurante (90...). Verificar efectivo/visas. Facturar.", hecho: false },
            { id: 14, texto: "<b>Libro Caja:</b> Lupa > 'Análisis completo por formas pago'. Puntear facturas y datáfonos.", hecho: false },
            { id: 15, texto: "<b>Desembolsos:</b> Imprimir listado 'Desembolsos Clientes'.", hecho: false },
            { id: 16, texto: "<b>Auditoría Fdas:</b> Revisar Facturas Emitidas (sin CLX 3 ni pago vacío). Corregir.", hecho: false },

            // 4. Gestión de Errores e Ingresos
            { id: 17, texto: "<h6 class='mb-1 text-primary fw-bold mt-2'>4. Errores e Ingresos</h6><b>Corrección:</b> Cancelar (rellamada 3) y refacturar correctamente.", hecho: false },
            { id: 18, texto: "<b>Ingreso:</b> Preparar sobre (Total Contado, Desembolsos, Vales firmados).", hecho: false },
            { id: 19, texto: "<b>Cálculo:</b> Contado - Desembolsos - Vales = Total Efectivo.", hecho: false },
            { id: 20, texto: "<b>Entrega Admin:</b> Juntar facturas, docs safes, spa, lavandería y sobre. Al safe.", hecho: false },
            { id: 21, texto: "<b>Caja Noche:</b> Conteo dinero, sellos y vales propios.", hecho: false },

            // 5. Cierre del Día
            { id: 22, texto: "<h6 class='mb-1 text-primary fw-bold mt-2'>5. Cierre del Día</h6><b>Previa:</b> Sin CLX 3, Control Center a 0. Libro firmado. Listado cancelaciones.", hecho: false },
            { id: 23, texto: "<b>Control SS Fijos:</b> Listado previsión (detectar cargas mal o a 0).", hecho: false },
            { id: 24, texto: "<b>Ejecución:</b> Lupa > Cierre del día > Tabla procesos > Inicio. Confirmar.", hecho: false },

            // 6. Informes Post-Cierre
            { id: 25, texto: "<h6 class='mb-1 text-primary fw-bold mt-2'>6. Informes Post-Cierre</h6><b>Listados Admin:</b> Tabla 'ADMIN' > Resumen producción.", hecho: false },
            { id: 26, texto: "<b>Management Report:</b> Estadística Producción > Neto ON. Revisar y guardar.", hecho: false },
            { id: 27, texto: "<b>Estancias:</b> Rellenar Excel Estado Hotel (ordenador Paqui).", hecho: false },

            // 7. Facturación Agencias
            { id: 28, texto: "<h6 class='mb-1 text-primary fw-bold mt-2'>7. Fact. Agencias</h6><b>Listado Salidas:</b> Confirmar importes.", hecho: false },
            { id: 29, texto: "<b>Agrupadas:</b> Check Out > Buscar cuentas > Tipo titular > Masiva > A crédito.", hecho: false },
            { id: 30, texto: "<b>Individuales:</b> Fact. Masiva > Filtro titular. (No directos, Mirai, Expedia hotel, Booking...).", hecho: false },
            { id: 31, texto: "<b>Impresión:</b> Facturas Emitidas > Selección Control > Impresión Masiva.", hecho: false },
            { id: 32, texto: "<b>Relación:</b> Para Sr. Farrais. Enviar a Voxel correctamente.", hecho: false },

            // 8. Tareas Finales
            { id: 33, texto: "<h6 class='mb-1 text-primary fw-bold mt-2'>8. Tareas Finales</h6><b>Archivar:</b> Créditos día y facturines salidas.", hecho: false },
            { id: 34, texto: "<b>Llegadas:</b> Chequear llegadas día con llaves. A la caja.", hecho: false },
            { id: 35, texto: "<b>Reservas:</b> Preparar carpeta llegadas y bandeja Emiliano.", hecho: false },
            { id: 36, texto: "<b>Libro:</b> Firmar libro recepción.", hecho: false },
            { id: 37, texto: "<b>Novedades:</b> Anotar para minibares/gobernantas (No Show, Check-in post-cierre).", hecho: false }
        ];
    }
}

// ==========================================
// 4. HANDLERS GLOBALES
// ==========================================

/**
 * Cambia el turno actual de la guía y vuelve a renderizarla.
 * @param {string} nuevoTurno - El nuevo turno a establecer.
 */
function cambiarGuia(nuevoTurno) {
    turnoActual = nuevoTurno;
    renderGuia();
}

/**
 * Alterna el modo de edición de la guía. Requiere una contraseña para activar.
 */
export async function toggleEdicionGuia() {
    if (modoEdicion) {
        modoEdicion = false;
        renderGuia();
    } else {
        const pass = await window.showPrompt("🔒 Contraseña:", "password");
        if (pass === PASSWORD_EDICION) {
            modoEdicion = true;
            renderGuia();
        } else if (pass !== null) window.showAlert("Contraseña incorrecta.", "error");
    }
}

/**
 * Restaura la guía actual a su versión por defecto y desmarca todos los pasos.
 * Pide confirmación al usuario.
 */
export async function resetearChecksGuia() {
    if (await window.showConfirm("¿Restaurar la guía oficial? Esto actualizará la lista a la última versión y desmarcará todo.")) {
        // Cargar SIEMPRE la guía por defecto (oficial) para asegurar actualizaciones
        let lista = obtenerGuiaPorDefecto(turnoActual);
        // Asegurar que todo empiece desmarcado (aunque por defecto ya debería estarlo)
        lista = lista.map(p => ({ ...p, hecho: false }));
        ayudaService.saveGuia(turnoActual, lista);
        renderGuia();
        window.showAlert("Guía actualizada correctamente.", "success");
    }
};

/**
 * Alterna el estado 'hecho' de un paso de la guía.
 * @param {number} id - El ID del paso a modificar.
 */
export function toggleCheckPaso(id) {
    let lista = ayudaService.getGuia(turnoActual, obtenerGuiaPorDefecto(turnoActual));
    lista = lista.map(p => p.id === id ? { ...p, hecho: !p.hecho } : p);
    ayudaService.saveGuia(turnoActual, lista);
    renderGuia();
};

/**
 * Agrega un nuevo paso a la guía desde el campo de texto de edición.
 */
export function agregarPasoGuiaManual() {
    const div = document.getElementById('nuevo-paso-texto');
    const texto = div.innerHTML.trim();
    if (texto) {
        let lista = ayudaService.getGuia(turnoActual, obtenerGuiaPorDefecto(turnoActual));
        const nuevoId = lista.length > 0 ? Math.max(...lista.map(p => p.id)) + 1 : 1;
        lista.push({ id: nuevoId, texto: texto, hecho: false });
        ayudaService.saveGuia(turnoActual, lista);
        div.innerHTML = '';
        renderGuia();
    }
};

/**
 * Elimina un paso de la guía, pidiendo confirmación al usuario.
 * @param {number} id - El ID del paso a eliminar.
 */
export async function eliminarPasoGuia(id) {
    if (await window.showConfirm("¿Eliminar?")) {
        let lista = ayudaService.getGuia(turnoActual, obtenerGuiaPorDefecto(turnoActual));
        lista = lista.filter(p => p.id !== id);
        ayudaService.saveGuia(turnoActual, lista);
        renderGuia();
    }
};

/**
 * Actualiza el texto de un paso específico de la guía.
 * @param {number} id - El ID del paso a actualizar.
 * @param {string} nuevoTexto - El nuevo contenido HTML del paso.
 */
export function actualizarTextoPaso(id, nuevoTexto) {
    let lista = ayudaService.getGuia(turnoActual, obtenerGuiaPorDefecto(turnoActual));
    lista = lista.map(p => p.id === id ? { ...p, texto: nuevoTexto } : p);
    ayudaService.saveGuia(turnoActual, lista);
};

// Helpers para Toolbar

/**
 * Establece el elemento HTML que tiene el foco de edición.
 * @param {HTMLElement} el - El elemento editable que ha recibido el foco.
 */
export function setFoco(el) { inputFoco = el; };

/**
 * Muestra la barra de herramientas de edición flotante.
 */
export function mostrarToolbar() { document.getElementById('editor-toolbar')?.classList.replace('d-none', 'd-flex'); actualizarPosicionToolbar(); };

/**
 * Oculta la barra de herramientas de edición flotante después de un breve retraso.
 */
export function ocultarToolbar() { setTimeout(() => document.getElementById('editor-toolbar')?.classList.replace('d-flex', 'd-none'), 200); };

/**
 * Actualiza la posición de la barra de herramientas de edición para que se muestre
 * encima del elemento con foco.
 */
export function actualizarPosicionToolbar() { if (!inputFoco) return; const tb = document.getElementById('editor-toolbar'); if (!tb || tb.classList.contains('d-none')) return; const r = inputFoco.getBoundingClientRect(); tb.style.top = `${r.top + window.scrollY - tb.offsetHeight - 8}px`; tb.style.left = `${r.left + window.scrollX + (r.width / 2) - (tb.offsetWidth / 2)}px`; };

/**
 * Aplica un comando de formato de texto al contenido editable.
 * @param {string} cmd - El comando de formato (ej. 'bold', 'italic').
 * @param {string} [val] - El valor asociado al comando (ej. un color).
 */
export function aplicarFormato(cmd, val) { if (!inputFoco) return; inputFoco.focus(); document.execCommand(cmd, false, val); };

/**
 * Inserta un icono predefinido en el contenido editable.
 * @param {string} tipo - El tipo de icono a insertar ('warning', 'info', 'check').
 */
export function insertarIcono(tipo) { if (!inputFoco) return; inputFoco.focus(); const icon = tipo === 'warning' ? `<i class="bi bi-exclamation-triangle-fill text-warning me-1"></i>` : tipo === 'check' ? `<i class="bi bi-check-circle-fill text-success me-1"></i>` : `<i class="bi bi-info-circle-fill text-info me-1"></i>`; document.execCommand('insertHTML', false, icon + '&nbsp;'); };

/**
 * Prepara y ejecuta la impresión de la guía actual.
 * Valida que haya un usuario seleccionado antes de imprimir.
 */
function imprimirGuia() {
    const user = Utils.validateUser();
    if (!user) return;

    Utils.printSection('print-date-ayuda', 'print-repc-nombre-ayuda', user);
}

// --- DRAG AND DROP HANDLERS ---
let draggedItemIndex = null;

/**
 * Maneja el inicio del arrastre de un elemento de la guía.
 * @param {Event} e - El evento de arrastre.
 * @param {number} index - El índice del elemento arrastrado.
 */
export function handleDragStart(e, index) {
    draggedItemIndex = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
    e.target.style.opacity = '0.4';
};

/**
 * Maneja el evento de arrastre sobre un elemento, permitiendo el drop.
 * @param {Event} e - El evento de arrastre.
 * @returns {boolean} Siempre false para indicar que se ha manejado.
 */
export function handleDragOver(e) {
    e.preventDefault(); // Necesario para permitir el drop
    e.dataTransfer.dropEffect = 'move';
    return false;
};

/**
 * Maneja el evento de arrastre entrando en un elemento, aplicando estilos visuales.
 * @param {Event} e - El evento de arrastre.
 */
export function handleDragEnter(e) {
    e.target.closest('.guide-item')?.classList.add('bg-light', 'border-primary');
};

/**
 * Maneja el evento de arrastre saliendo de un elemento, eliminando estilos visuales.
 * @param {Event} e - El evento de arrastre.
 */
export function handleDragLeave(e) {
    e.target.closest('.guide-item')?.classList.remove('bg-light', 'border-primary');
};

/**
 * Maneja el evento de soltar un elemento arrastrado, reordenando la lista de pasos.
 * @param {Event} e - El evento de soltar.
 * @param {number} targetIndex - El índice del elemento sobre el que se soltó.
 * @returns {boolean} Siempre false para indicar que se ha manejado.
 */
export function handleDrop(e, targetIndex) {
    e.stopPropagation();
    e.preventDefault();

    // Limpiar estilos visuales
    document.querySelectorAll('.guide-item').forEach(el => {
        el.style.opacity = '1';
        el.classList.remove('bg-light', 'border-primary');
    });

    if (draggedItemIndex !== null && draggedItemIndex !== targetIndex) {
        let lista = ayudaService.getGuia(turnoActual, obtenerGuiaPorDefecto(turnoActual));

        // Reordenar array
        const [movedItem] = lista.splice(draggedItemIndex, 1);
        lista.splice(targetIndex, 0, movedItem);

        ayudaService.saveGuia(turnoActual, lista);
        renderGuia();
    }
    draggedItemIndex = null;
    return false;
};

// Exportar funciones para HTML
window.cambiarGuia = cambiarGuia;
window.toggleEdicionGuia = toggleEdicionGuia;
window.resetearChecksGuia = resetearChecksGuia;
window.toggleCheckPaso = toggleCheckPaso;
window.agregarPasoGuiaManual = agregarPasoGuiaManual;
window.eliminarPasoGuia = eliminarPasoGuia;
window.actualizarTextoPaso = actualizarTextoPaso;
window.setFoco = setFoco;
window.mostrarToolbar = mostrarToolbar;
window.ocultarToolbar = ocultarToolbar;
window.actualizarPosicionToolbar = actualizarPosicionToolbar;
window.aplicarFormato = aplicarFormato;
window.insertarIcono = insertarIcono;
window.imprimirGuia = imprimirGuia;
window.handleDragStart = handleDragStart;
window.handleDragOver = handleDragOver;
window.handleDragEnter = handleDragEnter;
window.handleDragLeave = handleDragLeave;
window.handleDrop = handleDrop;