import { APP_CONFIG } from '../core/Config.js';
import { agendaService } from '../services/AgendaService.js';
import { Utils } from '../core/Utils.js';

/**
 * MÓDULO DE AGENDA DE CONTACTOS (agenda.js)
 * ----------------------------------------
 * Maneja la interfaz para buscar, añadir y editar contactos.
 * Soporta miles de registros gracias a un sistema de paginación automática (Load More).
 */

let editIdAgenda = null;    // ID del contacto que se está editando (null si es nuevo)
let formAgenda = null;      // Referencia al formulario HTML
let agendaCuerpo = null;    // Contenedor de la tabla de contactos

/**
 * INICIALIZACIÓN DEL MÓDULO
 * Prepara el formulario, carga datos iniciales, configura selectores y eventos.
 */
export async function inicializarAgenda() {
    formAgenda = document.getElementById('formAgenda');
    agendaCuerpo = document.getElementById('agendaCuerpo');

    // 1. Verificar si la agenda está cargada (lógica anti-corrupción)
    await agendaService.verificarDatosIniciales();

    // 2. Preparar el selector de teléfonos dinámico
    const wrapper = document.getElementById('telefonos-wrapper');
    if (wrapper) {
        wrapper.innerHTML = '<label class="form-label small d-flex justify-content-between mb-1">Teléfonos <button type="button" class="btn btn-sm btn-outline-secondary border-0 py-0" onclick="agregarCampoTelefono()"><i class="bi bi-plus-circle"></i></button></label>';
        agregarCampoTelefono();
    }

    // 3. Cargar la lista de países (Banderas y Prefijos)
    const datalist = document.getElementById('paises-list');
    if (datalist && datalist.options.length === 0) {
        APP_CONFIG.AGENDA.PAISES.forEach(p => {
            const option = document.createElement('option');
            option.value = p.c;
            option.innerText = `${p.f} ${p.n}`;
            datalist.appendChild(option);
        });
    }

    // 4. Configurar Eventos (Listeners)
    const catSelect = document.getElementById('agenda_categoria');
    if (catSelect) {
        catSelect.removeEventListener('change', actualizarVisibilidadCampos);
        catSelect.addEventListener('change', actualizarVisibilidadCampos);
    }

    if (formAgenda) {
        formAgenda.removeEventListener('submit', manejarSubmitAgenda);
        formAgenda.addEventListener('submit', manejarSubmitAgenda);
    }

    const searchInput = document.getElementById('searchAgenda');
    if (searchInput) {
        searchInput.removeEventListener('input', manejarBusqueda);
        searchInput.addEventListener('input', manejarBusqueda);
    }

    // 5. Mostrar la lista inicial
    await mostrarContactos();
    actualizarVisibilidadCampos();

    // Botones de cambio de vista (Trabajo vs Lista completa)
    document.getElementById('btnVistaTrabajoAgenda')?.addEventListener('click', () => toggleViewAgenda('trabajo'));
    document.getElementById('btnVistaListaAgenda')?.addEventListener('click', () => toggleViewAgenda('lista'));
}

/**
 * CAMBIAR VISTA DE LA AGENDA
 * Permite ocultar el formulario para ver la lista de contactos en pantalla completa.
 */
window.toggleViewAgenda = function(view) {
    const btnTrabajo = document.getElementById('btnVistaTrabajoAgenda');
    const btnLista = document.getElementById('btnVistaListaAgenda');
    const formCol = document.getElementById('formAgenda')?.closest('.col-md-4');
    const listCol = document.getElementById('agenda-list-col');

    if (view === 'lista') {
        if(formCol) formCol.classList.add('d-none');
        if(listCol) { listCol.classList.remove('col-md-8'); listCol.classList.add('col-12'); }
        btnTrabajo?.classList.remove('active');
        btnLista?.classList.add('active');
    } else {
        if(formCol) formCol.classList.remove('d-none');
        if(listCol) { listCol.classList.remove('col-12'); listCol.classList.add('col-md-8'); }
        btnLista?.classList.remove('active');
        btnTrabajo?.classList.add('active');
    }
}

function manejarBusqueda(e) {
    const term = e.target.value.trim();
    mostrarContactos(term);
}

