const express = require('express');
const router = express.Router();
const DeviceTestsController = require('../controllers/device-tests.controller');

const controller = new DeviceTestsController();

router.post('/users/create', controller.createUsers.bind(controller));
router.post('/users/load', controller.loadUsers.bind(controller));
router.post('/users/delete', controller.deleteUsers.bind(controller));
router.post('/users/modify', controller.modifyUsers.bind(controller));
router.post('/users/no-photo', controller.usersNoPhoto.bind(controller));
router.post('/users/with-photo', controller.usersWithPhoto.bind(controller));

router.post('/users/hash-password', controller.hashPassword.bind(controller));
router.post('/users/add-field', controller.addField.bind(controller));
router.post('/users/remove-fields', controller.removeFields.bind(controller));

router.post(
    '/users/:id/image',
    express.raw({ type: 'application/octet-stream', limit: '20mb' }),
    controller.setUserImage.bind(controller)
);
router.get('/users/:id/image', controller.getUserImage.bind(controller));

router.post('/face/user-get-image', controller.userGetImage.bind(controller));
router.get('/face/user-list-images', controller.userListImages.bind(controller));
router.post('/face/user-get-image-list', controller.userGetImageList.bind(controller));

router.post(
    '/face/user-set-image',
    express.raw({ type: 'application/octet-stream', limit: '20mb' }),
    controller.userSetImage.bind(controller)
);

router.post(
    '/face/user-test-image',
    express.raw({ type: 'application/octet-stream', limit: '20mb' }),
    controller.userTestImage.bind(controller)
);

router.post('/face/user-set-image-list', controller.userSetImageList.bind(controller));
router.post('/face/user-destroy-image', controller.userDestroyImage.bind(controller));
router.post('/face/save-screenshot', controller.saveScreenshot.bind(controller));

router.post('/face/config-limit-display', controller.limitToDisplayRegion.bind(controller));
router.post('/face/config-led-brightness', controller.setLedBrightness.bind(controller));
router.post('/face/config-min-distance', controller.setMinDetectDistance.bind(controller));

module.exports = router;