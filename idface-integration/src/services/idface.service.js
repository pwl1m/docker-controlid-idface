const axios = require('axios');
const logger = require('../utils/logger');
const config = require('../config');

class IDFaceService {
    constructor() {
        this.session = null;
        this.sessionCheckInterval = null;
        this.sessionLifetime = 5 * 60 * 1000; // 5 minutes
    }

    get baseUrl() {
        return `http://${config.device.ip}`;
    }

    get credentials() {
        return {
            login: config.device.login,
            password: config.device.password
        };
    }

    async isSessionValid() {
        if (!this.session) return false;
        try {
            const url = `${this.baseUrl}/session_is_valid.fcgi?session=${this.session}`;
            const resp = await axios.post(url, {}, { timeout: 5000 });
            return resp.data?.session_is_valid === true;
        } catch (error) {
            logger.warn('Session validation failed:', error.message);
            return false;
        }
    }

    async authenticate() {
        try {
            const url = `${this.baseUrl}/login.fcgi`;
            const { login, password } = this.credentials;
            
            logger.info(`Will login to ip: ${config.device.ip}`);
            
            const resp = await axios.post(url, { login, password }, { timeout: 10000 });
            
            if (resp.data?.session) {
                this.session = resp.data.session;
                logger.info('login success:', resp.data);
                this.startSessionCheck();
                return { success: true, session: this.session };
            }
            
            throw new Error('No session returned');
        } catch (error) {
            logger.error('Error performing request:', error.message);
            throw error;
        }
    }

    async ensureAuthenticated() {
        if (!this.session) {
            await this.authenticate();
            return;
        }
        const valid = await this.isSessionValid();
        if (!valid) {
            logger.info('Session expired, re-authenticating...');
            await this.authenticate();
        }
    }

    startSessionCheck() {
        if (this.sessionCheckInterval) clearInterval(this.sessionCheckInterval);
        this.sessionCheckInterval = setInterval(async () => {
            const valid = await this.isSessionValid();
            if (!valid) {
                logger.warn('Session invalid, will re-authenticate on next request');
                this.session = null;
            }
        }, this.sessionLifetime);
    }

    async getDeviceInfo() {
        await this.ensureAuthenticated();
        try {
            const url = `${this.baseUrl}/system_information.fcgi?session=${this.session}`;
            const resp = await axios.post(url, {}, { timeout: 10000 });
            return resp.data;
        } catch (error) {
            logger.error('getDeviceInfo failed:', error.message);
            throw error;
        }
    }

    async configureMonitor(serverIp, serverPort, path = '') {
        await this.ensureAuthenticated();
        try {
            const ip = serverIp || config.server.ip || require('ip').address();
            const port = serverPort || config.server.port;
            const pushAddress = `http://${ip}:${port}${path}`;
            
            const url = `${this.baseUrl}/set_configuration.fcgi?session=${this.session}`;
            const payload = {
                push_server: {
                    push_request_timeout: config.push.requestTimeout,
                    push_request_period: config.push.requestPeriod,
                    push_remote_address: pushAddress
                }
            };
            
            logger.info(`Setting push to: ${pushAddress}`);
            const resp = await axios.post(url, payload, { timeout: 10000 });
            logger.info('set push success:', resp.data);
            return resp.data;
        } catch (error) {
            logger.error('Error performing set push:', error.message);
            throw error;
        }
    }

    async loadObjects(objectType, options = {}) {
        await this.ensureAuthenticated();
        try {
            const url = `${this.baseUrl}/load_objects.fcgi?session=${this.session}`;
            const payload = { object: objectType };
            
            if (options.where) payload.where = options.where;
            if (options.limit) payload.limit = options.limit;
            if (options.offset) payload.offset = options.offset;
            
            const resp = await axios.post(url, payload, { timeout: 10000 });
            return resp.data;
        } catch (error) {
            logger.error(`loadObjects(${objectType}) failed:`, error.message);
            throw error;
        }
    }

    async createObjects(objectType, values) {
        await this.ensureAuthenticated();
        
        const payload = {
            object: objectType,
            values: Array.isArray(values) ? values : [values]
        };
        
        const response = await this.postFcgi('create_objects.fcgi', payload);
        return response.data;
    }

    async modifyObjects(objectType, id, values) {
        await this.ensureAuthenticated();
        try {
            const url = `${this.baseUrl}/modify_objects.fcgi?session=${this.session}`;
            const payload = {
                object: objectType,
                values: { ...values },
                where: { [objectType]: { id: Number(id) } }
            };
            
            logger.info(`Modifying ${objectType}`, payload);
            const resp = await axios.post(url, payload, { timeout: 10000 });
            return resp.data;
        } catch (error) {
            logger.error(`modifyObjects(${objectType}) failed:`, error.message);
            throw error;
        }
    }

    async destroyObjects(objectType, id) {
        await this.ensureAuthenticated();
        try {
            const url = `${this.baseUrl}/destroy_objects.fcgi?session=${this.session}`;
            const payload = {
                object: objectType,
                where: { [objectType]: { id: Number(id) } }
            };
            
            logger.info(`Destroying ${objectType} id=${id}`);
            const resp = await axios.post(url, payload, { timeout: 10000 });
            return resp.data;
        } catch (error) {
            logger.error(`destroyObjects(${objectType}) failed:`, error.message);
            throw error;
        }
    }

