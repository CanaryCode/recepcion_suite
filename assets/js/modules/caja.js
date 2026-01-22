import { APP_CONFIG } from '../core/Config.js';
import { Utils } from '../core/Utils.js';
import { sessionService } from '../services/SessionService.js';

// ============================================================================
// ESTADO
// ============================================================================
let interfazCajaGenerada = false;

// ============================================================================
// INICIALIZACIÓN
// ============================================================================

/**
 * Inicializa el módulo de Caja.
 * Genera la interfaz, configura listeners y realiza el cálculo inicial.
 */
export function inicializarCaja() {
    generarInterfazCaja();

    // Listener global para recalcular al escribir
    document.addEventListener('input', (e) => {
        if (e.target.closest('#caja-content')) {
            calcularCaja();
        }
    });

    calcularCaja();
}

/**
 * Abre la sección de caja y asegura que esté actualizada.
 */
function abrirCaja() {
    const triggerEl = document.getElementById('tab-caja-content');
    if (window.navegarA) {
        window.navegarA('caja-content');
    } else if (triggerEl) {
        triggerEl.click();
    }
    generarInterfazCaja();
    calcularCaja();
}

/**
 * Genera dinámicamente los inputs de billetes y monedas si no existen.
 */
function generarInterfazCaja() {
    if (interfazCajaGenerada) return;

    // Configurar Fecha si está vacía
    const fechaInput = document.getElementById('caja_fecha');
    if (fechaInput && !fechaInput.value) {
        fechaInput.value = Utils.getTodayISO();
    }

    // Generar Inputs de Dinero
    const billetes = APP_CONFIG.CAJA?.BILLETES || [500, 200, 100, 50, 20, 10, 5];
    const monedas = APP_CONFIG.CAJA?.MONEDAS || [2, 1, 0.50, 0.20, 0.10, 0.05, 0.02, 0.01];

    renderizarInputs('billetes-container', billetes, 'bi-cash', 'BILLETES');
    renderizarInputs('monedas-container', monedas, 'bi-coin', 'MONEDAS');

    // Fondo por defecto
    const fondoInput = document.getElementById('caja_fondo');
    if (fondoInput && !fondoInput.value) {
        fondoInput.value = "2000.00";
    }

    interfazCajaGenerada = true;
}

// ============================================================================
// UI RENDERING
// ============================================================================

function renderizarInputs(containerId, valores, iconClass, titulo) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `<h6 class="small text-muted fw-bold mb-2">${titulo}</h6>`;
    container.classList.add('money-grid-container');

    valores.forEach(valor => {
        const div = document.createElement('div');
        div.className = 'input-group input-group-sm money-input-group';
        div.innerHTML = `
            <span class="input-group-text money-label"><i class="bi ${iconClass} me-1"></i>${valor}€</span>
            <input type="number" min="0" class="form-control input-caja" data-valor="${valor}" placeholder="Cant.">
            <span class="input-group-text money-total sub-caja">0.00€</span>
        `;
        container.appendChild(div);
    });
}

function agregarNuevoConcepto() {
    const container = document.getElementById('otros-container');
    if (!container) return;

    const div = document.createElement('div');
    div.className = 'col-md-4 dynamic-concept';
    div.innerHTML = `
        <div class="input-group input-group-sm">
            <input type="text" class="form-control concept-name text-start fw-bold" placeholder="Concepto..." style="width: 45%;">
            <input type="number" class="form-control concept-value text-end" placeholder="0.00" style="width: 35%;">
            <button class="btn btn-outline-danger d-print-none" onclick="this.closest('.dynamic-concept').remove(); calcularCaja();" style="width: 20%;">
                <i class="bi bi-trash"></i>
            </button>
        </div>
    `;
    container.appendChild(div);
    div.querySelector('.concept-name').focus();
}

// ============================================================================
// CÁLCULO
// ============================================================================

