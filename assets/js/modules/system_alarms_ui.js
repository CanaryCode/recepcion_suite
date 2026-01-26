/**
 * MÓDULO DE INTERFAZ DE ALARMAS (system_alarms_ui.js)
 * --------------------------------------------------
 * Gestiona el formulario y la lista visual de alarmas recurrentes.
 * Permite configurar avisos diarios, por fecha específica o por días de la semana,
 * actuando como puente entre el usuario y el servicio de alarmas del sistema.
 */

export function inicializarSystemAlarmsUI() {
    const form = document.getElementById('formSystemAlarm');
    if (form) {
        form.removeEventListener('submit', handleFormSubmit);
        form.addEventListener('submit', handleFormSubmit);
    }
    
    // Configurar inputs visibilidad
    window.togglePeriodicidadInputs = togglePeriodicidadInputs;
    togglePeriodicidadInputs(); // Init state

    // VISTAS (Trabajo vs Lista)
    document.getElementById('btnVistaTrabajoAlarms')?.addEventListener('click', () => toggleView('trabajo'));
    document.getElementById('btnVistaListaAlarms')?.addEventListener('click', () => toggleView('lista'));

    renderAlarmsList();
    
    // Helpers Globales
    window.editSystemAlarm = editSystemAlarm;
    window.deleteSystemAlarm = deleteSystemAlarm;
    window.toggleActiveSystemAlarm = toggleActiveSystemAlarm;
    window.resetFormSystemAlarm = resetForm;
}

function toggleView(view) {
    const btnTrabajo = document.getElementById('btnVistaTrabajoAlarms');
    const btnLista = document.getElementById('btnVistaListaAlarms');
    const formCol = document.querySelector('#formSystemAlarm')?.closest('.col-md-5');
    const listCol = document.querySelector('#tableSystemAlarmsBody')?.closest('.col-md-7');

    if (view === 'lista') {
        // Vista Solo Lista
        if(formCol) formCol.classList.add('d-none');
        if(listCol) {
            listCol.classList.remove('col-md-7');
            listCol.classList.add('col-12');
        }
        btnTrabajo?.classList.remove('active');
        btnLista?.classList.add('active');
    } else {
        // Vista Trabajo (Split)
        if(formCol) formCol.classList.remove('d-none');
        if(listCol) {
            listCol.classList.remove('col-12');
            listCol.classList.add('col-md-7');
        }
        btnLista?.classList.remove('active');
        btnTrabajo?.classList.add('active');
    }
}

/**
 * CONFIGURAR VISIBILIDAD DE INPUTS
 * Muestra u oculta los selectores de fecha o días de la semana según el 
 * tipo de periodicidad seleccionado (diaria, semanal o fecha fija).
 */
function togglePeriodicidadInputs() {
    const type = document.getElementById('sys_alarm_type').value;
    const groupDate = document.getElementById('group-date');
    const groupDays = document.getElementById('group-days');

    if (type === 'date') {
        groupDate.classList.remove('d-none');
        groupDays.classList.add('d-none');
        document.getElementById('sys_alarm_date').required = true;
    } else if (type === 'weekly') {
        groupDate.classList.add('d-none');
        groupDays.classList.remove('d-none');
        document.getElementById('sys_alarm_date').required = false;
    } else {
        groupDate.classList.add('d-none');
        groupDays.classList.add('d-none');
        document.getElementById('sys_alarm_date').required = false;
    }
}

function handleFormSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('sys_alarm_id').value;
    const hora = document.getElementById('sys_alarm_hora').value;
    const msg = document.getElementById('sys_alarm_msg').value;
    const type = document.getElementById('sys_alarm_type').value;
    const active = document.getElementById('sys_alarm_active').checked;

    if (!hora || !msg) return;

    let alarmData = {
        id: id || null,
        hora,
        mensaje: msg,
        type,
        active
    };

    if (type === 'date') {
        alarmData.date = document.getElementById('sys_alarm_date').value;
        if (!alarmData.date) {
            alert("Selecciona una fecha");
            return;
        }
    } else if (type === 'weekly') {
        // Collect days
        const days = [];
        [0,1,2,3,4,5,6].forEach(d => {
             if(document.getElementById(`day-${d}`).checked) days.push(d);
        });
        if (days.length === 0) {
            alert("Selecciona al menos un día de la semana");
            return;
        }
        alarmData.days = days;
    } else {
        // Daily
        alarmData.dias = 'todos'; // Legacy compatibility
    }

    systemAlarmsService.saveAlarm(alarmData);

    resetForm();
    renderAlarmsList();
    
    if (window.showAlert) {
        window.showAlert("Alarma guardada correctamente", "success");
    } else {
        alert("Alarma guardada correctamente");
    }
}

