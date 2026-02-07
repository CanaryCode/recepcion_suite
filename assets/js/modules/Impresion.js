import { APP_CONFIG } from '../core/Config.js';
import { Utils } from '../core/Utils.js';
import { Ui } from '../core/Ui.js';

/**
 * MÓDULO DE IMPRESIÓN DINÁMICA v1.37 - NUCLEAR RESET
 * -------------------------------------------------
 * Sistema de impresión nativo por Overlay (sin iframes).
 * Corregido problema de hojas en blanco y orientación.
 */

const COORDINATES_DEFAULT = {
    nombre: { x: 75, y: 12, h: 10, label: "Nombre" },
    habitacion: { x: 75, y: 25, h: 10, label: "Habitación" },
    pax: { x: 75, y: 38, h: 10, label: "Reservas" },
    regime: { x: 75, y: 51, h: 10, label: "Régimen" },
    entrada: { x: 75, y: 65, h: 10, label: "Llegadas" },
    salida: { x: 75, y: 78, h: 10, label: "Salida" },
    agencia: { x: 75, y: 91, h: 5, label: "Agencia" }
};

let currentCoordinates = { ...COORDINATES_DEFAULT };

export async function inicializarImpresion() {
    if (window.__impresion_v137_initialized) return;

    let root = document.getElementById('impresion-v120-root');
    if (!root) {
        const tab = document.getElementById('impresion-content');
        if (tab) {
            root = document.createElement('div');
            root.id = 'impresion-v120-root';
            tab.appendChild(root);
        }
    }

    if (!root) return;

    try {
        loadCoordinates(); 

        const response = await fetch('assets/templates/impresion.html?v=V137_NUCLEAR');
        if (!response.ok) throw new Error("Plantilla no encontrada");
        root.innerHTML = await response.text();

        inyectarEstilosBaseV137();

        Ui.setupViewToggle({
            buttons: [
                { id: 'btnImpresionTrabajo', viewId: 'impresion-trabajo' },
                { id: 'btnImpresionVista', viewId: 'impresion-tarjetero' },
                { id: 'btnImpresionConfig', viewId: 'impresion-config' }
            ]
        });

        document.getElementById('btnProcesarWord')?.addEventListener('click', () => procesarDatosWord());
        document.getElementById('nudgeX')?.addEventListener('input', updateGlobalOffsets);
        document.getElementById('nudgeY')?.addEventListener('input', updateGlobalOffsets);
        document.getElementById('btnToggleGuide')?.addEventListener('click', () => toggleSimulatedCard());
        
        renderCalibrationTable();

        window.ejecutarImpresionNativa = ejecutarImpresionNativa;
        // Mapeamos el botón de imprimir que está en impresion.html (que llamará a ejecutarImpresionIframe usualmente)
        // para que use el nuevo motor nativo. Pero como no puedo editar la plantilla ahora mismo, 
        // simplemente sobreescribo la función global que llama el botón.
        window.ejecutarImpresionIframe = ejecutarImpresionNativa; 
        
        window.resetCoordinate = resetCoordinate;
        window.updateCoordinateValue = updateCoordinateValue;

        window.__impresion_v137_initialized = true;
        console.log("%c[Impresion] v1.37 - NUCLEAR ENGINE LOADED", "color: #ff0055; font-weight: bold;");
        
        Ui.initTooltips?.();

    } catch (error) {
        console.error("[Impresion] Error:", error);
        root.innerHTML = `<div class="alert alert-danger m-3">Error v1.37: ${error.message}</div>`;
    }
}

function loadCoordinates() {
    const saved = localStorage.getItem('impresion_coords_v134'); 
    if (saved) {
        try {
            currentCoordinates = JSON.parse(saved);
        } catch (e) {
            currentCoordinates = JSON.parse(JSON.stringify(COORDINATES_DEFAULT));
        }
    } else {
        currentCoordinates = JSON.parse(JSON.stringify(COORDINATES_DEFAULT));
    }
}

