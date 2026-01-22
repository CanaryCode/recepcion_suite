/**
 * Sistema Global de Modales (Estilo Alarma)
 * Reemplaza los alerts nativos con un diseño moderno usando Bootstrap Modal.
 */

/* ==========================================================================
   CONFIGURACIÓN Y ESTILOS
   ========================================================================== */
const modalStyles = {
    error: { color: 'danger', icon: 'bi-exclamation-octagon-fill', title: 'ERROR' },
    success: { color: 'success', icon: 'bi-check-circle-fill', title: 'ÉXITO' },
    warning: { color: 'warning', icon: 'bi-exclamation-triangle-fill', title: 'ATENCIÓN' },
    info: { color: 'primary', icon: 'bi-info-circle-fill', title: 'INFORMACIÓN' },
    question: { color: 'primary', icon: 'bi-question-circle-fill', title: 'CONFIRMACIÓN' }
};

let systemModalInstance = null;

/* ==========================================================================
   HTML DEL MODAL
   ========================================================================== */
const modalHTML = `
<div class="modal fade" id="globalSystemModal" tabindex="-1" style="z-index: 10060;" data-bs-backdrop="static" data-bs-keyboard="false">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content shadow-lg border-0 overflow-hidden" id="globalModalContent">
            <div class="modal-header text-white border-0 py-2" id="globalModalHeader">
                <h5 class="modal-title fw-bold" id="globalModalTitle">AVISO</h5>
            </div>
            <div class="modal-body text-center p-4">
                <div class="display-1 mb-3" id="globalModalIcon"></div>
                <h4 class="fw-bold mb-2 text-dark" id="globalModalMessage"></h4>
                <div id="globalModalInputContainer" class="d-none mt-4">
                    <input type="text" id="globalModalInput" class="form-control form-control-lg text-center border-2" autocomplete="off">
                </div>
            </div>
            <div class="modal-footer justify-content-center border-0 pb-4 pt-0" id="globalModalFooter"></div>
        </div>
    </div>
</div>`;

/* ==========================================================================
   MÉTODOS PRIVADOS
   ========================================================================== */
function ensureModalExists() {
    if (!document.getElementById('globalSystemModal')) {
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        systemModalInstance = new bootstrap.Modal(document.getElementById('globalSystemModal'));
    } else if (!systemModalInstance) {
        systemModalInstance = new bootstrap.Modal(document.getElementById('globalSystemModal'));
    }
    return systemModalInstance;
}

function setupModalUI(type, msg) {
    const style = modalStyles[type] || modalStyles.info;
    const header = document.getElementById('globalModalHeader');

    // Reset clases
    header.className = `modal-header text-white border-0 py-2 bg-${style.color}`;
    document.getElementById('globalModalIcon').className = `display-1 mb-3 text-${style.color}`;

    document.getElementById('globalModalTitle').innerText = style.title;
    document.getElementById('globalModalIcon').innerHTML = `<i class="bi ${style.icon}"></i>`;
    document.getElementById('globalModalMessage').innerHTML = msg; // Permite HTML
    document.getElementById('globalModalInputContainer').classList.add('d-none');
    document.getElementById('globalModalFooter').innerHTML = '';
}

/* ==========================================================================
   MÉTODOS PÚBLICOS
   ========================================================================== */

export const Modal = {
    /**
     * Inicializa el sistema de modales inyectando el HTML si no existe
     */
    init: () => {
        ensureModalExists();
        // Exponer instancia globalmente para casos extremos donde se necesite acceso directo
        window.systemModal = systemModalInstance;

        // Sobrescribir alert nativo
        window.alert = (msg) => Modal.showAlert(msg, 'error');
        // Exponer helpers globalmente para compatibilidad
        window.showAlert = Modal.showAlert;
        window.showConfirm = Modal.showConfirm;
        window.showPrompt = Modal.showPrompt;
    },

    showAlert: (msg, type = 'error') => {
        return new Promise(resolve => {
            ensureModalExists();
            setupModalUI(type, msg);

            const footer = document.getElementById('globalModalFooter');
            footer.innerHTML = `<button class="btn btn-${modalStyles[type]?.color || 'primary'} btn-lg px-5 fw-bold shadow-sm" onclick="systemModal.hide()">ENTENDIDO</button>`;

            const el = document.getElementById('globalSystemModal');
            const onHide = () => {
                el.removeEventListener('hidden.bs.modal', onHide);
                resolve();
            };
            el.addEventListener('hidden.bs.modal', onHide);
            systemModalInstance.show();
        });
    },

    showConfirm: (msg) => {
        return new Promise(resolve => {
            ensureModalExists();
            setupModalUI('question', msg);

            const footer = document.getElementById('globalModalFooter');
            footer.innerHTML = `
                <button class="btn btn-outline-secondary btn-lg px-4 fw-bold me-2" onclick="this.dataset.res='false'; systemModal.hide()">CANCELAR</button>
                <button class="btn btn-primary btn-lg px-4 fw-bold" onclick="this.dataset.res='true'; systemModal.hide()">CONFIRMAR</button>
            `;

            const el = document.getElementById('globalSystemModal');
            let result = false;

            // Capturar clic en botones mediante delegación o asignación directa
            const btns = footer.querySelectorAll('button');
            btns.forEach(b => b.addEventListener('click', (e) => {
                // Aseguramos que tomamos el dataset del botón
                result = e.currentTarget.dataset.res === 'true';
            }));

            const onHide = () => {
                el.removeEventListener('hidden.bs.modal', onHide);
                resolve(result);
            };
            el.addEventListener('hidden.bs.modal', onHide);
            systemModalInstance.show();
        });
    },

    showPrompt: (msg, inputType = 'text') => {
        return new Promise(resolve => {
            ensureModalExists();
            setupModalUI('question', msg);

            const inputDiv = document.getElementById('globalModalInputContainer');
            const input = document.getElementById('globalModalInput');
            inputDiv.classList.remove('d-none');
            input.type = inputType;
            input.value = '';

            const footer = document.getElementById('globalModalFooter');
            footer.innerHTML = `
                <button class="btn btn-outline-secondary btn-lg px-4 fw-bold me-2" onclick="this.dataset.res='null'; systemModal.hide()">CANCELAR</button>
                <button class="btn btn-primary btn-lg px-4 fw-bold" onclick="this.dataset.res='ok'; systemModal.hide()">ACEPTAR</button>
            `;

            const el = document.getElementById('globalSystemModal');
            let value = null;

            const submit = () => { value = input.value; systemModalInstance.hide(); };
            const cancel = () => { value = null; systemModalInstance.hide(); };

            const btns = footer.querySelectorAll('button');
            btns[0].onclick = cancel;
            btns[1].onclick = submit;

            // Enter en input
            input.onkeydown = (e) => { if (e.key === 'Enter') submit(); };

            const onHide = () => {
                el.removeEventListener('hidden.bs.modal', onHide);
                input.onkeydown = null;
                resolve(value);
            };
            el.addEventListener('hidden.bs.modal', onHide);

            // Enfocar input al mostrar
            el.addEventListener('shown.bs.modal', () => input.focus(), { once: true });
            systemModalInstance.show();
        });
    }
};
