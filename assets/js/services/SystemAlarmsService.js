import { BaseService } from './BaseService.js';
import { APP_CONFIG } from '../core/Config.js';

class SystemAlarmsService extends BaseService {
    constructor() {
        super('riu_system_alarms');
        this.initializeDefaults();
    }

    initializeDefaults() {
        const existing = this.getAll();
        if (!existing || existing.length === 0) {
            // Seed defaults from Config if storage is empty
            const defaults = APP_CONFIG.HOTEL.ALARMAS_SISTEMA.map((a, i) => ({
                id: `sys_default_${i}`,
                ...a,
                active: true
            }));
            this.saveAll(defaults);
        }
    }

    getAlarms() {
        return this.getAll() || [];
    }

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

    toggleActive(id) {
        const list = this.getAlarms();
        const item = list.find(a => a.id === id);
        if (item) {
            item.active = !item.active;
            this.saveAll(list);
        }
    }

    /**
     * Verifica si una alarma debe sonar en el momento dado.
     * Soporta:
     * - type: 'daily' (todos los días o filtros legacy)
     * - type: 'weekly' (dias especificos [0,1,2...])
     * - type: 'date' (una fecha especifica YYYY-MM-DD)
     */
    isTriggerDue(alarm, dateObj) {
        if (!alarm.active) return false;

        const currentHour = dateObj.getHours().toString().padStart(2, '0');
        const currentMinute = dateObj.getMinutes().toString().padStart(2, '0');
        const currentTime = `${currentHour}:${currentMinute}`;

        if (alarm.hora !== currentTime) return false;

        // Comprobar periodicity
        const weekDay = dateObj.getDay(); // 0-6
        const dateStr = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD

        if (alarm.type === 'date') {
            return alarm.date === dateStr;
        }

        if (alarm.type === 'weekly') {
            if (Array.isArray(alarm.days)) {
                return alarm.days.includes(weekDay);
            }
            return false;
        }

        // Default 'daily' or legacy
        if (alarm.dias === 'todos' || !alarm.dias) return true;
        if (alarm.dias === 'laborables') return (weekDay >= 1 && weekDay <= 5);
        if (alarm.dias === 'finde') return (weekDay === 0 || weekDay === 6);
        if (Array.isArray(alarm.dias)) return alarm.dias.includes(weekDay);

        return true;
    }
}

export const systemAlarmsService = new SystemAlarmsService();
