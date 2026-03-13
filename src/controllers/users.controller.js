const idFaceService = require('../services/idface.service');

class UsersController {
    async list(req, res) {
        try {
            const { limit, page, name, registration, user_type_id } = req.query;
            const options = {};
            if (limit) options.limit = Number(limit);

            const where = [];
            if (name) where.push({ object: 'users', field: 'name', value: name });
            if (registration) where.push({ object: 'users', field: 'registration', value: registration });
            if (user_type_id) where.push({ object: 'users', field: 'user_type_id', value: Number(user_type_id) });
            if (where.length) options.where = where;

            const result = await idFaceService.loadObjects('users', options);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getById(req, res) {
        try {
            const id = req.params.id;
            const result = await idFaceService.getUserById(Number(id));
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async create(req, res) {
        try {
            const user = req.body;
            if (!user.name) return res.status(400).json({ error: 'name is required' });

            // If client provides an `id` we'll forward it; otherwise let device assign if supported
            const result = await idFaceService.createObjects('users', user);
            res.status(201).json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async update(req, res) {
        try {
            const id = Number(req.params.id);
            const values = req.body;
            const result = await idFaceService.updateUser(id, values);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async delete(req, res) {
        try {
            const id = Number(req.params.id);
            const result = await idFaceService.deleteUser(id);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = UsersController;
