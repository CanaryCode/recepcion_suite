import { APP_CONFIG } from '../core/Config.js';
import { riuService } from '../services/RiuService.js';
import { Utils } from '../core/Utils.js';
import { sessionService } from '../services/SessionService.js';

/**
 * MÓDULO DE GESTIÓN RIU CLASS (riu.js)
 * -----------------------------------
 * Administra el programa de fidelización RIU Class dentro del hotel.
 * Permite registrar clientes, visualizar su ubicación en rack y generar 
 * reportes visuales (HTML rico) para enviar por email a dirección.
 */

let editId = null;
let riuChartInstance = null;

// ==========================================
// 1. INICIALIZACIÓN
// ==========================================

export async function inicializarRiu() {
    // Configurar Formulario
    const form = document.getElementById('formCliente');
    if (form) {
        form.removeEventListener('submit', manejarSubmitCliente);
        form.addEventListener('submit', manejarSubmitCliente);
    }

    // Configurar Botones de Acción
    document.getElementById('btnLimpiarSalidas')?.addEventListener('click', limpiarSalidasHoyManual);
    document.getElementById('btnEnviarReporte')?.addEventListener('click', enviarEmailDirecto);
    document.getElementById('btnImprimirRiu')?.addEventListener('click', imprimirRiu);

    // Configurar Vistas
    document.getElementById('riu-trabajo')?.classList.add('content-panel');
    document.getElementById('riu-rack')?.classList.add('content-panel');

    document.getElementById('btnVistaTrabajoRiu')?.addEventListener('click', () => cambiarVistaRiu('trabajo'));
    document.getElementById('btnVistaRackRiu')?.addEventListener('click', () => cambiarVistaRiu('rack'));

    // Cargar datos iniciales
    await limpiarClientesCaducados();
    await mostrarClientes();
    establecerFechasPorDefecto();
}

function establecerFechasPorDefecto() {
    const entrada = document.getElementById('fecha_entrada');
    const salida = document.getElementById('fecha_salida');

    if (entrada && salida) {
        const hoy = new Date();
        const semanaMas = new Date();
        semanaMas.setDate(hoy.getDate() + 7);

        entrada.value = Utils.getTodayISO();
        salida.value = semanaMas.toISOString().split('T')[0];
    }
}

// ==========================================
// 2. HANDLERS (Manejo de Eventos)
// ==========================================

async function manejarSubmitCliente(e) {
    e.preventDefault();

    const habInput = document.getElementById('habitacion').value.trim().padStart(3, '0');
    const nHab = parseInt(habInput);

    // Validar usuario
    const autor = Utils.validateUser();
    if (!autor) return;

    // Validar existencia de la habitación
    const existe = APP_CONFIG.HOTEL.STATS_CONFIG.RANGOS.some(r => nHab >= r.min && nHab <= r.max);
    if (!existe) {
        alert(`Error: La habitación ${habInput} no existe en el Hotel Garoé.`);
        return;
    }

    // Validar duplicados (solo si no es edición o si cambia la habitación)
    let clientes = riuService.getClientes();
    const duplicada = clientes.some(c => c.habitacion === habInput && c.id !== editId);
    if (duplicada) {
        alert(`Error: La habitación ${habInput} ya tiene un cliente registrado.`);
        return;
    }

    // Normalizar visualmente
    document.getElementById('habitacion').value = habInput;

    const cliente = {
        id: editId || Date.now(),
        nombre: document.getElementById('nombre').value.trim(),
        habitacion: habInput,
        tipo_tarjeta: document.getElementById('tipo_tarjeta').value,
        fecha_entrada: document.getElementById('fecha_entrada').value,
        fecha_salida: document.getElementById('fecha_salida').value,
        comentarios: document.getElementById('comentarios').value.trim(),
        registrado_por: autor // Guardamos quién lo registró/modificó
    };

    if (editId) {
        clientes = clientes.map(c => c.id === editId ? cliente : c);
        riuService.saveClientes(clientes);
        editId = null;
    } else {
        riuService.addCliente(cliente);
    }

    e.target.reset();
    establecerFechasPorDefecto();
    mostrarClientes();

    // Si estamos en vista rack, actualizarla también
    if (!document.getElementById('riu-rack').classList.contains('d-none')) {
        renderVistaRackRiu();
    }
}