function calcularCaja() {
    let totalBilletes = 0, totalMonedas = 0;

    // Helper interno para procesar contenedores
    const procesarContainer = (containerId) => {
        let subtotal = 0;
        document.querySelectorAll(`#${containerId} .input-group`).forEach(row => {
            const input = row.querySelector('input');
            const span = row.querySelector('.sub-caja');
            if (input && span && input.value !== "") {
                const val = parseFloat(input.dataset.valor);
                const cant = parseFloat(input.value) || 0;
                const total = val * cant;
                span.textContent = Utils.formatCurrency(total);
                subtotal += total;
            } else if (span) {
                span.textContent = Utils.formatCurrency(0);
            }
        });
        return subtotal;
    };

    totalBilletes = procesarContainer('billetes-container');
    totalMonedas = procesarContainer('monedas-container');
    const totalEfectivo = totalBilletes + totalMonedas;

    // Otros conceptos
    const getVal = (id) => parseFloat(document.getElementById(id)?.value) || 0;
    const vales = getVal('caja_vales');
    const safe = getVal('caja_safe');
    const sellosCant = getVal('caja_sellos_cant');
    const sellosPrecio = getVal('caja_sellos_precio');
    const totalSellos = sellosCant * sellosPrecio;

    const sellosLbl = document.getElementById('caja_sellos_total_lbl');
    if (sellosLbl) sellosLbl.textContent = Utils.formatCurrency(totalSellos);

    const extra = getVal('caja_monedas_extra');
    const desembolsos = getVal('caja_desembolsos');

    // Dinámicos
    let totalDinamicos = 0;
    document.querySelectorAll('.concept-value').forEach(input => totalDinamicos += (parseFloat(input.value) || 0));

    const totalOtros = (vales + safe + totalSellos + extra + totalDinamicos) - desembolsos;
    const totalTesoreria = totalEfectivo + totalOtros;
    const fondoCaja = getVal('caja_fondo');
    const recaudacion = totalTesoreria - fondoCaja;

    // Actualizar UI
    updateUIValue('subtotal_billetes', totalBilletes);
    updateUIValue('subtotal_monedas', totalMonedas);
    updateUIValue('total_efectivo', totalEfectivo);
    updateUIValue('subtotal_otros', totalOtros);
    updateUIValue('total_caja', totalTesoreria);
    updateUIValue('recaudacion_caja', recaudacion);
}

function updateUIValue(id, val) {
    const el = document.getElementById(id);
    if (el) {
        const texto = Utils.formatCurrency(val);
        if (el.tagName === 'INPUT') {
            el.value = texto;
        } else {
            el.textContent = texto;
        }

        if (id === 'recaudacion_caja') {
            el.classList.remove('text-success', 'text-danger');
            el.classList.add(val >= 0 ? 'text-success' : 'text-danger');
        }
    }
}

// ============================================================================
// ACCIONES
// ============================================================================

async function resetearCaja() {
    if (await window.showConfirm("¿Estás seguro de borrar todos los datos de la caja?")) {
        const inputs = document.querySelectorAll('#caja-content input');
        inputs.forEach(i => {
            if (i.type === 'number' || i.type === 'text') i.value = '';
        });

        document.querySelectorAll('.dynamic-concept').forEach(el => el.remove());

        Utils.setVal('caja_fecha', Utils.getTodayISO());
        Utils.setVal('caja_sellos_precio', "1.50");
        Utils.setVal('caja_fondo', "2000.00");

        calcularCaja();
    }
}

function imprimirCierreCaja() {
    const user = sessionService.getUser();
    if (!user) {
        alert("⚠️ No hay usuario seleccionado. Selecciona tu nombre en el menú superior.");
        return;
    }

    // Sincronizar comentarios para impresión
    const comentarios = document.getElementById('caja_comentarios_cierre')?.value || "";
    const printDiv = document.getElementById('print-comentarios-caja');
    if (printDiv) printDiv.textContent = comentarios;

    Utils.printSection('print-date-caja', 'print-repc-nombre-caja', user);
}

async function guardarCajaPDF() {
    const user = sessionService.getUser();
    if (!user) {
        alert("⚠️ No hay usuario seleccionado.");
        return;
    }

    const fecha = document.getElementById('caja_fecha')?.value || "fecha";
    const turno = document.getElementById('caja_turno')?.value || "turno";
    const partes = fecha.split('-');
    const fechaFormateada = partes.length === 3 ? `${partes[2]}-${partes[1]}-${partes[0]}` : fecha;
    const filename = `${fechaFormateada}-${turno}.pdf`;

    const source = document.getElementById('caja-content');
    const headerPrint = source.querySelector('.report-header-print');
    const signature = document.querySelector('.signature-area');

    if (headerPrint) { headerPrint.classList.remove('d-none'); headerPrint.style.display = 'flex'; }
    if (signature) { signature.classList.remove('d-none'); signature.style.display = 'flex'; }

    // Ocultar flechas select
    const selects = source.querySelectorAll('.form-select');
    selects.forEach(s => s.style.backgroundImage = 'none');

    const opt = {
        margin: [10, 10],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, ignoreElements: (el) => el.tagName === 'BUTTON' || el.classList.contains('no-print') },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
        if (window.showSaveFilePicker) {
            const pdfBlob = await html2pdf().set(opt).from(source).output('blob');
            const handle = await window.showSaveFilePicker({
                suggestedName: filename,
                types: [{ description: 'PDF Document', accept: { 'application/pdf': ['.pdf'] } }],
            });
            const writable = await handle.createWritable();
            await writable.write(pdfBlob);
            await writable.close();
            await window.showAlert(`Guardado PDF: ${filename}`, "success");
        } else {
            await html2pdf().set(opt).from(source).save();
            await window.showAlert(`Descargado PDF: ${filename}`, "success");
        }
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error(err);
            await window.showAlert("Error al generar PDF.", "error");
        }
    } finally {
        if (headerPrint) { headerPrint.classList.add('d-none'); headerPrint.style.display = ''; }
        if (signature) { signature.classList.add('d-none'); signature.style.display = ''; }
        selects.forEach(s => s.style.backgroundImage = '');
    }
}