    async remoteAction(action = 'open', door = 1) {
        await this.ensureAuthenticated();
        try {
            const url = `${this.baseUrl}/execute_actions.fcgi?session=${this.session}`;
            
            let parameters;
            switch (action) {
                case 'open':
                    parameters = `door=${door}`;
                    break;
                case 'close':
                    parameters = `door=${door},close=1`;
                    break;
                case 'hold_open':
                    parameters = `door=${door},hold=1`;
                    break;
                case 'release':
                    parameters = `door=${door},release=1`;
                    break;
                default:
                    parameters = `door=${door}`;
            }

            const payload = { actions: [{ action: 'door', parameters }] };
            
            logger.info(`Remote action: ${action}`, payload);
            const resp = await axios.post(url, payload, { timeout: 10000 });
            return resp.data;
        } catch (error) {
            logger.error(`remoteAction(${action}) failed:`, error.message);
            throw error;
        }
    }

    buildUrl(path) {
        const normalized = path.includes('?')
            ? path
            : path.includes('&')
                ? path.replace('&', '?')
                : path;
        const separator = normalized.includes('?') ? '&' : '?';
        return `${this.baseUrl}/${normalized}${separator}session=${this.session}`;
    }

    normalizeAxiosError(error, context = 'request') {
        if (error?.response) {
            const status = error.response.status;
            const details = error.response.data;
            const message =
                details?.error ||
                details?.message ||
                `${context} failed with status code ${status}`;

            const err = new Error(message);
            err.status = status;
            err.details = details;
            return err;
        }

        const err = new Error(error?.message || `${context} failed`);
        err.status = 502;
        return err;
    }

    async postFcgi(path, payload = null, options = {}) {
        await this.ensureAuthenticated();
        try {
            const url = this.buildUrl(path);
            const resp = await axios.post(url, payload, {
                timeout: 10000,
                responseType: options.responseType || 'json',
                headers: options.headers || {}
            });
            return resp;
        } catch (error) {
            logger.error(`postFcgi(${path}) failed:`, error.message);
            throw this.normalizeAxiosError(error, `postFcgi(${path})`);
        }
    }

    async getFcgi(path, options = {}) {
        await this.ensureAuthenticated();
        try {
            const url = this.buildUrl(path);
            const resp = await axios.get(url, {
                timeout: 10000,
                responseType: options.responseType || 'json',
                headers: options.headers || {}
            });
            return resp;
        } catch (error) {
            logger.error(`getFcgi(${path}) failed:`, error.message);
            throw this.normalizeAxiosError(error, `getFcgi(${path})`);
        }
    }

    async getInterfoniaSipConfig() {
        const payload = {
            pjsip: [
                'enabled',
                'server_ip',
                'server_port',
                'server_outbound_port',
                'server_outbound_port_range',
                'numeric_branch_enabled',
                'branch',
                'login',
                'password',
                'peer_to_peer_enabled',
                'reg_status_query_period',
                'server_retry_interval',
                'max_call_time',
                'push_button_debounce',
                'auto_answer_enabled',
                'auto_answer_delay',
                'auto_call_button_enabled',
                'rex_enabled',
                'dialing_display_mode',
                'auto_call_target',
                'custom_identifier_auto_call',
                'video_enabled',
                'pjsip_custom_audio_enabled',
                'custom_audio_volume_gain',
                'mic_volume',
                'speaker_volume',
                'open_door_enabled',
                'open_door_command',
                'facial_id_during_call_enabled'
            ]
        };

        const resp = await this.postFcgi('get_configuration.fcgi', payload);
        return resp.data;
    }

    async objectAddField(payload) {
        const resp = await this.postFcgi('object_add_field.fcgi', payload);
        return resp.data;
    }

    async objectRemoveField(payload) {
        const resp = await this.postFcgi('object_remove_field.fcgi', payload);
        return resp.data;
    }

    // Compatibilidade retroativa com código já existente
    async objectRemoveFields(payload) {
        try {
            return await this.objectRemoveField(payload);
        } catch (error) {
            if (error.status === 404) {
                const resp = await this.postFcgi('object_remove_fields.fcgi', payload);
                return resp.data;
            }
            throw error;
        }
    }

    // Métodos auxiliares
    async getUsers(options = {}) {
        return this.loadObjects('users', options);
    }

    async getAccessLogs(limit = 100) {
        return this.loadObjects('access_logs', { limit });
    }

    async getUserById(userId) {
        try {
            const result = await this.loadObjects('users', {
                where: [{ object: 'users', field: 'id', value: Number(userId) }]
            });
            
            if (result.users && result.users.length > 0) {
                const user = result.users[0];
                return {
                    id: user.id,
                    name: user.name,
                    registration: user.registration,
                    password: user.password
                };
            }
            
            logger.warn(`Usuário com ID ${userId} não encontrado no dispositivo`);
            return null;
        } catch (error) {
            logger.error(`Erro ao buscar usuário ${userId}: ${error.message}`);
            throw error;
        }
    }

    async createUser(userId, userName, registration = null) {
        return this.createObjects('users', [{ id: userId, name: userName, registration }]);
    }

    async updateUser(id, values) {
        return this.modifyObjects('users', id, values);
    }

    async deleteUser(id) {
        return this.destroyObjects('users', id);
    }
}

module.exports = new IDFaceService();