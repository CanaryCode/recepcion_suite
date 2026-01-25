import { APP_CONFIG } from './Config.js';
import { sessionService } from '../services/SessionService.js';

/**
 * Utilidades Generales del Sistema
 */

export const Utils = {
    /**
     * Genera la lista de habitaciones basada en la configuración.
     * @returns {Array<{num: string, planta: number}>}
     */
    getHabitaciones: () => {
        const lista = [];
        if (APP_CONFIG.HOTEL && APP_CONFIG.HOTEL.STATS_CONFIG && APP_CONFIG.HOTEL.STATS_CONFIG.RANGOS) {
            APP_CONFIG.HOTEL.STATS_CONFIG.RANGOS.forEach(r => {
                for (let i = r.min; i <= r.max; i++) {
                    lista.push({ num: i.toString().padStart(3, '0'), planta: r.planta });
                }
            });
        }
        return lista;
    },
    /**
     * Formatea un número como moneda (Euro)
     * @param {number|string} amount - Cantidad a formatear
     * @returns {string} Cadena formateada (ej: "1,234.56€")
     */
    formatCurrency: (amount) => {
        const num = parseFloat(amount);
        if (isNaN(num)) return "0.00€";
        const sign = num < 0 ? "-" : "";
        return sign + Math.abs(num).toFixed(2) + "€";
    },

    /**
     * Obtiene la fecha actual en formato ISO (YYYY-MM-DD)
     * @returns {string}
     */
    getTodayISO: () => {
        return new Date().toISOString().split('T')[0];
    },

    /**
     * Formatea una fecha YYYY-MM-DD a DD/MM/YYYY
     * @param {string} dateStr 
     * @returns {string}
     */
    formatDate: (dateStr) => {
        if (!dateStr) return "";
        try {
            // Manejar si viene como objeto Date
            if (dateStr instanceof Date) return dateStr.toLocaleDateString();

            // Si es ISO YYYY-MM-DD
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                return `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
            return dateStr;
        } catch (e) {
            return dateStr;
        }
    },

    /**
     * Copia texto al portapapeles de forma segura
     * @param {string} text - Texto plano
     * @param {string} html - (Opcional) Contenido HTML rico
     */
    copyToClipboard: async (text, html = null) => {
        try {
            if (html && typeof ClipboardItem !== 'undefined') {
                const blobHtml = new Blob([html], { type: "text/html" });
                const blobText = new Blob([text], { type: "text/plain" });
                const data = [new ClipboardItem({ "text/html": blobHtml, "text/plain": blobText })];
                await navigator.clipboard.write(data);
            } else {
                await navigator.clipboard.writeText(text);
            }
            return true;
        } catch (err) {
            console.error("Error al copiar al portapapeles:", err);
            return false;
        }
    },
    /**
     * Valida si hay un usuario seleccionado en la sesión global.
     * Muestra una alerta si no hay nadie logueado.
     * @returns {string|null} Nombre del usuario o null si no hay sesión.
     */
    validateUser: () => {
        const user = sessionService.getUser();
        if (!user) {
            alert("⚠️ No hay usuario seleccionado. Selecciona tu nombre en el menú superior.");
            return null;
        }
        return user;
    },

    /**
     * Función auxiliar para imprimir una sección específica.
     * Gestiona la fecha, el usuario y la llamada a window.print().
     * @param {string} dateElementId - ID del elemento donde poner la fecha (opcional)
     * @param {string} userElementId - ID del elemento donde poner el usuario (opcional)
     * @param {string} userName - Nombre del usuario actual
     */
    printSection: (dateElementId, userElementId, userName) => {
        const now = new Date();
        const dateStr = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (dateElementId) {
            const el = document.getElementById(dateElementId);
            if (el) el.innerText = dateStr;
        }

        if (userElementId && userName) {
            const el = document.getElementById(userElementId);
            if (el) el.innerText = userName;
        }

        window.print();
    },

    /**
     * Asigna valor a un input de forma segura (verifica si existe).
     * @param {string} id - ID del elemento
     * @param {any} value - Valor a asignar
     */
    setVal: (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value;
    },

    /**
     * Alterna la visibilidad de un input type password
     * @param {string} id - ID del input
     */
    togglePassword: (id) => {
        const input = document.getElementById(id);
        if(!input) return;
        input.type = input.type === "password" ? "text" : "password";
    }
};
