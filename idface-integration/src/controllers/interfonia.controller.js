const idFaceService = require('../services/idface.service');

class InterfoniaController {
    async getConfig(req, res) {
        try {
            const data = await idFaceService.postFcgi('get_configuration.fcgi', {
                general: ['push_server'],
                pjsip: [
                    'enabled', 'server_ip', 'server_port', 'branch',
                    'login', 'password',
                    'auto_answer_enabled', 'auto_answer_delay',
                    'dialing_display_mode', 'auto_call_target',
                    'auto_call_button_enabled', 'rex_enabled',
                    'video_enabled', 'max_call_time',
                    'reg_status_query_period',
                    'custom_ringtone_enabled'
                ]
            });
            res.json(data.data);
        } catch (error) {
            res.status(500).json({ error: error.message });
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