import { APP_CONFIG } from '../core/Config.js';
import { Utils } from '../core/Utils.js';
import { Ui } from '../core/Ui.js';
import { novedadesService } from '../services/NovedadesService.js';
import { sessionService } from '../services/SessionService.js';

/**
 * MÓDULO DE NOVEDADES Y COMUNICACIÓN (novedades.js)
 * -----------------------------------------------
 * Registra eventos, averías o avisos destinados a otros departamentos o turnos.
 * Soporta prioridades, estados de gestión (Pendiente/Terminada) y multiselección de departamentos.
 */

// ============================================================================
// INICIALIZACIÓN
// ============================================================================

export async function inicializarNovedades() {
    // Garantizar carga autoritativa
    await novedadesService.init();
    
    const form = document.getElementById('formNovedad');

    if (form) {
        form.removeEventListener('submit', manejarSubmitNovedad);
        form.addEventListener('submit', manejarSubmitNovedad);
    }

    // Inyectar departamentos desde la configuración
    generarCheckboxesDepartamentos();

    // Eliminar configuración de selectores locales (Ya usa global)
    document.querySelector('.nov-autor-wrapper')?.classList.add('d-none');

    // Configurar layout
    // Configurar layout
    // document.getElementById('novedades-formulario')?.classList.add('content-panel');

    document.getElementById('btnVistaTrabajoNov')?.addEventListener('click', () => cambiarVistaNovedades('trabajo'));
    document.getElementById('btnVistaSoloNov')?.addEventListener('click', () => cambiarVistaNovedades('solo'));

    mostrarNovedades();
    setupIntersectionObserver();
}

/**
 * GENERAR DEPARTAMENTOS
 * Crea dinámicamente los checkboxes basados en APP_CONFIG.
 * Incluye la opción "Otro" con campo de texto libre.
 */
function generarCheckboxesDepartamentos() {
    const deptsCont = document.getElementById('nov_depts_container');
    if (!deptsCont) return;

    let html = APP_CONFIG.NOVEDADES.DEPARTAMENTOS.map(d => `
        <div class="form-check me-2">
            <input class="form-check-input check-nov-dept" type="checkbox" value="${d}" id="dept_${d.replace(/\s/g, '')}">
            <label class="form-check-label small" for="dept_${d.replace(/\s/g, '')}">${d}</label>
        </div>
    `).join('');

    // Añadir opción de departamento personalizado
    html += `
        <div class="form-check me-2 d-flex align-items-center">
            <input class="form-check-input check-nov-dept" type="checkbox" value="Otro" id="dept_otro">
            <label class="form-check-label small me-2" for="dept_otro">Otro:</label>
            <input type="text" class="form-control form-control-sm d-none" id="nov_dept_otro_input" placeholder="Nuevo..." style="width: 120px;">
        </div>
    `;
    deptsCont.innerHTML = html;

    // Evento para mostrar/ocultar input de "Otro" departamento
    const checkOtro = document.getElementById('dept_otro');
    const inputOtro = document.getElementById('nov_dept_otro_input');
    if (checkOtro && inputOtro) {
        checkOtro.addEventListener('change', (e) => {
            if (e.target.checked) {
                inputOtro.classList.remove('d-none');
                inputOtro.focus();
            } else {
                inputOtro.classList.add('d-none');
                inputOtro.value = '';
            }
        });
    }
}

function cambiarVistaNovedades(vista) {
    const btnTrabajo = document.getElementById('btnVistaTrabajoNov');
    const btnSolo = document.getElementById('btnVistaSoloNov');
    const divForm = document.getElementById('novedades-formulario');

    if (vista === 'trabajo') {
        btnTrabajo.classList.add('active');
        btnSolo.classList.remove('active');
        divForm.classList.remove('d-none');
    } else {
        btnTrabajo.classList.remove('active');
        btnSolo.classList.add('active');
        divForm.classList.add('d-none');
    }
}

// ============================================================================
// HANDLERS
// ============================================================================

/**
 * GUARDAR NOVEDAD
 * Valida los campos, detecta si es una edición o nueva inserción y actualiza la lista.
 */
