const express = require('express');
const router = express.Router();
const ReportsController = require('../controllers/reports.controller');
const requireAuth = require('../middlewares/auth');

const controller = new ReportsController();

router.post('/generate', requireAuth, controller.generate.bind(controller));

module.exports = router;