require('dotenv').config();
const express = require('express');
const routes = require('./routes');
const logger = require('./utils/logger');
const idFaceService = require('./services/idface.service');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração para ocultar logs repetitivos
const SHOW_HEARTBEAT_LOGS = false;
const SHOW_POLLING_LOGS = false;

// Log de requisições (exceto heartbeat e polling)
app.use((req, res, next) => {
    const isHeartbeat = req.url.includes('device_is_alive');
    const isPolling = req.url.startsWith('/push') && req.method === 'GET';
    const isNotificationsPolling = req.path === '/api/notifications' && req.method === 'GET';
    
    if (isHeartbeat && !SHOW_HEARTBEAT_LOGS) return next();
    if ((isPolling || isNotificationsPolling) && !SHOW_POLLING_LOGS) return next();
    
    logger.info(`${req.method} ${req.url} - IP: ${req.ip}`);
    next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============ ENDPOINTS DO DISPOSITIVO (ANTES das rotas da API) ============

// Heartbeat
app.post('/device_is_alive.fcgi', (req, res) => {
    if (SHOW_HEARTBEAT_LOGS) {
        logger.debug(`[HEARTBEAT] Device ID: ${req.query.device_id}`);
    }
    res.json({});
});

// Polling Push - GET /push
app.get('/push', (req, res) => {
    if (SHOW_POLLING_LOGS) {
        logger.debug(`[POLLING] Device: ${req.query.deviceId}, UUID: ${req.query.uuid}`);
    }
    res.json([]);
});

// Polling - GET /api/notifications
app.get('/api/notifications', (req, res) => {
    if (SHOW_POLLING_LOGS) {
        logger.debug(`[POLLING] Device: ${req.query.deviceId}`);
    }
    res.json([]);
});

// Operation mode
app.post('/api/notifications/operation_mode', (req, res) => {
    const event = req.body;
    logger.info(`[MODE] ${event.operation_mode?.mode_name || 'N/A'} - Device: ${event.device_id || 'N/A'}`);
    res.json({});
});

// DAO
app.post('/api/notifications/dao', (req, res) => {
    const data = req.body;
    logger.info(`[DAO] Objeto: ${data.object || 'N/A'}, Verb: ${data.verb || 'N/A'}`);
    res.json({});
});

// SecBox
app.post('/api/notifications/secbox', (req, res) => {
    logger.info(`[SECBOX] Evento recebido`);
    res.json({});
});

// ============ MODO MONITOR ============

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
    
    // Resposta COM o campo 'result' que o dispositivo espera
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

// Novo endpoint para receber resultados (se necessário)
app.post('/result', (req, res) => {
    logger.info('[RESULT] recebido:', JSON.stringify(req.body));
    // Retornar 'result' vazio para aceitar
    res.status(200).json({ result: {} });
});

// Monitor na raiz
app.post('/new_user_identified.fcgi', handleUserIdentified);
app.post('/user_not_identified.fcgi', handleUserNotIdentified);

// Monitor com path /api/notifications
app.post('/api/notifications/new_user_identified.fcgi', handleUserIdentified);
app.post('/api/notifications/user_not_identified.fcgi', handleUserNotIdentified);

// ============ Rotas da API interna (DEPOIS dos endpoints do dispositivo) ============
app.use('/api', routes);

// ============ Catch-all para debug ============
app.all('*', (req, res) => {
    logger.warn(`[NÃO MAPEADO] ${req.method} ${req.url}`);
    logger.warn(`Body: ${JSON.stringify(req.body)}`);
    res.json({});
});

// ============ INICIALIZAÇÃO ============

async function startServer() {
    try {
        logger.info('==========================================');
        logger.info('🚀 Iniciando servidor IDFace Integration');
        logger.info('==========================================');
        
        await idFaceService.authenticate();
        
        const deviceInfo = await idFaceService.getDeviceInfo();
        logger.info(`📱 Dispositivo: ${deviceInfo.device_name}`);
        logger.info(`🔢 Serial: ${deviceInfo.serial}`);
        logger.info(`📡 Firmware: ${deviceInfo.version}`);
        
        // Armazenar sessão globalmente para uso nos endpoints
        app.locals.deviceSession = idFaceService.session;
        logger.info(`🔑 Sessão ativa: ${idFaceService.session}`);
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log('');
            logger.info('==========================================');
            logger.info(`✅ Servidor rodando na porta ${PORT}`);
            logger.info(`🔇 Heartbeat logs: ${SHOW_HEARTBEAT_LOGS ? 'ON' : 'OFF'}`);
            logger.info(`🔇 Polling logs: ${SHOW_POLLING_LOGS ? 'ON' : 'OFF'}`);
            logger.info('==========================================');
            console.log('');
        });
        
    } catch (error) {
        logger.error(`❌ Erro ao iniciar: ${error.message}`);
        
        app.listen(PORT, '0.0.0.0', () => {
            logger.info(`Servidor rodando na porta ${PORT} (modo offline)`);
        });
    }
}

startServer();