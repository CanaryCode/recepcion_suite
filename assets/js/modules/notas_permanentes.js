import { notasService } from '../services/NotasService.js';
import { Utils } from '../core/Utils.js';

/**
 * MÓDULO DE NOTAS PERMANENTES (NOTAS ADHESIVAS / POST-ITS)
 * --------------------------------------------------------
 * Permite a los recepcionistas dejar notas rápidas fijadas en el muro.
 * Las notas tienen colores configurables y una rotación visual aleatoria.
 * Soporta protección por contraseña para evitar ediciones no autorizadas.
 */

let notaEnEdicionId = null;  // ID de la nota que se abre en el modal
let modoEdicion = false;     // Si es falso, las notas el muro son solo lectura
const PASSWORD_EDICION = "1234";

// ==========================================
// 1. INICIALIZACIÓN
// ==========================================

export function inicializarNotasPermanentes() {
    const container = document.getElementById('notas-content');
    if (!container) return;

    // Event Listeners
    const form = document.getElementById('formNota');
    if (form) {
        form.removeEventListener('submit', guardarNota);
        form.addEventListener('submit', guardarNota);
    }

    const searchInput = document.getElementById('searchNotas');
    if (searchInput) {
        const newSearch = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newSearch, searchInput);
        newSearch.addEventListener('input', () => renderNotas());
    }

    // Configurar botones globales del módulo
    document.getElementById('btn-nueva-nota')?.addEventListener('click', () => abrirModalNota());
    document.getElementById('btn-lock-notas')?.addEventListener('click', toggleEdicionNotas);

    renderNotas();
}

// ==========================================
// 2. HANDLERS & ACCIONES
// ==========================================

export async function toggleEdicionNotas() {
    if (modoEdicion) {
        modoEdicion = false;
        renderNotas();
    } else {
        const pass = await window.showPrompt("🔒 Contraseña de administrador:", "password");
        if (pass === PASSWORD_EDICION) {
            modoEdicion = true;
            renderNotas();
        } else if (pass !== null) {
            window.showAlert("Contraseña incorrecta", "error");
        }
    }
}

export function abrirModalNota(id = null) {
    notaEnEdicionId = id;
    const modalEl = document.getElementById('modalNota');
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    const title = document.getElementById('modalNotaTitle');

    // Resetear formulario
    document.getElementById('formNota').reset();
    document.getElementById('color-yellow').checked = true; // Default

    if (id) {
        const nota = notasService.getNotaById(id);
        if (nota) {
            title.innerText = "Editar Nota";
            Utils.setVal('notaTitulo', nota.titulo);
            Utils.setVal('notaContenido', nota.contenido);

            // Seleccionar color
            const colorRadio = document.querySelector(`input[name="colorNota"][value="${nota.color}"]`);
            if (colorRadio) colorRadio.checked = true;
        }
    } else {
        title.innerText = "Nueva Nota";
    }

    modal.show();
}

function guardarNota(e) {
    e.preventDefault();

    const titulo = document.getElementById('notaTitulo').value.trim();
    const contenido = document.getElementById('notaContenido').value.trim();
    const color = document.querySelector('input[name="colorNota"]:checked').value;

    if (!titulo && !contenido) {
        alert("La nota debe tener al menos título o contenido.");
        return;
    }

    const now = new Date();
    const fechaStr = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (notaEnEdicionId) {
        // Editar
        const notaExistente = notasService.getNotaById(notaEnEdicionId);
        if (notaExistente) {
            const notaActualizada = {
                ...notaExistente,
                titulo,
                contenido,
                color,
                fecha: fechaStr
            };
            notasService.updateNota(notaActualizada);
        }
    } else {
        // Crear
        const nuevaNota = {
            id: Date.now(),
            titulo,
            contenido,
            color,
            fecha: fechaStr,
            rotacion: (Math.random() * 4 - 2).toFixed(1)
        };
        notasService.addNota(nuevaNota);
    }

    // Cerrar modal
    const modalEl = document.getElementById('modalNota');
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.hide();

    renderNotas();
}

export async function eliminarNota(id) {
    if (await window.showConfirm("¿Eliminar esta nota?")) {
        notasService.removeNota(id);
        renderNotas();
    }
}

// ==========================================
// 3. RENDERIZADO
// ==========================================

/**
 * DIBUJAR MURO DE NOTAS
 * Renderiza todos los post-its con su inclinación (--rotation) y color específico.
 */
