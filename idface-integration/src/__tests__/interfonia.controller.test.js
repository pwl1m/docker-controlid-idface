const axios = require('axios');
jest.mock('axios');

const idFaceService = require('../services/idface.service');
const InterfoniaController = require('../controllers/interfonia.controller');

describe('InterfoniaController - SIP Intercom', () => {
    let controller;
    let req;
    let res;

    beforeEach(() => {
        jest.resetAllMocks();
        controller = new InterfoniaController();
        req = { body: {}, query: {}, params: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            set: jest.fn(),
            send: jest.fn()
        };
        // Mock session
        idFaceService.session = 'test-session';
    });

    // ============ GET CONFIG ============
    describe('getConfig (get_configuration.fcgi)', () => {
        test('returns 200 with SIP config', async () => {
            jest.spyOn(idFaceService, 'getInterfoniaSipConfig')
                .mockResolvedValueOnce({ pjsip: { enabled: '1', server_ip: 'sip.local' } });

            await controller.getConfig(req, res);

            expect(idFaceService.getInterfoniaSipConfig).toHaveBeenCalledTimes(1);
            expect(res.json).toHaveBeenCalledWith({ pjsip: { enabled: '1', server_ip: 'sip.local' } });
            expect(res.status).not.toHaveBeenCalled();
        });

        test('returns device status code when service throws mapped error', async () => {
            jest.spyOn(idFaceService, 'getInterfoniaSipConfig')
                .mockRejectedValueOnce({
                    status: 400,
                    message: 'invalid payload',
                    details: { error: 'invalid payload' }
                });

            await controller.getConfig(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'invalid payload' });
        });
    });

    // ============ SET CONFIG ============
    describe('setConfig (set_configuration.fcgi)', () => {
        test('sends pjsip config to device with dialing_display_mode', async () => {
            req.body = {
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

            await controller.setConfig(req, res);

            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/set_configuration.fcgi'),
                expect.objectContaining({
                    pjsip: expect.objectContaining({
                        dialing_display_mode: '0', // CRÍTICO - sempre presente
                        enabled: '1',
                        server_ip: 'sip.example.com'
                    })
                }),
                expect.any(Object)
            );
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        test('returns 400 when pjsip is missing', async () => {
            req.body = {};

            await controller.setConfig(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Campo pjsip é obrigatório' });
        });

        test('converts all values to string for firmware 6.23 compatibility', async () => {
            req.body = {
                pjsip: {
                    enabled: 1,
                    server_port: 5060,
                    mic_volume: 7
                }
            };

            axios.post.mockResolvedValueOnce({ data: {} });

            await controller.setConfig(req, res);

            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/set_configuration.fcgi'),
                expect.objectContaining({
                    pjsip: expect.objectContaining({
                        enabled: '1',
                        server_port: '5060',
                        mic_volume: '7'
                    })
                }),
                expect.any(Object)
            );
        });

        test('sets auto_answer config', async () => {
            req.body = {
                pjsip: {
                    auto_answer_enabled: '1',
                    auto_answer_delay: '5'
                }
            };

            axios.post.mockResolvedValueOnce({ data: {} });

            await controller.setConfig(req, res);

            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/set_configuration.fcgi'),
                expect.objectContaining({
                    pjsip: expect.objectContaining({
                        dialing_display_mode: '0',
                        auto_answer_enabled: '1',
                        auto_answer_delay: '5'
                    })
                }),
                expect.any(Object)
            );
        });

        test('sets video and dialing mode', async () => {
            req.body = {
                pjsip: {
                    video_enabled: '1',
                    dialing_display_mode: '0',
                    auto_call_target: '2000'
                }
            };

            axios.post.mockResolvedValueOnce({ data: {} });

            await controller.setConfig(req, res);

            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/set_configuration.fcgi'),
                expect.objectContaining({
                    pjsip: expect.objectContaining({
                        video_enabled: '1',
                        dialing_display_mode: '0',
                        auto_call_target: '2000'
                    })
                }),
                expect.any(Object)
            );
        });
    });

    // ============ GET STATUS ============
    describe('getStatus (get_sip_status.fcgi)', () => {
        test('returns SIP registration status', async () => {
            const mockStatus = {
                status: 200,
                in_call: false
            };

            axios.post.mockResolvedValueOnce({ data: mockStatus });

            await controller.getStatus(req, res);

            expect(res.json).toEqual(expect.any(Function));
        });

        test('handles various SIP status codes', async () => {
            const statusCodes = [
                { status: -1, meaning: 'Disabled' },
                { status: 0, meaning: 'Connecting' },
                { status: 100, meaning: 'Connecting' },
                { status: 200, meaning: 'Connected' },
                { status: 401, meaning: 'Auth failed' },
                { status: 403, meaning: 'Auth failed' },
                { status: 408, meaning: 'Timeout' },
                { status: 503, meaning: 'Network failed' }
            ];

            for (const { status } of statusCodes) {
                axios.post.mockResolvedValueOnce({ data: { status, in_call: false } });
                
                await controller.getStatus(req, res);
                
                expect(res.json).toHaveBeenCalled();
            }
        });
    });

    // ============ MAKE CALL ============
    describe('makeCall (make_sip_call.fcgi)', () => {
        test('makes a SIP call with target', async () => {
            req.body = { target: '1001' };
            axios.post.mockResolvedValueOnce({ data: { success: true } });

            await controller.makeCall(req, res);

            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/make_sip_call.fcgi'),
                expect.objectContaining({ target: '1001' }),
                expect.any(Object)
            );
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        test('returns 400 when target is missing', async () => {
            req.body = {};

            await controller.makeCall(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Campo target é obrigatório' });
        });

        test('converts numeric target to string', async () => {
            req.body = { target: 1001 };
            axios.post.mockResolvedValueOnce({ data: { success: true } });

            await controller.makeCall(req, res);

            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/make_sip_call.fcgi'),
                expect.objectContaining({ target: '1001' }),
                expect.any(Object)
            );
        });
    });

    // ============ END CALL ============
    describe('endCall (finalize_sip_call.fcgi)', () => {
        test('finalizes an active SIP call', async () => {
            axios.post.mockResolvedValueOnce({ data: {} });

            await controller.endCall(req, res);

            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/finalize_sip_call.fcgi'),
                {},
                expect.any(Object)
            );
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });
    });

    // ============ AUDIO ============
    describe('Audio messages', () => {
        test('set audio sends binary data', async () => {
            const audioBuffer = Buffer.from('fake-audio-data');
            req.body = audioBuffer;
            req.query = { current: '1', total: '1' };
            axios.post.mockResolvedValueOnce({ data: {} });

            await controller.setAudio(req, res);

            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/set_pjsip_audio_message.fcgi'),
                expect.any(Buffer),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Content-Type': 'application/octet-stream'
                    })
                })
            );
        });

        test('get audio returns audio data', async () => {
            const audioData = Buffer.from('audio-data');
            axios.post.mockResolvedValueOnce({ data: audioData });

            await controller.getAudio(req, res);

            expect(res.set).toHaveBeenCalledWith('Content-Type', 'audio/wav');
        });

        test('has audio checks if audio messages exist', async () => {
            axios.post.mockResolvedValueOnce({ data: { file_exists: true } });

            await controller.hasAudio(req, res);

            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/has_pjsip_audio_message.fcgi'),
                {},
                expect.any(Object)
            );
        });
    });

    // ============ DOOR RELEASE ============
    describe('configureDoorRelease', () => {
        test('configures DTMF door release', async () => {
            req.body = { enabled: '1', command: '#1234' };
            axios.post.mockResolvedValueOnce({ data: {} });

            await controller.configureDoorRelease(req, res);

            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/set_configuration.fcgi'),
                expect.objectContaining({
                    pjsip: expect.objectContaining({
                        dialing_display_mode: '0',
                        open_door_enabled: '1',
                        open_door_command: '#1234'
                    })
                }),
                expect.any(Object)
            );
        });
    });

    // ============ AUTO CALL ============
    describe('configureAutoCall', () => {
        test('configures auto call with target', async () => {
            req.body = { enabled: '1', target: '503', button_enabled: '1' };
            axios.post.mockResolvedValueOnce({ data: {} });

            await controller.configureAutoCall(req, res);

            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/set_configuration.fcgi'),
                expect.objectContaining({
                    pjsip: expect.objectContaining({
                        dialing_display_mode: '0',
                        auto_call_button_enabled: '1',
                        auto_call_target: '503'
                    })
                }),
                expect.any(Object)
            );
        });

        test('returns 400 when auto-call enabled but target missing', async () => {
            req.body = { enabled: '1' };

            await controller.configureAutoCall(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    // ============ VOLUMES ============
    describe('setVolumes', () => {
        test('sets mic and speaker volumes', async () => {
            req.body = { mic_volume: '8', speaker_volume: '6' };
            axios.post.mockResolvedValueOnce({ data: {} });

            await controller.setVolumes(req, res);

            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/set_configuration.fcgi'),
                expect.objectContaining({
                    pjsip: expect.objectContaining({
                        dialing_display_mode: '0',
                        mic_volume: '8',
                        speaker_volume: '6'
                    })
                }),
                expect.any(Object)
            );
        });

        test('clamps volume to valid range 1-10', async () => {
            req.body = { mic_volume: '15', speaker_volume: '0' };
            axios.post.mockResolvedValueOnce({ data: {} });

            await controller.setVolumes(req, res);

            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/set_configuration.fcgi'),
                expect.objectContaining({
                    pjsip: expect.objectContaining({
                        mic_volume: '10',  // Clamped to max
                        speaker_volume: '1' // Clamped to min
                    })
                }),
                expect.any(Object)
            );
        });
    });

    // ============ VIDEO ============
    describe('configureVideo', () => {
        test('enables video and returns reboot note', async () => {
            req.body = { enabled: '1' };
            axios.post.mockResolvedValueOnce({ data: {} });

            await controller.configureVideo(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                video_enabled: '1',
                note: expect.stringContaining('Reboot')
            }));
        });
    });

    // ============ FACIAL ID DURING CALL ============
    describe('configureFacialIdDuringCall', () => {
        test('enables facial ID during call', async () => {
            req.body = { enabled: '1' };
            axios.post.mockResolvedValueOnce({ data: {} });

            await controller.configureFacialIdDuringCall(req, res);

            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/set_configuration.fcgi'),
                expect.objectContaining({
                    pjsip: expect.objectContaining({
                        dialing_display_mode: '0',
                        facial_id_during_call_enabled: '1'
                    })
                }),
                expect.any(Object)
            );
        });
    });
});
