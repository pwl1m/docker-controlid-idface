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
     * Obtém configurações gerais do device
     */
    async getConfig(req, res) {
        try {
            // Campos comuns do general_cfg
            const fields = [
                'identification_mode',
                'multi_factor_authentication', 
                'identification_timeout',
                'beep',
                'voice',
                'relay_time',
                'door_sensor_mode',
                'anti_passback'
            ];

            const result = await this.idFaceService.postFcgi('get_configuration.fcgi', {
                general: fields
            });

            res.json({
                success: true,
                config: result.general || result,
                fields_available: fields
            });

        } catch (error) {
            logger.error('[DEVICE] Erro ao obter config:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * PUT /api/device/config
     * Atualiza configurações gerais do device
     * Body: { identification_timeout: 30, beep: 1, voice: 1, ... }
     */
    async setConfig(req, res) {
        try {
            const config = req.body;

            if (!config || Object.keys(config).length === 0) {
                return res.status(400).json({ 
                    error: 'Body vazio',
                    example: { identification_timeout: '30', beep: '1' }
                });
            }

            // Converter todos os valores para string (requisito do ControlID)
            const stringConfig = {};
            for (const [key, value] of Object.entries(config)) {
                stringConfig[key] = String(value);
            }

            logger.info(`[DEVICE] Atualizando config: ${JSON.stringify(stringConfig)}`);

            const result = await this.idFaceService.postFcgi('set_configuration.fcgi', {
                general: stringConfig
            });

            res.json({
                success: true,
                updated: stringConfig,
                result: result
            });

        } catch (error) {
            logger.error('[DEVICE] Erro ao atualizar config:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * GET /api/device/config/identification-timeout
     * Obtém o timeout de identificação atual
     */
    async getIdentificationTimeout(req, res) {
        try {
            const result = await this.idFaceService.postFcgi('get_configuration.fcgi', {
                general: ['identification_timeout']
            });

            const timeout = result.general?.identification_timeout || '30';

            res.json({
                success: true,
                identification_timeout: Number(timeout),
                unit: 'seconds',
                note: 'Tempo máximo para dispositivo aguardar identificação'
            });

        } catch (error) {
            logger.error('[DEVICE] Erro ao obter timeout:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * PUT /api/device/config/identification-timeout
     * Atualiza o timeout de identificação
     * Body: { timeout: 30 } (em segundos, 5-120)
     */
    async setIdentificationTimeout(req, res) {
        try {
            const { timeout } = req.body;

            if (timeout === undefined || timeout === null) {
                return res.status(400).json({ 
                    error: 'timeout é obrigatório',
                    example: { timeout: 30 }
                });
            }

            const value = Number(timeout);
            if (value < 5 || value > 120) {
                return res.status(400).json({ 
                    error: 'timeout deve ser entre 5 e 120 segundos'
                });
            }

            logger.info(`[DEVICE] Atualizando identification_timeout para ${value}s`);

            const result = await this.idFaceService.postFcgi('set_configuration.fcgi', {
                general: {
                    identification_timeout: String(value)
                }
            });

            res.json({
                success: true,
                identification_timeout: value,
                unit: 'seconds',
                result
            });

        } catch (error) {
            logger.error('[DEVICE] Erro ao atualizar timeout:', error.message);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = DeviceController;