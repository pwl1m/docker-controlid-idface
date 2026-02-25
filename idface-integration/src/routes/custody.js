const express = require('express');
const router = express.Router();
const CustodyController = require('../controllers/custody.controller');

const controller = new CustodyController();

// Leitura da config atual (sem auth para facilitar testes)
router.get('/config', controller.getIdentificationConfig.bind(controller));

// Setup dos modos (com auth em produção)
router.post('/setup/simple', controller.setupSimpleCustody.bind(controller));
router.post('/setup/dual', controller.setupDualCustody.bind(controller));
router.post('/setup/reset', controller.resetToDefault.bind(controller));

// Teste/validação
router.post('/test', controller.testDualCustodyFlow.bind(controller));

module.exports = router;