const idFaceService = require('./idface.service');
const logger = require('../utils/logger');

class CustodyCallService {
    constructor() {
        this.callTimeout = 30000; // 30 segundos para atender
        this.dtmfTimeout = 60000; // 60 segundos para digitar DTMF
        this.maxRetries = 2;
    }

    /**
     * Inicia chamada de custódia com fallback
     */
    async initiateCall(target, options = {}) {
        const { 
            fallbackTarget,
            onTimeout,
            onNoAnswer,
            retryCount = 0 
        } = options;

        try {
            logger.info(`[CUSTODY-CALL] Iniciando chamada para ${target} (tentativa ${retryCount + 1})`);
            
            const result = await idFaceService.postFcgi('make_sip_call.fcgi', { 
                target: String(target) 
            });

            // Aguardar status de chamada
            const callStatus = await this.waitForCallAnswer(this.callTimeout);
            
            if (!callStatus.answered) {
                logger.warn(`[CUSTODY-CALL] Chamada não atendida para ${target}`);
                
                // Tentar fallback
                if (fallbackTarget && retryCount < this.maxRetries) {
                    logger.info(`[CUSTODY-CALL] Tentando fallback para ${fallbackTarget}`);
                    return this.initiateCall(fallbackTarget, {
                        ...options,
                        retryCount: retryCount + 1
                    });
                }
                
                if (onNoAnswer) {
                    await onNoAnswer(target);
                }
                
                return { success: false, reason: 'no_answer', target };
            }

            return { success: true, target, callStatus };
        } catch (error) {
            logger.error(`[CUSTODY-CALL] Erro na chamada:`, error.message);
            
            if (retryCount < this.maxRetries) {
                await this.sleep(2000);
                return this.initiateCall(target, { ...options, retryCount: retryCount + 1 });
            }
            
            throw error;
        }
    }

    /**
     * Aguarda chamada ser atendida
     */
    async waitForCallAnswer(timeout) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            const status = await idFaceService.postFcgi('get_sip_status.fcgi', {});
            
            if (status.data?.in_call) {
                return { answered: true, time: Date.now() - startTime };
            }
            
            await this.sleep(1000);
        }
        
        return { answered: false, time: timeout };
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = new CustodyCallService();