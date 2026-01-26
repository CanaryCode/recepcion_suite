import { BaseService } from './BaseService.js';
import { APP_CONFIG } from '../core/Config.js';

/**
 * SERVICIO DE ALARMAS DEL SISTEMA (SystemAlarmsService)
 * ----------------------------------------------------
 * Gestiona los recordatorios internos y alarmas automáticas (ej: "Hacer copia", 
 * "Cierre de caja", etc.). Soporta repeticiones diarias, semanales o fechas únicas.
 */
class SystemAlarmsService extends BaseService {
    constructor() {
        super('riu_system_alarms');
        this.initializeDefaults();
    }

    /**
     * CARGA INICIAL POR DEFECTO
     * Si el sistema arranca sin alarmas guardadas, las toma del archivo Config.js.
     */
    initializeDefaults() {
        const existing = this.getAll();
        if (!existing || existing.length === 0) {
            // FIX: Comprobar que la configuración existe para evitar errores en el primer arranque
            if (APP_CONFIG.HOTEL && Array.isArray(APP_CONFIG.HOTEL.ALARMAS_SISTEMA)) {
                const defaults = APP_CONFIG.HOTEL.ALARMAS_SISTEMA.map((a, i) => ({
                    id: `sys_default_${i}`,
                    ...a,
                    active: true
                }));
                this.saveAll(defaults);
            }
        }
    }

    getAlarms() {
        return this.getAll() || [];
    }

    /**
     * GUARDAR O ACTUALIZAR ALARMA
     */
    saveAlarm(alarm) {
        let list = this.getAlarms();
        if (alarm.id) {
            const idx = list.findIndex(a => a.id === alarm.id);
            if (idx >= 0) {
                list[idx] = alarm;
            } else {
                list.push(alarm);
            }
        } else {
            alarm.id = `sys_${Date.now()}`;
            list.push(alarm);
        }
        this.saveAll(list);
    }

    deleteAlarm(id) {
        const list = this.getAlarms().filter(a => a.id !== id);
        this.saveAll(list);
    }

    /**
     * ACTIVAR/DESACTIVAR
     */
    toggleActive(id) {
        const list = this.getAlarms();
        const item = list.find(a => a.id === id);
        if (item) {
            item.active = !item.active;
            this.saveAll(list);
        }
    }

    /**
     * ¿DEBE SONAR AHORA?
     * Comprueba si la alarma coincide con la hora y el día actuales.
     * 
     * @param {Object} alarm - La configuración de la alarma.
     * @param {Date} dateObj - El momento actual (normalmente new Date()).
     * @returns {boolean}
     */
    isTriggerDue(alarm, dateObj) {
        if (!alarm.active) return false;

        // Formatear hora actual a HH:mm
        const currentHour = dateObj.getHours().toString().padStart(2, '0');
        const currentMinute = dateObj.getMinutes().toString().padStart(2, '0');
        const currentTime = `${currentHour}:${currentMinute}`;

        // Si la hora no coincide, ni seguimos mirando
        if (alarm.hora !== currentTime) return false;

        const weekDay = dateObj.getDay(); // 0 (Domingo) a 6 (Sábado)
        const dateStr = dateObj.toISOString().split('T')[0]; // Formato YYYY-MM-DD

        // Caso 1: Alarma de fecha específica (Única)
        if (alarm.type === 'date') {
            return alarm.date === dateStr;
        }

        // Caso 2: Alarma semanal (Días elegidos: lunas, martes...)
        if (alarm.type === 'weekly') {
            if (Array.isArray(alarm.days)) {
                return alarm.days.includes(weekDay);
            }
            return false;
        }

        // Caso 3: Alarma diaria o filtros con palabras (Legacy)
        if (alarm.dias === 'todos' || !alarm.dias) return true;
        if (alarm.dias === 'laborables') return (weekDay >= 1 && weekDay <= 5);
        if (alarm.dias === 'finde') return (weekDay === 0 || weekDay === 6);
        if (Array.isArray(alarm.dias)) return alarm.dias.includes(weekDay);

        return true;
    }
}

export const systemAlarmsService = new SystemAlarmsService();
