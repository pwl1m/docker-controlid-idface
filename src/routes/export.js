const express = require('express');
const router = express.Router();
const ExportController = require('../controllers/export.controller');
const requireAuth = require('../middlewares/auth');

const controller = new ExportController();

/**
 * ROTAS DE EXPORTAÇÃO
 * 
 * Suporta CSV, PDF e JSON
 * 
 * Exemplos:
 *   GET /api/export/users?format=csv
 *   GET /api/export/access-logs?format=pdf&limit=500
 *   POST /api/export/custom { object: "users", format: "csv", fields: ["id", "name"] }
 */

// Exportação simples de objetos
// GET /api/export/:object?format=csv|pdf|json
router.get('/:object', requireAuth, controller.exportObject.bind(controller));

// Exportação customizada com filtros
// POST /api/export/custom
router.post('/custom', requireAuth, controller.exportCustom.bind(controller));

module.exports = router;
