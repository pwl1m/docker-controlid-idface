const idFaceService = require('../services/idface.service');
const logger = require('../utils/logger');

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

    // ═══════════════════════════════════════════════════════════════════
    // CONFIGURAÇÕES DO DEVICE (general_cfg)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * GET /api/device/config
     * Retorna as configurações atuais do dispositivo
     * Firmware 6.23+: precisa especificar os campos desejados
     */
    async getConfig(req, res) {
        try {
            // Campos mais comuns para configuração
            const fieldsToGet = [
                'beep_enabled',
                'voice_enabled',
                'relay1_timeout',
                'relay2_timeout',
                'identification_timeout',
                'anti_passback',
                'door_sensor_mode',
                'face_match_threshold',
                'max_templates'
            ];

            const result = await idFaceService.postFcgi('get_configuration.fcgi', {
                general: fieldsToGet
            });
            
            const config = result.general || result.data || result;

            res.json({
                success: true,
                config: config,
                fields_requested: fieldsToGet,
                note: 'Firmware 6.23+ requer campos específicos'
            });
        } catch (error) {
            logger.error('[DEVICE] getConfig error:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * PUT /api/device/config
     * Atualiza configurações do dispositivo
     */
    async setConfig(req, res) {
        try {
            const updates = req.body;

            if (!updates || Object.keys(updates).length === 0) {
                return res.status(400).json({ error: 'Nenhuma configuração fornecida' });
            }

            await idFaceService.postFcgi('set_configuration.fcgi', {
                general: updates
            });

            res.json({
                success: true,
                message: 'Configurações atualizadas',
                applied: updates
            });
        } catch (error) {
            logger.error('[DEVICE] setConfig error:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * GET /api/device/config/identification-timeout
     */
    async getIdentificationTimeout(req, res) {
        try {
            const result = await idFaceService.postFcgi('get_configuration.fcgi', {
                general: ['identification_timeout']
            });
            
            const timeout = result.general?.identification_timeout || 
                           result.identification_timeout ||
                           '30';

            res.json({
                success: true,
                identification_timeout: parseInt(timeout),
                unit: 'seconds',
                note: 'Tempo máximo para dispositivo aguardar identificação'
            });
        } catch (error) {
            logger.error('[DEVICE] getIdentificationTimeout error:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * PUT /api/device/config/identification-timeout
     */
    async setIdentificationTimeout(req, res) {
        try {
            const { timeout } = req.body;

            if (timeout === undefined) {
                return res.status(400).json({ error: 'timeout é obrigatório' });
            }

            const timeoutInt = parseInt(timeout);
            if (isNaN(timeoutInt) || timeoutInt < 5 || timeoutInt > 120) {
                return res.status(400).json({ 
                    error: 'timeout deve ser entre 5 e 120 segundos' 
                });
            }

            await idFaceService.postFcgi('set_configuration.fcgi', {
                general: {
                    identification_timeout: String(timeoutInt)
                }
            });

            res.json({
                success: true,
                identification_timeout: timeoutInt,
                message: `Timeout alterado para ${timeoutInt} segundos`
            });
        } catch (error) {
            logger.error('[DEVICE] setIdentificationTimeout error:', error.message);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = DeviceController;