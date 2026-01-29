import { APP_CONFIG } from './Config.js';
import { Utils } from './Utils.js';

/**
 * SERVICIO DE GENERACIÓN DE PDF (PdfService)
 * -----------------------------------------
 * Centraliza la creación de informes profesionales en PDF.
 * Utiliza html2pdf.js y aplica una estética estandarizada del hotel.
 */
export const PdfService = {
    
    /**
     * GENERAR REPORTE ESTÁNDAR
     * @param {Object} options 
     * @param {string} options.title - Título del reporte
     * @param {string} options.author - Nombre del recepcionista o autor
     * @param {string} options.htmlContent - Contenido HTML del cuerpo del reporte
     * @param {string} options.filename - Nombre de archivo sugerido (.pdf)
     * @param {Object} [options.metadata] - Datos adicionales para la cabecera (Fecha, Turno, etc.)
     */
    async generateReport({ title, author, htmlContent, filename, metadata = {} }) {
        if (typeof html2pdf === 'undefined') {
            console.error("html2pdf.js no está cargado.");
            return;
        }

        const now = new Date();
        const dateStr = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const hotelName = APP_CONFIG.HOTEL?.NOMBRE || "HOTEL GAROÉ";

        // 1. Crear el contenedor base del reporte
        const container = document.createElement('div');
        container.classList.add('pdf-report-container');
        container.style.cssText = `
            font-family: Arial, sans-serif;
            color: #333;
            background: white;
            padding: 20px;
        `;

        // 2. Cabecera Estandarizada
        const headerHtml = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0d6efd; padding-bottom: 10px; margin-bottom: 20px;">
                <div>
                    <h2 style="margin: 0; color: #0d6efd; font-size: 22pt;">${hotelName}</h2>
                    <h4 style="margin: 5px 0 0 0; color: #666; font-size: 14pt;">${title}</h4>
                </div>
                <div style="text-align: right; font-size: 10pt; color: #777;">
                    <div><b>Fecha:</b> ${dateStr}</div>
                    <div><b>Autor:</b> ${author}</div>
                    ${Object.entries(metadata).map(([k, v]) => `<div><b>${k}:</b> ${v}</div>`).join('')}
                </div>
            </div>
        `;

        // 3. Pie de Página
        const footerHtml = `
            <div style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #ccc; font-size: 8pt; color: #999; display: flex; justify-content: space-between;">
                <span>Generado por Recepción Suite v5.0</span>
                <span>Página 1 de 1</span>
            </div>
        `;

        // 4. Inyectar contenido
        container.innerHTML = `
            ${headerHtml}
            <div class="pdf-report-body">
                ${htmlContent}
            </div>
            ${footerHtml}
        `;

        // 5. Configuración de html2pdf
        const opt = {
            margin: [10, 10, 10, 10],
            filename: filename || `${title.replace(/\s+/g, '_')}_${Utils.getTodayISO()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // 6. Ejecutar generación
        try {
            // Si el navegador soporta File System Access API
            if (window.showSaveFilePicker) {
                const handle = await window.showSaveFilePicker({
                    suggestedName: opt.filename,
                    types: [{ description: 'PDF Document', accept: { 'application/pdf': ['.pdf'] } }]
                });
                
                const pdfBlob = await html2pdf().set(opt).from(container).output('blob');
                const writable = await handle.createWritable();
                await writable.write(pdfBlob);
                await writable.close();
            } else {
                await html2pdf().set(opt).from(container).save();
            }
            return true;
        } catch (err) {
            console.error("Error al generar PDF:", err);
            return false;
        }
    }
};
