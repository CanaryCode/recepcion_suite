import { LocalStorage } from '../core/LocalStorage.js';

class SessionService {
    constructor() {
        this.STORAGE_KEY = 'app_current_user';
    }

    /**
     * Obtiene el usuario actual logueado
     * @returns {string|null} Nombre del usuario o null si no hay nadie
     */
    getUser() {
        return LocalStorage.get(this.STORAGE_KEY, null);
    }

    /**
     * Establece el usuario actual
     * @param {string} username 
     */
    setUser(username) {
        if (username) {
            LocalStorage.set(this.STORAGE_KEY, username);
        } else {
            this.logout();
        }
    }

    /**
     * Cierra la sesión (borra el usuario)
     */
    logout() {
        LocalStorage.remove(this.STORAGE_KEY);
    }

    /**
     * Verifica si hay una sesión activa
     * @returns {boolean}
     */
    isAuthenticated() {
        return !!this.getUser();
    }
}

export const sessionService = new SessionService();
