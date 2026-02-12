const express = require('express');
const router = express.Router();
const RegistroController = require('../controllers/registro.controller');
const requireAuth = require('../middlewares/auth');

const controller = new RegistroController();

router.post('/remote-enroll', requireAuth, controller.remoteEnroll.bind(controller));
router.post('/remote-enroll/cancel', requireAuth, controller.cancel.bind(controller));
router.post('/enroller-state', requireAuth, controller.state.bind(controller));

module.exports = router;