/**
 * PROCESAR FORMULARIO (Guardar/Editar)
 * Recopila los datos del formulario, valida teléfonos y extensiones, y guarda en el servicio.
 */
async function manejarSubmitAgenda(e) {
    e.preventDefault();

    // 1. Recopilar Teléfonos de los campos dinámicos
    const telefonos = Array.from(document.querySelectorAll('#telefonos-wrapper .tel-entry')).map(entry => {
        const pref = entry.querySelector('.agenda-prefijo').value;
        const pais = APP_CONFIG.AGENDA.PAISES.find(p => p.c === pref);
        return {
            tipo: entry.querySelector('.agenda-tipo').value,
            prefijo: pref,
            numero: entry.querySelector('.agenda-numero').value,
            flag: pais ? pais.f : ""
        };
    });

    // 2. Validaciones básicas de campos obligatorios
    const nombre = document.getElementById('agenda_nombre').value.trim();
    const vinculo = document.getElementById('agenda_vinculo').value;
    const categoria = document.getElementById('agenda_categoria').value;

    if (!nombre || !vinculo || !categoria) {
        alert("Por favor, rellene los campos obligatorios: Nombre, Vínculo y Categoría.");
        return;
    }

    // 3. Validación de Formato de Teléfonos/Extensiones
    for (const t of telefonos) {
        const numLimpio = t.numero.replace(/[\s-]/g, '');
        const esValido = t.tipo === 'Ext' ? /^\d{2,6}$/.test(numLimpio) : /^\d{7,15}$/.test(numLimpio);

        if (!esValido) {
            alert(`El contacto "${t.numero}" no es válido. Las extensiones tienen 2-6 dígitos y los teléfonos 7-15.`);
            return;
        }
    }

    // 4. Crear Objeto Contacto
    const contacto = {
        id: editIdAgenda || Date.now(),
        nombre: nombre,
        telefonos: telefonos,
        email: document.getElementById('agenda_email').value,
        web: document.getElementById('agenda_web').value,
        direccion: {
            pais: document.getElementById('agenda_pais').value,
            ciudad: document.getElementById('agenda_ciudad').value,
            calle: document.getElementById('agenda_calle').value,
            numero: document.getElementById('agenda_numero_calle').value,
            cp: document.getElementById('agenda_cp').value
        },
        vinculo: vinculo,
        categoria: categoria,
        comentarios: document.getElementById('agenda_comentarios').value,
        favorito: document.getElementById('agenda_favorito').checked
    };

    // 5. Guardar en el Servicio
    let contactos = await agendaService.getAll();
    if (editIdAgenda) {
        contactos = contactos.map(c => c.id === editIdAgenda ? contacto : c);
        editIdAgenda = null;
        document.getElementById('btnAgendaSubmit').innerHTML = '<i class="bi bi-person-plus-fill me-2"></i>Guardar Contacto';
    } else {
        contactos.push(contacto);
    }

    await agendaService.save(contactos);
    formAgenda.reset();
    inicializarAgenda(); 
}

/**
 * AÑADIR CAMPO DE TELÉFONO DINÁMICO
 */
function agregarCampoTelefono(prefijo = "+34", numero = "", tipo = "Tel") {
    const wrapper = document.getElementById('telefonos-wrapper');
    const div = document.createElement('div');
    div.className = 'border rounded p-1 mb-1 tel-entry bg-light';

    const paisEncontrado = APP_CONFIG.AGENDA.PAISES.find(p => p.c === prefijo);
    const flag = paisEncontrado ? paisEncontrado.f : "🌐";

    const catEl = document.getElementById('agenda_categoria');
    const cat = catEl ? catEl.value : 'Información';
    const forcedTipo = (cat === 'Extensión') ? 'Ext' : 'Tel';
    const isExt = forcedTipo === 'Ext';

    div.innerHTML = `
        <div class="d-flex gap-1 mb-1">
            <select class="form-select form-select-sm agenda-tipo" style="width: 80px;" onchange="toggleTelExt(this)" disabled>
                <option value="Tel" ${forcedTipo === 'Tel' ? 'selected' : ''}>Tel.</option>
                <option value="Ext" ${forcedTipo === 'Ext' ? 'selected' : ''}>Ext.</option>
            </select>
            <div class="input-group input-group-sm flag-prefijo-container" style="${isExt ? 'display:none' : ''}">
                <span class="input-group-text flag-display">${flag}</span>
                <input type="text" class="form-control agenda-prefijo" list="paises-list" value="${prefijo}" oninput="actualizarBandera(this)" placeholder="Pref">
            </div>
        </div>
        <div class="input-group input-group-sm">
            <input type="text" class="form-control agenda-numero" value="${numero}" placeholder="${isExt ? 'Extensión' : 'Número'}" required>
            <button type="button" class="btn btn-outline-danger" onclick="this.closest('.tel-entry').remove()"><i class="bi bi-x"></i></button>
        </div>
    `;
    wrapper.appendChild(div);
}

