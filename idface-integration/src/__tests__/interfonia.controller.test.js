const axios = require('axios');
jest.mock('axios');

const idFaceService = require('../services/idface.service');

describe('InterfoniaController - SIP Intercom', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        idFaceService.session = 'test-session';
    });

    // ============ GET CONFIG ============
    describe('getConfig (get_configuration.fcgi)', () => {
        test('returns SIP configuration with pjsip fields', async () => {
            const mockData = {
                pjsip: {
                    enabled: '1',
                    server_ip: 'sip.example.com',
                    server_port: '5060',
                    branch: '1000',
                    login: '1000',
                    auto_answer_enabled: '0',
                    auto_answer_delay: '3',
                    dialing_display_mode: 'dial_pad',
                    auto_call_target: '',
                    video_enabled: '0',
                    max_call_time: '60',
                    rex_enabled: '0'
                }
            };

            axios.post.mockResolvedValueOnce({ data: mockData });

            const result = await idFaceService.postFcgi('get_configuration.fcgi', {
                pjsip: ['enabled', 'server_ip', 'server_port', 'branch', 'login']
            });

            expect(result.data).toEqual(mockData);
            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/get_configuration.fcgi'),
                expect.objectContaining({
                    pjsip: expect.any(Array)
                }),
                expect.any(Object)
            );
        });
    });

    // ============ SET CONFIG ============
    describe('setConfig (set_configuration.fcgi)', () => {
        test('sends pjsip config to device', async () => {
            const configPayload = {
                pjsip: {
                    enabled: '1',
                    server_ip: 'sip.example.com',
                    server_port: '5060',
                    branch: '1000',
                    login: '1000',
                    password: 'secret'
                }
            };

            axios.post.mockResolvedValueOnce({ data: {} });

            const result = await idFaceService.postFcgi('set_configuration.fcgi', configPayload);

            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/set_configuration.fcgi'),
                expect.objectContaining({
                    pjsip: expect.objectContaining({
                        enabled: '1',
                        server_ip: 'sip.example.com'
                    })
                }),
                expect.any(Object)
            );
        });

        test('sets auto_answer config', async () => {
            const configPayload = {
                pjsip: {
                    auto_answer_enabled: '1',
                    auto_answer_delay: '5'
                }
            };

            axios.post.mockResolvedValueOnce({ data: {} });

            const result = await idFaceService.postFcgi('set_configuration.fcgi', configPayload);

            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/set_configuration.fcgi'),
                expect.objectContaining({
                    pjsip: expect.objectContaining({
                        auto_answer_enabled: '1',
                        auto_answer_delay: '5'
                    })
                }),
                expect.any(Object)
            );
        });

        test('sets video and dialing mode', async () => {
            const configPayload = {
                pjsip: {
                    video_enabled: '1',
                    dialing_display_mode: 'auto_call',
                    auto_call_target: '2000'
                }
            };

            axios.post.mockResolvedValueOnce({ data: {} });

            const result = await idFaceService.postFcgi('set_configuration.fcgi', configPayload);

            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/set_configuration.fcgi'),
                expect.objectContaining({
                    pjsip: expect.objectContaining({
                        video_enabled: '1',
                        dialing_display_mode: 'auto_call',
                        auto_call_target: '2000'
                    })
                }),
                expect.any(Object)
            );
        });
    });

    // ============ MAKE CALL ============
    describe('makeCall (make_sip_call.fcgi)', () => {
        test('makes a SIP call with target', async () => {
            axios.post.mockResolvedValueOnce({ data: { success: true } });

            const result = await idFaceService.postFcgi('make_sip_call.fcgi', { target: '1001' });

            expect(result.data).toEqual({ success: true });
            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/make_sip_call.fcgi'),
                expect.objectContaining({ target: '1001' }),
                expect.any(Object)
            );
        });
    });

    // ============ FINALIZE CALL ============
    describe('finalizeCall (finalize_sip_call.fcgi)', () => {
        test('finalizes an active SIP call', async () => {
            axios.post.mockResolvedValueOnce({ data: {} });

            const result = await idFaceService.postFcgi('finalize_sip_call.fcgi', {});

            expect(result.data).toEqual({});
            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/finalize_sip_call.fcgi'),
                {},
                expect.any(Object)
            );
        });
    });

    // ============ GET STATUS ============
    describe('getStatus (get_sip_status.fcgi)', () => {
        test('returns SIP registration status', async () => {
            const mockStatus = {
                registered: true,
                in_call: false,
                call_target: ''
            };

            axios.post.mockResolvedValueOnce({ data: mockStatus });

            const result = await idFaceService.postFcgi('get_sip_status.fcgi', {});

            expect(result.data).toEqual(mockStatus);
            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/get_sip_status.fcgi'),
                {},
                expect.any(Object)
            );
        });
    });

    // ============ AUDIO ============
    describe('Audio messages', () => {
        test('set audio sends binary data', async () => {
            const audioBuffer = Buffer.from('fake-audio-data');
            axios.post.mockResolvedValueOnce({ data: {} });

            const result = await idFaceService.postFcgi(
                'set_pjsip_audio_message.fcgi?current=1&total=1',
                audioBuffer,
                { headers: { 'Content-Type': 'application/octet-stream' } }
            );

            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/set_pjsip_audio_message.fcgi'),
                audioBuffer,
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Content-Type': 'application/octet-stream'
                    })
                })
            );
        });

        test('get audio returns audio data', async () => {
            axios.post.mockResolvedValueOnce({ data: { audio: 'base64data' } });

            const result = await idFaceService.postFcgi('get_pjsip_audio_message.fcgi', {});

            expect(result.data).toEqual({ audio: 'base64data' });
        });

        test('has audio checks if audio messages exist', async () => {
            axios.post.mockResolvedValueOnce({ data: { has_audio: true } });

            const result = await idFaceService.postFcgi('has_audio_access_messages.fcgi', {});

            expect(result.data).toEqual({ has_audio: true });
        });
    });
});
