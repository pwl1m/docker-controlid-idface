/**
 * Configurações do servidor - Padrão oficial Control iD
 * Baseado em: https://github.com/controlid/integracao
 */
module.exports = {
    // Dispositivo iDFace
    device: {
        ip: process.env.DEVICE_IP || '192.168.0.129',
        login: process.env.DEVICE_LOGIN || 'admin',
        password: process.env.DEVICE_PASSWORD || 'admin',
    },
    
    // Servidor (esta aplicação)
    server: {
        port: parseInt(process.env.PORT, 10) || 3001,
        ip: process.env.SERVER_IP || null, // Se null, usa ip.address() automaticamente
    },
    
    // Push (configuração enviada ao dispositivo)
    push: {
        requestTimeout: process.env.PUSH_REQUEST_TIMEOUT || '4000',
        requestPeriod: process.env.PUSH_REQUEST_PERIOD || '5',
    },
    
    // Segurança da API interna (opcional)
    auth: {
        apiKey: process.env.API_KEY || null, // Se null, endpoints não protegidos
    },
    
    // Logs
    logs: {
        showHeartbeat: process.env.SHOW_HEARTBEAT_LOGS === 'true',
        showPolling: process.env.SHOW_POLLING_LOGS === 'true',
    },
};