function renderAlarmsList() {
    const tbody = document.getElementById('tableSystemAlarmsBody');
    if (!tbody) return;

    const alarms = systemAlarmsService.getAlarms().sort((a, b) => a.hora.localeCompare(b.hora));
    tbody.innerHTML = '';

    if (alarms.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No hay alarmas configuradas.</td></tr>';
        return;
    }

    alarms.forEach(a => {
        let freqBadge = '';
        if (a.type === 'date') {
            freqBadge = `<span class="badge bg-secondary">${Utils.formatDate(a.date)}</span>`;
        } else if (a.type === 'weekly' || Array.isArray(a.days)) { // Support legacy days array too
            const daysMap = {0:'D', 1:'L', 2:'M', 3:'X', 4:'J', 5:'V', 6:'S'};
            const dList = (a.days || a.dias).sort().map(d => daysMap[d] || '?').join(', ');
            freqBadge = `<span class="badge bg-info text-dark" style="font-size: 0.75rem;">${dList}</span>`;
        } else {
            // Daily or Legacy strings
            if (a.dias === 'laborables') freqBadge = '<span class="badge bg-primary text-white">L-V</span>';
            else if (a.dias === 'finde') freqBadge = '<span class="badge bg-warning text-dark">S-D</span>';
            else freqBadge = '<span class="badge bg-success">Todos los días</span>';
        }

        const activeSwitch = `
        <div class="form-check form-switch d-flex justify-content-center">
            <input class="form-check-input" type="checkbox" ${a.active ? 'checked' : ''} onclick="toggleActiveSystemAlarm('${a.id}')">
        </div>`;

        tbody.innerHTML += `
            <tr class="${!a.active ? 'opacity-50' : ''}">
                <td class="fw-bold text-primary fs-5 font-monospace">${a.hora}</td>
                <td>${a.mensaje}</td>
                <td>${freqBadge}</td>
                <td>${activeSwitch}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editSystemAlarm('${a.id}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteSystemAlarm('${a.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

function editSystemAlarm(id) {
    const alarm = systemAlarmsService.getAlarms().find(a => a.id === id);
    if (!alarm) return;

    Utils.setVal('sys_alarm_id', alarm.id);
    Utils.setVal('sys_alarm_hora', alarm.hora);
    Utils.setVal('sys_alarm_msg', alarm.mensaje);
    
    // Type inference
    let type = alarm.type || 'daily';
    if (!alarm.type) {
        // Try to infer from legacy
        if (Array.isArray(alarm.dias)) type = 'weekly';
        else if (alarm.date) type = 'date';
        else type = 'daily';
    }
    
    Utils.setVal('sys_alarm_type', type);
    togglePeriodicidadInputs(); // Show correct inputs

    if (type === 'date') {
        Utils.setVal('sys_alarm_date', alarm.date);
    } else if (type === 'weekly') {
        // Reset checkboxes
        [0,1,2,3,4,5,6].forEach(d => document.getElementById(`day-${d}`).checked = false);
        const days = alarm.days || (Array.isArray(alarm.dias) ? alarm.dias : []);
        days.forEach(d => {
            const ck = document.getElementById(`day-${d}`);
            if(ck) ck.checked = true;
        });
    }

    const activeCk = document.getElementById('sys_alarm_active');
    if(activeCk) activeCk.checked = alarm.active;

    const btn = document.querySelector('#formSystemAlarm button[type="submit"]');
    if(btn) btn.innerHTML = '<i class="bi bi-save me-2"></i>Actualizar';
}

function deleteSystemAlarm(id) {
    if (confirm("¿Borrar esta alarma del sistema?")) {
        systemAlarmsService.deleteAlarm(id);
        renderAlarmsList();
    }
}

function toggleActiveSystemAlarm(id) {
    systemAlarmsService.toggleActive(id);
    renderAlarmsList();
}

function resetForm() {
    document.getElementById('formSystemAlarm').reset();
    document.getElementById('sys_alarm_id').value = '';
    togglePeriodicidadInputs();
    const btn = document.querySelector('#formSystemAlarm button[type="submit"]');
    if(btn) btn.innerHTML = '<i class="bi bi-plus-circle me-2"></i>Guardar Alarma';
}
