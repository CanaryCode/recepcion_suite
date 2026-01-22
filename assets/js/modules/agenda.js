import { APP_CONFIG } from '../core/Config.js';
import { agendaService } from '../services/AgendaService.js';
import { Utils } from '../core/Utils.js';

// ============================================================================
// ESTADO
// ============================================================================
let editIdAgenda = null;
let formAgenda = null;
let agendaCuerpo = null;

// ============================================================================
// INICIALIZACIÓN
// ============================================================================

/**
 * Inicializa el módulo de Agenda.
 * Configura listeners, carga datos iniciales y prepara el formulario.
 */
export async function inicializarAgenda() {
    formAgenda = document.getElementById('formAgenda');
    agendaCuerpo = document.getElementById('agendaCuerpo');

    // Configurar wrapper de teléfonos
    const wrapper = document.getElementById('telefonos-wrapper');
    if (wrapper) {
        wrapper.innerHTML = '<label class="form-label small d-flex justify-content-between mb-1">Teléfonos <button type="button" class="btn btn-sm btn-outline-secondary border-0 py-0" onclick="agregarCampoTelefono()"><i class="bi bi-plus-circle"></i></button></label>';
        agregarCampoTelefono();
    }

    // Cargar lista de países para datalist
    const datalist = document.getElementById('paises-list');
    if (datalist && datalist.options.length === 0) {
        APP_CONFIG.AGENDA.PAISES.forEach(p => {
            const option = document.createElement('option');
            option.value = p.c;
            option.innerText = `${p.f} ${p.n}`;
            datalist.appendChild(option);
        });
    }

    // Listeners del formulario y filtros
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
        searchInput.addEventListener('input', (e) => mostrarContactos(e.target.value));
    }

    await mostrarContactos();
    actualizarVisibilidadCampos();
}

// ============================================================================
// HANDLERS
// ============================================================================

/**
 * Maneja el envío del formulario de contacto (Crear/Editar).
 * @param {Event} e 
 */
async function manejarSubmitAgenda(e) {
    e.preventDefault();

    // 1. Recopilar Teléfonos
    const telefonos = Array.from(document.querySelectorAll('#telefonos-wrapper .tel-entry')).map(entry => {
        const tipo = entry.querySelector('.agenda-tipo').value;
        const pref = entry.querySelector('.agenda-prefijo').value;
        const pais = APP_CONFIG.AGENDA.PAISES.find(p => p.c === pref);
        return {
            tipo: tipo,
            prefijo: pref,
            numero: entry.querySelector('.agenda-numero').value,
            flag: pais ? pais.f : ""
        };
    });

    // 2. Validaciones básicas
    const nombre = document.getElementById('agenda_nombre').value.trim();
    const vinculo = document.getElementById('agenda_vinculo').value;
    const categoria = document.getElementById('agenda_categoria').value;

    ['agenda_nombre', 'agenda_vinculo', 'agenda_categoria'].forEach(id => document.getElementById(id).classList.remove('is-invalid'));

    if (!nombre || !vinculo || !categoria) {
        if (!nombre) document.getElementById('agenda_nombre').classList.add('is-invalid');
        if (!vinculo) document.getElementById('agenda_vinculo').classList.add('is-invalid');
        if (!categoria) document.getElementById('agenda_categoria').classList.add('is-invalid');
        alert("Por favor, rellene los campos obligatorios: Nombre, Vínculo y Categoría.");
        return;
    }

    if (telefonos.length === 0) {
        alert("Debe añadir al menos un número de contacto.");
        return;
    }

    // 3. Validación de Teléfonos
    for (const t of telefonos) {
        const inputEl = Array.from(document.querySelectorAll('#telefonos-wrapper .agenda-numero')).find(el => el.value === t.numero);
        if (inputEl) inputEl.classList.remove('is-invalid');

        const numLimpio = t.numero.replace(/[\s-]/g, '');
        const esValido = t.tipo === 'Ext' ? /^\d{2,6}$/.test(numLimpio) : /^\d{7,15}$/.test(numLimpio);

        if (!esValido) {
            if (inputEl) inputEl.classList.add('is-invalid');
            alert(`El contacto "${t.numero}" no es válido. ${t.tipo === 'Ext' ? 'Las extensiones deben tener entre 2 y 6 dígitos.' : 'Los teléfonos deben tener entre 7 y 15 dígitos.'}`);
            return;
        }
    }

    // 4. Construir Objeto
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

    // 5. Guardar
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
    inicializarAgenda(); // Reinicia listeners y vista
}

// ============================================================================
// FUNCIONES UI
// ============================================================================

/**
 * Agrega dinámicamente un campo de teléfono al formulario.
 */
function agregarCampoTelefono(prefijo = "+34", numero = "", tipo = "Tel") {
    const wrapper = document.getElementById('telefonos-wrapper');
    const div = document.createElement('div');
    div.className = 'border rounded p-1 mb-1 tel-entry bg-light';

    const paisEncontrado = APP_CONFIG.AGENDA.PAISES.find(p => p.c === prefijo);
    const flag = paisEncontrado ? paisEncontrado.f : "🌐";

    const catEl = document.getElementById('agenda_categoria');
    const cat = catEl ? catEl.value : 'Común';
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
                <input type="text" class="form-control agenda-prefijo" list="paises-list" value="${prefijo}" oninput="actualizarBandera(this)" placeholder="Prefijo">
            </div>
        </div>
        <div class="input-group input-group-sm">
            <input type="text" class="form-control agenda-numero" value="${numero}" placeholder="${isExt ? 'Extensión' : 'Número de teléfono'}" required>
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
    entry.querySelector('.agenda-numero').placeholder = isExt ? 'Extensión' : 'Número de teléfono';
}

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

    // Actualizar tipo de teléfono en filas existentes
    document.querySelectorAll('#telefonos-wrapper .tel-entry').forEach(entry => {
        const select = entry.querySelector('.agenda-tipo');
        select.value = isExt ? 'Ext' : 'Tel';
        select.disabled = true;
        toggleTelExt(select);
    });
}

