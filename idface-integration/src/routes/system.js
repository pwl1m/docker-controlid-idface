const express = require('express');
const router = express.Router();
const idFaceService = require('../services/idface.service');
const requireAuth = require('../middlewares/auth');
const logger = require('../utils/logger');

// ============ Informações do Sistema ============

// GET /api/system/info — Informações completas do dispositivo (system_information.fcgi)
router.get('/info', async (req, res) => {
    try {
        const data = await idFaceService.getSystemInformation();
        res.json(data);
    } catch (error) {
        logger.error('GET /system/info error:', error.message);
        res.status(error.status || 500).json({ error: error.message });
    }
});

// GET /api/system/session — Status da sessão atual
router.get('/session', async (req, res) => {
    try {
        const valid = await idFaceService.isSessionValid();
        res.json({
            session: idFaceService.session ? '***' + idFaceService.session.slice(-6) : null,
            valid
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ Hora / Tempo ============

// POST /api/system/sync-time — Sincronizar hora do device com o servidor
// Body (opcional): { "datetime": "2026-02-19T10:30:00Z" }
// Se não enviar body, usa a hora atual do servidor
router.post('/sync-time', requireAuth, async (req, res) => {
    try {
        const datetime = req.body?.datetime ? new Date(req.body.datetime) : new Date();
        const data = await idFaceService.setSystemTime(datetime);
        res.json({
            success: true,
            synced_to: datetime.toISOString(),
            response: data
        });
    } catch (error) {
        logger.error('POST /system/sync-time error:', error.message);
        res.status(error.status || 500).json({ error: error.message });
    }
});

// ============ Controle do Device ============

// POST /api/system/reboot — Reiniciar dispositivo
router.post('/reboot', requireAuth, async (req, res) => {
    try {
        const data = await idFaceService.reboot();
        res.json({ success: true, message: 'Device rebooting...', response: data });
    } catch (error) {
        logger.error('POST /system/reboot error:', error.message);
        res.status(error.status || 500).json({ error: error.message });
    }
});

// POST /api/system/message — Enviar mensagem para a tela do device (message_to_screen.fcgi)
// Body: { "message": "Texto...", "timeout": 5000 }
router.post('/message', requireAuth, async (req, res) => {
    try {
        const { message, timeout } = req.body;
        if (!message) return res.status(400).json({ error: 'message is required' });
        const data = await idFaceService.messageToScreen(message, timeout || 5000);
        res.json({ success: true, response: data });
    } catch (error) {
        logger.error('POST /system/message error:', error.message);
        res.status(error.status || 500).json({ error: error.message });
    }
});

// ============ Backup / Restore ============

// POST /api/system/backup — Backup completo dos objects do device (backup_objects.fcgi)
router.post('/backup', requireAuth, async (req, res) => {
    try {
        const data = await idFaceService.backupObjects();
        const filename = `backup-idface-${Date.now()}.bin`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.send(Buffer.from(data));
    } catch (error) {
        logger.error('POST /system/backup error:', error.message);
        res.status(error.status || 500).json({ error: error.message });
    }
});

// POST /api/system/restore — Restaurar backup (restore_objects.fcgi)
router.post('/restore', requireAuth, async (req, res) => {
    try {
        const data = await idFaceService.restoreObjects(req.body);
        res.json({ success: true, response: data });
    } catch (error) {
        logger.error('POST /system/restore error:', error.message);
        res.status(error.status || 500).json({ error: error.message });
    }
});

// ============ Configuração Genérica ============

// GET /api/system/config/:module?fields=field1,field2 — Buscar configuração de um módulo
// Exemplo: GET /api/system/config/general?fields=identification_mode,multi_factor_authentication
router.get('/config/:module', async (req, res) => {
    try {
        const { module } = req.params;
        const fields = req.query.fields ? req.query.fields.split(',') : [];

        if (fields.length === 0) {
            return res.status(400).json({ error: 'Query param "fields" is required (comma-separated)' });
        }

        const payload = {};
        payload[module] = fields;
        const data = await idFaceService.getConfiguration(payload);
        res.json(data);
    } catch (error) {
        logger.error(`GET /system/config/${req.params.module} error:`, error.message);
        res.status(error.status || 500).json({ error: error.message });
    }
});

// POST /api/system/config — Definir configuração (set_configuration.fcgi)
// Body: { "module": { "field": "value" } }
router.post('/config', requireAuth, async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ error: 'Body with configuration payload is required' });
        }
        const data = await idFaceService.setConfiguration(req.body);
        res.json({ success: true, response: data });
    } catch (error) {
        logger.error('POST /system/config error:', error.message);
        res.status(error.status || 500).json({ error: error.message });
    }
});

// ============ Exportação / Auditoria ============

// POST /api/system/export-afd — Exportar relatório AFD (export_afd.fcgi)
router.post('/export-afd', requireAuth, async (req, res) => {
    try {
        const data = await idFaceService.exportAfd(req.body || {});
        res.setHeader('Content-Type', 'text/plain');
        res.send(data);
    } catch (error) {
        logger.error('POST /system/export-afd error:', error.message);
        res.status(error.status || 500).json({ error: error.message });
    }
});

// POST /api/system/audit-logs — Exportar logs de auditoria (export_audit_logs.fcgi)
router.post('/audit-logs', requireAuth, async (req, res) => {
    try {
        const data = await idFaceService.exportAuditLogs(req.body || {});
        res.setHeader('Content-Type', 'text/plain');
        res.send(data);
    } catch (error) {
        logger.error('POST /system/audit-logs error:', error.message);
        res.status(error.status || 500).json({ error: error.message });
    }
});

// ============ Hash de Senha ============

// POST /api/system/hash-password — Gerar hash de senha (user_hash_password.fcgi)
// Body: { "password": "minhasenha" }
router.post('/hash-password', requireAuth, async (req, res) => {
    try {
        const { password } = req.body;
        if (!password) return res.status(400).json({ error: 'password is required' });
        const data = await idFaceService.userHashPassword(password);
        res.json(data);
    } catch (error) {
        logger.error('POST /system/hash-password error:', error.message);
        res.status(error.status || 500).json({ error: error.message });
    }
});

module.exports = router;
