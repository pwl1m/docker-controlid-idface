const express = require('express');
const router = express.Router();
const InterfoniaController = require('../controllers/interfonia.controller');

const controller = new InterfoniaController();

// ═══════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ═══════════════════════════════════════════════════════════════════

// GET /api/interfonia-sip/config - Obtém configuração SIP
router.get('/config', (req, res) => controller.getConfig(req, res));

// POST /api/interfonia-sip/config - Configura SIP
router.post('/config', (req, res) => controller.setConfig(req, res));

// ═══════════════════════════════════════════════════════════════════
// STATUS
// ═══════════════════════════════════════════════════════════════════

// GET /api/interfonia-sip/status - Status do registro SIP
router.get('/status', (req, res) => controller.getStatus(req, res));

// GET /api/interfonia-sip/call/status - Alias para status
router.get('/call/status', (req, res) => controller.getStatus(req, res));

// POST /api/interfonia-sip/call/status - Alias para status (compatibilidade)
router.post('/call/status', (req, res) => controller.getStatus(req, res));

// ═══════════════════════════════════════════════════════════════════
// CHAMADAS
// ═══════════════════════════════════════════════════════════════════

// POST /api/interfonia-sip/call - Iniciar chamada
router.post('/call', (req, res) => controller.makeCall(req, res));

// POST /api/interfonia-sip/call/end - Finalizar chamada
router.post('/call/end', (req, res) => controller.endCall(req, res));

// ═══════════════════════════════════════════════════════════════════
// ÁUDIO PERSONALIZADO
// ═══════════════════════════════════════════════════════════════════

// GET /api/interfonia-sip/audio - Download do áudio
router.get('/audio', (req, res) => controller.getAudio(req, res));

// POST /api/interfonia-sip/audio - Upload de áudio
router.post('/audio', (req, res) => controller.setAudio(req, res));

// GET /api/interfonia-sip/audio/exists - Verifica se existe áudio
router.get('/audio/exists', (req, res) => controller.hasAudio(req, res));

// ═══════════════════════════════════════════════════════════════════
// CONFIGURAÇÕES ESPECÍFICAS
// ═══════════════════════════════════════════════════════════════════

// POST /api/interfonia-sip/door/open - Configurar liberação via interfonia
router.post('/door/open', (req, res) => controller.configureDoorRelease(req, res));

// POST /api/interfonia-sip/auto-call - Configurar discagem automática
router.post('/auto-call', (req, res) => controller.configureAutoCall(req, res));

// POST /api/interfonia-sip/volumes - Configurar volumes
router.post('/volumes', (req, res) => controller.setVolumes(req, res));

// POST /api/interfonia-sip/auto-answer - Configurar auto-atendimento
router.post('/auto-answer', (req, res) => controller.configureAutoAnswer(req, res));

// POST /api/interfonia-sip/video - Habilitar/desabilitar vídeo
router.post('/video', (req, res) => controller.configureVideo(req, res));

// POST /api/interfonia-sip/facial-id - ID facial durante chamada
router.post('/facial-id', (req, res) => controller.configureFacialIdDuringCall(req, res));

module.exports = router;