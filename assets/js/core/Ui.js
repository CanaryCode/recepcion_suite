/**
 * UI CORE API (Ui.js)
 * -------------------
 * Centraliza patrones de interfaz de usuario reutilizables para garantizar consistencia y rendimiento.
 * 
 * Funcionalidades principales:
 * - Infinite Scroll (Intersection Observer Wrapper)
 * - Generación de Sentinels (Spinners de carga)
 */

export const Ui = {
    /**
     * INICIALIZACIÓN GLOBAL DE UI
     */
    init() {
        // Placeholder para inicialización global si fuera necesaria
        // Por ahora lo dejamos vacío para evitar el crash en main.js
    },

    /**
     * CONFIGURAR SCROLL INFINITO
     * Crea y gestiona un IntersectionObserver para cargar datos automáticamente al hacer scroll.
     * 
     * @param {Object} config Configuración del scroll
     * @param {Function} config.onLoadMore Función a ejecutar cuando se llega al final
     * @param {string} [config.sentinelId='sentinel-loader'] ID del elemento centinela
     * @param {string} [config.rootMargin='100px'] Margen de anticipación antes de cargar
     * @returns {Object} Controlador con métodos disconnect() y reconnect()
     */
    infiniteScroll: ({ onLoadMore, sentinelId = 'sentinel-loader', rootMargin = '100px' }) => {
        let observer = null;

        const connect = () => {
            const sentinel = document.getElementById(sentinelId);
            if (!sentinel) return; // Si no hay sentinel, no observamos nada (lista vacía o fin de datos)

            if (observer) observer.disconnect();

            observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        onLoadMore();
                    }
                });
            }, {
                root: null,
                rootMargin: rootMargin,
                threshold: 0.1
            });

            observer.observe(sentinel);
        };

        const disconnect = () => {
            if (observer) observer.disconnect();
            observer = null;
        };

        // Auto-conectar inicial si existe el sentinel
        setTimeout(connect, 100);

        return {
            disconnect,
            reconnect: connect
        };
    },

    /**
     * CREAR O OBTENER ELEMENTO SENTINEL (SPINNER ROW)
     * Genera la fila HTML con el spinner para indicar carga.
     * 
     * @param {string} id ID del elemento
     * @param {string} text Texto a mostrar junto al spinner
     * @param {number} colspan Número de columnas que ocupará en la tabla
     * @returns {HTMLElement} Elemento TR listo para insertar
     */
    createSentinelRow: (id, text = 'Cargando más registros...', colspan = 5) => {
        const tr = document.createElement('tr');
        tr.id = id;
        tr.innerHTML = `<td colspan="${colspan}" class="text-center py-2 text-muted small"><span class="spinner-border spinner-border-sm me-2"></span>${text}</td>`;
        return tr;
    },

    /**
     * RENDERIZAR TABLA ESTÁNDAR
     * Genera el HTML del cuerpo de una tabla dado un array de datos y una configuración de columnas.
     * 
     * @param {string} tbodyId - ID del elemento TBODY
     * @param {Array} data - Lista de datos
     * @param {Function} rowRenderer - Función (item, index) => String HTML (TR)
     * @param {string} emptyMessage - Mensaje si no hay datos
     * @param {boolean} append - Si es true, añade los datos al final sin borrar lo existente
     */
    renderTable: (tbodyId, data, rowRenderer, emptyMessage = 'No hay registros.', append = false) => {
        const tbody = document.getElementById(tbodyId);
        if (!tbody) return;

        // Si no estamos añadiendo y no hay datos, mostramos mensaje
        if (!append && (!data || data.length === 0)) {
            tbody.innerHTML = `<tr><td colspan="100%" class="text-center py-4 text-muted">${emptyMessage}</td></tr>`;
            return;
        }

        // Si estamos añadiendo y no hay datos nuevos, no hacemos nada
        if (append && (!data || data.length === 0)) return;

        const html = data.map((item, index) => rowRenderer(item, index)).join('');
        
        if (append) {
            // Eliminar sentinels viejos antes de añadir
            const oldLoader = tbody.querySelector('[id^="sentinel-"]');
            if (oldLoader) oldLoader.remove();
            tbody.insertAdjacentHTML('beforeend', html);
        } else {
            tbody.innerHTML = html;
        }
    },

    /**
     * ACTUALIZAR WIDGET DASHBOARD
     * Estandariza la actualización de mini-tablas en el dashboard principal.
     * 
     * @param {string} moduleName - Nombre del módulo (usado para IDs: dash-col-{name}, dash-count-{name}, dash-tabla-{name})
     * @param {Array} data - Datos a mostrar
     * @param {Function} rowRenderer - Función (item) => String HTML (TR)
     * @param {number} limit - (Opcional) Límite de items a mostrar (default 5)
     */
    updateDashboardWidget: (moduleName, data, rowRenderer, limit = 5) => {
        const col = document.getElementById(`dash-col-${moduleName}`);
        const count = document.getElementById(`dash-count-${moduleName}`);
        const table = document.getElementById(`dash-tabla-${moduleName}`);

        const hasData = data && data.length > 0;

        if (col) col.classList.toggle('d-none', !hasData);
        if (count) count.innerText = hasData ? data.length : 0;

        if (table && hasData) {
            // Usamos slice para limitar items en el dashboard
            const slice = data.slice(0, limit);
            table.innerHTML = slice.map(item => rowRenderer(item)).join('');
        } else if (table) {
            table.innerHTML = '';
        }
    },

    /**
     * INICIALIZAR AUTOCOMPLETE DE HABITACIONES
     * Popula un datalist con todas las habitaciones del hotel.
     * 
     * @param {string} datalistId 
     */
    initRoomAutocomplete: async (datalistId) => {
        const datalist = document.getElementById(datalistId);
        if (!datalist) return;

        const { Utils } = await import('./Utils.js');
        const habs = Utils.getHabitaciones();
        
        datalist.innerHTML = habs.map(h => `<option value="${h.num}">`).join('');
    },

    /**
     * CONFIGURAR CONMUTADOR DE VISTAS (Tabs/Panels)
     * Automatiza el cambio entre vista de Lista, Formulario o Rack.
     * 
     * @param {Object} config
     * @param {Array} config.buttons - [{ id, viewId, onShow }]
     * @param {string} config.activeClass - Clase para el botón activo (default 'active')
     */
    setupViewToggle: ({ buttons, activeClass = 'active' }) => {
        buttons.forEach(btnConfig => {
            const btn = document.getElementById(btnConfig.id);
            if (!btn) return;

            btn.addEventListener('click', () => {
                // Desactivar todos los botones y ocultar vistas
                buttons.forEach(b => {
                    document.getElementById(b.id)?.classList.remove(activeClass);
                    document.getElementById(b.viewId)?.classList.add('d-none');
                });

                // Activar actual
                btn.classList.add(activeClass);
                const view = document.getElementById(btnConfig.viewId);
                if (view) view.classList.remove('d-none');

                // Callback opcional
                if (btnConfig.onShow) btnConfig.onShow();
            });
        });
    },

    /**
     * ASISTENTE DE ENVÍO DE FORMULARIOS OPERATIVOS
     * Estandariza el proceso de: Validar -> Extraer -> Guardar -> Feedback.
     * 
     * @param {Object} config
     * @param {string} config.formId - ID del formulario
     * @param {Object} config.service - El servicio que tiene el método .setByKey()
     * @param {string} config.idField - ID del campo que actúa como clave única (ej: 'hab')
     * @param {Function} config.onSuccess - Callback tras guardar con éxito
     * @param {Function} [config.mapData] - (Opcional) Transforma los campos del form en un objeto
     */
    /**
     * ASISTENTE DE ENVÍO DE FORMULARIOS OPERATIVOS
     * Estandariza el proceso de: Validar -> Extraer -> Guardar -> Feedback.
     * 
     * @param {Object} config
     * @param {string} config.formId - ID del formulario
     * @param {Object} config.service - El servicio que tiene el método .setByKey()
     * @param {string} config.idField - ID/Name del campo que actúa como clave única (ej: 'hab')
     * @param {Function} config.onSuccess - Callback tras guardar con éxito
     * @param {string} [config.serviceIdField] - (Opcional) Nombre del campo ID en el objeto de datos (si difiere del form)
     */
    handleFormSubmission: ({ formId, service, idField, onSuccess, mapData, serviceIdField }) => {
        const form = document.getElementById(formId);
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // 1. Validar Usuario (Core Logic)
            const { Utils } = await import('./Utils.js');
            const autor = Utils.validateUser();
            if (!autor) return;

            // 2. Extraer Datos (Soporte para name e id)
            const rawData = {};
            form.querySelectorAll('input, select, textarea').forEach(el => {
                const key = el.name || el.id;
                if (!key) return;
                if (el.type === 'checkbox') {
                    if (!rawData[key]) rawData[key] = [];
                    if (el.checked) {
                        const val = el.value === 'on' ? true : el.value;
                        if (Array.isArray(rawData[key])) rawData[key].push(val);
                        else rawData[key] = val;
                    }
                } else if (el.type === 'radio') {
                    if (el.checked) rawData[key] = el.value;
                } else {
                    rawData[key] = el.value;
                }
            });

            let idValue = rawData[idField];

            // 3. Validar Habitación si aplica
            if (idField && idField.includes('hab')) {
                idValue = idValue.toString().padStart(3, '0');
                const validHabs = Utils.getHabitaciones().map(h => h.num);
                if (!validHabs.includes(idValue)) {
                    Ui.showToast(`Error: La habitación ${idValue} no existe.`, "danger");
                    return;
                }
            }

            // 4. Mapear datos (Añadir autor por defecto)
            let finalData = mapData ? mapData(rawData) : rawData;
            if (!finalData) return; // Validación interna fallida
            
            finalData.autor = autor;
            finalData.actualizadoEn = new Date().toISOString();

            // 5. Guardar en el Servicio
            // Si no hay idValue (ej: nueva novedad), se usa Date.now()
            const finalId = idValue || Date.now();
            // Usamos serviceIdField si existe, sino idField (comportamiento legacy), sino 'id' (default BaseService)
            const targetKeyField = serviceIdField || idField;
            service.setByKey(finalId, finalData, targetKeyField);

            // 6. Feedback
            Ui.showToast("Registro guardado correctamente.", "success");
            form.reset();
            
            // Limpiar campos ocultos o visuales especiales
            const hiddenId = form.querySelector(`input[type="hidden"]#${idField}`);
            if (hiddenId) hiddenId.value = '';
            
            // 7. Success logic (ej: mostrarLista)
            if (onSuccess) onSuccess(finalId, finalData);
        });
    },

    /**
     * PREPARAR REPORTE DE IMPRESIÓN
     * Centraliza la asignación de metadatos (fecha, autor) en la sección de impresión.
     */
    preparePrintReport: ({ dateId, memberId, memberName, extraMappings = {} }) => {
        const now = new Date();
        const dateStr = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (dateId) {
            const el = document.getElementById(dateId);
            if (el) el.innerText = dateStr;
        }

        if (memberId && memberName) {
            const el = document.getElementById(memberId);
            if (el) el.innerText = memberName;
        }

        // Mapeos extra (ej: nombres para firmas)
        Object.keys(extraMappings).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerText = extraMappings[id];
        });
    },

    /**
     * MOSTRAR NOTIFICACIÓN (Toast)
     */
    showToast: (message, type = 'success') => {
        if (window.showAlert) {
            window.showAlert(message, type);
        } else {
            // Fallback simple si no hay sistema de alertas cargado
            alert(`${type.toUpperCase()}: ${message}`);
        }
    },

    /**
     * MOSTRAR CONFIRMACIÓN
     */
    showConfirm: async (message) => {
        if (window.showConfirm) {
            return await window.showConfirm(message);
        }
        return confirm(message);
    },

    /**
     * MOSTRAR PROMPT (Entrada de texto)
     */
    showPrompt: async (message, type = 'text') => {
        if (window.showPrompt) {
            return await window.showPrompt(message, type);
        }
        return prompt(message);
    }
};