function actualizarBandera(input) {
    const flagSpan = input.parentElement.querySelector('.flag-display');
    const pais = APP_CONFIG.AGENDA.PAISES.find(p => p.c === input.value);
    flagSpan.innerText = pais ? pais.f : "🌐";
}

function toggleTelExt(select) {
    const isExt = select.value === 'Ext';
    const entry = select.closest('.tel-entry');
    entry.querySelector('.flag-prefijo-container').style.display = isExt ? 'none' : 'flex';
    entry.querySelector('.agenda-numero').placeholder = isExt ? 'Extensión' : 'Número';
}

/**
 * OCULTAR/MOSTRAR CAMPOS SEGÚN CATEGORÍA
 * Si es una "Extensión", no necesitamos dirección, email ni web.
 */
/**
 * OCULTAR/MOSTRAR CAMPOS SEGÚN CATEGORÍA
 * Si es una "Extensión", no necesitamos dirección, email ni web.
 * También bloquea el tipo de teléfono a "Ext".
 */
function actualizarVisibilidadCampos() {
    const catEl = document.getElementById('agenda_categoria');
    if (!catEl) return;

    const cat = catEl.value;
    const isExt = cat === 'Extensión';
    const vinculo = document.getElementById('agenda_vinculo');
    const extraFields = ['agenda_email', 'agenda_web', 'agenda_pais', 'agenda_ciudad', 'agenda_calle', 'agenda_numero_calle', 'agenda_cp'];

    if (isExt) {
        vinculo.value = 'Hotel';
        vinculo.disabled = true;
        extraFields.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.closest(id.includes('agenda_email') || id.includes('agenda_web') ? '.mb-2' : 'div').style.display = 'none';
        });
        if (document.getElementById('direccion-wrapper')) document.getElementById('direccion-wrapper').style.display = 'none';
    } else {
        vinculo.disabled = false;
        extraFields.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.closest(id.includes('agenda_email') || id.includes('agenda_web') ? '.mb-2' : 'div').style.display = 'block';
        });
        if (document.getElementById('direccion-wrapper')) document.getElementById('direccion-wrapper').style.display = 'flex';
    }

    // Cambiar automáticamente todos los teléfonos de este contacto a tipo Ext o Tel
    document.querySelectorAll('#telefonos-wrapper .tel-entry').forEach(entry => {
        const select = entry.querySelector('.agenda-tipo');
        select.value = isExt ? 'Ext' : 'Tel';
        toggleTelExt(select);
    });
}

// --- GESTIÓN DE PAGINACIÓN Y RENDERIZADO ---
let currentFilteredContacts = [];
let visibleCount = 50;
const PAGE_SIZE = 50;

/**
 * FILTRAR Y PREPARAR LISTA
 * Ordena por favoritos y alfabéticamente antes de filtrar por el término de búsqueda.
 */
