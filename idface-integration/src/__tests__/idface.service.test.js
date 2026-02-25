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

describe('IDFaceService - SIP config and object fields', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        jest.spyOn(idFaceService, 'ensureAuthenticated').mockResolvedValue();
        jest.spyOn(idFaceService, 'buildUrl').mockImplementation((p) => `http://device/${p}`);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('getInterfoniaSipConfig calls get_configuration.fcgi with pjsip keys', async () => {
        axios.post.mockResolvedValueOnce({ data: { pjsip: { enabled: '1' } } });

        const data = await idFaceService.getInterfoniaSipConfig();

        expect(axios.post).toHaveBeenCalledTimes(1);
        expect(axios.post.mock.calls[0][0]).toContain('get_configuration.fcgi');
        expect(axios.post.mock.calls[0][1]).toHaveProperty('pjsip');
        expect(Array.isArray(axios.post.mock.calls[0][1].pjsip)).toBe(true);
        expect(data).toEqual({ pjsip: { enabled: '1' } });
    });

    test('objectRemoveField uses singular endpoint object_remove_field.fcgi', async () => {
        axios.post.mockResolvedValueOnce({ data: { success: true } });

        const data = await idFaceService.objectRemoveField({ object: 'users', field_name: 'cpf' });

        expect(axios.post).toHaveBeenCalledTimes(1);
        expect(axios.post.mock.calls[0][0]).toContain('object_remove_field.fcgi');
        expect(data).toEqual({ success: true });
    });

    test('objectRemoveFields falls back to object_remove_fields.fcgi on 404', async () => {
        axios.post
            .mockRejectedValueOnce({ response: { status: 404, data: { error: 'not found' } } })
            .mockResolvedValueOnce({ data: { success: true } });

        const data = await idFaceService.objectRemoveFields({ object: 'users', field_name: 'cpf' });

        expect(axios.post).toHaveBeenCalledTimes(2);
        expect(axios.post.mock.calls[0][0]).toContain('object_remove_field.fcgi');
        expect(axios.post.mock.calls[1][0]).toContain('object_remove_fields.fcgi');
        expect(data).toEqual({ success: true });
    });

    test('postFcgi maps axios 400 to error.status=400 (not 500)', async () => {
        axios.post.mockRejectedValueOnce({
            response: { status: 400, data: { error: 'invalid payload' } }
        });

        await expect(idFaceService.postFcgi('set_configuration.fcgi', { any: 1 }))
            .rejects
            .toMatchObject({
                status: 400,
                details: { error: 'invalid payload' }
            });
    });
});