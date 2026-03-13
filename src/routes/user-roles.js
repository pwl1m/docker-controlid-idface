const express = require('express');
const router = express.Router();
const GenericController = require('../controllers/generic.controller');
const requireAuth = require('../middlewares/auth');

const controller = new GenericController('user_roles');

router.get('/', controller.list.bind(controller));
router.get('/:id', controller.getById.bind(controller));
router.post('/', requireAuth, controller.create.bind(controller));
router.patch('/:id', requireAuth, controller.update.bind(controller));
router.delete('/:id', requireAuth, controller.delete.bind(controller));

module.exports = router;