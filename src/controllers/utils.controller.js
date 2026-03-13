const crypto = require('crypto');
const idFaceService = require('../services/idface.service');

class UtilsController {
    // Gera senha randômica
    async generatePassword(req, res) {
        try {
            const { length = 8, numeric = false } = req.query;
            const len = Math.min(Math.max(Number(length), 4), 32);
            
            let password;
            if (numeric === 'true' || numeric === '1') {
                // Apenas números (para PIN)
                password = Array.from({ length: len }, () => 
                    Math.floor(Math.random() * 10)
                ).join('');
            } else {
                // Alfanumérico
                password = crypto.randomBytes(len).toString('base64').slice(0, len);
            }

            res.json({ password });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Copia usuário existente
    async copyUser(req, res) {
        try {
            const sourceId = Number(req.params.id);
            const { name, registration } = req.body;

            if (!name) {
                return res.status(400).json({ error: 'name is required for the new user' });
            }

            // Busca usuário original
            const sourceResult = await idFaceService.loadObjects('users', {
                where: [{ object: 'users', field: 'id', value: sourceId }]
            });

            const sourceUsers = sourceResult.users || [];
            if (!sourceUsers.length) {
                return res.status(404).json({ error: 'Source user not found' });
            }

            const sourceUser = sourceUsers[0];

            // Cria novo usuário com dados copiados
            const newUser = {
                name,
                registration: registration || null,
                user_type_id: sourceUser.user_type_id,
                begin_time: sourceUser.begin_time,
                end_time: sourceUser.end_time
            };

            const createResult = await idFaceService.createObjects('users', newUser);

            // Opcionalmente copiar templates, cards, etc. (se necessário)
            // Isso pode ser expandido conforme necessidade

            res.status(201).json({
                message: 'User copied successfully',
                source: sourceUser,
                created: createResult
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = UtilsController;