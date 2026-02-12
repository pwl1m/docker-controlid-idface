const express = require('express');
const router = express.Router();
const InterfoniaController = require('../controllers/interfonia.controller');

const controller = new InterfoniaController();

router.get('/config', controller.getConfig.bind(controller));
router.post('/config', controller.setConfig.bind(controller));
router.post('/audio', express.raw({ type: 'application/octet-stream', limit: '50mb' }), controller.setAudio.bind(controller));
router.post('/audio/get', controller.getAudio.bind(controller));
router.post('/audio/exists', controller.hasAudio.bind(controller));
router.post('/call', controller.makeCall.bind(controller));
router.post('/call/finalize', controller.finalizeCall.bind(controller));
router.post('/call/status', controller.getStatus.bind(controller));

module.exports = router;