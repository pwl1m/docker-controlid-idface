const axios = require('axios');
jest.mock('axios');

const idFaceService = require('../services/idface.service');

describe('Interfonia SIP - Firmware 6.23+', () => {
    
    beforeEach(() => {
        jest.resetAllMocks();
        idFaceService.session = 'test-session';
        idFaceService.firmwareVersion = '6.23.0';
        idFaceService.firmwareMajor = 6;
        idFaceService.firmwareMinor = 23;
    });

    // ============ GET CONFIG ============
    describe('getInterfoniaSipConfig', () => {
        test('retorna config pjsip completa', async () => {
            const mockConfig = {
                pjsip: {
                    enabled: '1',
                    server_ip: 'sip.exemplo.com',
                    server_port: '5060',
                    branch: '1000',
                    login: '1000',
                    password: 'senhasip',
                    dialing_display_mode: '0',
                    auto_call_button_enabled: '1',
                    auto_call_target: '503',
                    video_enabled: '1',
                    mic_volume: '7',
                    speaker_volume: '7',
                    open_door_enabled: '1',
                    open_door_command: '#1234',
                    facial_id_during_call_enabled: '1'
                }
            };

            axios.post.mockResolvedValueOnce({ data: mockConfig });

            const result = await idFaceService.getInterfoniaSipConfig();

            expect(result).toEqual(mockConfig);
            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/get_configuration.fcgi'),
                expect.objectContaining({
                    pjsip: expect.any(Array)
                }),
                expect.any(Object)
            );
        });
    });

    // ============ SET CONFIG - dialing_display_mode OBRIGATÓRIO ============
    describe('setSipConfig - dialing_display_mode crítico', () => {
        test('deve sempre incluir dialing_display_mode', async () => {
            axios.post.mockResolvedValueOnce({ data: {} });

            await idFaceService.postFcgi('set_configuration.fcgi', {
                pjsip: {
                    dialing_display_mode: '0',
                    enabled: '1',
                    server_ip: 'sip.test.com'
                }
            });

            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/set_configuration.fcgi'),
                expect.objectContaining({
                    pjsip: expect.objectContaining({
                        dialing_display_mode: '0'
                    })
                }),
                expect.any(Object)
            );
        });

        test('config completa para dupla custódia', async () => {
            axios.post.mockResolvedValueOnce({ data: {} });

            const dualCustodyConfig = {
                pjsip: {
                    dialing_display_mode: '0',
                    enabled: '1',
                    server_ip: 'sip.exemplo.com',
                    server_port: '5060',
                    branch: '1000',
                    login: '1000',
                    password: 'senha',
                    auto_call_button_enabled: '1',
                    auto_call_target: '503',
                    open_door_enabled: '1',
                    open_door_command: '#1234',
                    video_enabled: '1',
                    max_call_time: '120',
                    facial_id_during_call_enabled: '1'
                }
            };

            await idFaceService.postFcgi('set_configuration.fcgi', dualCustodyConfig);

            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/set_configuration.fcgi'),
                dualCustodyConfig,
                expect.any(Object)
            );
        });
    });

    // ============ SIP STATUS ============
    describe('getSipStatus', () => {
        test('status 200 = registrado', async () => {
            axios.post.mockResolvedValueOnce({ 
                data: { status: 200, in_call: false } 
            });

            const result = await idFaceService.postFcgi('get_sip_status.fcgi', {});

            expect(result.data.status).toBe(200);
            expect(result.data.in_call).toBe(false);
        });

        test('status 408 = timeout', async () => {
            axios.post.mockResolvedValueOnce({ 
                data: { status: 408, in_call: false } 
            });

            const result = await idFaceService.postFcgi('get_sip_status.fcgi', {});

            expect(result.data.status).toBe(408);
        });

        test('status -1 = desabilitado', async () => {
            axios.post.mockResolvedValueOnce({ 
                data: { status: -1, in_call: false } 
            });

            const result = await idFaceService.postFcgi('get_sip_status.fcgi', {});

            expect(result.data.status).toBe(-1);
        });
    });

    // ============ CHAMADAS SIP ============
    describe('makeSipCall / finalizeSipCall', () => {
        test('inicia chamada para ramal', async () => {
            axios.post.mockResolvedValueOnce({ data: { success: true } });

            const result = await idFaceService.makeSipCall('503');

            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/make_sip_call.fcgi'),
                { target: '503' },
                expect.any(Object)
            );
        });

        test('finaliza chamada ativa', async () => {
            axios.post.mockResolvedValueOnce({ data: {} });

            const result = await idFaceService.finalizeSipCall();

            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/finalize_sip_call.fcgi'),
                {},
                expect.any(Object)
            );
        });
    });
});