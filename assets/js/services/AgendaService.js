import { BaseService } from './BaseService.js';

class AgendaService extends BaseService {
    constructor() {
        super('riu_agenda_contactos', []);
    }

    // Here we can add domain-specific methods if needed,
    // e.g., searchByName(query), but currently the UI handles filtering.
}

export const agendaService = new AgendaService();
