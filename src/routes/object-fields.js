const express = require('express');
const router = express.Router();
const ObjectFieldsController = require('../controllers/object-fields.controller');
const requireAuth = require('../middlewares/auth');

const controller = new ObjectFieldsController();

router.post('/add', requireAuth, controller.add.bind(controller));
router.post('/remove', requireAuth, controller.remove.bind(controller));

module.exports = router;