function renderNotas() {
    const grid = document.getElementById('grid-notas');
    if (!grid) return;

    actualizarEstadoBotonLock();
    const notas = notasService.getNotas();

    // Filtrar por término de búsqueda (Input superior)
    const searchInput = document.getElementById('searchNotas');
    const filtro = searchInput ? searchInput.value.toLowerCase().trim() : "";
    const notasFiltradas = filtro ? notas.filter(n =>
        (n.titulo && n.titulo.toLowerCase().includes(filtro)) ||
        (n.contenido && n.contenido.toLowerCase().includes(filtro))
    ) : notas;

    grid.innerHTML = '';

    if (notasFiltradas.length === 0) {
        grid.innerHTML = `
            <div class="col-12 text-center py-5 opacity-50">
                <i class="bi bi-stickies display-1 text-secondary"></i>
                <p class="mt-3 fs-5">${filtro ? 'No se encontraron notas con ese texto.' : 'No hay notas fijadas.'}</p>
            </div>`;
        return;
    }

    notasFiltradas.forEach(nota => {
        const rotacion = nota.rotacion || (Math.random() * 4 - 2).toFixed(1);
        const visibilityClass = modoEdicion ? '' : 'd-none';

        // Gestión de Drag & Drop (Solo si está desbloqueado)
        const dragAttrs = modoEdicion ? `draggable="true" ondragstart="handleDragStart(event, ${nota.id})" ondragover="handleDragOver(event)" ondrop="handleDrop(event, ${nota.id})" ondragenter="handleDragEnter(event)" ondragleave="handleDragLeave(event)"` : '';
        const cursorStyle = modoEdicion ? 'cursor: grab;' : '';

        grid.innerHTML += `
            <div class="col-md-6 col-lg-4 col-xl-3" ${dragAttrs} style="${cursorStyle}">
                <div class="card post-it ${nota.color || 'note-yellow'} h-100" style="--rotation: ${rotacion}deg;">
                    <div class="card-body d-flex flex-column p-3">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="card-title fw-bold mb-0 text-dark" style="font-family: 'Inter', sans-serif; font-size: 1.1rem;">${nota.titulo}</h5>
                            <div class="dropdown ${visibilityClass}">
                                <button class="btn btn-link text-dark p-0 opacity-50 hover-opacity-100" data-bs-toggle="dropdown">
                                    <i class="bi bi-three-dots-vertical"></i>
                                </button>
                                <ul class="dropdown-menu dropdown-menu-end border-0 shadow">
                                    <li><button class="dropdown-item" onclick="abrirModalNota(${nota.id})"><i class="bi bi-pencil me-2"></i>Editar</button></li>
                                    <li><button class="dropdown-item text-danger" onclick="eliminarNota(${nota.id})"><i class="bi bi-trash me-2"></i>Eliminar</button></li>
                                </ul>
                            </div>
                        </div>
                        <p class="card-text flex-grow-1" style="white-space: pre-wrap; font-size: 0.95rem; line-height: 1.5;">${nota.contenido}</p>
                        <div class="mt-2 text-end">
                            <small class="text-muted opacity-50" style="font-size: 0.7rem;">${nota.fecha}</small>
                        </div>
                    </div>
                </div>
            </div>`;
    });
}

// ==========================================
// 4. DRAG AND DROP HANDLERS
// ==========================================

export function handleDragStart(e, id) {
    if (!modoEdicion) return;
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
    e.currentTarget.style.opacity = '0.4';
}

export function handleDragOver(e) {
    if (!modoEdicion) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
}

export function handleDragEnter(e) {
    if (!modoEdicion) return;
    e.preventDefault();
    e.currentTarget.classList.add('scale-up-center'); // Efecto visual opcional
}

export function handleDragLeave(e) {
    if (!modoEdicion) return;
    e.currentTarget.classList.remove('scale-up-center');
}

export function handleDrop(e, targetId) {
    if (!modoEdicion) return;
    e.preventDefault();
    e.currentTarget.style.opacity = '1';
    e.currentTarget.classList.remove('scale-up-center');

    const sourceId = parseInt(e.dataTransfer.getData("text/plain"));

    if (sourceId === targetId) return;

    // Reordenar array
    const notas = notesService.getNotas(); // Usando alias correcto abajo o import
    const fromIndex = notas.findIndex(n => n.id === sourceId);
    const toIndex = notas.findIndex(n => n.id === targetId);

    if (fromIndex !== -1 && toIndex !== -1) {
        // Mover elemento
        const [movedNote] = notas.splice(fromIndex, 1);
        notas.splice(toIndex, 0, movedNote);

        // Guardar y renderizar
        notesService.saveNotas(notas); // Asegurar que sea notasService
        renderNotas();
    }
}

function actualizarEstadoBotonLock() {
    const btnLock = document.getElementById('btn-lock-notas');
    const iconLock = document.getElementById('icon-lock-notas');
    const textLock = document.getElementById('text-lock-notas');
    const btnNew = document.getElementById('btn-nueva-nota');

    if (btnLock) {
        if (modoEdicion) {
            btnLock.classList.replace('btn-outline-secondary', 'btn-outline-danger');
            if (iconLock) iconLock.className = 'bi bi-unlock-fill';
            if (textLock) textLock.textContent = 'Edición Activa';
            btnNew?.classList.remove('d-none');
        } else {
            btnLock.classList.replace('btn-outline-danger', 'btn-outline-secondary');
            if (iconLock) iconLock.className = 'bi bi-lock-fill';
            if (textLock) textLock.textContent = 'Bloqueado';
            btnNew?.classList.add('d-none');
        }
    }
}

// Helper interno para evitar problemas de ámbito con la variable importada
const notesService = notasService;

// Exportar funciones para HTML
window.toggleEdicionNotas = toggleEdicionNotas;
window.abrirModalNota = abrirModalNota;
window.eliminarNota = eliminarNota;
window.handleDragStart = handleDragStart;
window.handleDragOver = handleDragOver;
window.handleDrop = handleDrop;
window.handleDragEnter = handleDragEnter;
window.handleDragLeave = handleDragLeave;
