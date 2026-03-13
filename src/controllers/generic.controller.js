const idFaceService = require('../services/idface.service');

class GenericController {
    constructor(objectType) {
        this.objectType = objectType;
    }

    async list(req, res) {
        try {
            const { limit, offset, ...filters } = req.query;
            const options = {};
            
            if (limit) options.limit = Number(limit);
            if (offset) options.offset = Number(offset);

            const where = [];
            for (const [key, value] of Object.entries(filters)) {
                where.push({ object: this.objectType, field: key, value });
            }
            if (where.length) options.where = where;

            const result = await idFaceService.loadObjects(this.objectType, options);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getById(req, res) {
        try {
            const id = Number(req.params.id);
            const result = await idFaceService.loadObjects(this.objectType, {
                where: [{ object: this.objectType, field: 'id', value: id }]
            });
            const items = result[this.objectType] || [];
            if (!items.length) {
                return res.status(404).json({ error: 'Not found' });
            }
            res.json(items[0]);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async create(req, res) {
        try {
            // Aceita tanto { values: [...] } quanto array direto ou objeto único
            let values = req.body.values || req.body;
            if (!Array.isArray(values)) {
                values = [values];
            }
            
            const result = await idFaceService.createObjects(this.objectType, values);
            res.status(201).json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async update(req, res) {
        try {
            const id = Number(req.params.id);
            // Remove 'values' wrapper se existir
            const values = req.body.values ? req.body.values[0] : req.body;
            
            const result = await idFaceService.modifyObjects(this.objectType, id, values);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async delete(req, res) {
        try {
            const id = Number(req.params.id);
            const result = await idFaceService.destroyObjects(this.objectType, id);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = GenericController;