async function enviarCajaEmail() {
    const nombre = sessionService.getUser();
    if (!nombre) {
        alert("⚠️ No hay usuario seleccionado.");
        return;
    }

    const fecha = document.getElementById('caja_fecha')?.value || "";
    const turno = document.getElementById('caja_turno')?.value || "";
    
    // Obtener Totales
    const totalCaja = document.getElementById('total_caja')?.innerText || "0.00€";
    const recaudacion = document.getElementById('recaudacion_caja')?.innerText || "0.00€";
    const efectivo = document.getElementById('total_efectivo')?.innerText || "0.00€";
    const otrosTotal = document.getElementById('subtotal_otros')?.innerText || "0.00€";
    const billetesTotal = document.getElementById('subtotal_billetes')?.innerText || "0.00€";
    const monedasTotal = document.getElementById('subtotal_monedas')?.innerText || "0.00€";

    // --- HELPER: Obtener Desglose Detallado ---
    const getDesgloseDinero = (containerId) => {
        let items = [];
        document.querySelectorAll(`#${containerId} .input-group`).forEach(row => {
            const input = row.querySelector('input');
            const cant = parseFloat(input?.value || 0);
            if (cant > 0) {
                const valor = input.dataset.valor;
                const total = parseFloat(valor) * cant;
                items.push({ 
                    desc: `${valor}€ x ${cant}`, 
                    total: Utils.formatCurrency(total) 
                });
            }
        });
        return items;
    };

    const periodicos = getDesgloseDinero('billetes-container');
    const metalico = getDesgloseDinero('monedas-container');

    // Desglose Otros Conceptos
    let otrosItems = [];
    
    // 1. Fijos
    const addSiExiste = (id, label, isCant = false) => {
        const val = parseFloat(document.getElementById(id)?.value || 0);
        if (val > 0) {
            if (isCant) { // Caso especial Sellos
                 const precio = parseFloat(document.getElementById('caja_sellos_precio')?.value || 0);
                 otrosItems.push({ desc: `${label} (${val} x ${Utils.formatCurrency(precio)})`, total: Utils.formatCurrency(val * precio) });
            } else {
                 otrosItems.push({ desc: label, total: Utils.formatCurrency(val) });
            }
        }
    };
    
    addSiExiste('caja_vales', 'Vales');
    addSiExiste('caja_safe', 'Safe');
    addSiExiste('caja_sellos_cant', 'Sellos', true);
    addSiExiste('caja_monedas_extra', 'Extra');
    
    // 2. Dinámicos
    document.querySelectorAll('.dynamic-concept').forEach(div => {
        const nombre = div.querySelector('.concept-name')?.value || "Varios";
        const val = parseFloat(div.querySelector('.concept-value')?.value || 0);
        if (val !== 0) {
            otrosItems.push({ desc: nombre, total: Utils.formatCurrency(val) });
        }
    });
    
    // Desembolsos (Restan)
    const desembolsos = parseFloat(document.getElementById('caja_desembolsos')?.value || 0);
    if (desembolsos > 0) {
        otrosItems.push({ desc: 'Desembolsos', total: `-${Utils.formatCurrency(desembolsos)}` });
    }


    const partes = fecha.split('-');
    const fechaFormateada = partes.length === 3 ? `${partes[2]}-${partes[1]}-${partes[0]}` : fecha;
    const subject = `Cierre de Caja - ${fechaFormateada} - ${turno.toUpperCase()}`;

    // --- GENERACIÓN HTML ---
    const generateTableRows = (items) => {
        return items.map(i => `
            <tr>
                <td style="padding: 4px 10px; border-bottom: 1px solid #f0f0f0; font-size: 13px; color: #555;">${i.desc}</td>
                <td style="padding: 4px 10px; border-bottom: 1px solid #f0f0f0; text-align: right; font-size: 13px;">${i.total}</td>
            </tr>
        `).join('');
    };

    const htmlReporte = `
        <div style="font-family: 'Segoe UI', system-ui, sans-serif; color: #333; max-width: 500px; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; background: #fff;">
            <div style="background-color: #f8f9fa; padding: 15px 20px; border-bottom: 3px solid #0d6efd;">
                <h2 style="color: #0d6efd; margin: 0; font-size: 20px;">CIERRE DE CAJA</h2>
                <div style="font-size: 13px; color: #666; margin-top: 5px;">H. Garoé | ${fechaFormateada} | ${turno.toUpperCase()}</div>
            </div>
            
            <div style="padding: 20px;">
                <!-- EFECTIVO -->
                <div style="margin-bottom: 20px;">
                    <div style="font-weight: bold; color: #000; border-bottom: 2px solid #eee; padding-bottom: 5px; margin-bottom: 5px;">
                        EFECTIVO <span style="float: right;">${efectivo}</span>
                    </div>
                    ${periodicos.length > 0 ? `
                        <div style="font-size: 12px; font-weight: bold; color: #888; margin-top: 5px;">BILLETES (${billetesTotal})</div>
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 5px;">${generateTableRows(periodicos)}</table>
                    ` : ''}
                    
                    ${metalico.length > 0 ? `
                        <div style="font-size: 12px; font-weight: bold; color: #888; margin-top: 5px;">MONEDAS (${monedasTotal})</div>
                        <table style="width: 100%; border-collapse: collapse;">${generateTableRows(metalico)}</table>
                    ` : ''}
                </div>

                <!-- OTROS CONCEPTOS -->
                ${otrosItems.length > 0 ? `
                <div style="margin-bottom: 20px;">
                    <div style="font-weight: bold; color: #000; border-bottom: 2px solid #eee; padding-bottom: 5px; margin-bottom: 5px;">
                        OTROS CONCEPTOS <span style="float: right;">${otrosTotal}</span>
                    </div>
                    <table style="width: 100%; border-collapse: collapse;">${generateTableRows(otrosItems)}</table>
                </div>
                ` : ''}

                <!-- TOTALES -->
                <div style="background-color: #f1f8ff; padding: 15px; border-radius: 6px; margin-top: 15px;">
                    <table style="width: 100%;">
                        <tr>
                            <td style="font-weight: bold; color: #004085; font-size: 16px;">TOTAL TESORERÍA</td>
                            <td style="text-align: right; font-weight: bold; color: #004085; font-size: 20px;">${totalCaja}</td>
                        </tr>
                        <tr>
                            <td style="font-weight: bold; color: #155724; font-size: 14px; padding-top: 5px;">PRODUCCIÓN (VENTA)</td>
                            <td style="text-align: right; font-weight: bold; color: #155724; font-size: 16px; padding-top: 5px;">${recaudacion}</td>
                        </tr>
                    </table>
                </div>

                <div style="margin-top: 15px; font-size: 12px; color: #999; text-align: right;">
                    Recepcionista: <strong>${nombre}</strong>
                </div>
            </div>
        </div>
    `;

    // --- GENERACIÓN TEXTO PLANO ---
    let textoPlano = `
📋 CIERRE DE CAJA - ${fechaFormateada}
=======================================
Turno: ${turno.toUpperCase()} | Usuario: ${nombre}

💵 EFECTIVO: ${efectivo}
`;
    if (periodicos.length) textoPlano += periodicos.map(i => `   ${i.desc.padEnd(15)} : ${i.total}`).join('\n') + '\n';
    if (metalico.length) textoPlano += metalico.map(i => `   ${i.desc.padEnd(15)} : ${i.total}`).join('\n') + '\n';
    
    if (otrosItems.length) {
        textoPlano += `\n📑 OTROS CONCEPTOS: ${otrosTotal}\n`;
        textoPlano += otrosItems.map(i => `   ${i.desc.padEnd(20)} : ${i.total}`).join('\n') + '\n';
    }

    textoPlano += `
=======================================
💰 TOTAL TESORERÍA:  ${totalCaja}
📈 PRODUCCIÓN:       ${recaudacion}
=======================================
`;

    // Copiar al portapapeles
    if (await Utils.copyToClipboard(textoPlano, htmlReporte)) {
        await window.showAlert("📋 Reporte DETALLADO copiado. Pégalo en el correo.", "success");
    } else {
        await window.showAlert("Resumen copiado como texto plano.", "info");
    }

    // Abrir cliente de correo
    const mailBody = `Buenos días,\n\nAdjunto le envío el detalle del cierre de caja.\n\n[PEGAR AQUÍ EL REPORTE DETALLADO]\n\nSaludos,\n${nombre}`;
    window.location.href = `mailto:administracion@hotelgaroe.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mailBody)}`;
}

// ============================================================================
// EXPORTACIONES GLOBALES
// ============================================================================
window.abrirCaja = abrirCaja;
window.resetearCaja = resetearCaja;
window.imprimirCierreCaja = imprimirCierreCaja;
window.calcularCaja = calcularCaja;
window.agregarNuevoConcepto = agregarNuevoConcepto;
window.guardarCajaPDF = guardarCajaPDF;
window.enviarCajaEmail = enviarCajaEmail;