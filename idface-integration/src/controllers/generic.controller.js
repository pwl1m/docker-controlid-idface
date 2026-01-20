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
                if (!['limit', 'offset', 'export'].includes(key)) {
                    where.push({ object: this.objectType, field: key, value });
                }
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
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async create(req, res) {
        try {
            const values = req.body;
            const result = await idFaceService.createObjects(this.objectType, values);
            res.status(201).json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async update(req, res) {
        try {
            const id = Number(req.params.id);
            const values = req.body;
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