async function mostrarContactos(filtro = "") {
    let contactos = await agendaService.getAll();
    if (!agendaCuerpo) return;

    agendaCuerpo.innerHTML = '';
    const totalEl = document.getElementById('totalContactos');
    if (totalEl) totalEl.innerText = contactos.length;

    contactos.sort((a, b) => (b.favorito ? 1 : 0) - (a.favorito ? 1 : 0));

    const filtrados = contactos.filter(c =>
        c.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
        (c.telefonos && c.telefonos.some(t => t.numero && t.numero.includes(filtro))) ||
        (c.telefono && c.telefono.includes(filtro)) ||
        (c.email && c.email.toLowerCase().includes(filtro.toLowerCase()))
    );

    filtrados.forEach(c => {
        const favIcon = c.favorito ? '<i class="bi bi-star-fill text-warning me-1"></i>' : '';
        let telList = "";

        if (c.telefonos && c.telefonos.length > 0) {
            telList = c.telefonos.map(t => `
            <div class="small fw-bold">
                <span class="text-muted" style="font-size: 0.7rem;">${t.tipo}:</span> 
                <span class="text-primary">${t.tipo === 'Tel' ? (t.flag || '') + ' ' + (t.prefijo || '') : ''} ${t.numero || ''}</span>
            </div>`).join('');
        } else if (c.telefono) {
            telList = `<div class="small fw-bold text-primary">${c.telefono}</div>`;
        }

        const emailHtml = c.email ? `<div class="small text-muted"><i class="bi bi-envelope me-1"></i>${c.email}</div>` : '';
        const webHtml = c.web ? `<div class="small text-muted"><i class="bi bi-globe me-1"></i><a href="${c.web}" target="_blank" class="text-decoration-none">${c.web}</a></div>` : '';

        let addressHtml = '';
        if (c.direccion && (c.direccion.calle || c.direccion.ciudad)) {
            const d = c.direccion;
            addressHtml = `<div class="small text-muted"><i class="bi bi-geo-alt me-1"></i>${d.calle || ''} ${d.numero || ''}, ${d.cp || ''} ${d.ciudad || ''} (${d.pais || ''})</div>`;
        }

        const commHtml = c.comentarios ? `<div class="small fst-italic text-secondary mt-1 border-top pt-1">${c.comentarios}</div>` : '';

        // Clases dinámicas
        const vinculoClass = { "Empresa": "bg-secondary", "Cliente": "bg-info", "Hotel": "bg-primary", "Otro": "bg-light text-dark border" }[c.vinculo] || "bg-dark";
        const catClass = { "Urgencia": "bg-danger", "Información": "bg-primary", "Extensión": "bg-success" }[c.categoria] || "bg-secondary";

        agendaCuerpo.innerHTML += `
            <tr class="${c.favorito ? 'table-warning' : ''}">
                <td style="width: 30%">
                    <div class="d-flex align-items-center">
                        ${favIcon}
                        <i class="bi bi-person-badge me-2 text-muted"></i>
                        <strong>${c.nombre}</strong>
                    </div>
                    ${commHtml}
                </td>
                <td style="width: 12%"><span class="badge ${vinculoClass}">${c.vinculo}</span></td>
                <td style="width: 12%"><span class="badge ${catClass}">${c.categoria}</span></td>
                <td style="width: 26%">${telList}${emailHtml}${webHtml}${addressHtml}</td>
                <td style="width: 20%">
                    <button onclick="prepararEdicionAgenda(${c.id})" class="btn btn-sm btn-outline-primary border-0 me-1" data-bs-toggle="tooltip" data-bs-title="Editar"><i class="bi bi-pencil"></i></button>
                    <button onclick="eliminarContacto(${c.id})" class="btn btn-sm btn-outline-danger border-0" data-bs-toggle="tooltip" data-bs-title="Eliminar"><i class="bi bi-trash"></i></button>
                </td>
            </tr>`;
    });
}

/**
 * Carga los datos de un contacto en el formulario para editar.
 * @param {number} id 
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

    // Recargar teléfonos
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

    // Scroll arriba
    document.getElementById('formAgenda')?.scrollIntoView({ behavior: 'smooth' });
}

export async function eliminarContacto(id) {
    if (confirm("¿Eliminar este contacto?")) {
        let contactos = await agendaService.getAll();
        contactos = contactos.filter(c => c.id !== id);
        await agendaService.save(contactos);
        mostrarContactos();
    }
}

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

// ============================================================================
// EXPORTACIONES GLOBALES
// ============================================================================
window.prepararEdicionAgenda = prepararEdicionAgenda;
window.eliminarContacto = eliminarContacto;
window.exportarAgendaCSV = exportarAgendaCSV;
window.agregarCampoTelefono = agregarCampoTelefono;
window.actualizarBandera = actualizarBandera;
window.toggleTelExt = toggleTelExt;