require('dotenv').config();
    const express = require('express');
    const routes = require('./routes');
    const logger = require('./utils/logger');
    const config = require('./config');
    const idFaceService = require('./services/idface.service');
    const PushController = require('./controllers/push.controller');
    const pushController = new PushController();
    const path = require('path');

    const app = express();

    // Log de requisições (exceto heartbeat e polling)
    app.use((req, res, next) => {
        const isHeartbeat = req.url.includes('device_is_alive');
        const isPolling = req.url.startsWith('/push') && req.method === 'GET';
        const isNotificationsPolling = req.path === '/api/notifications' && req.method === 'GET';
        
        if (isHeartbeat && !config.logs.showHeartbeat) return next();
        if ((isPolling || isNotificationsPolling) && !config.logs.showPolling) return next();
        
        logger.info(`${req.method} ${req.url} - IP: ${req.ip}`);
        next();
    });

    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Health check
    app.get('/health', (req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // ============ ENDPOINTS DO DISPOSITIVO ============

    app.post('/device_is_alive.fcgi', (req, res) => {
        if (config.logs.showHeartbeat) logger.info('Heartbeat received');
        res.json({ alive: true });
    });

    app.get('/push', (req, res) => {
        if (config.logs.showPolling) logger.debug('Push polling from device:', req.query.deviceId);
        pushController.getCommand(req, res);
    });

    app.post('/result', (req, res) => {
        logger.info('Push result received from device:', req.query.deviceId);
        pushController.postResult(req, res);
    });

    app.get('/api/notifications', (req, res) => {
        if (config.logs.showPolling) logger.debug(`[POLLING] Device: ${req.query.deviceId}`);
        res.json([]);
    });

    // ============ MODO MONITOR ============

    // Este bloco deve vir antes dos handlers específicos de /api/notifications/*
    app.post('/api/notifications/*', (req, res, next) => {
        logger.info('==========================================');
        logger.info(`🔍 EVENTO CAPTURADO: ${req.path}`);
        logger.info('==========================================');
        logger.info('Body completo:', JSON.stringify(req.body, null, 2));
        logger.info('==========================================');
        next();
    });

    app.post('/api/notifications/operation_mode', (req, res) => {
        const event = req.body;
        logger.info(`[MODE] ${event.operation_mode?.mode_name || 'N/A'} - Device: ${event.device_id || 'N/A'}`);
        res.json({});
    });

    app.post('/api/notifications/dao', async (req, res) => {
        const data = req.body;
        
        // Log detalhado do DAO
        logger.info('==========================================');
        logger.info('📦 DAO - Data Access Object');
        logger.info('==========================================');
        
        // Processar mudanças de objetos
        if (data.object_changes && Array.isArray(data.object_changes)) {
            for (const change of data.object_changes) {
                if (change.object === 'access_logs' && change.type === 'inserted') {
                    const accessLog = change.values;
                    const userId = parseInt(accessLog.user_id);
                    const eventId = parseInt(accessLog.event);
                    const horario = new Date(parseInt(accessLog.time) * 1000).toLocaleString('pt-BR');
                    
                    // Buscar informações do usuário
                    try {
                        const userInfo = await idFaceService.getUserById(userId);
                        
                        logger.info('==========================================');
                        logger.info('🎯 ACESSO REGISTRADO!');
                        logger.info('==========================================');
                        logger.info(`👤 Nome: ${userInfo?.name || 'N/A'}`);
                        logger.info(`🆔 User ID: ${userId}`);
                        logger.info(`🔑 Identifier ID: ${accessLog.identifier_id}`);
                        logger.info(`📋 Matrícula: ${userInfo?.registration || 'N/A'}`);
                        logger.info(`📊 Confiança: ${accessLog.confidence}`);
                        logger.info(`😷 Máscara: ${accessLog.mask === '1' ? 'SIM' : 'NÃO'}`);
                        logger.info(`🚪 Portal: ${accessLog.portal_id}`);
                        logger.info(`📅 Event ID: ${eventId}`);
                        logger.info(`⏰ Horário: ${horario}`);
                        logger.info('==========================================');
                    } catch (error) {
                        logger.warn('==========================================');
                        logger.warn('⚠️ ACESSO DETECTADO - Erro ao buscar usuário');
                        logger.warn(`🆔 User ID: ${userId}`);
                        logger.warn(`📊 Confiança: ${accessLog.confidence}`);
                        logger.warn(`⏰ Horário: ${horario}`);
                        logger.warn(`❌ Erro: ${error.message}`);
                        logger.warn('==========================================');
                    }
                }
            }
        }
        
        logger.info('Payload completo:', JSON.stringify(data, null, 2));
        logger.info('==========================================');
        
        res.json({});
    });

    app.post('/api/notifications/secbox', (req, res) => {
        const data = req.body;
        
        // Log detalhado do SECBOX
        logger.info('==========================================');
        logger.info('🔒 SECBOX - Evento de Segurança');
        logger.info('==========================================');
        logger.info('Payload completo:', JSON.stringify(data, null, 2));
        logger.info('==========================================');
        
        res.json({});
    });

    // Adicione também handler para device_is_alive no caminho correto
    app.post('/api/notifications/device_is_alive', (req, res) => {
        const data = req.body;
        
        if (config.logs.showHeartbeat) {
            logger.info('💓 Heartbeat via notifications');
            logger.info(`Access logs: ${data.access_logs}`);
        }
        
        res.json({});
    });

    function handleUserIdentified(req, res) {
        const event = req.body;
        const userId = parseInt(event.user_id) || 0;
        const userName = event.user_name || '';
        const eventId = event.event ? parseInt(event.event) : undefined;
        const horario = event.time ? new Date(parseInt(event.time) * 1000).toLocaleString('pt-BR') : 'N/A';
        
        console.log('');
        
        if (userId > 0 && userName) {
            logger.info('==========================================');
            logger.info('🎯 USUÁRIO IDENTIFICADO!');
            logger.info('==========================================');
            logger.info(`👤 Nome: ${userName}`);
            logger.info(`🆔 User ID: ${userId}`);
            logger.info(`📋 Matrícula: ${event.registration || 'N/A'}`);
            logger.info(`📊 Confiança: ${event.confidence || 'N/A'}`);
            logger.info(`😷 Máscara: ${event.face_mask === '1' ? 'SIM' : 'NÃO'}`);
            logger.info(`⏰ Horário: ${horario}`);
            logger.info('==========================================');
        } else {
            logger.warn('==========================================');
            logger.warn('👤 ROSTO DETECTADO - NÃO IDENTIFICADO');
            logger.warn(`📊 Confiança: ${event.confidence || 'N/A'}`);
            logger.warn(`⏰ Horário: ${horario}`);
            logger.warn('==========================================');
        }
        
        console.log('');
        
        res.setHeader('Content-Type', 'application/json');
        res.status(200).json({
            result: {
                user_id: String(userId),
                user_name: userName,
                event: eventId,
                actions: []
            }
        });
    }

    function handleUserNotIdentified(req, res) {
        const event = req.body;
        const eventId = event.event ? parseInt(event.event) : undefined;
        const horario = event.time ? new Date(parseInt(event.time) * 1000).toLocaleString('pt-BR') : 'N/A';
        
        console.log('');
        logger.warn('==========================================');
        logger.warn('⚠️ USUÁRIO NÃO IDENTIFICADO!');
        logger.warn(`⏰ Horário: ${horario}`);
        logger.warn('==========================================');
        console.log('');
        
        res.setHeader('Content-Type', 'application/json');
        res.status(200).json({
            result: {
                user_id: -1,
                user_name: '',
                event: eventId,
                actions: []
            }
        });
    }

    app.post('/new_user_identified.fcgi', handleUserIdentified);
    app.post('/user_not_identified.fcgi', handleUserNotIdentified);
    app.post('/api/notifications/new_user_identified.fcgi', handleUserIdentified);
    app.post('/api/notifications/user_not_identified.fcgi', handleUserNotIdentified);

    // ============ CALLBACKS DE ENROLLMENT DO DEVICE ============
    // Estes endpoints são chamados PELO DEVICE quando enrollment async termina
    // IMPORTANTE: Devem estar ANTES do catch-all para serem alcançados

    app.post('/face_create.fcgi', (req, res) => {
        logger.info('[DEVICE CALLBACK] face_create.fcgi recebido');
        req.url = '/api/enrollment/callback/face';
        app._router.handle(req, res);
    });

    app.post('/card_create.fcgi', (req, res) => {
        logger.info('[DEVICE CALLBACK] card_create.fcgi recebido');
        req.url = '/api/enrollment/callback/card';
        app._router.handle(req, res);
    });

    app.post('/fingerprint_create.fcgi', (req, res) => {
        logger.info('[DEVICE CALLBACK] fingerprint_create.fcgi recebido');
        req.url = '/api/enrollment/callback/fingerprint';
        app._router.handle(req, res);
    });

    app.post('/pin_create.fcgi', (req, res) => {
        logger.info('[DEVICE CALLBACK] pin_create.fcgi recebido');
        req.url = '/api/enrollment/callback/pin';
        app._router.handle(req, res);
    });

    app.post('/password_create.fcgi', (req, res) => {
        logger.info('[DEVICE CALLBACK] password_create.fcgi recebido');
        req.url = '/api/enrollment/callback/password';
        app._router.handle(req, res);
    });

    // ============ Rotas da API interna ============
    app.use('/api', routes);

    // Servir UI de testes (antes do catch-all)
    app.use('/ui', express.static(path.join(__dirname, 'public')));
    app.get('/ui', (req, res) => res.sendFile(path.join(__dirname, 'public', 'teste-ui.html')));

    // ============ Catch-all para debug (DEVE SER O ÚLTIMO) ============
    app.all('*', (req, res) => {
        logger.warn(`[NÃO MAPEADO] ${req.method} ${req.url}`);
        logger.warn(`Body: ${JSON.stringify(req.body)}`);
        res.status(404).json({ error: 'Not Found' });
    });

    // ============ INICIALIZAÇÃO ============

    async function startServer() {
        try {
            logger.info('==========================================');
            logger.info('🚀 Iniciando servidor IDFace Container');
            logger.info('==========================================');
            logger.info(`📋 Dispositivo: ${config.device.ip}`);
            logger.info(`📋 Porta: ${config.server.port}`);
            
            await idFaceService.authenticate();
            
            const deviceInfo = await idFaceService.getDeviceInfo();
            logger.info(`📱 Dispositivo: ${deviceInfo.device_name}`);
            logger.info(`🔢 Serial: ${deviceInfo.serial}`);
            logger.info(`📡 Firmware: ${deviceInfo.version}`);

            // Sincronizar hora do device com o servidor na inicialização
            try {
                await idFaceService.setSystemTime();
                logger.info('🕐 Hora do device sincronizada com o servidor');
            } catch (e) {
                logger.warn('⚠️ Falha ao sincronizar hora:', e.message);
            }
            
            app.locals.deviceSession = idFaceService.session;
            logger.info(`🔑 Sessão ativa: ${idFaceService.session}`);
            
            app.listen(config.server.port, '0.0.0.0', () => {
                console.log('');
                logger.info('==========================================');
                logger.info(`✅ Servidor rodando na porta ${config.server.port}`);
                logger.info(`🔇 Heartbeat logs: ${config.logs.showHeartbeat ? 'ON' : 'OFF'}`);
                logger.info(`🔇 Polling logs: ${config.logs.showPolling ? 'ON' : 'OFF'}`);
                logger.info(`🔐 API Key: ${config.auth.apiKey ? 'ATIVA' : 'DESABILITADA'}`);
                logger.info('==========================================');
                console.log('');
            });
            
        } catch (error) {
            logger.error(`❌ Erro ao iniciar: ${error.message}`);
            
            app.listen(config.server.port, '0.0.0.0', () => {
                logger.info(`Servidor rodando na porta ${config.server.port} (modo offline)`);
            });
        }
    }

    startServer();
