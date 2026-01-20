const axios = require('axios');
jest.mock('axios');

const idFaceService = require('../services/idface.service');

describe('IDFaceService', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        idFaceService.session = null;
    });

    test('authenticate stores session', async () => {
        axios.post.mockResolvedValueOnce({ data: { session: 'abc123' } });
        const res = await idFaceService.authenticate();
        expect(res).toEqual({ success: true, session: 'abc123' });
        expect(idFaceService.session).toBe('abc123');
    });

    test('getDeviceInfo uses session and returns data', async () => {
        idFaceService.session = 'sess1';
        axios.post.mockResolvedValueOnce({ data: { model: 'iDAccess' } });
        const info = await idFaceService.getDeviceInfo();
        expect(info).toEqual({ model: 'iDAccess' });
        expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('/system_information.fcgi?session=sess1'), {}, expect.any(Object));
    });

    test('configureMonitor posts set_configuration with push_remote_address', async () => {
        idFaceService.session = 'sess2';
        axios.post.mockResolvedValueOnce({ data: { success: true } });
        const res = await idFaceService.configureMonitor('192.168.0.10', 8080, '/push');
        expect(res).toEqual({ success: true });
        expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('/set_configuration.fcgi?session=sess2'), expect.objectContaining({
            push_server: expect.objectContaining({
                push_remote_address: 'http://192.168.0.10:8080/push'
            })
        }), expect.any(Object));
    });

    test('loadObjects calls load_objects.fcgi', async () => {
        idFaceService.session = 'sess3';
        axios.post.mockResolvedValueOnce({ data: { object: 'users', data: [] } });
        const resp = await idFaceService.loadObjects('users', { limit: 10 });
        expect(resp).toEqual({ object: 'users', data: [] });
        expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('/load_objects.fcgi?session=sess3'), expect.objectContaining({ object: 'users', limit: 10 }), expect.any(Object));
    });

    test('createObjects posts create_objects', async () => {
        idFaceService.session = 'sess4';
        axios.post.mockResolvedValueOnce({ data: { success: true, created: [{ id: 1 }] } });
        const resp = await idFaceService.createObjects('users', [{ id: 1 }]);
        expect(resp).toEqual({ success: true, created: [{ id: 1 }] });
    });

    test('isSessionValid accepts session_is_valid response', async () => {
        idFaceService.session = 'sessX';
        axios.post.mockResolvedValueOnce({ data: { session_is_valid: true } });
        const valid = await idFaceService.isSessionValid();
        expect(valid).toBe(true);
    });

    test('isSessionValid returns false for invalid response', async () => {
        idFaceService.session = 'sessY';
        axios.post.mockResolvedValueOnce({ data: {} });
        const valid = await idFaceService.isSessionValid();
        expect(valid).toBe(false);
    });
});