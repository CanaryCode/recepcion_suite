import { systemAlarmsService } from '../services/SystemAlarmsService.js';
import { Utils } from '../core/Utils.js';

export function inicializarSystemAlarmsUI() {
    const form = document.getElementById('formSystemAlarm');
    if (form) {
        form.removeEventListener('submit', handleFormSubmit);
        form.addEventListener('submit', handleFormSubmit);
    }
    
    // Configurar inputs visibilidad
    window.togglePeriodicidadInputs = togglePeriodicidadInputs;
    togglePeriodicidadInputs(); // Init state

    renderAlarmsList();
    
    // Helpers Globales
    window.editSystemAlarm = editSystemAlarm;
    window.deleteSystemAlarm = deleteSystemAlarm;
    window.toggleActiveSystemAlarm = toggleActiveSystemAlarm;
    window.resetFormSystemAlarm = resetForm;
}

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
