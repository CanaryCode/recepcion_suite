import { APP_CONFIG } from '../core/Config.js';
import { Utils } from '../core/Utils.js';
import { sessionService } from '../services/SessionService.js';
import { Modal } from '../core/Modal.js';
import { safeService } from '../services/SafeService.js'; // Importado para cálculo automático

// ============================================================================
// ESTADO
// ============================================================================
let interfazCajaGenerada = false;
let listaVales = []; // { id, concepto, importe }
let listaDesembolsos = []; // { id, concepto, importe }

// ... (existing helper functions)

// ============================================================================
// GESTIÓN DE VALES
// ============================================================================

window.abrirModalVales = () => {
    const modal = new bootstrap.Modal(document.getElementById('modalVales'));
    renderVales();
    modal.show();
    setTimeout(() => document.getElementById('vale_concepto')?.focus(), 500);
};

window.agregarVale = (e) => {
    e.preventDefault();
    const conceptoIn = document.getElementById('vale_concepto');
    const importeIn = document.getElementById('vale_importe');
    
    const concepto = conceptoIn.value.trim();
    const importe = parseFloat(importeIn.value);

    if (concepto && importe > 0) {
        listaVales.push({
            id: Date.now(),
            concepto,
            importe
        });
        
        conceptoIn.value = '';
        importeIn.value = '';
        conceptoIn.focus();
        
        renderVales();
        calcularCaja();
    }
};

window.eliminarVale = (id) => {
    listaVales = listaVales.filter(v => v.id !== id);
    renderVales();
    calcularCaja();
};

