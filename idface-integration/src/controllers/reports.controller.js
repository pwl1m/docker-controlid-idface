const idFaceService = require('../services/idface.service');

class ReportsController {
    async generate(req, res) {
        try {
            const payload = req.body || {};
            const data = await idFaceService.postFcgi('report_generate.fcgi', payload);
            res.json(data.data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = ReportsController;