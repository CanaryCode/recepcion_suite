import { preciosService } from '../services/PreciosService.js';
import { sessionService } from '../services/SessionService.js';
import { Utils } from '../core/Utils.js';
import { Ui } from '../core/Ui.js';

/**
 * MÓDULO DE LISTA DE PRECIOS (precios.js)
 * --------------------------------------
 * Gestiona el catálogo de productos y servicios del hotel (Bebidas, Comida, etc).
 * Incluye un buscador en tiempo real, sistema de favoritos y un modo de edición 
 * protegido por contraseña para administradores.
 */

let modoEdicionPrecios = false;  // Flag para habilitar/deshabilitar cambios
let targetInputId = null;        // Referencia para el selector de iconos
const PASSWORD_EDICION = "1234";

// ==========================================
// 1. INICIALIZACIÓN
// ==========================================

export function inicializarPrecios() {
    // Configurar buscador
    const searchInput = document.getElementById('search-precios-modulo');
    if (searchInput) {
        // Clonar para eliminar listeners anteriores
        const newSearch = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newSearch, searchInput);
        newSearch.addEventListener('input', (e) => renderPrecios(e.target.value));
    }

    // Configurar botón de impresión
    document.getElementById('btnImprimirPrecios')?.addEventListener('click', imprimirPrecios);

    renderPrecios();
}

// ==========================================
// 2. HANDLERS & ACCIONES
// ==========================================

/**
 * MODO EDICIÓN
 * Permite desbloquear el grid de precios para realizar cambios directos.
 * Requiere contraseña de administrador.
 */
export async function toggleEdicionPrecios() {
    if (modoEdicionPrecios) {
        modoEdicionPrecios = false;
        renderPrecios();
    } else {
        const pass = await Ui.showPrompt("🔒 Contraseña de administrador:", "password");
        if (pass === PASSWORD_EDICION) {
            modoEdicionPrecios = true;
            renderPrecios();
        } else if (pass !== null) {
            Ui.showToast("Contraseña incorrecta", "danger");
        }
    }
}

export function agregarPrecio(e) {
    e.preventDefault();
    const nombre = document.getElementById('new-precio-nombre').value;
    const precio = document.getElementById('new-precio-valor').value;
    const icono = document.getElementById('new-precio-icon').value;
    const comentario = document.getElementById('new-precio-comentario').value;

    if (nombre && precio) {
        preciosService.savePrecio({
            id: Date.now(),
            nombre,
            precio,
            icono,
            comentario,
            favorito: false
        });
        e.target.reset();
        renderPrecios();
    }
}

export async function eliminarPrecio(id) {
    if (await Ui.showConfirm("¿Eliminar este producto de la lista?")) {
        await preciosService.deletePrecio(id);
        renderPrecios();
    }
}

export function toggleFavoritoPrecio(id) {
    preciosService.toggleFavorito(id);
    renderPrecios();
}

export function guardarPrecio(id, campo, valor) {
    const p = preciosService.getPrecioById(id);
    if (p) {
        p[campo] = valor.trim();
        preciosService.savePrecio(p);
    }
}

// ==========================================
// 3. RENDERIZADO
// ==========================================

/**
 * DIBUJAR LISTA DE PRECIOS
 * Renderiza el catálogo ordenado (favoritos primero).
 * Si el modo edición está activo, habilita 'contenteditable' en los campos.
 */
