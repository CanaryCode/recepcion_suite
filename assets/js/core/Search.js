/**
 * Sistema de Búsqueda Global
 */

export const Search = {
    init: () => {
        const searchInput = document.getElementById('globalSearch');

        if (searchInput) {
            // Evento Input: Filtrar mientras se escribe
            searchInput.addEventListener('input', function (e) {
                Search.realizarBusqueda(e.target.value);
            });

            // Evento Focus: Mostrar opciones al hacer clic
            searchInput.addEventListener('focus', function () {
                Search.realizarBusqueda(this.value);
            });
        }

        // Cerrar búsqueda al hacer click fuera
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.nav-search-wrapper')) {
                document.getElementById('searchResults')?.classList.add('d-none');
            }
        });

        // Exponer globalmente para onclick en resultados
        window.activarResultado = Search.activarResultado;
        window.currentSearchMatches = [];
    },

    realizarBusqueda: (term) => {
        term = term.toLowerCase();
        const resultsContainer = document.getElementById('searchResults');
        if (!resultsContainer) return;

        // Buscar en todos los botones de navegación y dropdowns
        const links = document.querySelectorAll('#mainTabs .nav-link:not(.dropdown-toggle), #mainTabs .dropdown-item');
        let matches = [];

        links.forEach(link => {
            const text = link.textContent.trim();
            if (!text) return;

            // Excluir elementos del selector de usuario
            if (link.closest('#globalUserList')) return;

            // Si no hay término (foco inicial), mostrar todo. Si hay término, filtrar.
            if (term === '' || text.toLowerCase().includes(term)) {
                matches.push({ text: link.innerHTML, el: link });
            }
        });

        if (matches.length > 0) {
            // Limitar a 15 resultados para no saturar si se muestra todo
            const limit = term === '' ? 15 : matches.length;
            const displayMatches = matches.slice(0, limit);

            let html = displayMatches.map((m, i) =>
                `<button class="list-group-item list-group-item-action small border-0 py-2 text-start" onclick="activarResultado(${i})">${m.text}</button>`
            ).join('');

            if (matches.length > limit) {
                html += `<div class="p-2 text-muted small text-center fst-italic">... y ${matches.length - limit} más</div>`;
            }

            resultsContainer.innerHTML = html;
            window.currentSearchMatches = matches.map(m => m.el);
            resultsContainer.classList.remove('d-none');
        } else {
            resultsContainer.innerHTML = '<div class="p-2 text-muted small text-center">No encontrado</div>';
            resultsContainer.classList.remove('d-none');
        }
    },

    activarResultado: (index) => {
        const el = window.currentSearchMatches[index];
        if (el) {
            // 1. Navegar al elemento
            el.click();

            // 2. Cerrar el dropdown si el elemento estaba dentro de uno
            const dropdownMenu = el.closest('.dropdown-menu');
            if (dropdownMenu) {
                const dropdownToggle = dropdownMenu.closest('.dropdown')?.querySelector('.dropdown-toggle');
                if (dropdownToggle) {
                    // Usar API de Bootstrap 5 para cerrar limpiamente
                    const bsDropdown = bootstrap.Dropdown.getInstance(dropdownToggle);
                    if (bsDropdown) bsDropdown.hide();
                }
            }
        }
        document.getElementById('globalSearch').value = '';
        document.getElementById('searchResults').classList.add('d-none');
    }
};
