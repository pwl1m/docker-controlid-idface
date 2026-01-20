const express = require('express');
const router = express.Router();
const UsersController = require('../controllers/users.controller');
const requireAuth = require('../middlewares/auth');

const usersController = new UsersController();

router.get('/', usersController.list.bind(usersController));
router.get('/:id', usersController.getById.bind(usersController));
router.post('/', requireAuth, usersController.create.bind(usersController));
router.patch('/:id', requireAuth, usersController.update.bind(usersController));
router.delete('/:id', requireAuth, usersController.delete.bind(usersController));

module.exports = router;