function manejarSubmitNovedad(e) {
    e.preventDefault();
    const now = new Date();
    const idInput = document.getElementById('nov_id').value;

    // 1. Validar Usuario
    const autor = Utils.validateUser();
    if (!autor) return;

    // 2. Validar Prioridad y Texto
    const prioridad = document.getElementById('nov_prioridad').value;
    if (!prioridad) {
        alert("Por favor, seleccione la prioridad de la novedad.");
        document.getElementById('nov_prioridad').focus();
        return;
    }

    const texto = document.getElementById('nov_texto').value.trim();
    if (!texto) {
        alert("La descripción de la novedad es obligatoria.");
        document.getElementById('nov_texto').focus();
        return;
    }

    // 3. Validar Departamentos
    let departamentos = Array.from(document.querySelectorAll('.check-nov-dept:checked')).map(cb => cb.value);

    if (departamentos.includes('Otro')) {
        const inputOtro = document.getElementById('nov_dept_otro_input');
        const nuevoDept = inputOtro.value.trim();

        // Remover "Otro" de la lista final
        departamentos = departamentos.filter(d => d !== 'Otro');

        if (nuevoDept) {
            departamentos.push(nuevoDept);
        } else {
            alert("Ha seleccionado 'Otro' departamento. Por favor, especifique el nombre.");
            inputOtro.focus();
            return;
        }
    }

    if (departamentos.length === 0) {
        alert("Por favor, selecciona al menos un departamento de destino.");
        return;
    }

    // 4. Guardar o Actualizar
    if (idInput) {
        // EDITAR
        const novedadExistente = novedadesService.getNovedadById(parseInt(idInput));
        if (novedadExistente) {
            const novedadActualizada = {
                ...novedadExistente,
                prioridad: prioridad,
                texto: texto,
                comentario: document.getElementById('nov_comentario').value.trim(),
                departamentos: departamentos,
                fechaModificacion: `${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            };
            novedadesService.updateNovedad(novedadActualizada);
        }
        document.getElementById('nov_id').value = '';
        const btn = document.getElementById('btnSubmitNovedad');
        if (btn) btn.innerHTML = '<i class="bi bi-save-fill me-2"></i>Registrar Novedad';
    } else {
        // NUEVA
        const novedad = {
            id: Date.now(),
            fecha: now.toLocaleDateString(),
            hora: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            prioridad: prioridad,
            autor: autor,
            texto: texto,
            comentario: document.getElementById('nov_comentario').value.trim(),
            departamentos: departamentos,
            estado: 'Pendiente'
        };
        novedadesService.addNovedad(novedad);
    }

    e.target.reset();

    // Resetear UI de "Otro"
    const deptOtroInput = document.getElementById('nov_dept_otro_input');
    if (deptOtroInput) deptOtroInput.classList.add('d-none');
    mostrarNovedades();
}

// ============================================================================
// RENDERIZADO
// ============================================================================

/**
 * RENDERIZADO DE NOVEDADES
 * Actualiza tanto el mini-resumen del Dashboard como la tabla principal de gestión.
 * Aplica estilos visuales según prioridad (Urgente = Rojo).
 */
// ============================================================================
// PAGINACIÓN Y RENDERIZADO (LAZY LOAD)
// ============================================================================

// ============================================================================
// PAGINACIÓN Y RENDERIZADO (LAZY LOAD)
// ============================================================================

let currentFilteredNovedades = [];
let visibleCount = 50;
const PAGE_SIZE = 50;
let infiniteScrollController = null;

function setupIntersectionObserver() {
    infiniteScrollController = Ui.infiniteScroll({
        onLoadMore: window.cargarMasNovedades,
        sentinelId: 'sentinel-loader-nov'
    });
}


/**
 * RENDERIZADO DE NOVEDADES (CONTROLLER)
 * Prepara los datos, actualiza el Dashboard y llama al renderizado de la tabla.
 */
function mostrarNovedades() {
    const novedades = novedadesService.getNovedades();

    // 1. Actualizar Dashboard (Siempre con los datos más recientes)
    actualizarDashboardNovedades(novedades);

    // 2. Preparar Lista Filtrada (Por ahora sin filtro de texto en UI, pero preparado)
    // Ordenar por fecha desc (más reciente primero)
    // Nota: El servicio ya suele devolverlas ordenadas, pero aseguramos
    // Si hubiera filtro de búsqueda, lo aplicaríamos aquí
    currentFilteredNovedades = [...novedades]; 
    
    // Resetear paginación
    visibleCount = 50;
    
    // 3. Renderizar Tabla (Reset)
    renderListaNovedades(false);
}

function actualizarDashboardNovedades(novedades) {
    const dashCol = document.getElementById('dash-col-novedades');
    const dashTabla = document.getElementById('dash-tabla-novedades');
    const dashCount = document.getElementById('dash-count-novedades');
    
    const pendientes = novedades.filter(n => n.estado !== 'Terminada');
    if (dashCol) dashCol.classList.toggle('d-none', pendientes.length === 0);
    if (dashCount) dashCount.innerText = pendientes.length;

    if (dashTabla) {
        dashTabla.innerHTML = '';
        // Solo mostrar las 5 más recientes en dashboard
        pendientes.slice(0, 5).forEach(n => {
            const color = n.prioridad === 'Urgente' ? 'text-danger' : 'text-info';
            dashTabla.innerHTML += `
            <tr onclick="irANovedad(${n.id})" style="cursor: pointer;">
                <td><i class="bi bi-circle-fill ${color} me-2" style="font-size: 0.5rem;"></i>${n.texto}</td>
                <td class="text-end small text-muted">${n.hora}</td>
            </tr>`;
        });
    }
}

/**
 * DIBUJAR TABLA PRINCIPAL (VIEW)
 * Soporta append para Infinite Scroll.
 */
function renderListaNovedades(append = false) {
    const tabla = document.getElementById('tablaNovedadesCuerpo');
    if (!tabla) return;

    if (!append) {
        tabla.innerHTML = '';
        visibleCount = Math.min(PAGE_SIZE, currentFilteredNovedades.length > 0 ? currentFilteredNovedades.length : PAGE_SIZE);
    }

    const total = currentFilteredNovedades.length;
    const start = append ? Math.max(0, visibleCount - PAGE_SIZE) : 0;
    const end = Math.min(visibleCount, total);

    if (append && start >= end) return;

    const slice = currentFilteredNovedades.slice(start, end);
    const fragment = document.createDocumentFragment();

    slice.forEach(n => {
        const isUrgente = n.prioridad === 'Urgente';
        let statusClass = 'bg-secondary';
        if (n.estado === 'En Proceso') statusClass = 'bg-info text-dark';
        if (n.estado === 'Terminada') statusClass = 'bg-success';

        const tr = document.createElement('tr');
        tr.id = `nov-row-${n.id}`;
        if (isUrgente) tr.className = 'nov-urgente';

        const deptsBadges = n.departamentos.map(d => `<span class="badge bg-primary opacity-75 me-1" style="font-size: 0.6rem;">${d}</span>`).join('');
        const comentarioHtml = n.comentario ? `<div class="mt-1 p-2 bg-light rounded small border-start border-3"><strong>Seguimiento:</strong> ${n.comentario}</div>` : '';
        const modificadoHtml = n.fechaModificacion ? `<div class="text-info mt-1" style="font-size: 0.65rem;"><strong><i class="bi bi-info-circle me-1"></i>Modificado:</strong> ${n.fechaModificacion}</div>` : '';

        tr.innerHTML = `
            <td class="small">
                <div class="fw-bold">${n.fecha}</div>
                <div class="text-muted">${n.hora}</div>
            </td>
            <td>
                <span class="badge ${isUrgente ? 'bg-danger' : 'bg-light text-dark border'}">${n.prioridad}</span>
            </td>
            <td>
                <div class="fw-bold mb-1">${n.texto}</div>
                <div class="mb-1">${deptsBadges}</div>
                <div class="small text-muted">Escrito por: <strong>${n.autor}</strong></div>
                ${comentarioHtml}
                ${modificadoHtml}
            </td>
            <td>
                <select onchange="cambiarEstadoNovedad(${n.id}, this.value)" class="form-select form-select-sm ${statusClass} bg-opacity-10 fw-bold">
                    <option value="Pendiente" ${n.estado === 'Pendiente' ? 'selected' : ''}>⏳ Pendiente</option>
                    <option value="En Proceso" ${n.estado === 'En Proceso' ? 'selected' : ''}>⚙️ En Proceso</option>
                    <option value="Terminada" ${n.estado === 'Terminada' ? 'selected' : ''}>✅ Terminada</option>
                </select>
            </td>
            <td class="text-end">
                <button onclick="prepararEdicionNovedad(${n.id})" class="btn btn-sm btn-outline-primary border-0 me-1" data-bs-toggle="tooltip" data-bs-title="Editar"><i class="bi bi-pencil"></i></button>
                <button onclick="eliminarNovedad(${n.id})" class="btn btn-sm btn-outline-danger border-0" data-bs-toggle="tooltip" data-bs-title="Eliminar"><i class="bi bi-trash"></i></button>
            </td>`;
        
        fragment.appendChild(tr);
    });

    // Gestionar Sentinel con Ui.js
    const existingSentinel = document.getElementById('sentinel-loader-nov');
    if (existingSentinel) existingSentinel.remove();

    tabla.appendChild(fragment);

    if (visibleCount < total) {
        const sentinelRow = Ui.createSentinelRow('sentinel-loader-nov', 'Cargando historial...', 5);
        tabla.appendChild(sentinelRow);
        
        // Re-conectar (aunque Ui.infiniteScroll suele ser autosuficiente, si el elemento cambió de DOM
        // puede necesitar refresh. El controlador lo hace un poco automatico pero mejor asegurar)
        if (infiniteScrollController) infiniteScrollController.reconnect();
    }

    if (window.checkDailySummaryVisibility) window.checkDailySummaryVisibility();
}

window.cargarMasNovedades = function() {
    if (visibleCount >= currentFilteredNovedades.length) return;
    visibleCount += PAGE_SIZE;
    renderListaNovedades(true);
};

// ============================================================================
// ACCIONES GLOBALES
// ============================================================================

function imprimirNovedades() {
    const user = Utils.validateUser();
    if (!user) return;
    Utils.printSection('print-date-novedades', 'print-repc-nombre-novedades', user);
}

window.cambiarEstadoNovedad = (id, nuevoEstado) => {
    let novedades = novedadesService.getNovedades();
    const novedad = novedades.find(n => n.id === id);
    if (novedad) {
        novedad.estado = nuevoEstado;
        novedadesService.updateNovedad(novedad);
    }
    mostrarNovedades();
};

window.eliminarNovedad = async (id) => {
    if (await window.showConfirm("¿Eliminar esta novedad definitivamente?")) {
        novedadesService.removeNovedad(id);
        mostrarNovedades();
    }
};

/**
 * EDITAR NOVEDAD
 * Carga los datos de una novedad existente en el formulario para su modificación.
 */
window.prepararEdicionNovedad = (id) => {
    const n = novedadesService.getNovedadById(id);
    if (n) {
        cambiarVistaNovedades('trabajo');
        Utils.setVal('nov_id', n.id);
        Utils.setVal('nov_prioridad', n.prioridad);
        Utils.setVal('nov_texto', n.texto);
        Utils.setVal('nov_comentario', n.comentario || '');

        // Marcar departamentos
        // Resetear todos primero
        document.querySelectorAll('.check-nov-dept').forEach(cb => cb.checked = false);
        const deptOtroCheck = document.getElementById('dept_otro');
        const deptOtroInput = document.getElementById('nov_dept_otro_input');
        if (deptOtroCheck) deptOtroCheck.checked = false;
        if (deptOtroInput) {
            deptOtroInput.value = '';
            deptOtroInput.classList.add('d-none');
        }

        n.departamentos.forEach(dept => {
            const cb = document.querySelector(`.check-nov-dept[value="${dept}"]`);
            if (cb) {
                cb.checked = true;
            } else {
                // Es un departamento personalizado
                if (deptOtroCheck && deptOtroInput) {
                    deptOtroCheck.checked = true;
                    deptOtroInput.value = dept;
                    deptOtroInput.classList.remove('d-none');
                }
            }
        });

        const btn = document.getElementById('btnSubmitNovedad');
        if (btn) btn.innerHTML = '<i class="bi bi-pencil-square me-2"></i>Actualizar Novedad';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

window.cambiarVistaNovedades = cambiarVistaNovedades;
window.imprimirNovedades = imprimirNovedades;

window.irANovedad = (id) => {
    navegarA('#novedades-content');
    cambiarVistaNovedades('solo');
    setTimeout(() => {
        const row = document.getElementById(`nov-row-${id}`);
        if (row) {
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            row.classList.add('table-warning');
            setTimeout(() => row.classList.remove('table-warning'), 2000);
        }
    }, 100);
};

window.limpiarNovedadesTerminadas = async () => {
    if (await window.showConfirm("¿Deseas borrar todas las novedades marcadas como 'Terminada'?")) {
        // En lugar de acceder a localStorage, usamos servicio (simulado aquí con lógica manual pq servicio no tiene deleteBulk)
        const all = novedadesService.getNovedades();
        const active = all.filter(n => n.estado !== 'Terminada');
        novedadesService.saveNovedades(active);
        mostrarNovedades();
    }
};