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

    // ═══════════════════════════════════════════════════════════════════
    // UPLOAD DE FOTO FACIAL (via arquivo/base64)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * POST /api/enrollment/face/upload
     * Upload de foto facial via base64
     * Body: { user_id, image_base64, match: true }
     * 
     * A imagem deve ser JPEG ou PNG, recomendado 640x480 ou maior
     */
    async uploadFaceBase64(req, res) {
        try {
            const { user_id, image_base64, match = true } = req.body;

            if (!user_id) {
                return res.status(400).json({ error: 'user_id é obrigatório' });
            }

            if (!image_base64) {
                return res.status(400).json({ error: 'image_base64 é obrigatório' });
            }

            // Validar que é base64 de imagem
            let cleanBase64 = image_base64;
            if (image_base64.includes('base64,')) {
                cleanBase64 = image_base64.split('base64,')[1];
            }

            // Verificar tamanho mínimo (uma imagem válida tem pelo menos alguns KB)
            if (cleanBase64.length < 1000) {
                return res.status(400).json({ 
                    error: 'Imagem muito pequena',
                    hint: 'Envie uma imagem JPEG ou PNG de pelo menos 640x480'
                });
            }

            const timestamp = Math.floor(Date.now() / 1000);

            logger.info(`[ENROLLMENT] Upload face base64 para user ${user_id}`);

            // Usar user_set_image_list.fcgi para enviar base64
            const result = await idFaceService.postFcgi('user_set_image_list.fcgi', {
                match: match ? 1 : 0,
                user_images: [{
                    user_id: parseInt(user_id),
                    timestamp: timestamp,
                    image: cleanBase64
                }]
            });

            res.json({
                success: true,
                user_id: parseInt(user_id),
                timestamp,
                match,
                result: result.data || result,
                message: 'Face cadastrada com sucesso'
            });

        } catch (error) {
            logger.error('[ENROLLMENT] Erro upload face base64:', error.message);
            res.status(error.status || 500).json({ 
                error: error.message,
                hint: 'Verifique se a imagem está em formato base64 válido'
            });
        }
    }

    /**
     * POST /api/enrollment/face/upload-binary
     * Upload de foto facial via binary (application/octet-stream)
     * Query: ?user_id=10&match=1
     * Body: raw image bytes
     */
    async uploadFaceBinary(req, res) {
        try {
            const { user_id, match = '1' } = req.query;

            if (!user_id) {
                return res.status(400).json({ error: 'user_id é obrigatório (query param)' });
            }

            // O body é o buffer da imagem
            const imageBuffer = req.body;

            if (!imageBuffer || imageBuffer.length < 1000) {
                return res.status(400).json({ 
                    error: 'Imagem inválida ou muito pequena',
                    received_bytes: imageBuffer?.length || 0
                });
            }

            const timestamp = Math.floor(Date.now() / 1000);

            logger.info(`[ENROLLMENT] Upload face binary para user ${user_id} (${imageBuffer.length} bytes)`);

            // Usar user_set_image.fcgi para enviar binary
            // Este endpoint requer Content-Type: application/octet-stream
            const result = await idFaceService.postFcgiBinary(
                `user_set_image.fcgi?user_id=${user_id}&match=${match}&timestamp=${timestamp}`,
                imageBuffer
            );

            res.json({
                success: true,
                user_id: parseInt(user_id),
                timestamp,
                bytes: imageBuffer.length,
                result: result.data || result,
                message: 'Face cadastrada com sucesso'
            });

        } catch (error) {
            logger.error('[ENROLLMENT] Erro upload face binary:', error.message);
            res.status(error.status || 500).json({ error: error.message });
        }
    }

    /**
     * POST /api/enrollment/face/upload-multiple
     * Upload de múltiplas fotos faciais via base64
     * Body: { match: true, user_images: [{ user_id, image_base64 }, ...] }
     */
    async uploadFaceMultiple(req, res) {
        try {
            const { match = true, user_images } = req.body;

            if (!user_images || !Array.isArray(user_images) || user_images.length === 0) {
                return res.status(400).json({ 
                    error: 'user_images é obrigatório',
                    example: { user_images: [{ user_id: 10, image_base64: '...' }] }
                });
            }

            const timestamp = Math.floor(Date.now() / 1000);
            const payload = {
                match: match ? 1 : 0,
                user_images: user_images.map((item, index) => {
                    let cleanBase64 = item.image_base64 || item.image;
                    if (cleanBase64 && cleanBase64.includes('base64,')) {
                        cleanBase64 = cleanBase64.split('base64,')[1];
                    }
                    return {
                        user_id: parseInt(item.user_id),
                        timestamp: timestamp + index,
                        image: cleanBase64
                    };
                })
            };

            logger.info(`[ENROLLMENT] Upload batch de ${user_images.length} faces`);

            const result = await idFaceService.postFcgi('user_set_image_list.fcgi', payload);

            res.json({
                success: true,
                total: user_images.length,
                timestamp,
                result: result.data || result,
                message: `${user_images.length} face(s) cadastrada(s)`
            });

        } catch (error) {
            logger.error('[ENROLLMENT] Erro upload face múltiplo:', error.message);
            res.status(error.status || 500).json({ error: error.message });
        }
    }

    /**
     * GET /api/enrollment/face/:user_id
     * Obtém a foto facial de um usuário
     */
    async getFaceImage(req, res) {
        try {
            const { user_id } = req.params;
            const { get_timestamp = '1' } = req.query;

            logger.info(`[ENROLLMENT] Obtendo face do user ${user_id}`);

            const result = await idFaceService.postFcgiBinary(
                `user_get_image.fcgi?user_id=${user_id}&get_timestamp=${get_timestamp}`,
                null,
                'GET'
            );

            // Se retornar imagem, enviar como binary
            if (result && result.data) {
                res.setHeader('Content-Type', 'image/jpeg');
                res.send(result.data);
            } else {
                res.status(404).json({ error: 'Imagem não encontrada' });
            }

        } catch (error) {
            logger.error('[ENROLLMENT] Erro ao obter face:', error.message);
            res.status(error.status || 500).json({ error: error.message });
        }
    }

    /**
     * DELETE /api/enrollment/face/:user_id
     * Remove a foto facial de um usuário
     */
    async deleteFaceImage(req, res) {
        try {
            const { user_id } = req.params;

            logger.info(`[ENROLLMENT] Removendo face do user ${user_id}`);

            const result = await idFaceService.postFcgi('user_destroy_image.fcgi', {
                user_ids: [parseInt(user_id)]
            });

            res.json({
                success: true,
                user_id: parseInt(user_id),
                result: result.data || result,
                message: 'Face removida com sucesso'
            });

        } catch (error) {
            logger.error('[ENROLLMENT] Erro ao remover face:', error.message);
            res.status(error.status || 500).json({ error: error.message });
        }
    }

    /**
     * GET /api/enrollment/face/list
     * Lista todos os usuários que têm foto cadastrada
     */
    async listUsersWithFace(req, res) {
        try {
            const { get_timestamp = '1' } = req.query;

            const result = await idFaceService.postFcgi(
                `user_list_images.fcgi?get_timestamp=${get_timestamp}`,
                {}
            );

            res.json({
                success: true,
                users: result.data?.user_ids || result.user_ids || [],
                total: (result.data?.user_ids || result.user_ids || []).length
            });

        } catch (error) {
            logger.error('[ENROLLMENT] Erro ao listar faces:', error.message);
            res.status(error.status || 500).json({ error: error.message });
        }
    }

    /**
     * POST /api/enrollment/face/test
     * Testa uma imagem para verificar se é válida para reconhecimento facial
     * Body: raw image bytes ou { image_base64: "..." }
     */
    async testFaceImage(req, res) {
        try {
            let imageBuffer;

            // Verificar se veio base64 no body JSON
            if (req.body && req.body.image_base64) {
                let cleanBase64 = req.body.image_base64;
                if (cleanBase64.includes('base64,')) {
                    cleanBase64 = cleanBase64.split('base64,')[1];
                }
                imageBuffer = Buffer.from(cleanBase64, 'base64');
            } else {
                // Binary direto
                imageBuffer = req.body;
            }

            if (!imageBuffer || imageBuffer.length < 1000) {
                return res.status(400).json({ 
                    error: 'Imagem inválida',
                    hint: 'Envie uma imagem JPEG ou PNG'
                });
            }

            logger.info(`[ENROLLMENT] Testando imagem facial (${imageBuffer.length} bytes)`);

            const result = await idFaceService.postFcgiBinary(
                'user_test_image.fcgi',
                imageBuffer
            );

            res.json({
                success: true,
                valid: result.data?.valid !== false,
                result: result.data || result,
                message: result.data?.valid !== false 
                    ? 'Imagem válida para reconhecimento facial'
                    : 'Imagem não reconhecida como face válida'
            });

        } catch (error) {
            logger.error('[ENROLLMENT] Erro ao testar face:', error.message);
            res.status(error.status || 500).json({ error: error.message });
        }
    }
}

module.exports = EnrollmentController;