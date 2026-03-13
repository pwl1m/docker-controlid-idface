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
// UPLOAD DE FOTO FACIAL (via arquivo/base64)
// ═══════════════════════════════════════════════════════════════════

// Listar usuários com foto cadastrada
router.get('/face/list', controller.listUsersWithFace.bind(controller));

// Upload de foto via base64
// Body: { user_id, image_base64, match: true }
router.post('/face/upload', controller.uploadFaceBase64.bind(controller));

// Upload de múltiplas fotos via base64
// Body: { match: true, user_images: [{ user_id, image_base64 }] }
router.post('/face/upload-multiple', controller.uploadFaceMultiple.bind(controller));

// Upload de foto via binary (application/octet-stream)
// Query: ?user_id=10&match=1
// Body: raw image bytes
router.post('/face/upload-binary', 
    express.raw({ type: 'application/octet-stream', limit: '10mb' }),
    controller.uploadFaceBinary.bind(controller)
);

// Testar se uma imagem é válida para reconhecimento facial
router.post('/face/test', controller.testFaceImage.bind(controller));

// Obter foto facial de um usuário
router.get('/face/:user_id', controller.getFaceImage.bind(controller));

// Remover foto facial de um usuário
router.delete('/face/:user_id', controller.deleteFaceImage.bind(controller));

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