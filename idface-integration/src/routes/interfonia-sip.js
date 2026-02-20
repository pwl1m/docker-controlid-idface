const express = require('express');
const router = express.Router();
const InterfoniaController = require('../controllers/interfonia.controller');

const controller = new InterfoniaController();

router.get('/config', controller.getConfig.bind(controller));
router.post('/config', controller.setConfig.bind(controller));
router.post('/audio', controller.setAudio.bind(controller));
router.post('/audio/get', controller.getAudio.bind(controller));
router.post('/audio/exists', controller.hasAudio.bind(controller));
router.post('/call', controller.makeCall.bind(controller));
router.post('/call/finalize', controller.finalizeCall.bind(controller));

// Status SIP - aceita GET e POST
router.get('/call/status', controller.getStatus.bind(controller));
router.post('/call/status', controller.getStatus.bind(controller));
router.get('/status', controller.getStatus.bind(controller));  // Alias mais curto

module.exports = router;