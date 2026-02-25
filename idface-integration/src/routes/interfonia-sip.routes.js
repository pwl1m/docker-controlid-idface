const express = require('express');
const router = express.Router();
const idFaceService = require('../services/idface.service');
const logger = require('../utils/logger');

/**
 * GET /api/interfonia-sip/config
 * Obtém configuração atual do SIP
 */
router.get('/config', async (req, res) => {
    try {
        const config = await idFaceService.getInterfoniaSipConfig();
        res.json(config);
    } catch (error) {
        logger.error('[SIP] Erro ao obter config:', error.message);
        res.status(error.status || 500).json({ error: error.message });
    }
});

/**
 * POST /api/interfonia-sip/config
 * Configura o módulo SIP/Interfonia
 * 
 * ⚠️ IMPORTANTE: O parâmetro 'dialing_display_mode' é OBRIGATÓRIO!
 * Sem ele, o device pode crashar.
 */
router.post('/config', async (req, res) => {
    try {
        const { pjsip } = req.body;
        
        if (!pjsip) {
            return res.status(400).json({ error: 'Campo pjsip é obrigatório' });
        }
        
        // Garantir que dialing_display_mode está presente (CRÍTICO)
        const safeConfig = {
            dialing_display_mode: '0',
            ...pjsip
        };
        
        const result = await idFaceService.postFcgi('set_configuration.fcgi', { pjsip: safeConfig });
        res.json({ success: true, data: result.data });
    } catch (error) {
        logger.error('[SIP] Erro ao configurar:', error.message);
        res.status(error.status || 500).json({ error: error.message });
    }
});

/**
 * GET /api/interfonia-sip/status
 * Obtém status do registro SIP
 */
router.get('/status', async (req, res) => {
    try {
        const result = await idFaceService.postFcgi('get_sip_status.fcgi', {});
        res.json(result.data);
    } catch (error) {
        logger.error('[SIP] Erro ao obter status:', error.message);
        res.status(error.status || 500).json({ error: error.message });
    }
});

/**
 * POST /api/interfonia-sip/call/status
 * Obtém status do registro SIP (compatibilidade)
 */
router.post('/call/status', async (req, res) => {
    try {
        const result = await idFaceService.postFcgi('get_sip_status.fcgi', {});
        res.json(result.data);
    } catch (error) {
        logger.error('[SIP] Erro ao obter status:', error.message);
        res.status(error.status || 500).json({ error: error.message });
    }
});

/**
 * GET /api/interfonia-sip/call/status
 * Obtém status do registro SIP (GET - compatibilidade)
 */
router.get('/call/status', async (req, res) => {
    try {
        const result = await idFaceService.postFcgi('get_sip_status.fcgi', {});
        res.json(result.data);
    } catch (error) {
        logger.error('[SIP] Erro ao obter status:', error.message);
        res.status(error.status || 500).json({ error: error.message });
    }
});

/**
 * POST /api/interfonia-sip/call
 * Inicia uma chamada SIP
 */
router.post('/call', async (req, res) => {
    try {
        const { target } = req.body;
        
        if (!target) {
            return res.status(400).json({ error: 'Campo target é obrigatório' });
        }
        
        logger.info(`[SIP] Iniciando chamada para: ${target}`);
        const result = await idFaceService.postFcgi('make_sip_call.fcgi', { target });
        res.json({ success: true, data: result.data });
    } catch (error) {
        logger.error('[SIP] Erro ao fazer chamada:', error.message);
        res.status(error.status || 500).json({ error: error.message });
    }
});

/**
 * POST /api/interfonia-sip/call/end
 * Finaliza a chamada SIP atual
 */
router.post('/call/end', async (req, res) => {
    try {
        logger.info('[SIP] Finalizando chamada');
        const result = await idFaceService.postFcgi('finalize_sip_call.fcgi', {});
        res.json({ success: true, data: result.data });
    } catch (error) {
        logger.error('[SIP] Erro ao finalizar chamada:', error.message);
        res.status(error.status || 500).json({ error: error.message });
    }
});

module.exports = router;