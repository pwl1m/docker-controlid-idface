const idFaceService = require('../services/idface.service');
const logger = require('../utils/logger');

/**
 * PARÂMETROS SIP COMPLETOS - Documentação Control iD
 * 
 * CONEXÃO:
 * - enabled: "0"/"1" - Habilita interfonia SIP
 * - server_ip: string - Endereço do servidor SIP (URL ou IP)
 * - server_port: int - Porta do servidor (default: 5060)
 * - server_outbound_port: int - Porta RTP inicial (0 = qualquer disponível)
 * - server_outbound_port_range: int - Range de portas RTP
 * - numeric_branch_enabled: "0"/"1" - Ramal numérico (0=alfanumérico, 1=numérico)
 * - branch: string - Ramal registrado no servidor SIP
 * - login: string - Usuário no servidor SIP
 * - password: string - Senha (máx 16 chars para Digest Auth)
 * - peer_to_peer_enabled: "0"/"1" - Comunicação peer-to-peer
 * 
 * TIMERS:
 * - reg_status_query_period: int - Período para query de registro (segundos)
 * - server_retry_interval: int - Intervalo keep-alive (segundos)
 * - max_call_time: int - Duração máxima de chamada (segundos)
 * - push_button_debounce: int - Debounce do botão (ms)
 * 
 * AUTO-ATENDIMENTO:
 * - auto_answer_enabled: "0"/"1" - Auto-atendimento
 * - auto_answer_delay: string - Delay para auto-atender (segundos)
 * 
 * MODO DE DISCAGEM:
 * - auto_call_button_enabled: "0"/"1" - Visibilidade do botão de chamada
 * - rex_enabled: "0"/"1" - Discagem por botoeira externa
 * - dialing_display_mode: "0"/"1"/"2" - Modo de discagem
 *   - "0": Auto-discagem (chama direto)
 *   - "1": Lista de contatos
 *   - "2": Teclado numérico + lista
 * - auto_call_target: string - Número para auto-discagem
 * - custom_identifier_auto_call: string - Nome exibido na chamada
 * 
 * VÍDEO:
 * - video_enabled: "0"/"1" - Chamada com vídeo (requer reboot)
 * 
 * ÁUDIO PERSONALIZADO:
 * - pjsip_custom_audio_enabled: "0"/"1" - Som de chamada personalizado
 * - custom_audio_volume_gain: "1"/"2"/"3" - Ganho do áudio (1x, 2x, 3x)
 * 
 * VOLUMES:
 * - mic_volume: "1"-"10" - Volume do microfone
 * - speaker_volume: "1"-"10" - Volume do alto-falante
 * 
 * LIBERAÇÃO DE ACESSO:
 * - open_door_enabled: "0"/"1" - Liberação via interfonia
 * - open_door_command: string - Código DTMF para liberar (números, +, *, #)
 * 
 * IDENTIFICAÇÃO DURANTE CHAMADA:
 * - facial_id_during_call_enabled: "0"/"1" - ID facial durante chamada (firmware 6.13.1+)
 */

class InterfoniaController {

    handleError(res, error) {
        logger.error('[INTERFONIA] Error:', error.message);
        res.status(error.status || 500).json({ error: error.message });
    }

    /**
     * GET /api/interfonia-sip/config
     * Obtém configuração completa do SIP
     */
    async getConfig(req, res) {
        try {
            const config = await idFaceService.getInterfoniaSipConfig();
            res.json(config);
        } catch (error) {
            this.handleError(res, error);
        }
    }

