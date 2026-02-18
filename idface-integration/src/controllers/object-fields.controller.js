const idFaceService = require('../services/idface.service');

class ObjectFieldsController {
    async add(req, res) {
        try {
            const data = await idFaceService.objectAddField(req.body);
            res.json(data);
        } catch (error) {
            res.status(error.status || 500).json({
                error: error.message,
                details: error.details || undefined
            });
        }
    }

    async remove(req, res) {
        try {
            const data = await idFaceService.objectRemoveField(req.body);
            res.json(data);
        } catch (error) {
            res.status(error.status || 500).json({
                error: error.message,
                details: error.details || undefined
            });
        }
    }
}

module.exports = ObjectFieldsController;