function renderVales() {
    // 1. Render en Modal
    const container = document.getElementById('listaVales');
    const msg = document.getElementById('noValesMsg');
    const totalLabel = document.getElementById('modalValesTotal');
    
    if (container) {
        if (listaVales.length === 0) {
            container.innerHTML = '';
            if (msg) msg.style.display = 'block';
        } else {
            if (msg) msg.style.display = 'none';
            container.innerHTML = listaVales.map(v => `
                <div class="list-group-item d-flex justify-content-between align-items-center py-2 px-3">
                    <div class="d-flex flex-column" style="min-width: 0;">
                        <span class="fw-bold text-dark small text-break" style="word-wrap: break-word;">${v.concepto}</span>
                    </div>
                    <div class="d-flex align-items-center flex-shrink-0 ms-2">
                        <span class="fw-bold text-primary me-3">${Utils.formatCurrency(v.importe)}</span>
                        <button class="btn btn-sm btn-outline-danger border-0 p-1" onclick="eliminarVale(${v.id})" data-bs-toggle="tooltip" data-bs-title="Eliminar Vale">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }
    }

    // 2. Calcular Total
    const total = listaVales.reduce((sum, v) => sum + v.importe, 0);
    if (totalLabel) totalLabel.innerText = Utils.formatCurrency(total);
    
    // 3. Render para IMPRESIÓN / PDF (Compact Grid - Ancho Completo)
    const printContainer = document.getElementById('print-vales-details');
    if (printContainer) {
        if (listaVales.length > 0) {
            printContainer.innerHTML = `
                <div class="border border-secondary rounded p-1 mt-1" style="background-color: #f8f9fa;">
                    <div class="d-flex justify-content-between align-items-center border-bottom border-secondary mb-1 pb-1">
                        <h6 class="fw-bold mb-0 text-dark" style="font-size: 11px;">DESGLOSE VALES (${listaVales.length})</h6>
                    </div>
                    <div class="d-flex flex-wrap gap-1">
                        ${listaVales.map(v => `
                            <div class="d-flex justify-content-between border bg-white rounded px-1" style="width: 32%; font-size: 10px; border-color: #dee2e6 !important;">
                                <span class="text-truncate me-1" style="max-width: 70%;">${v.concepto}</span>
                                <span class="fw-bold">${Utils.formatCurrency(v.importe)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else {
            printContainer.innerHTML = '';
        }
    }
}

// ============================================================================
// GESTIÓN DE DESEMBOLSOS (NUEVO)
// ============================================================================

window.abrirModalDesembolsos = () => {
    const modal = new bootstrap.Modal(document.getElementById('modalDesembolsos'));
    renderDesembolsos();
    modal.show();
    setTimeout(() => document.getElementById('desembolso_concepto')?.focus(), 500);
};

window.agregarDesembolso = (e) => {
    e.preventDefault();
    const conceptoIn = document.getElementById('desembolso_concepto');
    const importeIn = document.getElementById('desembolso_importe');
    
    const concepto = conceptoIn.value.trim();
    const importe = parseFloat(importeIn.value);

    if (concepto && importe > 0) {
        listaDesembolsos.push({
            id: Date.now(),
            concepto,
            importe
        });
        
        conceptoIn.value = '';
        importeIn.value = '';
        conceptoIn.focus();
        
        renderDesembolsos();
        calcularCaja();
    }
};

window.eliminarDesembolso = (id) => {
    listaDesembolsos = listaDesembolsos.filter(d => d.id !== id);
    renderDesembolsos();
    calcularCaja();
};

function renderDesembolsos() {
    // 1. Render en Modal
    const container = document.getElementById('listaDesembolsos');
    const msg = document.getElementById('noDesembolsosMsg');
    const totalLabel = document.getElementById('modalDesembolsosTotal');
    
    if (container) {
        if (listaDesembolsos.length === 0) {
            container.innerHTML = '';
            if (msg) msg.style.display = 'block';
        } else {
            if (msg) msg.style.display = 'none';
            container.innerHTML = listaDesembolsos.map(d => `
                <div class="list-group-item d-flex justify-content-between align-items-center py-2 px-3">
                    <div class="d-flex flex-column" style="min-width: 0;">
                        <span class="fw-bold text-dark small text-break" style="word-wrap: break-word;">${d.concepto}</span>
                    </div>
                    <div class="d-flex align-items-center flex-shrink-0 ms-2">
                        <span class="fw-bold text-primary me-3">${Utils.formatCurrency(d.importe)}</span>
                        <button class="btn btn-sm btn-outline-danger border-0 p-1" onclick="eliminarDesembolso(${d.id})" data-bs-toggle="tooltip" data-bs-title="Eliminar Desembolso">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }
    }

    // 2. Calcular Total
    const total = listaDesembolsos.reduce((sum, d) => sum + d.importe, 0);
    if (totalLabel) totalLabel.innerText = Utils.formatCurrency(total);
    
    // 3. Render para IMPRESIÓN / PDF (Compact Grid - Ancho Completo)
    // Para impresión, mantenemos un toque distintivo pero sutil, o lo unificamos también?
    // User dijo "mismo color que todo", así que usaremos estilo neutro/gris similar a Vales.
    const printContainer = document.getElementById('print-desembolsos-details');
    if (printContainer) {
        if (listaDesembolsos.length > 0) {
            printContainer.innerHTML = `
                <div class="border border-secondary rounded p-1 mt-1" style="background-color: #f8f9fa;">
                    <div class="d-flex justify-content-between align-items-center border-bottom border-secondary mb-1 pb-1">
                        <h6 class="fw-bold mb-0 text-dark" style="font-size: 11px;">DESGLOSE DESEMBOLSOS (${listaDesembolsos.length})</h6>
                    </div>
                    <div class="d-flex flex-wrap gap-1">
                        ${listaDesembolsos.map(d => `
                            <div class="d-flex justify-content-between border bg-white rounded px-1" style="width: 32%; font-size: 10px; border-color: #dee2e6 !important;">
                                <span class="text-truncate me-1" style="max-width: 70%;">${d.concepto}</span>
                                <span class="fw-bold">${Utils.formatCurrency(d.importe)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else {
            printContainer.innerHTML = '';
        }
    }
}



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
    actualizarDatosAutomaticosCaja(); // Force update on open
    calcularSafeAutomatico(); // Recalcular safes al abrir (si está bloqueado)
    calcularCaja();
}

function actualizarDatosAutomaticosCaja() {
    const ahora = new Date();
    
    // 1. FECHA (Hoy)
    const fechaInput = document.getElementById('caja_fecha');
    if (fechaInput) {
        // Formato ES: DD-MM-YYYY para visualización, o ISO para valor? 
        // El input ahora es text, mejor mostrar algo legible
        // Pero para PDF/Email se usa el value. Usemos ISO YYYY-MM-DD para consistencia con lógica existente
        // o mejor DD/MM/YYYY que es más legible.
        // Revisando código existente: usa split('-') esperando YYYY-MM-DD o similar.
        // Utils.getTodayISO() devuelve YYYY-MM-DD.
        fechaInput.value = Utils.getTodayISO(); 
    }

    // 2. TURNO (Automático)
    /*
        07:00 - 15:00 -> Mañana
        15:00 - 23:00 -> Tarde
        23:00 - 07:00 -> Noche
    */
    const hora = ahora.getHours();
    let turno = "tarde"; // Default safe
    
    if (hora >= 7 && hora < 15) {
        turno = "mañana";
    } else if (hora >= 15 && hora < 23) {
        turno = "tarde";
    } else {
        turno = "noche";
    }

    const turnoInput = document.getElementById('caja_turno');
    if (turnoInput) {
        turnoInput.value = turno.toUpperCase();
    }
}

/**
 * Genera dinámicamente los inputs de billetes y monedas si no existen.
 */
function generarInterfazCaja() {
    if (interfazCajaGenerada) return;

    actualizarDatosAutomaticosCaja();

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

    // Cálculo automático de Safes
    calcularSafeAutomatico();

    interfazCajaGenerada = true;
}

/**
 * Calcula el valor de safes activos x precio diario.
 * Solo si el campo está bloqueado (readonly).
 */
function calcularSafeAutomatico() {
    const safeInput = document.getElementById('caja_safe');
    if (!safeInput) return;

    // Si no tiene readonly, es porque el usuario lo desbloqueó para editar manual. Respetamos eso.
    if (!safeInput.hasAttribute('readonly')) return;

    // Obtener alquileres activos
    const rentals = safeService.getRentals(); // Asume que getRentals devuelve todos los vigentes
    // Si la lógica de "activos hoy" es más compleja (por fechas), habría que filtrar.
    // Asumiremos que si está en el array, está activo hoy.
    
    // Contar cuántos hay
    const count = rentals.length;
    
    // Precio
    const precio = APP_CONFIG.SAFE?.PRECIO_DIARIO || 2.00;
    
    // Total
    const total = count * precio;
    
    safeInput.value = total.toFixed(2);
    
    // Forzar recálculo global de caja si es necesario, 
    // pero cuidado con bucles infinitos si calcularCaja llama a esto. 
    // calcularCaja NO llama a esto, así que bien.
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
            <input type="number" min="0" class="form-control input-caja" data-valor="${valor}" placeholder="0">
            <span class="input-group-text money-total sub-caja fw-bold text-primary">0.00<span class="text-primary">€</span></span>
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
            <input type="text" class="form-control concept-name text-start fw-bold" placeholder="Ej: Gasto Extra..." style="width: 45%;">
            <input type="number" class="form-control concept-value text-end" placeholder="0.00" style="width: 35%;">
            <button class="btn btn-outline-danger d-print-none" onclick="this.closest('.dynamic-concept').remove(); calcularCaja();" style="width: 20%;" data-bs-toggle="tooltip" data-bs-title="Eliminar Concepto">
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
    
    // VALES (Calculado desde array)
    const totalVales = listaVales.reduce((sum, v) => sum + v.importe, 0);
    const valesInput = document.getElementById('caja_vales_total');
    if (valesInput) valesInput.value = Utils.formatCurrency(totalVales);

    const safe = getVal('caja_safe');
    const sellosCant = getVal('caja_sellos_cant');
    const sellosPrecio = getVal('caja_sellos_precio');
    const totalSellos = sellosCant * sellosPrecio;

    const sellosLbl = document.getElementById('caja_sellos_total_lbl');
    if (sellosLbl) sellosLbl.textContent = Utils.formatCurrency(totalSellos);

    const extra = getVal('caja_monedas_extra');
    
    // DESEMBOLSOS (Calculado desde array)
    const desembolsos = listaDesembolsos.reduce((sum, d) => sum + d.importe, 0);
    const desembolsosInput = document.getElementById('caja_desembolsos');
    if (desembolsosInput) desembolsosInput.value = Utils.formatCurrency(desembolsos);

    // Dinámicos
    let totalDinamicos = 0;
    document.querySelectorAll('.concept-value').forEach(input => totalDinamicos += (parseFloat(input.value) || 0));

    // Sumar Total (Desembolsos ahora SUMAN, positivo)
    const fondoCaja = getVal('caja_fondo');
    // El usuario indica que el fondo es negativo (se resta)
    const totalOtros = (totalVales + safe + totalSellos + extra + totalDinamicos + desembolsos) - fondoCaja;
    
    // Total Tesorería ahora será el saldo neto (Efectivo + Vales + Extras - Fondo)
    const totalTesoreria = totalEfectivo + totalOtros;
    
    // Como el fondo ya está restado en Total Tesorería, la Recaudación es igual al Total Tesorería
    const recaudacion = totalTesoreria;

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
        
        listaVales = [];
        listaDesembolsos = [];
        renderVales();
        renderDesembolsos();

        actualizarDatosAutomaticosCaja();
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

    // FIX IMPRESIÓN: Sincronizar valor visual con atributo DOM para que salga en papel
    const inputs = document.querySelectorAll('#caja-content input');
    inputs.forEach(i => {
        if (i.type === 'number' || i.type === 'text') {
            i.setAttribute('value', i.value);
        }
    });

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

    // 1. Preparar CLON para manipular (Sin afectar la UI real)
    const original = document.getElementById('caja-content');
    const clone = original.cloneNode(true);

    // 2. Crear Contenedor Temporal con clase PDF-EXPORT para forzar estilos
    const wrapper = document.createElement('div');
    wrapper.className = 'pdf-export p-4'; // p-4 para margen interno blanco
    wrapper.style.position = 'absolute';
    wrapper.style.left = '-9999px';
    wrapper.style.top = '0';
    wrapper.style.width = '210mm'; // A4 width hint
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    // 3. Sincronizar Datos en el CLON
    // Entradas de texto/numeros -> Atributos value para que salgan
    const inputsOriginal = original.querySelectorAll('input, select, textarea');
    const inputsClone = clone.querySelectorAll('input, select, textarea');
    
    inputsClone.forEach((inputClone, i) => {
        const inputOriginal = inputsOriginal[i];
        if (inputOriginal) {
           if (inputClone.tagName === 'SELECT') {
               try {
                  const selectedText = inputOriginal.options[inputOriginal.selectedIndex]?.text || inputOriginal.value;
                  // Reemplazar select por span para mejor visualización
                  const span = document.createElement('span');
                  span.className = 'fw-bold';
                  span.textContent = selectedText;
                  inputClone.parentNode.replaceChild(span, inputClone);
               } catch(e) {}
           } else {
               inputClone.setAttribute('value', inputOriginal.value);
               // Si es checkbox/radio
               if (inputOriginal.checked) inputClone.setAttribute('checked', 'checked');
           }
        }
    });

    // Comentarios
    const comentariosVal = document.getElementById('caja_comentarios_cierre')?.value || "";
    const printComentarios = clone.querySelector('#print-comentarios-caja');
    if (printComentarios) {
        printComentarios.textContent = comentariosVal;
        printComentarios.classList.remove('d-none'); // Asegurar visible
    }

    // Cabeceras y Firmas (Están d-none en UI, forzar block en clon)
    // Ya lo hace el CSS .pdf-export, pero aseguramos
    const headerPrint = clone.querySelector('.report-header-print');
    if (headerPrint) headerPrint.classList.remove('d-none');
    
    const signature = clone.querySelector('.signature-area');
    if (signature) signature.classList.remove('d-none');
    
    // Vales
    const printVales = clone.querySelector('#print-vales-details');
    if (printVales) printVales.classList.remove('d-none');
    
    // Desembolsos (Nuevo)
    const printDesembolsos = clone.querySelector('#print-desembolsos-details');
    if (printDesembolsos) printDesembolsos.classList.remove('d-none');

    // 4. Configurar PDF
    const opt = {
        margin: [5, 5, 5, 5], // Márgenes pequeños, el padding lo da el wrapper
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
        if (window.showSaveFilePicker) {
            const pdfBlob = await html2pdf().set(opt).from(wrapper).output('blob');
            const handle = await window.showSaveFilePicker({
                suggestedName: filename,
                types: [{ description: 'PDF Document', accept: { 'application/pdf': ['.pdf'] } }],
            });
            const writable = await handle.createWritable();
            await writable.write(pdfBlob);
            await writable.close();
            await window.showAlert(`Guardado PDF: ${filename}`, "success");
        } else {
            await html2pdf().set(opt).from(wrapper).save();
            await window.showAlert(`Descargado PDF: ${filename}`, "success");
        }
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error(err);
            await window.showAlert("Error al generar PDF.", "error");
        }
    } finally {
        // 5. Limpieza
        document.body.removeChild(wrapper);
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
    
    // Obtener Totales Principales del DOM
    const totalCaja = document.getElementById('total_caja')?.innerText || "0.00€";
    const recaudacion = document.getElementById('recaudacion_caja')?.innerText || "0.00€";
    const efectivo = document.getElementById('total_efectivo')?.innerText || "0.00€";
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

    // --- DESGLOSE VALES (SEPARADO) ---
    const valesItems = listaVales.map(v => ({
        desc: v.concepto,
        total: Utils.formatCurrency(v.importe)
    }));
    const totalValesNum = listaVales.reduce((sum, v) => sum + v.importe, 0);
    const totalValesStr = Utils.formatCurrency(totalValesNum);

    // --- DESGLOSE DESEMBOLSOS (SEPARADO) ---
    const desembolsosItems = listaDesembolsos.map(d => ({
        desc: d.concepto,
        total: Utils.formatCurrency(d.importe)
    }));
    const totalDesembolsosNum = listaDesembolsos.reduce((sum, d) => sum + d.importe, 0);
    // const totalDesembolsosStr = Utils.formatCurrency(totalDesembolsosNum); // Already used?

    // --- DESGLOSE OTROS (Sin Vales ni Desembolsos viejos) ---
    let otrosItems = [];
    let otrosSum = 0; // Suma manual para mostrar total de esta sección

    const addSiExiste = (id, label, isCant = false) => {
        const val = parseFloat(document.getElementById(id)?.value || 0);
        if (val !== 0) {
            let total = 0;
            if (isCant) { // Caso especial Sellos
                 const precio = parseFloat(document.getElementById('caja_sellos_precio')?.value || 0);
                 total = val * precio;
                 otrosItems.push({ desc: `${label} (${val} x ${Utils.formatCurrency(precio)})`, total: Utils.formatCurrency(total) });
            } else {
                 total = val;
                 otrosItems.push({ desc: label, total: Utils.formatCurrency(total) });
            }
            otrosSum += total;
        }
    };
    
    addSiExiste('caja_safe', 'Safe');
    addSiExiste('caja_sellos_cant', 'Sellos', true);
    addSiExiste('caja_monedas_extra', 'Extra');
    
    // 2. Dinámicos
    document.querySelectorAll('.dynamic-concept').forEach(div => {
        const nombre = div.querySelector('.concept-name')?.value || "Varios";
        const val = parseFloat(div.querySelector('.concept-value')?.value || 0);
        if (val !== 0) {
            otrosItems.push({ desc: nombre, total: Utils.formatCurrency(val) });
            otrosSum += val;
        }
    });

    // Desembolsos ya son su propia lista, no se añaden aqui.
    
    const totalOtrosStr = Utils.formatCurrency(otrosSum);


    const partes = fecha.split('-');
    const fechaFormateada = partes.length === 3 ? `${partes[2]}-${partes[1]}-${partes[0]}` : fecha;
    const subject = `Cierre de Caja - ${fechaFormateada} - ${turno.toUpperCase()}`;

    // --- GENERACIÓN HTML ---
    const generateTableRows = (items) => {
        return items.map(i => `
            <tr>
                <td style="padding: 6px 10px; border-bottom: 1px solid #f0f0f0; font-size: 13px; color: #555; word-wrap: break-word; word-break: break-all; white-space: normal;">${i.desc}</td>
                <td style="padding: 6px 10px; border-bottom: 1px solid #f0f0f0; text-align: right; font-size: 13px; white-space: nowrap; vertical-align: top;">${i.total}</td>
            </tr>
        `).join('');
    };

    const htmlReporte = `
        <div style="font-family: 'Segoe UI', system-ui, sans-serif; color: #333; width: 100%; max-width: 600px; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; background: #fff;">
            <div style="background-color: #f8f9fa; padding: 15px 20px; border-bottom: 3px solid #0d6efd;">
                <h2 style="color: #0d6efd; margin: 0; font-size: 20px;">CIERRE DE CAJA</h2>
                <div style="font-size: 13px; color: #666; margin-top: 5px;">H. Garoé | ${fechaFormateada} | ${turno.toUpperCase()}</div>
            </div>
            
            <div style="padding: 20px;">
                <!-- EFECTIVO -->
                <div style="margin-bottom: 25px;">
                    <div style="font-weight: bold; color: #000; border-bottom: 2px solid #eee; padding-bottom: 5px; margin-bottom: 10px;">
                        EFECTIVO <span style="float: right;">${efectivo}</span>
                    </div>
                    ${periodicos.length > 0 ? `
                        <div style="font-size: 11px; font-weight: bold; color: #888; margin-bottom: 5px;">BILLETES (${billetesTotal})</div>
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; table-layout: fixed;">${generateTableRows(periodicos)}</table>
                    ` : ''}
                    
                    ${metalico.length > 0 ? `
                        <div style="font-size: 11px; font-weight: bold; color: #888; margin-bottom: 5px;">MONEDAS (${monedasTotal})</div>
                        <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">${generateTableRows(metalico)}</table>
                    ` : ''}
                </div>

                <!-- VALES -->
                ${valesItems.length > 0 ? `
                <div style="margin-bottom: 25px;">
                    <div style="font-weight: bold; color: #d63384; border-bottom: 2px solid #eee; padding-bottom: 5px; margin-bottom: 10px;">
                        VALES <span style="float: right;">${totalValesStr}</span>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
                         ${generateTableRows(valesItems)}
                    </table>
                </div>
                ` : ''}

                <!-- DESEMBOLSOS -->
                ${desembolsosItems.length > 0 ? `
                <div style="margin-bottom: 25px;">
                    <div style="font-weight: bold; color: #0d6efd; border-bottom: 2px solid #eee; padding-bottom: 5px; margin-bottom: 10px;">
                        DESEMBOLSOS <span style="float: right;">${Utils.formatCurrency(totalDesembolsosNum)}</span>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
                         ${generateTableRows(desembolsosItems)}
                    </table>
                </div>
                ` : ''}

                <!-- OTROS CONCEPTOS -->
                ${otrosItems.length > 0 ? `
                <div style="margin-bottom: 25px;">
                    <div style="font-weight: bold; color: #fd7e14; border-bottom: 2px solid #eee; padding-bottom: 5px; margin-bottom: 10px;">
                        VARIOS <span style="float: right;">${totalOtrosStr}</span>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">${generateTableRows(otrosItems)}</table>
                </div>
                ` : ''}

                <!-- TOTALES -->
                <div style="background-color: #f1f8ff; padding: 15px; border-radius: 6px; margin-top: 10px;">
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
    
    if (valesItems.length) {
        textoPlano += `\n🎫 VALES: ${totalValesStr}\n`;
        textoPlano += valesItems.map(i => `   ${i.desc} : ${i.total}`).join('\n') + '\n';
    }

    if (desembolsosItems.length) {
        textoPlano += `\n🔴 DESEMBOLSOS: ${Utils.formatCurrency(totalDesembolsosNum)}\n`;
        textoPlano += desembolsosItems.map(i => `   ${i.desc} : ${i.total}`).join('\n') + '\n';
    }

    if (otrosItems.length) {
        textoPlano += `\n📑 VARIOS: ${totalOtrosStr}\n`;
        textoPlano += otrosItems.map(i => `   ${i.desc} : ${i.total}`).join('\n') + '\n';
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

window.toggleLockCaja = (inputId, btn) => {
    const input = document.getElementById(inputId);
    if (!input) return;

    // Check for both readonly (inputs) and disabled (selects)
    const isLocked = input.hasAttribute('readonly') || input.hasAttribute('disabled');
    const icon = btn.querySelector('i');

    if (isLocked) {
        input.removeAttribute('readonly');
        input.removeAttribute('disabled');
        input.classList.remove('bg-light');
        icon.className = 'bi bi-unlock-fill';
        // Visual feedback based on color
        if (inputId === 'caja_fecha') {
            btn.classList.remove('btn-outline-primary', 'text-primary');
            btn.classList.add('btn-primary', 'text-white');
        } else {
            btn.classList.remove('btn-outline-success', 'text-success');
            btn.classList.add('btn-success', 'text-white');
        }
    } else {
        // Lock it back
        if (input.tagName === 'SELECT') {
            input.setAttribute('disabled', 'true');
        } else {
            input.setAttribute('readonly', 'true');
        }
        input.classList.add('bg-light');
        icon.className = 'bi bi-lock-fill';
        
        // Restore visual state
        if (inputId === 'caja_fecha') {
            btn.classList.remove('btn-primary', 'text-white');
            btn.classList.add('btn-outline-primary', 'text-primary');
        } else {
            btn.classList.remove('btn-success', 'text-white');
            btn.classList.add('btn-outline-success', 'text-success');
        }
    }
};