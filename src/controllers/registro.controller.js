const idFaceService = require('../services/idface.service');

class RegistroController {
    async remoteEnroll(req, res) {
        try {
            const payload = req.body || {};
            const data = await idFaceService.postFcgi('remote_enroll.fcgi', payload);
            res.json(data.data || data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async cancel(req, res) {
        try {
            const data = await idFaceService.postFcgi('cancel_remote_enroll.fcgi', {});
            res.json(data.data || data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async state(req, res) {
        try {
            const data = await idFaceService.postFcgi('enroller_state.fcgi', {});
            res.json(data.data || data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = RegistroController;