async function mostrarContactos(filtro = "") {
    let contactos = await agendaService.getAll();
    try {
        if (!contactos || !Array.isArray(contactos)) {
            contactos = [];
        }

        // Ordenar: Favoritos primero, luego Alfabético
        contactos.sort((a, b) => {
            if (a.favorito !== b.favorito) return b.favorito ? -1 : 1;
            return a.nombre.localeCompare(b.nombre);
        });
    } catch (e) {
        console.error("Error sorting:", e);
        contactos = [];
    }

    // Aplicar Filtro
    currentFilteredContacts = filtro.trim() === "" 
        ? contactos 
        : contactos.filter(c =>
            c.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
            (c.telefonos && c.telefonos.some(t => t.numero && t.numero.includes(filtro))) ||
            (c.email && c.email.toLowerCase().includes(filtro.toLowerCase()))
        );

    // Resetear paginación en cada búsqueda
    visibleCount = PAGE_SIZE;
    
    // Actualizar Contadores UI
    const totalEl = document.getElementById('totalContactos');
    if (totalEl) totalEl.innerText = currentFilteredContacts.length;

    renderListaContactos();
}

/**
 * DIBUJAR TABLA DE CONTACTOS (Paginado)
 * Muestra solo los primeros N contactos e incluye un botón para cargar más si es necesario.
 */
function renderListaContactos() {
    if (!agendaCuerpo) return;
    
    const slice = currentFilteredContacts.slice(0, visibleCount);
    let html = '';

    slice.forEach(c => {
        const favIcon = c.favorito ? '<i class="bi bi-star-fill text-warning me-1"></i>' : '';
        let telList = (c.telefonos || []).map(t => `
            <div class="small fw-bold">
                <span class="text-muted" style="font-size: 0.7rem;">${t.tipo}:</span> 
                <span class="text-primary">${t.tipo === 'Tel' ? (t.flag || '') + ' ' + (t.prefijo || '') : ''} ${t.numero || ''}</span>
            </div>`).join('');

        const emailHtml = c.email ? `<div class="small text-muted"><i class="bi bi-envelope me-1"></i>${c.email}</div>` : '';
        const webHtml = c.web ? `<div class="small text-muted"><i class="bi bi-globe me-1"></i><a href="${c.web}" target="_blank" class="text-decoration-none">${c.web}</a></div>` : '';

        let addressHtml = '';
        if (c.direccion && (c.direccion.calle || c.direccion.ciudad)) {
            const d = c.direccion;
            addressHtml = `<div class="small text-muted"><i class="bi bi-geo-alt me-1"></i>${d.calle || ''} ${d.numero || ''}, ${d.cp || ''} ${d.ciudad || ''} (${d.pais || ''})</div>`;
        }

        const commHtml = c.comentarios ? `<div class="small fst-italic text-secondary mt-1 border-top pt-1">${c.comentarios}</div>` : '';

        // Estilos de badges
        const vinculoClass = { "Empresa": "bg-secondary", "Cliente": "bg-info", "Hotel": "bg-primary", "Otro": "bg-light text-dark border" }[c.vinculo] || "bg-dark";
        const catClass = { "Urgencia": "bg-danger", "Información": "bg-primary", "Extensión": "bg-success" }[c.categoria] || "bg-secondary";

        html += `
            <tr class="${c.favorito ? 'table-warning' : ''}">
                <td style="width: 30%">
                    <div class="d-flex align-items-center">${favIcon}<i class="bi bi-person-badge me-2 text-muted"></i><strong>${c.nombre}</strong></div>
                    ${commHtml}
                </td>
                <td style="width: 12%"><span class="badge ${vinculoClass}">${c.vinculo}</span></td>
                <td style="width: 12%"><span class="badge ${catClass}">${c.categoria}</span></td>
                <td style="width: 26%">${telList}${emailHtml}${webHtml}${addressHtml}</td>
                <td style="width: 20%">
                    <button onclick="prepararEdicionAgenda(${c.id})" class="btn btn-sm btn-outline-primary border-0 me-1"><i class="bi bi-pencil"></i></button>
                    <button onclick="eliminarContacto(${c.id})" class="btn btn-sm btn-outline-danger border-0"><i class="bi bi-trash"></i></button>
                </td>
            </tr>`;
    });

    // Botón "Cargar más"
    if (visibleCount < currentFilteredContacts.length) {
        html += `
        <tr id="row-load-more">
            <td colspan="5" class="text-center py-3">
                <button class="btn btn-light text-primary fw-bold w-100" onclick="window.cargarMasContactos()">
                    <i class="bi bi-arrow-down-circle me-2"></i>Cargar más contactos (${currentFilteredContacts.length - visibleCount} restantes)
                </button>
            </td>
        </tr>`;
    }

    agendaCuerpo.innerHTML = html;
}

