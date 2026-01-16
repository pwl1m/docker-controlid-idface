const express = require('express');
const router = express.Router();
const DeviceController = require('../controllers/device.controller');

const deviceController = new DeviceController();

router.post('/login', deviceController.login.bind(deviceController));
router.post('/recognize', deviceController.recognize.bind(deviceController));
router.get('/device/info', deviceController.getInfo.bind(deviceController));
router.post('/device/configure-push', deviceController.configurePush.bind(deviceController));

module.exports = router;