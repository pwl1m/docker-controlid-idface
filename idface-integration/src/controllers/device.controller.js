const idFaceService = require('../services/idface.service');

class DeviceController {
    constructor() {
        this.idFaceService = idFaceService;
    }

    async login(req, res) {
        try {
            const { username, password } = req.body;
            const result = await this.idFaceService.authenticate();
            res.status(200).json(result);
        } catch (error) {
            res.status(500).json({ message: 'Login failed', error: error.message });
        }
    }

    async recognize(req, res) {
        try {
            const { image } = req.body;
            // TODO: Implementar reconhecimento
            res.status(200).json({ message: 'Not implemented yet' });
        } catch (error) {
            res.status(500).json({ message: 'Recognition failed', error: error.message });
        }
    }

    async getInfo(req, res) {
        try {
            const info = await this.idFaceService.getDeviceInfo();
            res.json(info);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async configurePush(req, res) {
        try {
            const { serverIp, serverPort = 3001, path = '' } = req.body;
            const result = await this.idFaceService.configureMonitor(serverIp, serverPort, path);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = DeviceController;