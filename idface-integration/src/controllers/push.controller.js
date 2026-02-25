const pushQueueService = require('../services/push-queue.service');
const logger = require('../utils/logger');

class PushController {
    /**
     * GET /push - Dispositivo busca comando pendente
     * Query params: deviceId, uuid (do dispositivo)
     */
    async getCommand(req, res) {
        try {
            const { deviceId, uuid } = req.query;
            
            if (!deviceId) {
                return res.status(400).json({ error: 'deviceId is required' });
            }

            const command = pushQueueService.dequeue(deviceId);

            if (!command) {
                // Resposta vazia = sem comandos pendentes
                return res.status(200).send('');
            }

            // Se for lote de transações
            if (command.transactions) {
                logger.info(`Push batch to device ${deviceId}:`, command.transactions.length, 'commands');
                return res.json({ transactions: command.transactions });
            }

            // Comando único
            logger.info(`Push command to device ${deviceId}:`, command.endpoint);
            res.json({
                verb: command.verb,
                endpoint: command.endpoint,
                body: command.body,
                contentType: command.contentType,
                queryString: command.queryString
            });
        } catch (error) {
            logger.error('Push getCommand error:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * POST /result - Dispositivo envia resultado do comando executado
     * Query params: deviceId, uuid, endpoint
     * Body: { response } ou { error } ou { transactions_results }
     */
    async postResult(req, res) {
        try {
            const { deviceId, uuid, endpoint } = req.query;
            const body = req.body;

            logger.info(`Push result from device ${deviceId}:`, {
                uuid,
                endpoint,
                hasResponse: !!body.response,
                hasError: !!body.error,
                hasTransactions: !!body.transactions_results
            });

            // Armazenar resultado
            pushQueueService.setResult(uuid, {
                deviceId,
                endpoint,
                response: body.response,
                error: body.error,
                transactions_results: body.transactions_results
            });

            // Resposta vazia conforme documentação
            res.status(200).send('');
        } catch (error) {
            logger.error('Push postResult error:', error.message);
            res.status(500).send('');
        }
    }

    /**
     * POST /api/push/enqueue - Adicionar comando à fila (uso interno/admin)
     */
    async enqueueCommand(req, res) {
        try {
            const { deviceId, command, commands } = req.body;

            if (!deviceId) {
                return res.status(400).json({ error: 'deviceId is required' });
            }

            let uuid;
            if (commands && Array.isArray(commands)) {
                // Lote de comandos
                uuid = pushQueueService.enqueueBatch(deviceId, commands);
                logger.info(`Enqueued batch of ${commands.length} commands for device ${deviceId}`);
            } else if (command) {
                // Comando único
                uuid = pushQueueService.enqueue(deviceId, command);
                logger.info(`Enqueued command ${command.endpoint} for device ${deviceId}`);
            } else {
                return res.status(400).json({ error: 'command or commands is required' });
            }

            res.json({ uuid, queued: true });
        } catch (error) {
            logger.error('Push enqueue error:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * GET /api/push/pending - Listar comandos pendentes (debug)
     */
    async getPending(req, res) {
        try {
            const { deviceId } = req.query;
            
            if (!deviceId) {
                return res.status(400).json({ error: 'deviceId is required' });
            }

            const pending = pushQueueService.getPendingCommands(deviceId);
            res.json({ deviceId, pending, count: pending.length });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * GET /api/push/result/:uuid - Obter resultado de comando (debug)
     */
    async getResult(req, res) {
        try {
            const { uuid } = req.params;
            const result = pushQueueService.getResult(uuid);

            if (!result) {
                return res.status(404).json({ error: 'Result not found' });
            }

            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Processa eventos de chamada SIP
     */
    processSipCallEvent(event) {
        const { type, user_id, timestamp, call_target, duration } = event;
        
        logger.info('[PUSH] SIP Call Event:', {
            type,       // 'call_started', 'call_answered', 'call_ended', 'dtmf_received'
            user_id,
            call_target,
            duration,
            timestamp
        });

        // Emitir para sistema externo (webhook, socket, etc)
        this.emitEvent('sip_call', event);
    }

    /**
     * Processa evento de liberação via DTMF
     */
    processDtmfDoorEvent(event) {
        const { user_id, operator_ramal, dtmf_code, door, timestamp } = event;
        
        logger.info('[PUSH] DTMF Door Release:', {
            user_id,
            operator_ramal,  // Quem autorizou
            dtmf_code,
            door,
            timestamp
        });

        // Logar acesso autorizado por operador
        this.logCustodyAccess({
            type: 'dual_custody_access',
            user_id,
            authorized_by: operator_ramal,
            method: 'dtmf',
            timestamp
        });
    }
}

module.exports = PushController;