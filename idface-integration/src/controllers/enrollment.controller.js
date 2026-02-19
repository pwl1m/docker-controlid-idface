const idFaceService = require('../services/idface.service');
const logger = require('../utils/logger');

class EnrollmentController {
    
    /**
     * Inicia cadastro remoto no device
     * POST /api/enrollment/remote
     * Body: { type, user_id, save, sync, auto, countdown, msg }
     */
    async startRemoteEnroll(req, res) {
        try {
            const {
                type,           // 'face', 'card', 'biometry', 'pin', 'password'
                user_id,
                save = true,
                sync = true,    // Recomendado true para simplicidade
                auto = true,    // Auto-captura (sem botão)
                countdown = 3,  // Segundos para auto-captura
                msg = null      // Mensagem customizada no display
            } = req.body;

            if (!type) {
                return res.status(400).json({ error: 'type é obrigatório (face, card, biometry, pin, password)' });
            }

            if (save && !user_id) {
                return res.status(400).json({ error: 'user_id é obrigatório quando save=true' });
            }

            const payload = {
                type,
                user_id,
                save,
                sync
            };

            // Parâmetros específicos para face
            if (type === 'face') {
                payload.auto = auto;
                payload.countdown = countdown;
            }

            if (msg) {
                payload.msg = msg;
            }

            logger.info(`[ENROLLMENT] Iniciando ${type} para user ${user_id} (sync=${sync})`);

            const result = await idFaceService.postFcgi('remote_enroll.fcgi', payload);

            res.json({
                success: true,
                type,
                user_id,
                sync,
                result: result.data || result
            });

        } catch (error) {
            logger.error('[ENROLLMENT] Erro ao iniciar:', error.message);
            res.status(error.status || 500).json({
                error: error.message,
                details: error.details
            });
        }
    }

    /**
     * Cancela cadastro em andamento
     * POST /api/enrollment/cancel
     */
    async cancelRemoteEnroll(req, res) {
        try {
            logger.info('[ENROLLMENT] Cancelando cadastro em andamento');
            
            const result = await idFaceService.postFcgi('cancel_remote_enroll.fcgi', {});

            res.json({
                success: true,
                message: 'Cadastro cancelado',
                result: result.data || result
            });

        } catch (error) {
            logger.error('[ENROLLMENT] Erro ao cancelar:', error.message);
            res.status(error.status || 500).json({ error: error.message });
        }
    }

    /**
     * Callback: Device envia face cadastrada (modo async)
     * POST /api/enrollment/callback/face
     * Chamado pelo device, não pelo cliente
     */
    async onFaceCreated(req, res) {
        try {
            const { user_id, device_id, face } = req.body;

            logger.info(`[ENROLLMENT CALLBACK] Face criada - user: ${user_id}, device: ${device_id}`);

            // Aqui você pode:
            // 1. Salvar a imagem no banco de dados
            // 2. Notificar o frontend via WebSocket
            // 3. Atualizar status do usuário

            // TODO: Implementar lógica de persistência
            // await this.saveUserFace(user_id, face);

            // Responder ao device (obrigatório)
            res.json({ success: true });

        } catch (error) {
            logger.error('[ENROLLMENT CALLBACK] Erro face:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Callback: Device envia cartão cadastrado (modo async)
     * POST /api/enrollment/callback/card
     */
    async onCardCreated(req, res) {
        try {
            const { user_id, device_id, card_value } = req.body;

            logger.info(`[ENROLLMENT CALLBACK] Card criado - user: ${user_id}, card: ${card_value}`);

            // TODO: Salvar card no banco
            // await this.saveUserCard(user_id, card_value);

            res.json({ success: true });

        } catch (error) {
            logger.error('[ENROLLMENT CALLBACK] Erro card:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Callback: Device envia digital cadastrada (modo async)
     * POST /api/enrollment/callback/fingerprint
     */
    async onFingerprintCreated(req, res) {
        try {
            const { user_id, device_id, finger_type, fingerprints } = req.body;

            logger.info(`[ENROLLMENT CALLBACK] Fingerprint criada - user: ${user_id}, panic: ${finger_type}`);

            // fingerprints é um array com várias capturas da mesma digital
            // Cada item tem: { image, width, height }

            res.json({ success: true });

        } catch (error) {
            logger.error('[ENROLLMENT CALLBACK] Erro fingerprint:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Callback: Device envia PIN cadastrado (modo async)
     * POST /api/enrollment/callback/pin
     */
    async onPinCreated(req, res) {
        try {
            const { user_id, device_id, pin_value } = req.body;

            logger.info(`[ENROLLMENT CALLBACK] PIN criado - user: ${user_id}`);

            // ATENÇÃO: pin_value vem em texto claro
            // Considere hash antes de salvar

            res.json({ success: true });

        } catch (error) {
            logger.error('[ENROLLMENT CALLBACK] Erro pin:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Callback: Device envia senha cadastrada (modo async)
     * POST /api/enrollment/callback/password
     */
    async onPasswordCreated(req, res) {
        try {
            const { user_id, device_id, password_value } = req.body;

            logger.info(`[ENROLLMENT CALLBACK] Password criado - user: ${user_id}`);

            // ATENÇÃO: password_value vem em texto claro
            // Considere hash antes de salvar

            res.json({ success: true });

        } catch (error) {
            logger.error('[ENROLLMENT CALLBACK] Erro password:', error.message);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = EnrollmentController;