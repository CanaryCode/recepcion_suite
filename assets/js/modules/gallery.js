import { APP_CONFIG } from '../core/Config.js';
import { Ui } from '../core/Ui.js';
import { Api } from '../core/Api.js';

let moduloInicializado = false;
let currentScale = 1;
let currentRotation = 0;
let isDragging = false;
let startX, startY, translateX = 0, translateY = 0;
let currentImages = [];
let currentIndex = -1;

export const Gallery = {
    async inicializar() {
        if (moduloInicializado) return;
        
        // Initial load
        await this.loadImages();
        
        // Event listeners for Filters
        document.getElementById('gallerySearch')?.addEventListener('input', (e) => {
            this.filterImages(e.target.value);
        });

        // setupModalEvents will handle the viewer controls
        this.setupModalEvents();

        moduloInicializado = true;
    },

    async loadImages() {
        const container = document.getElementById('gallery-grid');
        if (!container) return;

        container.innerHTML = '<div class="col-12 text-center py-5"><div class="spinner-border text-primary" role="status"></div><p class="mt-2 text-muted">Cargando imágenes...</p></div>';

        try {
            const galleryPath = APP_CONFIG.SYSTEM?.GALLERY_PATH || 'assets/gallery';
            
            // Call the new system endpoint
            const response = await Api.post('/system/list-images', {
                folderPath: galleryPath
            });

            if (response && response.images) {
                this.renderGrid(response.images);
            } else {
                container.innerHTML = '<div class="col-12 text-center text-muted py-5"><i class="bi bi-images fs-1 mb-3"></i><p>No hay imágenes en la carpeta configurada.</p></div>';
            }

        } catch (error) {
            console.error('Error loading gallery:', error);
            container.innerHTML = `<div class="col-12 text-center text-danger py-5"><i class="bi bi-exclamation-triangle fs-1 mb-3"></i><p>Error al cargar la galería: ${error.message}</p></div>`;
        }
    },

    renderGrid(images) {
        currentImages = images; // Store for navigation
        const container = document.getElementById('gallery-grid');
        container.innerHTML = '';

        if (images.length === 0) {
            container.innerHTML = '<div class="col-12 text-center text-muted py-5">Carpeta vacía.</div>';
            return;
        }

        images.forEach(img => {
            const col = document.createElement('div');
            col.className = 'col-6 col-md-4 col-lg-3 gallery-item-col';
            col.dataset.name = img.name.toLowerCase();

            col.innerHTML = `
                <div class="card h-100 shadow-sm border-0 gallery-card" onclick="Gallery.openViewer('${img.url}', '${img.name}')">
                    <div class="card-img-wrapper" style="height: 200px; overflow: hidden; position: relative;">
                        <img src="${img.url}" class="card-img-top" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s;">
                    </div>
                    <div class="card-body p-2 text-center">
                        <small class="fw-bold text-secondary text-truncate d-block">${img.name}</small>
                    </div>
                </div>
            `;
            container.appendChild(col);
        });
    },

    filterImages(query) {
        const term = query.toLowerCase();
        const items = document.querySelectorAll('.gallery-item-col');
        
        items.forEach(item => {
            const name = item.dataset.name;
            if (name.includes(term)) {
                item.classList.remove('d-none');
            } else {
                item.classList.add('d-none');
            }
        });
    },

    openViewer(url, title) {
        const modalEl = document.getElementById('galleryModal');
        const img = document.getElementById('galleryViewerImage');
        const titleEl = document.getElementById('galleryViewerTitle');
        
        if (!modalEl || !img) return;

        // Set index for navigation
        currentIndex = currentImages.findIndex(i => i.url === url);

        img.src = url;
        titleEl.textContent = title;
        
        // Reset transform state
        this.resetView();

        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    },

    nextImage() {
        if (currentImages.length <= 1) return;
        currentIndex = (currentIndex + 1) % currentImages.length;
        this.syncViewer();
    },

    prevImage() {
        if (currentImages.length <= 1) return;
        currentIndex = (currentIndex - 1 + currentImages.length) % currentImages.length;
        this.syncViewer();
    },

    syncViewer() {
        const item = currentImages[currentIndex];
        if (!item) return;

        const img = document.getElementById('galleryViewerImage');
        const titleEl = document.getElementById('galleryViewerTitle');
        
        if (img) img.src = item.url;
        if (titleEl) titleEl.textContent = item.name;

        this.resetView();
    },

    // --- ZOOM & PAN LOGIC ---

    resetView() {
        currentScale = 1;
        currentRotation = 0;
        translateX = 0;
        translateY = 0;
        this.updateTransform();
    },

    adjustZoom(delta) {
        currentScale += delta;
        if (currentScale < 0.1) currentScale = 0.1;
        if (currentScale > 5) currentScale = 5;
        this.updateTransform();
    },

    rotateImage(deg) {
        currentRotation += deg;
        this.updateTransform();
    },

    updateTransform() {
        const img = document.getElementById('galleryViewerImage');
        if (img) {
            img.style.transform = `translate(${translateX}px, ${translateY}px) scale(${currentScale}) rotate(${currentRotation}deg)`;
        }
    },

    setupModalEvents() {
        const imgContainer = document.getElementById('galleryViewerContainer');
        const img = document.getElementById('galleryViewerImage');

        if (!imgContainer) return;

        // Wheel Zoom
        imgContainer.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            this.adjustZoom(delta);
        });

        // Mouse Drag to Pan
        imgContainer.addEventListener('mousedown', (e) => {
            if (currentScale <= 1) return; // Only pan if zoomed in
            isDragging = true;
            startX = e.clientX - translateX;
            startY = e.clientY - translateY;
            imgContainer.style.cursor = 'grabbing';
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
            if (imgContainer) imgContainer.style.cursor = 'grab';
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            translateX = e.clientX - startX;
            translateY = e.clientY - startY;
            this.updateTransform();
        });

        // --- BUTTONS ---
        document.getElementById('galleryRotateLeft')?.addEventListener('click', (e) => { e.stopPropagation(); this.rotateImage(-90); });
        document.getElementById('galleryRotateRight')?.addEventListener('click', (e) => { e.stopPropagation(); this.rotateImage(90); });
        document.getElementById('galleryZoomIn')?.addEventListener('click', (e) => { e.stopPropagation(); this.adjustZoom(0.2); });
        document.getElementById('galleryZoomOut')?.addEventListener('click', (e) => { e.stopPropagation(); this.adjustZoom(-0.2); });
        document.getElementById('galleryResetView')?.addEventListener('click', (e) => { e.stopPropagation(); this.resetView(); });

        // Navigation
        document.getElementById('galleryPrevBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.prevImage();
        });
        document.getElementById('galleryNextBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.nextImage();
        });

        // Keyboard Support (Only once)
        if (!window._galleryKeyHandler) {
            window._galleryKeyHandler = true;
            window.addEventListener('keydown', (e) => {
                const modal = document.getElementById('galleryModal');
                if (!modal?.classList.contains('show')) return;

                if (e.key === 'ArrowRight') this.nextImage();
                if (e.key === 'ArrowLeft') this.prevImage();
                if (e.key === 'Escape') {
                    const bModal = bootstrap.Modal.getInstance(modal);
                    bModal?.hide();
                }
            });
        }
    }
};

// Global Exposure
window.Gallery = Gallery;
