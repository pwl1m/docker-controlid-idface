const idFaceService = require('../services/idface.service');

class SecBoxsController {
    async getConfig(req, res) {
        try {
            const result = await idFaceService.loadObjects('sec_boxs', {});
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async updateConfig(req, res) {
        try {
            const id = 65793; // ID fixo da SecBox conforme documentação
            const values = req.body;
            const result = await idFaceService.modifyObjects('sec_boxs', id, values);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Acionamento remoto (liberar porta)
    async action(req, res) {
        try {
            const { action } = req.body; // 'open', 'close', etc.
            
            // Usa o endpoint remote_open.fcgi ou set_door_state conforme a ação
            const result = await idFaceService.remoteAction(action);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = SecBoxsController;