function cambiarVistaRiu(vista) {
    const btnTrabajo = document.getElementById('btnVistaTrabajoRiu');
    const btnRack = document.getElementById('btnVistaRackRiu');
    const divTrabajo = document.getElementById('riu-trabajo');
    const divRack = document.getElementById('riu-rack');

    if (vista === 'trabajo') {
        btnTrabajo.classList.add('active');
        btnRack.classList.remove('active');
        divTrabajo.classList.remove('d-none');
        divRack.classList.add('d-none');
        mostrarClientes();
    } else {
        btnTrabajo.classList.remove('active');
        btnRack.classList.add('active');
        divTrabajo.classList.add('d-none');
        divRack.classList.remove('d-none');
        renderVistaRackRiu();
    }
}

// ==========================================
// 3. RENDERIZADO
// ==========================================

export async function mostrarClientes() {
    const clientes = riuService.getClientes();
    const tabla = document.getElementById('tablaCuerpo');
    if (!tabla) return;

    tabla.innerHTML = '';

    // Ordenar por habitación
    clientes.sort((a, b) => a.habitacion.localeCompare(b.habitacion));

    clientes.forEach(c => {
        let badgeClass = 'bg-riu-class';
        if (c.tipo_tarjeta === 'Oro') badgeClass = 'bg-riu-oro';
        else if (c.tipo_tarjeta === 'Diamante') badgeClass = 'bg-riu-diamante';

        tabla.innerHTML += `
            <tr>
                <td>${c.nombre}</td>
                <td>${c.habitacion}</td>
                <td><span class="badge ${badgeClass}">${c.tipo_tarjeta}</span></td>
                <td>${Utils.formatDate(c.fecha_salida)}</td>
                <td>${c.comentarios}</td>
                <td class="text-end">
                    <button onclick="prepararEdicionCliente(${c.id})" class="btn btn-sm btn-outline-primary border-0 me-1" data-bs-toggle="tooltip" data-bs-title="Editar"><i class="bi bi-pencil"></i></button>
                    <button onclick="eliminarCliente(${c.id})" class="btn btn-sm btn-outline-danger border-0" data-bs-toggle="tooltip" data-bs-title="Eliminar"><i class="bi bi-trash"></i></button>
                </td>
            </tr>`;
    });
    actualizarEstadisticas(clientes);
}

/**
 * RENDER VISTA RACK RIU
 * Muestra el hotel planta por planta, coloreando las habitaciones según el tipo
 * de tarjeta (Class, Oro, Diamante) del cliente alojado.
 */
async function renderVistaRackRiu() {
    const rackCont = document.getElementById('rack-riu-habitaciones');
    if (!rackCont) return;

    const clientes = riuService.getClientes();
    const rangos = APP_CONFIG.HOTEL.STATS_CONFIG.RANGOS;

    rackCont.innerHTML = '';
    rangos.forEach(r => {
        const header = document.createElement('div');
        header.className = 'w-100 mt-3 mb-2 d-flex align-items-center';
        header.innerHTML = `<span class="badge bg-secondary me-2">Planta ${r.planta}</span><hr class="flex-grow-1 my-0 opacity-25">`;
        rackCont.appendChild(header);

        for (let i = r.min; i <= r.max; i++) {
            const num = i.toString().padStart(3, '0');
            const cliente = clientes.find(c => c.habitacion === num);

            let colorClass = 'bg-white text-muted border';
            let tooltip = 'Libre';
            let content = num;

            if (cliente) {
                tooltip = `${cliente.nombre} (${cliente.tipo_tarjeta})`;
                if (cliente.tipo_tarjeta === 'Class') colorClass = 'bg-riu-class text-white border-0';
                else if (cliente.tipo_tarjeta === 'Oro') colorClass = 'bg-riu-oro text-dark border-0';
                else if (cliente.tipo_tarjeta === 'Diamante') colorClass = 'bg-riu-diamante text-white border-0';
                // Añadir inicial del cliente para mejor visualización
                content = `<div>${num}</div><div style="font-size:0.6rem; overflow:hidden; white-space:nowrap; text-align:center; width:100%">${cliente.nombre.split(' ')[0]}</div>`;
            }

            const box = document.createElement('div');
            box.className = `d-flex flex-column align-items-center justify-content-center rounded rack-box ${colorClass}`;
            box.title = tooltip;
            box.innerHTML = content;

            // Permitir hacer click para editar directamente desde el rack
            if (cliente) {
                box.style.cursor = 'pointer';
                box.onclick = () => prepararEdicionCliente(cliente.id);
            }

            rackCont.appendChild(box);
        }
    });
    actualizarEstadisticas(clientes);
}

