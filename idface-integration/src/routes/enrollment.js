const express = require('express');
const router = express.Router();
const EnrollmentController = require('../controllers/enrollment.controller');

const controller = new EnrollmentController();

// ═══════════════════════════════════════════════════════════════════
// ROTAS PARA INICIAR ENROLLMENT (Backend → Device)
// ═══════════════════════════════════════════════════════════════════

// Iniciar cadastro remoto (face, card, biometry, pin, password)
router.post('/remote', controller.startRemoteEnroll.bind(controller));

// Cancelar cadastro em andamento
router.post('/cancel', controller.cancelRemoteEnroll.bind(controller));

// ═══════════════════════════════════════════════════════════════════
// CALLBACKS DO DEVICE (Device → Backend) - Modo Assíncrono
// ═══════════════════════════════════════════════════════════════════

// Callback de face cadastrada
router.post('/callback/face', controller.onFaceCreated.bind(controller));

// Callback de cartão cadastrado
router.post('/callback/card', controller.onCardCreated.bind(controller));

// Callback de digital cadastrada
router.post('/callback/fingerprint', controller.onFingerprintCreated.bind(controller));

// Callback de PIN cadastrado
router.post('/callback/pin', controller.onPinCreated.bind(controller));

// Callback de senha cadastrada
router.post('/callback/password', controller.onPasswordCreated.bind(controller));

module.exports = router;