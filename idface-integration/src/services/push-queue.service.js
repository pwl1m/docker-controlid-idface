/**
 * Serviço de fila de comandos Push para o dispositivo
 * O dispositivo faz GET /push periodicamente e recebe comandos pendentes
 */
class PushQueueService {
    constructor() {
        // Fila de comandos pendentes por dispositivo
        this.queues = new Map(); // deviceId -> [commands]
        // Resultados recebidos (para debug/auditoria)
        this.results = new Map(); // uuid -> result
    }

    /**
     * Adiciona comando à fila do dispositivo
     * @param {string|number} deviceId 
     * @param {object} command - { verb, endpoint, body, contentType, queryString }
     * @returns {string} uuid do comando
     */
    enqueue(deviceId, command) {
        const uuid = this.generateUUID();
        const cmd = {
            uuid,
            verb: command.verb || 'POST',
            endpoint: command.endpoint,
            body: command.body || {},
            contentType: command.contentType || 'application/json',
            queryString: command.queryString || '',
            createdAt: Date.now()
        };

        if (!this.queues.has(deviceId)) {
            this.queues.set(deviceId, []);
        }
        this.queues.get(deviceId).push(cmd);
        
        return uuid;
    }

    /**
     * Adiciona múltiplos comandos (transações em lote)
     * @param {string|number} deviceId 
     * @param {array} commands 
     * @returns {string} uuid do lote
     */
    enqueueBatch(deviceId, commands) {
        const uuid = this.generateUUID();
        const transactions = commands.map((cmd, index) => ({
            transactionid: index + 1,
            verb: cmd.verb || 'POST',
            endpoint: cmd.endpoint,
            body: cmd.body || {},
            contentType: cmd.contentType || 'application/json',
            queryString: cmd.queryString || ''
        }));

        const batch = {
            uuid,
            transactions,
            createdAt: Date.now()
        };

        if (!this.queues.has(deviceId)) {
            this.queues.set(deviceId, []);
        }
        this.queues.get(deviceId).push(batch);

        return uuid;
    }

    /**
     * Obtém próximo comando da fila (chamado quando dispositivo faz GET /push)
     * @param {string|number} deviceId 
     * @returns {object|null} comando ou null se fila vazia
     */
    dequeue(deviceId) {
        const queue = this.queues.get(deviceId);
        if (!queue || queue.length === 0) {
            return null;
        }
        return queue.shift();
    }

    /**
     * Registra resultado de comando executado
     * @param {string} uuid 
     * @param {object} result 
     */
    setResult(uuid, result) {
        this.results.set(uuid, {
            ...result,
            receivedAt: Date.now()
        });

        // Limpar resultados antigos (mais de 1 hora)
        this.cleanOldResults();
    }

    /**
     * Obtém resultado de um comando
     * @param {string} uuid 
     * @returns {object|null}
     */
    getResult(uuid) {
        return this.results.get(uuid) || null;
    }

    /**
     * Lista comandos pendentes para um dispositivo
     * @param {string|number} deviceId 
     * @returns {array}
     */
    getPendingCommands(deviceId) {
        return this.queues.get(deviceId) || [];
    }

    /**
     * Limpa resultados com mais de 1 hora
     */
    cleanOldResults() {
        const oneHourAgo = Date.now() - 3600000;
        for (const [uuid, result] of this.results.entries()) {
            if (result.receivedAt < oneHourAgo) {
                this.results.delete(uuid);
            }
        }
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}

module.exports = new PushQueueService();