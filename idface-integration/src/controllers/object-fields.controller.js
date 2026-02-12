const idFaceService = require('../services/idface.service');

class ObjectFieldsController {
    async add(req, res) {
        try {
            const data = await idFaceService.objectAddField(req.body);
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async remove(req, res) {
        try {
            const data = await idFaceService.objectRemoveFields(req.body);
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = ObjectFieldsController;