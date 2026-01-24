import { agendaService } from './AgendaService.js';
import { notasService } from './NotasService.js';
import { novedadesService } from './NovedadesService.js';
import { atencionesService } from './AtencionesService.js';
import { desayunoService } from './DesayunoService.js';
import { despertadorService } from './DespertadorService.js';
import { estanciaService } from './EstanciaService.js';
import { preciosService } from './PreciosService.js';
import { safeService } from './SafeService.js';
import { systemAlarmsService } from './SystemAlarmsService.js';
import { ayudaService } from './AyudaService.js';
import { riuService } from './RiuService.js';

class BackupService {
    constructor() {
        this.services = [
            { name: "Agenda", svc: agendaService },
            { name: "Notas", svc: notasService },
            { name: "Novedades", svc: novedadesService },
            { name: "Atenciones", svc: atencionesService },
            { name: "Desayunos", svc: desayunoService },
            { name: "Despertadores", svc: despertadorService },
            { name: "Estancias", svc: estanciaService },
            { name: "Precios", svc: preciosService },
            { name: "Safe", svc: safeService },
            { name: "Alarmas Sistema", svc: systemAlarmsService },
            { name: "Guías Ayuda", svc: ayudaService },
            { name: "RIU Class", svc: riuService }
        ];
    }

    async performFullBackup() {
        console.log("Starting Full Backup...");
        const results = { success: [], error: [] };

        for (const item of this.services) {
            try {
                // Force read from local storage to ensure we have latest in memory
                const data = item.svc.getAll();
                
                // Trigger save mechanism which pushes to SyncManager
                if (item.svc.saveAll) {
                    item.svc.saveAll(data);
                } else {
                    item.svc.save(data);
                }
                
                results.success.push(item.name);
            } catch (e) {
                console.error(`Backup failed for ${item.name}`, e);
                results.error.push(`${item.name}: ${e.message}`);
            }
            // Small delay to yield to UI
            await new Promise(r => setTimeout(r, 50));
        }

        return results;
    }
}

export const backupService = new BackupService();
