const config = require('../config');

module.exports = function requireAuth(req, res, next) {
    const apiKey = config.auth.apiKey;
    
    // Se API_KEY não definida, middleware desabilitado
    if (!apiKey) return next();

    const header = req.get('x-api-key') || req.query.api_key;
    if (header === apiKey) return next();

    res.status(401).json({ error: 'Unauthorized' });
};