    /**
     * POST /api/interfonia-sip/config
     * Configura o módulo SIP
     * 
     * ⚠️ CRÍTICO: dialing_display_mode é OBRIGATÓRIO - sem ele device crasha
     */
    async setConfig(req, res) {
        try {
            const { pjsip } = req.body;

            if (!pjsip) {
                return res.status(400).json({ error: 'Campo pjsip é obrigatório' });
            }

            // Garantir parâmetro crítico
            const safeConfig = {
                dialing_display_mode: '0',  // OBRIGATÓRIO - evita crash
                ...pjsip
            };

            // Converter todos os valores para string (firmware 6.23 exige)
            const stringifiedConfig = {};
            for (const [key, value] of Object.entries(safeConfig)) {
                stringifiedConfig[key] = String(value);
            }

            logger.info('[SIP] Configurando:', { 
                server: stringifiedConfig.server_ip, 
                branch: stringifiedConfig.branch 
            });

            const result = await idFaceService.postFcgi('set_configuration.fcgi', { 
                pjsip: stringifiedConfig 
            });
            
            res.json({ success: true, data: result.data });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    /**
     * GET /api/interfonia-sip/status
     * Obtém status do registro SIP
     * 
     * Códigos de status:
     * -1: Desabilitado
     * 0/100: Conectando
     * 200: Conectado
     * 401/403: Falha de autenticação
     * 408: Falha ao conectar no servidor
     * 503: Falha de conexão de rede
     */
    async getStatus(req, res) {
        try {
            const result = await idFaceService.postFcgi('get_sip_status.fcgi', {});
            res.json(result.data);
        } catch (error) {
            this.handleError(res, error);
        }
    }

    /**
     * POST /api/interfonia-sip/call
     * Inicia uma chamada SIP
     * 
     * A chamada só será feita se o device estiver na tela inicial
     * ou em streaming de identificação
     */
    async makeCall(req, res) {
        try {
            const { target } = req.body;

            if (!target) {
                return res.status(400).json({ error: 'Campo target é obrigatório' });
            }

            logger.info(`[SIP] Iniciando chamada para: ${target}`);
            const result = await idFaceService.postFcgi('make_sip_call.fcgi', { 
                target: String(target) 
            });
            
            res.json({ success: true, data: result.data });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    /**
     * POST /api/interfonia-sip/call/end
     * Finaliza a chamada SIP atual
     */
    async endCall(req, res) {
        try {
            logger.info('[SIP] Finalizando chamada');
            const result = await idFaceService.postFcgi('finalize_sip_call.fcgi', {});
            res.json({ success: true, data: result.data });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    /**
     * POST /api/interfonia-sip/audio
     * Upload de áudio personalizado para toque de chamada
     * 
     * O áudio deve ser:
     * - Formato: .wav
     * - Tamanho máximo: 5MB
     * - Enviado em blocos de no máximo 2MB
     * 
     * Requer restart do device para aplicar
     */
    async setAudio(req, res) {
        try {
            const audioData = req.body;
            const current = parseInt(req.query.current) || 1;
            const total = parseInt(req.query.total) || 1;

            logger.info(`[SIP] Upload de áudio: bloco ${current}/${total}`);

            const result = await idFaceService.postFcgi(
                `set_pjsip_audio_message.fcgi?current=${current}&total=${total}`,
                audioData,
                {
                    headers: { 'Content-Type': 'application/octet-stream' },
                    timeout: 30000
                }
            );

            res.json({ success: true, data: result.data });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    /**
     * GET /api/interfonia-sip/audio
     * Download do áudio personalizado atual
     */
    async getAudio(req, res) {
        try {
            const result = await idFaceService.postFcgi('get_pjsip_audio_message.fcgi', {}, {
                responseType: 'arraybuffer'
            });

            res.set('Content-Type', 'audio/wav');
            res.send(result.data);
        } catch (error) {
            this.handleError(res, error);
        }
    }

    /**
     * GET /api/interfonia-sip/audio/exists
     * Verifica se existe áudio personalizado no device
     */
    async hasAudio(req, res) {
        try {
            const result = await idFaceService.postFcgi('has_pjsip_audio_message.fcgi', {});
            res.json(result.data);
        } catch (error) {
            this.handleError(res, error);
        }
    }

    /**
     * POST /api/interfonia-sip/door/open
     * Configura liberação de acesso via interfonia
     */
    async configureDoorRelease(req, res) {
        try {
            const { enabled = '1', command = '#1234' } = req.body;

            const result = await idFaceService.postFcgi('set_configuration.fcgi', {
                pjsip: {
                    dialing_display_mode: '0',  // CRÍTICO
                    open_door_enabled: String(enabled),
                    open_door_command: String(command)
                }
            });

            res.json({ 
                success: true, 
                open_door_enabled: enabled,
                open_door_command: command,
                data: result.data 
            });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    /**
     * POST /api/interfonia-sip/auto-call
     * Configura discagem automática
     */
    async configureAutoCall(req, res) {
        try {
            const { 
                enabled = '1',
                target,
                identifier_name = '',
                button_enabled = '1',
                rex_enabled = '0'
            } = req.body;

            if (enabled === '1' && !target) {
                return res.status(400).json({ 
                    error: 'Campo target é obrigatório quando auto-call está habilitado' 
                });
            }

            const result = await idFaceService.postFcgi('set_configuration.fcgi', {
                pjsip: {
                    dialing_display_mode: '0',  // CRÍTICO - modo auto-discagem
                    auto_call_button_enabled: String(button_enabled),
                    auto_call_target: String(target || ''),
                    custom_identifier_auto_call: String(identifier_name),
                    rex_enabled: String(rex_enabled)
                }
            });

            res.json({ 
                success: true, 
                auto_call_target: target,
                data: result.data 
            });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    /**
     * POST /api/interfonia-sip/volumes
     * Configura volumes de microfone e alto-falante (1-10)
     */
    async setVolumes(req, res) {
        try {
            const { mic_volume, speaker_volume } = req.body;

            const config = { dialing_display_mode: '0' };  // CRÍTICO

            if (mic_volume !== undefined) {
                const vol = Math.min(10, Math.max(1, parseInt(mic_volume)));
                config.mic_volume = String(vol);
            }
            if (speaker_volume !== undefined) {
                const vol = Math.min(10, Math.max(1, parseInt(speaker_volume)));
                config.speaker_volume = String(vol);
            }

            const result = await idFaceService.postFcgi('set_configuration.fcgi', {
                pjsip: config
            });

            res.json({ success: true, data: result.data });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    /**
     * POST /api/interfonia-sip/auto-answer
     * Configura auto-atendimento de chamadas
     */
    async configureAutoAnswer(req, res) {
        try {
            const { enabled = '1', delay = '5' } = req.body;

            const result = await idFaceService.postFcgi('set_configuration.fcgi', {
                pjsip: {
                    dialing_display_mode: '0',  // CRÍTICO
                    auto_answer_enabled: String(enabled),
                    auto_answer_delay: String(delay)
                }
            });

            res.json({ success: true, data: result.data });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    /**
     * POST /api/interfonia-sip/video
     * Habilita/desabilita chamada com vídeo
     * 
     * ⚠️ IMPORTANTE: Requer reboot do device para aplicar
     */
    async configureVideo(req, res) {
        try {
            const { enabled = '1' } = req.body;

            const result = await idFaceService.postFcgi('set_configuration.fcgi', {
                pjsip: {
                    dialing_display_mode: '0',  // CRÍTICO
                    video_enabled: String(enabled)
                }
            });

            res.json({ 
                success: true, 
                video_enabled: enabled,
                note: enabled === '1' ? 'Reboot necessário para aplicar vídeo SIP' : null,
                data: result.data 
            });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    /**
     * POST /api/interfonia-sip/facial-id-during-call
     * Habilita identificação facial durante chamada SIP
     * 
     * Disponível a partir do firmware 6.13.1
     */
    async configureFacialIdDuringCall(req, res) {
        try {
            const { enabled = '1' } = req.body;

            const result = await idFaceService.postFcgi('set_configuration.fcgi', {
                pjsip: {
                    dialing_display_mode: '0',  // CRÍTICO
                    facial_id_during_call_enabled: String(enabled)
                }
            });

            res.json({ success: true, data: result.data });
        } catch (error) {
            this.handleError(res, error);
        }
    }
}

module.exports = InterfoniaController;