function renderPrecios(filtro = "") {
    const container = document.getElementById('lista-precios-container');
    const formAdd = document.getElementById('form-add-precio-container');
    const btnText = document.getElementById('btn-text-precios');
    const iconLock = document.getElementById('icon-lock-precios');

    if (!container) return;

    // Normalizar estilos del padre para evitar doble scroll
    if (container.parentElement) {
        container.parentElement.style.maxHeight = 'none';
        container.parentElement.style.overflow = 'visible';
        container.parentElement.classList.remove('overflow-auto');
    }

    let precios = preciosService.getPrecios();

    // Filtrar
    if (filtro) {
        const f = filtro.toLowerCase();
        precios = precios.filter(p => p.nombre.toLowerCase().includes(f) || (p.comentario && p.comentario.toLowerCase().includes(f)));
    }

    // Ordenar: Favoritos primero, luego alfabético
    precios.sort((a, b) => {
        if (a.favorito !== b.favorito) return b.favorito - a.favorito;
        return a.nombre.localeCompare(b.nombre);
    });

    // Renderizar Grid
    container.className = 'row g-3 no-print';
    container.innerHTML = '';

    if (precios.length === 0) {
        container.innerHTML = '<div class="col-12"><div class="p-5 text-center text-muted">No hay productos registrados o encontrados.</div></div>';
    }

    precios.forEach(p => {
        const favClass = p.favorito ? 'text-warning' : 'text-muted opacity-25';
        const editable = modoEdicionPrecios ? 'contenteditable="true"' : '';

        // Determinar icono
        const esImagen = p.icono && (p.icono.includes('/') || p.icono.includes('.') || p.icono.startsWith('data:image'));
        const iconoHtml = esImagen
            ? `<img src="${p.icono}" alt="icon" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`
            : `<span>${p.icono || '📦'}</span>`;

        container.innerHTML += `
            <div class="col-md-6 col-lg-4 col-xl-3">
                <div class="card h-100 border-0 shadow-sm price-card p-3 position-relative">
                    <button class="btn btn-link p-0 position-absolute top-0 end-0 mt-2 me-2 ${favClass}" onclick="toggleFavoritoPrecio(${p.id})"><i class="bi bi-star-fill"></i></button>
                    
                    <div class="d-flex align-items-center gap-3 h-100">
                        <div class="price-icon-box shadow-sm overflow-hidden position-relative" style="cursor: ${modoEdicionPrecios ? 'pointer' : 'default'}" onclick="${modoEdicionPrecios ? `abrirSelectorIconos(null, ${p.id})` : ''}">
                            ${iconoHtml}
                            ${modoEdicionPrecios ? '<div class="position-absolute top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-flex align-items-center justify-content-center text-white opacity-0 hover-opacity-100"><i class="bi bi-pencil-fill small"></i></div>' : ''}
                        </div>
                        
                        <div class="flex-grow-1">
                            <div class="fw-bold text-dark mb-1" ${editable} onblur="guardarPrecio(${p.id}, 'nombre', this.innerText)">${p.nombre}</div>
                            <div class="small text-muted lh-sm mb-2" style="font-size: 0.8rem;" ${editable} onblur="guardarPrecio(${p.id}, 'comentario', this.innerText)">${p.comentario || 'Sin descripción'}</div>
                            <div class="fw-bold text-primary fs-5"><span ${editable} onblur="guardarPrecio(${p.id}, 'precio', this.innerText)">${p.precio}</span>€</div>
                        </div>
                        
                        ${modoEdicionPrecios ? `<button class="btn btn-light text-danger btn-sm position-absolute bottom-0 end-0 mb-2 me-2" onclick="eliminarPrecio(${p.id})"><i class="bi bi-trash"></i></button>` : ''}
                    </div>
                </div>
            </div>`;
    });

    // Renderizar Impresión (Tabla limpia)
    const tablaPrint = document.getElementById('tabla-precios-print');
    if (tablaPrint) {
        tablaPrint.innerHTML = precios.map(p => {
            const esImg = p.icono && (p.icono.includes('/') || p.icono.includes('.') || p.icono.startsWith('data:image'));
            const iconHtml = esImg
                ? `<img src="${p.icono}" alt="icon" style="width: 32px; height: 32px; object-fit: cover; border-radius: 50%;">`
                : `<span>${p.icono || '📦'}</span>`;

            return `
            <tr>
                <td class="text-center fs-4">${iconHtml}</td>
                <td class="fw-bold">${p.nombre}</td>
                <td class="text-muted small">${p.comentario || ''}</td>
                <td class="text-end fw-bold">${p.precio}€</td>
            </tr>`;
        }).join('');
    }

    // Actualizar UI según modo edición
    if (modoEdicionPrecios) {
        formAdd?.classList.remove('d-none');
        if (btnText) btnText.innerText = "Salir Edición";
        if (iconLock) iconLock.className = "bi bi-unlock-fill me-1";
    } else {
        formAdd?.classList.add('d-none');
        if (btnText) btnText.innerText = "Editar Lista";
        if (iconLock) iconLock.className = "bi bi-lock-fill me-1";
    }
}

// ==========================================
// 4. LÓGICA DE ICONOS (Migrada a IconSelector.js)
// ==========================================

export function abrirSelectorIconos(inputId = null, productId = null) {
    if (productId) {
        IconSelector.open(null, (value) => {
            guardarPrecio(productId, 'icono', value);
            renderPrecios();
        });
    } else {
        IconSelector.open(inputId);
    }
}

// ==========================================
// 5. IMPRESIÓN
// ==========================================

function imprimirPrecios() {
    const user = Utils.validateUser();
    if (!user) return;

    Utils.printSection('print-date-precios', 'print-repc-nombre-precios', user);
}

// Exportaciones para el HTML (OnClicks)
window.toggleEdicionPrecios = toggleEdicionPrecios;
window.agregarPrecio = agregarPrecio;
window.eliminarPrecio = eliminarPrecio;
window.toggleFavoritoPrecio = toggleFavoritoPrecio;
window.guardarPrecio = guardarPrecio;
window.imprimirPrecios = imprimirPrecios;
window.abrirSelectorIconos = abrirSelectorIconos;
window.seleccionarIcono = (v) => IconSelector.select(v); 
window.procesarImagenSubida = (i) => IconSelector.handleFileUpload(i);
