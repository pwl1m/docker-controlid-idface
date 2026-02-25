const idFaceService = require('../services/idface.service');

class InterfoniaController {
    handleError(res, error) {
        return res.status(error.status || 500).json({
            error: error.message,
            details: error.details || undefined
        });
    }

    async getConfig(req, res) {
        try {
            const data = await idFaceService.getInterfoniaSipConfig();
            res.json(data);
        } catch (error) {
            return this.handleError(res, error);
        }
    }

    async setConfig(req, res) {
        try {
            if (!req.body?.pjsip) {
                return res.status(400).json({ error: 'pjsip object is required' });
            }
            const data = await idFaceService.postFcgi('set_configuration.fcgi', req.body);
            res.json(data.data);
        } catch (error) {
            return this.handleError(res, error);
        }
    }

    async setAudio(req, res) {
        try {
            const data = await idFaceService.postFcgi('set_pjsip_audio_message.fcgi?current=1&total=1', req.body, {
                headers: { 'Content-Type': 'application/octet-stream' }
            });
            res.json(data.data);
        } catch (error) {
            return this.handleError(res, error);
        }
    }

    async getAudio(req, res) {
        try {
            const data = await idFaceService.postFcgi('get_pjsip_audio_message.fcgi', {});
            res.json(data.data);
        } catch (error) {
            return this.handleError(res, error);
        }
    }

    async hasAudio(req, res) {
        try {
            const data = await idFaceService.postFcgi('has_pjsip_audio_message.fcgi', {});
            res.json(data.data);
        } catch (error) {
            return this.handleError(res, error);
        }
    }

    async makeCall(req, res) {
        try {
            const { target } = req.body || {};
            if (!target) return res.status(400).json({ error: 'target is required' });
            const data = await idFaceService.postFcgi('make_sip_call.fcgi', { target: String(target) });
            res.json(data.data);
        } catch (error) {
            return this.handleError(res, error);
        }
    }

    async finalizeCall(req, res) {
        try {
            const data = await idFaceService.postFcgi('finalize_sip_call.fcgi', {});
            res.json(data.data);
        } catch (error) {
            return this.handleError(res, error);
        }
    }

    async getStatus(req, res) {
        try {
            const data = await idFaceService.postFcgi('get_sip_status.fcgi', {});
            res.json(data.data);
        } catch (error) {
            return this.handleError(res, error);
        }
    }
}

module.exports = InterfoniaController;