function saveCoordinates() {
    localStorage.setItem('impresion_coords_v134', JSON.stringify(currentCoordinates));
}

function renderCalibrationTable() {
    const body = document.getElementById('calib-fields-body');
    if (!body) return;

    body.innerHTML = '';
    Object.keys(currentCoordinates).forEach(key => {
        const field = currentCoordinates[key];
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="fw-bold">${field.label}</td>
            <td>
                <input type="number" class="form-control form-control-sm" value="${field.x}" step="0.5" 
                    oninput="window.updateCoordinateValue('${key}', 'x', this.value)">
            </td>
            <td>
                <input type="number" class="form-control form-control-sm" value="${field.y}" step="0.5" 
                    oninput="window.updateCoordinateValue('${key}', 'y', this.value)">
            </td>
            <td>
                <input type="number" class="form-control form-control-sm" value="${field.h}" step="0.5" 
                    oninput="window.updateCoordinateValue('${key}', 'h', this.value)">
            </td>
            <td class="text-center">
                <button class="btn btn-sm btn-light border" onclick="window.resetCoordinate('${key}')">
                    <i class="bi bi-arrow-counterclockwise"></i>
                </button>
            </td>
        `;
        body.appendChild(tr);
    });
}

function updateCoordinateValue(key, axis, value) {
    if (!currentCoordinates[key]) return;
    currentCoordinates[key][axis] = parseFloat(value) || 0;
    saveCoordinates();
    
    document.querySelectorAll(`.f-${key}`).forEach(el => {
        if (axis === 'x') el.style.left = value + 'mm';
        if (axis === 'y') el.style.top = value + 'mm';
        if (axis === 'h') el.style.height = value + 'mm';
    });
}

function resetCoordinate(key) {
    currentCoordinates[key] = JSON.parse(JSON.stringify(COORDINATES_DEFAULT[key]));
    saveCoordinates();
    renderCalibrationTable();
    
    const coords = currentCoordinates[key];
    document.querySelectorAll(`.f-${key}`).forEach(el => {
        el.style.left = coords.x + 'mm';
        el.style.top = coords.y + 'mm';
        el.style.height = coords.h + 'mm';
    });
    
    Ui.showToast(`Reseteado: ${COORDINATES_DEFAULT[key].label}`, "info");
}

function inyectarEstilosBaseV137() {
    document.querySelectorAll('[id^="styles-impresion-"]').forEach(el => el.remove());
    const styleTag = document.createElement('style');
    styleTag.id = 'styles-impresion-v137';
    styleTag.innerHTML = `
        .customer-card {
            width: 140mm !important;
            height: 110mm !important;
            background: #ffffff !important;
            border: 1px solid #ddd !important;
            position: relative !important;
            margin: 20px auto !important;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1) !important;
            font-family: 'Inter', sans-serif !important;
            overflow: hidden !important;
            display: block !important;
        }
        .customer-card.show-guide {
            background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="140mm" height="110mm"><rect x="0" y="0" width="62mm" height="110mm" fill="%236a9c3b" opacity="0.1"/><line x1="75mm" y1="0" x2="75mm" y2="110mm" stroke="red" opacity="0.2"/></svg>') !important;
            background-size: cover !important;
        }
        .precision-container {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            pointer-events: none !important;
        }
        .card-field {
            position: absolute !important;
            display: flex !important;
            align-items: center !important;
            white-space: nowrap !important;
            overflow: hidden !important;
        }
        .field-label {
            font-size: 7.5pt !important;
            color: #999 !important;
            font-weight: bold !important;
            position: absolute !important;
            left: -60mm !important;
            width: 55mm !important;
            text-align: right !important;
            pointer-events: none !important;
            text-transform: uppercase !important;
        }
        .field-value {
            font-size: 13pt !important;
            font-weight: 800 !important;
            color: #000 !important;
            text-transform: uppercase !important;
            display: inline-block !important;
        }

        /* ESTILOS DE IMPRESIÓN NATIVA (Overlay) */
        #print-native-overlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: white;
            z-index: 99999;
        }

        @media print {
            body > *:not(#print-native-overlay) {
                display: none !important;
            }
            #print-native-overlay {
                display: block !important;
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: auto !important;
            }
            @page { 
                size: 140mm 110mm landscape !important; 
                margin: 0 !important; 
            }
            .card-page { 
                width: 140mm !important; 
                height: 110mm !important; 
                page-break-after: always !important; 
                position: relative !important; 
                overflow: hidden !important;
                background: white !important;
            }
            .native-field {
                position: absolute !important;
                display: flex !important;
                align-items: center !important;
                white-space: nowrap !important;
                box-sizing: border-box !important;
            }
            .native-val {
                font-family: Arial, sans-serif !important;
                font-weight: bold !important;
                color: black !important;
                text-transform: uppercase !important;
                -webkit-print-color-adjust: exact !important;
            }
        }
    `;
    document.head.appendChild(styleTag);
}

function updateGlobalOffsets() {
    const x = document.getElementById('nudgeX')?.value || 0;
    const y = document.getElementById('nudgeY')?.value || 0;
    document.querySelectorAll('.precision-container').forEach(c => {
        c.style.transform = `translate(${x}mm, ${y}mm)`;
    });
}

function toggleSimulatedCard() {
    document.querySelectorAll('.customer-card').forEach(c => c.classList.toggle('show-guide'));
}

/**
 * PARSER v1.28
 */
function procesarDatosWord() {
    const rawText = document.getElementById('txtWordData').value;
    if (!rawText || rawText.trim().length < 10) {
        Ui.showToast("Pega los datos primero", "warning");
        return;
    }

    const lines = rawText.split(/\r?\n/).filter(l => l.trim().length > 5);
    const parsedData = [];
    const dateRegex = /\d{2}[\.\/\-]\d{2}[\.\/\-]\d{2,4}/g;

    lines.forEach(line => {
        const dates = line.match(dateRegex);
        if (dates && dates.length >= 2) {
            const entry = {
                entrada: dates[0],
                salida: dates[1],
                nombre: "DESCONOCIDO",
                habitacion: "",
                pax: "1",
                regime: "HD",
                agencia: "DIRECTO"
            };

            const lastDateIdx = line.lastIndexOf(dates[dates.length - 1]);
            const textAfter = line.substring(lastDateIdx + dates[dates.length - 1].length).toUpperCase();
            
            if (textAfter.includes("MP")) entry.regime = "MP";
            else if (textAfter.includes("PC")) entry.regime = "PC";
            else if (textAfter.includes("TI")) entry.regime = "TI";
            else if (textAfter.includes("AD")) entry.regime = "HD";
            else if (textAfter.includes("HD")) entry.regime = "HD";

            const firstDateIdx = line.indexOf(dates[0]);
            const textBefore = line.substring(0, firstDateIdx).trim();
            
            const numbers = textBefore.match(/\b\d+\b/g) || [];
            if (numbers.length >= 1) {
                entry.habitacion = numbers.find(n => n.length >= 3) || numbers[0];
            }
            if (numbers.length >= 2) {
                entry.pax = numbers.find(n => n !== entry.habitacion && n.length === 1) || numbers[1];
            }

            const parts = textBefore.split(/[\t]{1,}|[ ]{2,}/).map(p => p.trim()).filter(p => p.length > 2);
            if (parts.length > 0) {
                const nameCandidates = parts.filter(p => !p.match(/^\d+$/) && p.length > 5);
                if (nameCandidates.length > 0) {
                    entry.nombre = nameCandidates.find(c => c.includes(" ")) || nameCandidates[0];
                }
                const agencyCandidate = parts.find(p => p !== entry.nombre && ["EXPEDIA", "BOOKING", "TUI", "JET2", "MTS", "HOTELBEDS", "VECI", "DIR"].some(kw => p.toUpperCase().includes(kw)));
                if (agencyCandidate) entry.agencia = agencyCandidate.substring(0, 15);
            }
            parsedData.push(entry);
        }
    });

    if (parsedData.length === 0) {
        Ui.showToast("No se detectaron datos válidos.", "danger");
        return;
    }

    renderizarTarjetero(parsedData);
    document.getElementById('btnImpresionVista')?.click();
}

function renderizarTarjetero(data) {
    const container = document.getElementById('cards-container');
    const lblTotal = document.getElementById('lblTotalCards');
    if (!container) return;
    
    container.innerHTML = '';
    lblTotal.textContent = data.length;

    data.forEach(item => {
        const div = document.createElement('div');
        div.className = 'customer-card';
        
        let fieldsHtml = '';
        Object.keys(currentCoordinates).forEach(key => {
            const coords = currentCoordinates[key];
            const value = item[key] || '';
            if (value) {
                fieldsHtml += `
                    <div class="card-field f-${key}" style="left: ${coords.x}mm; top: ${coords.y}mm; height: ${coords.h}mm; width: calc(140mm - ${coords.x}mm);">
                        <span class="field-label">${coords.label}:</span>
                        <span class="field-value">${value}</span>
                    </div>
                `;
            }
        });

        div.innerHTML = `<div class="precision-container">${fieldsHtml}</div>`;
        container.appendChild(div);

        setTimeout(() => {
            div.querySelectorAll('.field-value').forEach(el => {
                const maxWidth = el.parentElement.offsetWidth - 5;
                let size = 13;
                el.style.fontSize = size + 'pt';
                while (el.scrollWidth > maxWidth && size > 6) {
                    size -= 0.5;
                    el.style.fontSize = size + 'pt';
                }
            });
        }, 10);
    });

    Ui.showToast(`${data.length} tarjetas generadas.`);
    updateGlobalOffsets();
}

/**
 * MOTOR DE IMPRESIÓN NATIVO v1.37
 * No usa iframes. Genera un overlay temporal y lanza print().
 */
function ejecutarImpresionNativa() {
    const container = document.getElementById('cards-container');
    if (!container || container.children.length === 0) {
        Ui.showToast("No hay datos para imprimir", "warning");
        return;
    }

    const offX = parseFloat(document.getElementById('nudgeX')?.value || 0);
    const offY = parseFloat(document.getElementById('nudgeY')?.value || 0);

    // Crear Overlay
    let overlay = document.getElementById('print-native-overlay');
    if (overlay) overlay.remove();
    
    overlay = document.createElement('div');
    overlay.id = 'print-native-overlay';
    document.body.appendChild(overlay);

    let htmlBody = '';
    
    // Capturar datos actuales de la vista previa
    document.querySelectorAll('#cards-container .customer-card').forEach(cardEl => {
        htmlBody += `<div class="card-page">`;
        htmlBody += `<div class="precision-container" style="top: ${offY}mm; left: ${offX}mm;">`;
        
        cardEl.querySelectorAll('.card-field').forEach(fieldEl => {
            const valEl = fieldEl.querySelector('.field-value');
            const key = Array.from(fieldEl.classList).find(c => c.startsWith('f-')).replace('f-', '');
            const coords = currentCoordinates[key];
            
            if (coords) {
                htmlBody += `
                <div class="native-field" style="left: ${coords.x}mm; top: ${coords.y}mm; height: ${coords.h}mm; width: calc(140mm - ${coords.x}mm);">
                    <span class="native-val" style="font-size: ${valEl.style.fontSize || '13pt'}">
                        ${valEl.textContent}
                    </span>
                </div>`;
            }
        });
        
        htmlBody += `</div></div>`;
    });

    overlay.innerHTML = htmlBody;

    // Lanzar impresión
    setTimeout(() => {
        window.print();
        // Limpiar después de imprimir (opcional, pero mejor dejar el overlay oculto)
        setTimeout(() => overlay.remove(), 1000);
    }, 500);
}

window.inicializarImpresion = inicializarImpresion;
