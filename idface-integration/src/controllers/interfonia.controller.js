const idFaceService = require('../services/idface.service');

class InterfoniaController {
    async setConfig(req, res) {
        try {
            if (!req.body?.pjsip) {
                return res.status(400).json({ error: 'pjsip object is required' });
            }
            const data = await idFaceService.postFcgi('set_configuration.fcgi', req.body);
            res.json(data.data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async setAudio(req, res) {
        try {
            const data = await idFaceService.postFcgi('set_pjsip_audio_message.fcgi?current=1&total=1', req.body, {
                headers: { 'Content-Type': 'application/octet-stream' }
            });
            res.json(data.data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getAudio(req, res) {
        try {
            const data = await idFaceService.postFcgi('get_pjsip_audio_message.fcgi', {});
            res.json(data.data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async hasAudio(req, res) {
        try {
            const data = await idFaceService.postFcgi('has_audio_access_messages.fcgi', {});
            res.json(data.data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async makeCall(req, res) {
        try {
            const { target } = req.body || {};
            if (!target) return res.status(400).json({ error: 'target is required' });
            const data = await idFaceService.postFcgi('make_sip_call.fcgi', { target: String(target) });
            res.json(data.data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async finalizeCall(req, res) {
        try {
            const data = await idFaceService.postFcgi('finalize_sip_call.fcgi', {});
            res.json(data.data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getStatus(req, res) {
        try {
            const data = await idFaceService.postFcgi('get_sip_status.fcgi', {});
            res.json(data.data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = InterfoniaController;