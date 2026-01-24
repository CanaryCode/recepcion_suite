import { APP_CONFIG } from '../core/Config.js';
import { Utils } from '../core/Utils.js';

export function inicializarCobro() {
    const valores = APP_CONFIG.COBRO.VALORES;
    const rBil = document.getElementById('recibido-billetes');
    const rMon = document.getElementById('recibido-monedas');
    const eBil = document.getElementById('entregado-billetes');
    const eMon = document.getElementById('entregado-monedas');

    if (!rBil || !rMon || !eBil || !eMon) return;

    valores.forEach(v => {
        const label = Utils.formatCurrency(v);
        const isBill = v >= 5;
        const styleClass = isBill ? 'bill-label' : 'coin-label';
        const iconClass = isBill ? 'bi-cash' : 'bi-coin';

        const html = `
            <div class="input-group input-group-sm mb-1">
                <span class="input-group-text ${styleClass} px-1" style="width: 55px; font-size: 0.75rem;"><i class="bi ${iconClass} me-1"></i>${v}€</span>
                <input type="number" min="0" class="form-control ${isBill ? 'input-cobro-recibido' : 'input-cobro-recibido'} p-1 text-center" style="font-size: 0.85rem;" data-val="${v}" placeholder="0">
            </div>`;

        // RECONSTRUCCIÓN: Usar clases específicas para facilitar el querySelector posterior si es necesario, 
        // pero manteniendo las clases originales para no romper calcularCobro()
        
        const inputHtml = (prefix) => `
            <div class="input-group input-group-sm mb-1">
                <span class="input-group-text ${styleClass} px-1 fw-bold" style="min-width: 50px; font-size: 0.75rem;"><i class="bi ${iconClass} me-1"></i>${valLabel(v)}</span>
                <input type="text" class="form-control input-cobro-${prefix} p-1 text-center fw-bold" style="font-size: 0.8rem;" data-val="${v}" placeholder="0">
            </div>`;

        function valLabel(num) {
            return num >= 1 ? num + '€' : (num * 100) + 'c';
        }

        if (isBill) {
            rBil.innerHTML += inputHtml('recibido');
            eBil.innerHTML += inputHtml('entregado');
        } else {
            rMon.innerHTML += inputHtml('recibido');
            eMon.innerHTML += inputHtml('entregado');
        }
    });

    const cobroContent = document.getElementById('cobro-content');
    if (cobroContent) {
        // Inyectar contenedor - Eliminado (HTML estático)
        cobroContent.addEventListener('input', calcularCobro);
    }
    calcularCobro();
}

function calcularCobro() {
    const totalACobrar = parseFloat(document.getElementById('cobro_total_a_cobrar').value) || 0;

    let totalRecibido = 0;
    document.querySelectorAll('.input-cobro-recibido').forEach(input => {
        totalRecibido += parseFloat(input.dataset.val) * (parseInt(input.value) || 0);
    });

    let totalEntregado = 0;
    document.querySelectorAll('.input-cobro-entregado').forEach(input => {
        totalEntregado += parseFloat(input.dataset.val) * (parseInt(input.value) || 0);
    });

    const cambioQueDebo = Math.max(0, totalRecibido - totalACobrar);
    const diferenciaFinal = cambioQueDebo - totalEntregado;

    // Actualizar UI
    if (document.getElementById('cobro_total_recibido')) document.getElementById('cobro_total_recibido').innerText = Utils.formatCurrency(totalRecibido);
    if (document.getElementById('cobro_total_entregado')) document.getElementById('cobro_total_entregado').innerText = Utils.formatCurrency(totalEntregado);
    if (document.getElementById('cobro_cambio_deber')) document.getElementById('cobro_cambio_deber').innerText = Utils.formatCurrency(cambioQueDebo);

    // Calcular y mostrar sugerencia de desglose óptimo
    mostrarSugerenciaCambio(Math.max(0, diferenciaFinal));

    const diffEl = document.getElementById('cobro_diferencia_final');
    if (diffEl) diffEl.innerText = Utils.formatCurrency(Math.abs(diferenciaFinal));

    const statusMsg = document.getElementById('cobro_status_msg');

    if (totalACobrar <= 0) {
        statusMsg.innerHTML = '<span class="text-muted">Introduce el total a cobrar</span>';
        diffEl.className = "display-5 fw-bold mb-0";
    } else if (totalRecibido < totalACobrar) {
        const falta = totalACobrar - totalRecibido;
        statusMsg.innerHTML = `<span class="text-warning">Faltan ${Utils.formatCurrency(falta)} por recibir</span>`;
        diffEl.className = "display-5 fw-bold mb-0 text-warning";
    } else if (Math.abs(diferenciaFinal) < 0.001) {
        statusMsg.innerHTML = '<span class="text-success"><i class="bi bi-check-circle-fill me-1"></i>¡Cambio Exacto!</span>';
        diffEl.className = "display-5 fw-bold mb-0 text-success";
    } else if (diferenciaFinal > 0) {
        statusMsg.innerHTML = `<span class="text-danger">Faltan ${Utils.formatCurrency(diferenciaFinal)} por devolver</span>`;
        diffEl.className = "display-5 fw-bold mb-0 text-danger";
    } else {
        statusMsg.innerHTML = `<span class="text-info">Has devuelto ${Utils.formatCurrency(Math.abs(diferenciaFinal))} de más</span>`;
        diffEl.className = "display-5 fw-bold mb-0 text-info";
    }
}

function mostrarSugerenciaCambio(cantidad) {
    const container = document.getElementById('sugerencia-cambio-container');
    if (!container) return;

    if (cantidad <= 0.009) { // Tolerancia mínima
        container.classList.add('d-none');
        container.innerHTML = '';
        return;
    }

    // Algoritmo Greedy para cambio óptimo
    // Trabajamos con céntimos (enteros) para evitar errores de punto flotante
    let restante = Math.round(cantidad * 100);
    const valores = APP_CONFIG.COBRO.VALORES.slice().sort((a, b) => b - a); // Asegurar orden descendente

    let html = '<div class="fw-bold mb-2 small text-uppercase"><i class="bi bi-lightbulb-fill me-2 text-warning"></i>Sugerencia de Cambio:</div><div class="d-flex flex-wrap gap-2">';
    let haySugerencia = false;

    valores.forEach(val => {
        const valCentimos = Math.round(val * 100);
        if (restante >= valCentimos) {
            const count = Math.floor(restante / valCentimos);
            restante = restante % valCentimos;

            if (count > 0) {
                haySugerencia = true;
                const isBill = val >= 5;
                const bgClass = isBill ? 'bg-success' : 'bg-secondary';
                const iconClass = isBill ? 'bi-cash' : 'bi-coin';

                html += `
                    <div class="badge ${bgClass} p-2 d-flex align-items-center" style="font-size: 0.9rem;">
                        <span class="fw-bold me-2 border-end border-white border-opacity-50 pe-2">${count}</span>
                        <i class="bi ${iconClass} me-1"></i>
                        <span>${Utils.formatCurrency(val)}</span>
                    </div>
                `;
            }
        }
    });

    html += '</div>';
    container.innerHTML = html;
    container.classList.toggle('d-none', !haySugerencia);
}

async function resetearCobro() {
    if (await window.showConfirm("¿Deseas limpiar la operación actual?")) {
        document.getElementById('cobro_total_a_cobrar').value = '';
        document.querySelectorAll('.input-cobro-recibido, .input-cobro-entregado').forEach(i => i.value = '');
        calcularCobro();
    }
}

window.resetearCobro = resetearCobro;
window.calcularCobro = calcularCobro;