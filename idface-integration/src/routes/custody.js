const express = require('express');
const router = express.Router();
const CustodyController = require('../controllers/custody.controller');
const requireAuth = require('../middlewares/auth');

const controller = new CustodyController();

// Leitura da config atual
router.get('/config', controller.getIdentificationConfig.bind(controller));

// Setup dos modos
router.post('/setup/simple', requireAuth, controller.setupSimpleCustody.bind(controller));
router.post('/setup/dual', requireAuth, controller.setupDualCustody.bind(controller));
router.post('/setup/reset', requireAuth, controller.resetToDefault.bind(controller));

// Teste/validação do fluxo
router.post('/test', requireAuth, controller.testDualCustodyFlow.bind(controller));

module.exports = router;