const axios = require('axios');
const logger = require('../utils/logger');

class IDFaceService {
    constructor() {
        this.deviceIp = process.env.IDFACE_DEVICE_IP;
        this.login = process.env.IDFACE_LOGIN || 'admin';
        this.password = process.env.IDFACE_PASSWORD || 'admin';
        this.session = null;
        this.sessionCheckInterval = null;
    }

    get baseUrl() {
        return `http://${this.deviceIp}`;
    }

    /**
     * Login no dispositivo
     * POST /login.fcgi
     */
    async authenticate() {
        try {
            logger.info(`[AUTH] Conectando ao dispositivo ${this.deviceIp}...`);
            
            const response = await axios.post(`${this.baseUrl}/login.fcgi`, {
                login: this.login,
                password: this.password
            });

            this.session = response.data.session;
            logger.info(`[AUTH] ✅ Login realizado! Session: ${this.session}`);
            
            // Iniciar verificação periódica da sessão
            this.startSessionCheck();
            
            return this.session;
        } catch (error) {
            logger.error(`[AUTH] ❌ Erro no login: ${error.message}`);
            throw error;
        }
    }

    /**
     * Verificar se a sessão é válida
     * POST /session_is_valid.fcgi
     */
    async isSessionValid() {
        if (!this.session) return false;

        try {
            const response = await axios.post(
                `${this.baseUrl}/session_is_valid.fcgi?session=${this.session}`
            );
            return response.data.session_is_valid === true;
        } catch (error) {
            logger.warn(`[AUTH] Sessão inválida ou expirada`);
            return false;
        }
    }

    /**
     * Garantir que temos uma sessão válida
     */
    async ensureAuthenticated() {
        if (!this.session) {
            await this.authenticate();
            return;
        }

        const isValid = await this.isSessionValid();
        if (!isValid) {
            logger.info('[AUTH] Sessão expirada, reconectando...');
            await this.authenticate();
        }
    }

    /**
     * Verificar sessão periodicamente (a cada 5 minutos)
     */
    startSessionCheck() {
        if (this.sessionCheckInterval) {
            clearInterval(this.sessionCheckInterval);
        }

        this.sessionCheckInterval = setInterval(async () => {
            const isValid = await this.isSessionValid();
            if (!isValid) {
                logger.warn('[AUTH] Sessão expirou, reconectando...');
                await this.authenticate();
            }
        }, 5 * 60 * 1000); // 5 minutos
    }

    /**
     * Obter informações do sistema
     * POST /system_information.fcgi
     */
    async getDeviceInfo() {
        await this.ensureAuthenticated();

        const response = await axios.post(
            `${this.baseUrl}/system_information.fcgi?session=${this.session}`
        );
        return response.data;
    }

    /**
     * Carregar objetos (usuários, logs, etc)
     * POST /load_objects.fcgi
     */
    async loadObjects(objectType, options = {}) {
        await this.ensureAuthenticated();

        const response = await axios.post(
            `${this.baseUrl}/load_objects.fcgi?session=${this.session}`,
            {
                object: objectType,
                ...options
            }
        );
        return response.data;
    }

    /**
     * Listar usuários cadastrados
     */
    async getUsers() {
        return this.loadObjects('users');
    }

    /**
     * Listar logs de acesso
     */
    async getAccessLogs(limit = 100) {
        return this.loadObjects('access_logs', { limit });
    }

    /**
     * Criar objetos (usuários, etc)
     * POST /create_objects.fcgi
     */
    async createObjects(objectType, values) {
        await this.ensureAuthenticated();

        const response = await axios.post(
            `${this.baseUrl}/create_objects.fcgi?session=${this.session}`,
            {
                object: objectType,
                values: Array.isArray(values) ? values : [values]
            }
        );
        
        return response.data;
    }

    /**
     * Cadastrar novo usuário
     */
    async createUser(userId, userName, registration = null) {
        const user = {
            id: userId,
            name: userName,
            registration: registration || String(userId)
        };

        const result = await this.createObjects('users', user);
        logger.info(`[USER] ✅ Usuário criado: ${userName} (ID: ${userId})`);
        return result;
    }

    /**
     * Modificar objetos
     * POST /modify_objects.fcgi
     */
    async modifyObjects(objectType, values, where = {}) {
        await this.ensureAuthenticated();

        const response = await axios.post(
            `${this.baseUrl}/modify_objects.fcgi?session=${this.session}`,
            {
                object: objectType,
                values,
                where
            }
        );
        
        return response.data;
    }

    /**
     * Destruir objetos
     * POST /destroy_objects.fcgi
     */
    async destroyObjects(objectType, where) {
        await this.ensureAuthenticated();

        const response = await axios.post(
            `${this.baseUrl}/destroy_objects.fcgi?session=${this.session}`,
            {
                object: objectType,
                where
            }
        );
        
        return response.data;
    }

    /**
     * Captura de imagem da câmera
     * POST /capture_camera.fcgi
     */
    async captureCamera() {
        await this.ensureAuthenticated();

        const response = await axios.post(
            `${this.baseUrl}/capture_camera.fcgi?session=${this.session}`,
            {},
            { responseType: 'arraybuffer' }
        );
        
        return response.data;
    }

    /**
     * Obter configurações
     * POST /get_configuration.fcgi
     */
    async getConfiguration() {
        await this.ensureAuthenticated();

        const response = await axios.post(
            `${this.baseUrl}/get_configuration.fcgi?session=${this.session}`
        );
        return response.data;
    }

    /**
     * Definir configurações
     * POST /set_configuration.fcgi
     */
    async setConfiguration(config) {
        await this.ensureAuthenticated();

        const response = await axios.post(
            `${this.baseUrl}/set_configuration.fcgi?session=${this.session}`,
            config
        );
        return response.data;
    }

    /**
     * Configurar modo monitor
     */
    async configureMonitor(serverIp, serverPort = 3001, path = '') {
        const config = {
            monitor: {
                hostname: serverIp,
                port: serverPort,
                path: path,
                timeout: 5000
            }
        };

        const result = await this.setConfiguration(config);
        logger.info(`[CONFIG] Monitor configurado: ${serverIp}:${serverPort}${path}`);
        return result;
    }
}

module.exports = new IDFaceService();