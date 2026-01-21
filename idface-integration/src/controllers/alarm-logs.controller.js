const idFaceService = require('../services/idface.service');

class AlarmLogsController {
    async list(req, res) {
        try {
            const { limit, offset, from, to, user_id, event, cause } = req.query;
            const options = {};
            
            if (limit) options.limit = Number(limit);
            if (offset) options.offset = Number(offset);

            const where = [];
            if (user_id) where.push({ object: 'alarm_logs', field: 'user_id', value: Number(user_id) });
            if (event) where.push({ object: 'alarm_logs', field: 'event', value: Number(event) });
            if (cause) where.push({ object: 'alarm_logs', field: 'cause', value: Number(cause) });
            if (from) where.push({ object: 'alarm_logs', field: 'time', operator: '>=', value: Number(from) });
            if (to) where.push({ object: 'alarm_logs', field: 'time', operator: '<=', value: Number(to) });

            if (where.length) options.where = where;

            const result = await idFaceService.loadObjects('alarm_logs', options);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getById(req, res) {
        try {
            const id = Number(req.params.id);
            const result = await idFaceService.loadObjects('alarm_logs', {
                where: [{ object: 'alarm_logs', field: 'id', value: id }]
            });
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = AlarmLogsController;