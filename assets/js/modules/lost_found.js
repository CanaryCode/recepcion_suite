import { Utils } from "../core/Utils.js";
import { Ui } from "../core/Ui.js";
import { lostFoundService } from "../services/LostFoundService.js";
import { MediaPicker } from "../core/MediaPicker.js";
import { MediaService } from "../services/MediaService.js";

/**
 * MÓDULO DE OBJETOS PERDIDOS (lost_found.js)
 * -----------------------------------------
 * Gestiona la interfaz y lógica para el registro de hallazgos.
 */

let moduleInitialized = false;
let currentImageArray = [];

export const lostFoundModule = {
    async init() {
        if (moduleInitialized) return;

        await lostFoundService.init();
        this.renderInterface();
        this.setupEvents();
        
        moduleInitialized = true;
    },

    renderInterface() {
        // Reset form
        this.limpiarFormulario();
        
        // Setup View Toggles
        Ui.setupViewToggle({
            buttons: [
                { id: 'btnLostFoundVistaTrabajo', viewId: 'lost-found-trabajo' },
                { id: 'btnLostFoundVistaLista', viewId: 'lost-found-lista' }
            ]
        });

        this.refreshData();
    },

    setupEvents() {
        // Form Submission
        Ui.handleFormSubmission({
            formId: 'formLostFound',
            service: lostFoundService,
            idField: 'lost_found_id',
            serviceIdField: 'id',
            mapData: (data) => ({
                id: data.lost_found_id || '',
                objeto: data.lost_found_objeto,
                lugar: data.lost_found_lugar,
                quien: data.lost_found_quien,
                estado: data.lost_found_estado,
                comments: data.lost_found_comments,
                imagenes: currentImageArray.filter(img => img && typeof img === 'string'),
                fecha: data.lost_found_fecha || Utils.getTodayISO()
            }),
            onSuccess: () => {
                this.limpiarFormulario();
                this.refreshData();
                Ui.showToast("Objeto registrado correctamente", "success");
            }
        });

        // Filters & Search
        const searchInput = document.getElementById('searchLostFound');
        const statusFilter = document.getElementById('filterLostFoundEstado');

        if (searchInput) searchInput.addEventListener('input', () => this.renderFullList());
        if (statusFilter) statusFilter.addEventListener('change', () => this.renderFullList());
    },

    async refreshData() {
        this.renderRecentList();
        this.renderFullList();
    },

    async renderRecentList() {
        const items = await lostFoundService.getItems();
        // Sort by date/id descending, take last 5
        const recent = [...items].sort((a, b) => b.id - a.id).slice(0, 5);

        Ui.renderTable('lostFoundRecentBody', recent, (item) => `
            <tr>
                <td>${Utils.formatDate(item.fecha)}</td>
                <td class="fw-bold">${item.objeto}</td>
                <td><small>${item.lugar}</small></td>
                <td>${this.getStatusBadge(item.estado)}</td>
            </tr>
        `, 'Ningún objeto registrado recientemente.');
    },

    async renderFullList() {
        const items = await lostFoundService.getItems();
        const searchTerm = document.getElementById('searchLostFound')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('filterLostFoundEstado')?.value || '';

        const filtered = items.filter(item => {
            const matchesSearch = !searchTerm || 
                item.objeto.toLowerCase().includes(searchTerm) ||
                item.lugar.toLowerCase().includes(searchTerm) ||
                item.quien.toLowerCase().includes(searchTerm);
            const matchesStatus = !statusFilter || item.estado === statusFilter;
            return matchesSearch && matchesStatus;
        });

        // Default Sort (Newest first)
        filtered.sort((a, b) => b.id - a.id);

        // Update Total Badge
        const badge = document.getElementById('lostFoundTotalBadge');
        if (badge) badge.innerText = filtered.length;

        // Render Table Function
        const renderTable = (data) => {
             Ui.renderTable('lostFoundFullBody', data, (item) => `
            <tr style="cursor: pointer;" onclick="lostFoundModule.openDetail('${item.id}')">
                <td class="text-center">
                    <div class="d-flex justify-content-center" style="margin-left: 8px;">
                        ${item.imagenes && item.imagenes.length > 0 
                            ? item.imagenes.slice(0, 3).map((img, i) => `<img src="${this.resolveImagePath(img)}" class="rounded-circle border border-white shadow-sm" style="width: 24px; height: 24px; object-fit: cover; margin-left: -8px; z-index: ${10-i}">`).join('')
                            : '<i class="bi bi-image text-muted"></i>'}
                        ${item.imagenes && item.imagenes.length > 3 ? `<span class="badge bg-light text-dark rounded-circle border small d-flex align-items-center justify-content-center" style="width: 24px; height: 24px; margin-left: -8px; font-size: 0.6rem; z-index: 1;">+${item.imagenes.length - 3}</span>` : ''}
                    </div>
                </td>
                <td class="text-center small">
                    <div class="fw-bold text-primary" style="font-size: 0.7rem;">${item.id}</div>
                    <div>${Utils.formatDate(item.fecha)}</div>
                </td>
                <td class="fw-bold">${item.objeto}</td>
                <td>
                    <div class="small fw-bold">${item.lugar}</div>
                    <div class="text-muted" style="font-size: 0.75rem;">Por: ${item.quien}</div>
                </td>
                <td class="text-center">${this.getStatusBadge(item.estado)}</td>
                <td class="text-center no-print">
                    <button class="btn btn-sm btn-outline-primary border-0" onclick="event.stopPropagation(); lostFoundModule.editItem('${item.id}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger border-0" onclick="event.stopPropagation(); lostFoundModule.deleteItem('${item.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `, 'No hay objetos que coincidan con la búsqueda.');
        };

        // Render Initial
        renderTable(filtered);

        // Enable Global Sorting
        Ui.enableTableSorting('table-lost-found', filtered, (sortedData) => {
            renderTable(sortedData);
        });
    },

    getStatusBadge(status) {
        let color = 'bg-secondary';
        let icon = 'bi-box';

        switch (status) {
            case 'Almacenado': color = 'bg-info text-dark'; icon = 'bi-archive'; break;
            case 'Entregado': color = 'bg-success'; icon = 'bi-check2-circle'; break;
            case 'Donado': color = 'bg-primary'; icon = 'bi-heart'; break;
            case 'Desechado': color = 'bg-danger'; icon = 'bi-trash'; break;
        }

        return `<span class="badge ${color} d-inline-flex align-items-center"><i class="bi ${icon} me-1"></i>${status}</span>`;
    },

    /**
     * Resuelve la ruta de la imagen para que sea válida en el navegador
     */
    resolveImagePath(path) {
        if (!path) return '';
        if (path.startsWith('data:image')) return path; // Base64 legacy
        if (path.startsWith('http')) return path;
        
        // Si ya tiene / al principio, lo dejamos
        if (path.startsWith('/')) return path;

        // Si empieza por 'storage/', le ponemos la / para que el servidor lo sirva desde la raíz
        if (path.startsWith('storage')) return `/${path}`;

        // Fallback: si no sabemos qué es, asumimos que es una ruta relativa de storage
        return `/storage/media/lost_found/${path}`;
    },

    openImageZoom(imgData) {
        const newTab = window.open();
        if (!newTab) {
            Ui.showToast("No se pudo abrir la pestaña (bloqueador de popups?)", "warning");
            return;
        }
        newTab.document.write(`
            <html>
                <head>
                    <title>Previsualización de Imagen - Recepción Suite</title>
                    <style>
                        body { margin: 0; background: #000; display: flex; align-items: center; justify-content: center; height: 100vh; overflow: hidden; }
                        img { max-width: 100%; max-height: 100%; border: 3px solid #333; box-shadow: 0 0 20px rgba(0,0,0,0.5); }
                    </style>
                </head>
                <body>
                    <img src="${imgData}" />
                </body>
            </html>
        `);
        newTab.document.close();
    },

    async printTicket(id) {
        const item = typeof id === 'string' ? await lostFoundService.getById(id) : id;
        if (!item) return;

        const printWindow = window.open('', '_blank', 'width=400,height=600');
        if (!printWindow) return;

        const hotelName = "RIU HOTELS & RESORTS"; // Podría venir de Config.js
        const dateStr = Utils.formatDate(item.fecha);

        printWindow.document.write(`
            <html>
                <head>
                    <title>Ticket de Almacenamiento #${item.id}</title>
                    <style>
                        @page { margin: 0; size: 80mm 100mm; }
                        body { font-family: 'Courier New', Courier, monospace; padding: 20px; font-size: 14px; text-align: center; }
                        .hotel { font-weight: bold; font-size: 16px; margin-bottom: 20px; text-transform: uppercase; }
                        .title { font-size: 18px; margin: 10px 0; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; }
                        .info { text-align: left; margin: 15px 0; }
                        .id { font-size: 24px; font-weight: bold; margin: 15px 0; display: block; }
                        .footer { margin-top: 30px; font-size: 10px; font-style: italic; }
                        @media print { .no-print { display: none; } }
                    </style>
                </head>
                <body>
                    <div class="hotel">${hotelName}</div>
                    <div class="title">OBJETO PERDIDO</div>
                    <div class="id">${item.id}</div>
                    <div class="info">
                        <strong>Objeto:</strong> ${item.objeto}<br>
                        <strong>Fecha:</strong> ${dateStr}<br>
                        <strong>Lugar:</strong> ${item.lugar}<br>
                        <strong>Por:</strong> ${item.quien}
                    </div>
                    <div class="footer">
                        Escanee o asocie este ID al objeto físico.<br>
                        "Recepcion Suite v2"
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    },

    async handleFileSelection(event) {
        const files = Array.from(event.target.files);
        if (!files.length) return;

        Ui.showToast(`Procesando ${files.length} imágenes...`, "info");

        for (const file of files) {
            try {
                // Subir inmediatamente al servidor
                const relativePath = await MediaService.uploadImage(file, 'lost_found');
                // IMPORTANTE: Solo añadir si la ruta es válida
                if (relativePath) {
                    currentImageArray.push(relativePath);
                }
            } catch (err) {
                console.error("Error al subir archivo:", err);
                Ui.showToast(`Error al subir ${file.name}`, "danger");
            }
        }

        this.updateImagePreviews();
        // Limpiar el input para permitir seleccionar los mismos archivos después
        event.target.value = '';
    },

    updateImagePreviews() {
        const container = document.getElementById('lost_found_image_previews');
        if (!container) return;

        container.innerHTML = currentImageArray.map((img, index) => `
            <div class="position-relative">
                <img src="${this.resolveImagePath(img)}" class="rounded border shadow-sm" style="width: 60px; height: 60px; object-fit: cover;">
                <button type="button" class="btn btn-danger btn-xs position-absolute top-0 end-0 rounded-circle" 
                    style="padding: 0 4px; font-size: 10px; transform: translate(30%, -30%);"
                    onclick="lostFoundModule.removeImage(${index})">
                    <i class="bi bi-x"></i>
                </button>
            </div>
        `).join('');
    },

    removeImage(index) {
        currentImageArray.splice(index, 1);
        this.updateImagePreviews();
    },

    limpiarFormulario() {
        const form = document.getElementById('formLostFound');
        if (form) form.reset();
        
        document.getElementById('lost_found_id').value = '';
        document.getElementById('lost_found_fecha').value = Utils.getTodayISO();
        document.getElementById('lost_found_estado').value = 'Almacenado';
        
        currentImageArray = [];
        this.updateImagePreviews();
        
        // Reset Recent view if we are on Tab Work
        this.renderRecentList();
    },

    async editItem(id) {
        const item = await lostFoundService.getById(id);
        if (!item) return;

        // Switch to work view
        document.getElementById('btnLostFoundVistaTrabajo')?.click();

        // Fill form
        document.getElementById('lost_found_id').value = item.id;
        document.getElementById('lost_found_fecha').value = item.fecha;
        document.getElementById('lost_found_objeto').value = item.objeto;
        document.getElementById('lost_found_lugar').value = item.lugar;
        document.getElementById('lost_found_quien').value = item.quien;
        document.getElementById('lost_found_estado').value = item.estado;
        document.getElementById('lost_found_comments').value = item.comments || '';

        currentImageArray = Array.isArray(item.imagenes) ? [...item.imagenes] : (item.imagen ? [item.imagen] : []);
        this.updateImagePreviews();

        Ui.showToast("Cargado para editar", "info");
    },

    async deleteItem(id) {
        if (await Ui.showConfirm("¿Estás seguro de eliminar este registro definitivamente?")) {
            await lostFoundService.removeItem(id);
            this.refreshData();
            Ui.showToast("Registro eliminado", "success");
        }
    },

    async openDetail(id) {
        const item = await lostFoundService.getById(id);
        if (!item) return;

        const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalLostFoundDetail'));
        
        document.getElementById('lostFoundDetailId').innerText = `#${item.id}`;
        document.getElementById('lostFoundDetailObjeto').innerText = item.objeto;
        document.getElementById('lostFoundDetailFecha').innerText = Utils.formatDate(item.fecha);
        document.getElementById('lostFoundDetailLugar').innerText = item.lugar;
        document.getElementById('lostFoundDetailQuien').innerText = item.quien;
        document.getElementById('lostFoundDetailComments').innerText = item.comments || 'Sin observaciones adicionales.';

        const badge = document.getElementById('lostFoundDetailEstadoBadge');
        badge.className = 'badge';
        const badgeContent = this.getStatusBadge(item.estado);
        badge.innerHTML = badgeContent;

        const gallery = document.getElementById('lostFoundDetailGallery');
        const noImg = document.getElementById('lostFoundDetailNoImg');

        const imagenes = Array.isArray(item.imagenes) ? item.imagenes : (item.imagen ? [item.imagen] : []);

        if (imagenes.length > 0) {
            gallery.innerHTML = imagenes.map(img => {
                const resolvedPath = this.resolveImagePath(img);
                return `
                <div class="gallery-item-wrapper border rounded shadow-sm bg-white p-1" style="cursor: zoom-in;" onclick="lostFoundModule.openImageZoom('${resolvedPath}')">
                    <img src="${resolvedPath}" class="img-fluid rounded" style="width: 140px; height: 140px; object-fit: cover;">
                </div>`;
            }).join('');
            gallery.style.display = 'flex';
            noImg.style.display = 'none';
        } else {
            gallery.style.display = 'none';
            noImg.style.display = 'block';
        }

        // Action Buttons in Modal
        const btnDelete = document.getElementById('btnLostFoundDeleteDetail');
        btnDelete.onclick = () => {
            modal.hide();
            this.deleteItem(item.id);
        };

        const btnEdit = document.getElementById('btnLostFoundEditFromDetail');
        btnEdit.onclick = () => {
            modal.hide();
            this.editItem(item.id);
        };

        const btnPrint = document.getElementById('btnLostFoundPrintDetail');
        if (btnPrint) {
            btnPrint.onclick = () => this.printTicket(item);
        }

        modal.show();
    }
};

export async function inicializarLostFound() {
    return lostFoundModule.init();
}

window.lostFoundModule = lostFoundModule;