window.cargarMasContactos = function() {
    visibleCount += PAGE_SIZE;
    renderListaContactos();
};

/**
 * EDITAR CONTACTO (Cargar datos en form)
 * Busca el contacto por ID y rellena todos los campos del formulario, 
 * incluyendo los teléfonos dinámicos.
 */
export async function prepararEdicionAgenda(id) {
    const contactos = await agendaService.getAll();
    const c = contactos.find(item => item.id === id);
    if (!c) return;

    Utils.setVal('agenda_nombre', c.nombre);
    Utils.setVal('agenda_email', c.email || '');
    Utils.setVal('agenda_web', c.web || '');

    if (c.direccion) {
        Utils.setVal('agenda_pais', c.direccion.pais || '');
        Utils.setVal('agenda_ciudad', c.direccion.ciudad || '');
        Utils.setVal('agenda_calle', c.direccion.calle || '');
        Utils.setVal('agenda_numero_calle', c.direccion.numero || '');
        Utils.setVal('agenda_cp', c.direccion.cp || '');
    }

    Utils.setVal('agenda_vinculo', c.vinculo || 'Trabajador');
    Utils.setVal('agenda_categoria', c.categoria);
    Utils.setVal('agenda_comentarios', c.comentarios || '');
    document.getElementById('agenda_favorito').checked = c.favorito || false;

    // Recargar campos de teléfono
    const wrapper = document.getElementById('telefonos-wrapper');
    wrapper.innerHTML = '<label class="form-label d-flex justify-content-between">Teléfonos / Extensiones <button type="button" class="btn btn-sm btn-outline-secondary border-0 py-0" onclick="agregarCampoTelefono()"><i class="bi bi-plus-circle"></i></button></label>';

    if (c.telefonos && c.telefonos.length > 0) {
        c.telefonos.forEach(t => agregarCampoTelefono(t.prefijo, t.numero, t.tipo));
    } else {
        agregarCampoTelefono();
    }

    editIdAgenda = id;
    document.getElementById('btnAgendaSubmit').innerHTML = '<i class="bi bi-pencil-square me-2"></i>Actualizar Contacto';
    actualizarVisibilidadCampos();

    document.getElementById('formAgenda')?.scrollIntoView({ behavior: 'smooth' });
}

/**
 * ELIMINAR CONTACTO
 */
export async function eliminarContacto(id) {
    if (confirm("¿Eliminar este contacto?")) {
        let contactos = await agendaService.getAll();
        contactos = contactos.filter(c => c.id !== id);
        await agendaService.save(contactos);
        mostrarContactos();
    }
}

/**
 * EXPORTAR A EXCEL (CSV)
 * Genera un archivo con formato punto y coma (;) compatible con Excel en español.
 */
export async function exportarAgendaCSV() {
    const contactos = await agendaService.getAll();
    if (contactos.length === 0) return alert("No hay contactos para exportar.");

    let csv = "\ufeffNombre;Vínculo;Prioridad;Favorito;Teléfonos;Email;Web;País;Ciudad;Calle;Número;CP;Comentarios\n";

    contactos.forEach(c => {
        const tels = (c.telefonos || []).map(t => `${t.tipo}: ${t.prefijo || ''} ${t.numero}`).join(" | ");
        const d = c.direccion || {};
        csv += `"${c.nombre}";"${c.vinculo}";"${c.categoria}";"${c.favorito ? 'Sí' : 'No'}";"${tels}";"${c.email || ''}";"${c.web || ''}";"${d.pais || ''}";"${d.ciudad || ''}";"${d.calle || ''}";"${d.numero || ''}";"${d.cp || ''}";"${c.comentarios || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `agenda_contactos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

// Exportaciones para uso desde el HTML
window.prepararEdicionAgenda = prepararEdicionAgenda;
window.eliminarContacto = eliminarContacto;
window.exportarAgendaCSV = exportarAgendaCSV;
window.agregarCampoTelefono = agregarCampoTelefono;
window.actualizarBandera = actualizarBandera;
window.toggleTelExt = toggleTelExt;