const idFaceService = require('../services/idface.service');

class AccessLogsController {
    async list(req, res) {
        try {
            const { 
                limit, 
                offset, 
                from,      // timestamp início
                to,        // timestamp fim
                user_id, 
                portal_id, 
                device_id,
                event,
                export: exportFormat 
            } = req.query;

            const options = {};
            if (limit) options.limit = Number(limit);
            if (offset) options.offset = Number(offset);

            const where = [];
            
            if (user_id) where.push({ object: 'access_logs', field: 'user_id', value: Number(user_id) });
            if (portal_id) where.push({ object: 'access_logs', field: 'portal_id', value: Number(portal_id) });
            if (device_id) where.push({ object: 'access_logs', field: 'device_id', value: Number(device_id) });
            if (event) where.push({ object: 'access_logs', field: 'event', value: Number(event) });
            
            // Filtros de tempo usando operadores
            if (from) {
                where.push({ object: 'access_logs', field: 'time', operator: '>=', value: Number(from) });
            }
            if (to) {
                where.push({ object: 'access_logs', field: 'time', operator: '<=', value: Number(to) });
            }

            if (where.length) options.where = where;

            const result = await idFaceService.loadObjects('access_logs', options);

            // Exportação CSV
            if (exportFormat === 'csv') {
                const logs = result.access_logs || [];
                const csv = this.toCSV(logs);
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', 'attachment; filename=access_logs.csv');
                return res.send(csv);
            }

            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getById(req, res) {
        try {
            const id = Number(req.params.id);
            const result = await idFaceService.loadObjects('access_logs', {
                where: [{ object: 'access_logs', field: 'id', value: id }]
            });
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    toCSV(logs) {
        if (!logs.length) return '';
        
        const headers = ['id', 'time', 'event', 'user_id', 'portal_id', 'device_id', 'card_value', 'qrcode_value', 'confidence', 'mask'];
        const rows = logs.map(log => 
            headers.map(h => {
                const val = log[h];
                if (val === null || val === undefined) return '';
                if (h === 'time') return new Date(val * 1000).toISOString();
                return String(val).replace(/,/g, ';');
            }).join(',')
        );
        
        return [headers.join(','), ...rows].join('\n');
    }
}

module.exports = AccessLogsController;