function actualizarEstadisticas(clientes) {
    const rangos = APP_CONFIG.HOTEL.STATS_CONFIG.RANGOS;
    const totalHab = rangos.reduce((acc, r) => acc + (r.max - r.min + 1), 0);

    // Contadores
    const counts = {
        'Class': 0,
        'Oro': 0,
        'Diamante': 0
    };

    clientes.forEach(c => {
        if (counts[c.tipo_tarjeta] !== undefined) counts[c.tipo_tarjeta]++;
    });

    const ocupadas = clientes.length;
    const libres = totalHab - ocupadas;
    const porcentaje = ((ocupadas / totalHab) * 100).toFixed(1);

    const textEl = document.getElementById('totalOcupacionText');
    if (textEl) textEl.innerText = `${porcentaje}%`;

    // Actualizar etiquetas visuales
    const statsLabels = document.getElementById('statsLabels');
    if (statsLabels) {
        const tipos = [
            { nombre: 'Class', count: counts['Class'], color: 'bg-riu-class' },
            { nombre: 'Oro', count: counts['Oro'], color: 'bg-riu-oro' },
            { nombre: 'Diamante', count: counts['Diamante'], color: 'bg-riu-diamante' },
            { nombre: 'Libres', count: libres, color: 'bg-secondary text-white' }
        ];

        statsLabels.innerHTML = tipos.map(t => `
            <div class="col-6 col-md-3">
                <div class="p-2 border rounded bg-white shadow-sm h-100">
                    <div class="small text-muted mb-1 fw-bold text-uppercase" style="font-size: 0.65rem;">${t.nombre}</div>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="h5 mb-0 fw-bold">${t.count}</span>
                        <span class="badge ${t.color}" style="font-size: 0.6rem;">
                            ${((t.count / totalHab) * 100).toFixed(1)}%
                        </span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Chart.js
    const ctx = document.getElementById('riuChart')?.getContext('2d');
    if (ctx) {
        if (riuChartInstance) riuChartInstance.destroy();
        riuChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Class', 'Oro', 'Diamante', 'Libres'],
                datasets: [{
                    data: [counts['Class'], counts['Oro'], counts['Diamante'], libres],
                    backgroundColor: ['#0d6efd', '#ffc107', '#212529', '#dee2e6'],
                    borderWidth: 1
                }]
            },
            options: { cutout: '75%', plugins: { legend: { display: false } } }
        });
    }
}

// ==========================================
// 4. ACCIONES GLOBALES
// ==========================================

export async function prepararEdicionCliente(id) {
    const clientes = riuService.getClientes();
    const c = clientes.find(item => item.id === id);
    if (c) {
        cambiarVistaRiu('trabajo');
        Utils.setVal('nombre', c.nombre);
        Utils.setVal('habitacion', c.habitacion);
        Utils.setVal('tipo_tarjeta', c.tipo_tarjeta);
        Utils.setVal('fecha_entrada', c.fecha_entrada);
        Utils.setVal('fecha_salida', c.fecha_salida);
        Utils.setVal('comentarios', c.comentarios);
        editId = id;
    }
}

export async function eliminarCliente(id) {
    if (await window.showConfirm('¿Eliminar este registro de cliente?')) {
        let clientes = riuService.getClientes();
        clientes = clientes.filter(c => c.id !== id);
        riuService.saveClientes(clientes);
        mostrarClientes();
    }
}

export async function limpiarClientesCaducados() {
    riuService.limpiarSalidas();
}

export async function limpiarSalidasHoyManual() {
    if (await window.showConfirm('¿Deseas eliminar del listado a todos los clientes que tienen salida hoy?')) {
        const hoy = Utils.getTodayISO();
        let clientes = riuService.getClientes();
        clientes = clientes.filter(c => c.fecha_salida !== hoy);
        riuService.saveClientes(clientes);
        mostrarClientes();
    }
}

/**
 * REPORTE EMAIL (Copiado Rico)
 * Genera un reporte formateado con tablas y colores, lo copia al portapapeles 
 * como HTML y abre el cliente de correo predeterminado del sistema.
 */
export async function enviarEmailDirecto() {
    const clientes = riuService.getClientes();
    const rangos = APP_CONFIG.HOTEL.STATS_CONFIG.RANGOS;
    const totalHab = rangos.reduce((acc, r) => acc + (r.max - r.min + 1), 0);
    const ocupacion = ((clientes.length / totalHab) * 100).toFixed(1);

    // Generar cuerpo para copiar al portapapeles (HTML Rico)
    const htmlReporte = generarReporteHTML(clientes, ocupacion, totalHab);

    try {
        if (typeof ClipboardItem !== 'undefined') {
            const blobHtml = new Blob([htmlReporte], { type: "text/html" });
            const blobText = new Blob([htmlReporte.replace(/<[^>]*>/g, '')], { type: "text/plain" });
            const data = [new ClipboardItem({ "text/html": blobHtml, "text/plain": blobText })];
            await navigator.clipboard.write(data);
            alert("¡Reporte copiado! Pégalo en el cuerpo del correo.");
        } else {
            // Fallback
            throw new Error("ClipboardItem no soportado");
        }
    } catch (err) {
        // Fallback texto plano
        const textoPlano = `REPORTE RIU CLASS - ${Utils.formatDate(new Date())}\nOcupación: ${ocupacion}%\n\n` +
            clientes.map(c => `${c.habitacion} - ${c.nombre} (${c.tipo_tarjeta})`).join('\n');
        navigator.clipboard.writeText(textoPlano);
        alert("Reporte copiado como texto plano (Navegador no soporta copiado rico automátic).");
    }

    // Abrir mailto
    const asunto = `Reporte RIU Class - ${Utils.formatDate(new Date())}`;
    const cuerpoMail = `Buenos días,\n\nAdjunto reporte RIU Class.\n\n[PEGAR REPORTE AQUÍ]\n\nSaludos.`;
    window.location.href = `mailto:direccion@hotelgaroe.com?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpoMail)}`;
}

function generarReporteHTML(clientes, ocupacion, totalHab) {
    // Generación del HTML para el reporte (simplificado del original para mayor claridad)
    const counts = { 'Class': 0, 'Oro': 0, 'Diamante': 0 };
    clientes.forEach(c => { if (counts[c.tipo_tarjeta] !== undefined) counts[c.tipo_tarjeta]++ });

    return `
        <div style="font-family: Arial, sans-serif; color: #333;">
            <h2 style="color: #0d6efd;">REPORTE DIARIO RIU CLASS</h2>
            <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Ocupación:</strong> ${ocupacion}% (${clientes.length}/${totalHab})</p>
            <p>Class: ${counts['Class']} | Oro: ${counts['Oro']} | Diamante: ${counts['Diamante']}</p>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top:10px;">
                <thead>
                    <tr style="background-color: #f8f9fa;">
                        <th style="border:1px solid #ddd; padding:8px;">Hab</th>
                        <th style="border:1px solid #ddd; padding:8px;">Nombre</th>
                        <th style="border:1px solid #ddd; padding:8px;">Tarjeta</th>
                        <th style="border:1px solid #ddd; padding:8px;">Salida</th>
                    </tr>
                </thead>
                <tbody>
                    ${clientes.map(c => `
                        <tr>
                            <td style="border:1px solid #ddd; padding:6px;">${c.habitacion}</td>
                            <td style="border:1px solid #ddd; padding:6px;">${c.nombre}</td>
                            <td style="border:1px solid #ddd; padding:6px;">
                                <span style="font-weight:bold; color:${c.tipo_tarjeta === 'Oro' ? '#d39e00' : (c.tipo_tarjeta === 'Diamante' ? '#000' : '#0d6efd')}">${c.tipo_tarjeta}</span>
                            </td>
                            <td style="border:1px solid #ddd; padding:6px;">${Utils.formatDate(c.fecha_salida)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function imprimirRiu() {
    const user = Utils.validateUser();
    if (!user) return;

    Utils.printSection('print-date-riu', 'print-repc-nombre-riu', user);
}

// Exportar funciones para uso en HTML (OnClicks)
window.prepararEdicionCliente = prepararEdicionCliente;
window.eliminarCliente = eliminarCliente;
window.limpiarSalidasHoyManual = limpiarSalidasHoyManual;
window.enviarEmailDirecto = enviarEmailDirecto;
window.cambiarVistaRiu = cambiarVistaRiu;
window.imprimirRiu = imprimirRiu;
