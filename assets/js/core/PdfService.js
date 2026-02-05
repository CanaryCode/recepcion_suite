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
    async generateReport({ title, author, htmlContent, element, filename, metadata = {}, outputType = 'save' }) {
        if (typeof html2pdf === 'undefined') {
            console.error("html2pdf.js no está cargado.");
            return;
        }

        const now = new Date();
        const dateStr = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const hotelName = APP_CONFIG.HOTEL?.NOMBRE || "HOTEL GAROÉ";

        // 1. Construir el HTML completo como STRING (Evita fugas de CSS y PDFs en blanco)
        // Eliminamos la cabecera genérica de PdfService porque Caja ya trae su propio header profesional
        // Reducimos el padding general al mínimo (0 10mm) para aprovechar el folio
        const baseStyles = `
            <style>
                .pdf-root { font-family: Arial, sans-serif; color: #333; padding: 0mm; margin: 0; }
                .pdf-report-body { padding: 0; margin: 0; }
            </style>
        `;

        const footerHtml = `
                <div style="margin-top: 20px; padding-top: 5px; border-top: 1px solid #eee; font-size: 7pt; color: #bbb; display: flex; justify-content: space-between; font-family: sans-serif;">
                    <span>Generado por Recepción Suite v5.0</span>
                    <span>Página 1 de 1</span>
                </div>
            </div>
        `;

        let finalBodyHtml = "";
        if (element) {
            const clone = element.cloneNode(true);
            clone.classList.remove('d-none', 'd-print-none', 'd-print-block', 'fade');
            clone.style.display = 'block';
            clone.style.visibility = 'visible';
            finalBodyHtml = clone.outerHTML;
        } else {
            finalBodyHtml = htmlContent || "";
        }

        const unifiedHtml = `<div class="pdf-root">${baseStyles}<div class="pdf-report-body">${finalBodyHtml}</div>${footerHtml}`;

        // 2. Configuración de html2pdf
        const opt = {
            margin: [5, 10, 10, 10], // Reducimos margen superior de 10 a 5mm
            filename: filename || `${title.replace(/\s+/g, '_')}_${Utils.getTodayISO()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 2, 
                useCORS: true,
                letterRendering: false, // Desactivado para mayor compatibilidad
                logging: false,
                backgroundColor: '#ffffff'
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true }
        };

        // 3. Ejecutar generación directamente desde STRING
        try {
            const worker = html2pdf().set(opt).from(unifiedHtml);

            if (outputType === 'blob' || outputType === 'base64') {
                const pdfBlob = await worker.output('blob');
                
                if (outputType === 'blob') return pdfBlob;

                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const base64 = reader.result.split(',')[1];
                        resolve(base64);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(pdfBlob);
                });
            }

            await worker.save();
            return true;
        } catch (err) {
            console.error("Error al generar PDF:", err);
            return false;
        }
    }
};
