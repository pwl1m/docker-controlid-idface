const axios = require('axios');
jest.mock('axios');

const idFaceService = require('../services/idface.service');
const CustodyController = require('../controllers/custody.controller');

describe('Custódia - Simples e Dupla', () => {
    let controller;
    let req;
    let res;

    beforeEach(() => {
        jest.resetAllMocks();
        controller = new CustodyController();
        req = { body: {}, params: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        idFaceService.session = 'test-session';
    });

    // ============ HELPERS ============
    const mockFirmware623 = () => {
        idFaceService.firmwareVersion = '6.23.0';
        idFaceService.firmwareMajor = 6;
        idFaceService.firmwareMinor = 23;
        jest.spyOn(idFaceService, 'detectFirmwareVersion').mockResolvedValue('6.23.0');
        jest.spyOn(idFaceService, 'isFirmware623OrHigher').mockReturnValue(true);
        jest.spyOn(idFaceService, 'isFirmwareLegacy').mockReturnValue(false);
    };

    const mockFirmwareLegacy = () => {
        idFaceService.firmwareVersion = '6.20.0';
        idFaceService.firmwareMajor = 6;
        idFaceService.firmwareMinor = 20;
        jest.spyOn(idFaceService, 'detectFirmwareVersion').mockResolvedValue('6.20.0');
        jest.spyOn(idFaceService, 'isFirmware623OrHigher').mockReturnValue(false);
        jest.spyOn(idFaceService, 'isFirmwareLegacy').mockReturnValue(true);
    };

    // ============ getSafePjsipDefaults ============
    describe('getSafePjsipDefaults', () => {
        test('sempre retorna dialing_display_mode', () => {
            const defaults = controller.getSafePjsipDefaults();
            
            expect(defaults).toEqual({
                dialing_display_mode: '0'
            });
        });
    });

    // ============ GET CONFIG ============
    describe('getIdentificationConfig', () => {
        test('firmware 6.23+ retorna apenas pjsip + nota manual', async () => {
            mockFirmware623();
            
            axios.post
                .mockResolvedValueOnce({ 
                    data: { pjsip: { enabled: '1', auto_call_target: '503' } } 
                })
                .mockResolvedValueOnce({ 
                    data: { status: 200, in_call: false } 
                });

            await controller.getIdentificationConfig(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                firmware: '6.23.0',
                firmware_type: '6.23+',
                note: expect.stringContaining('6.23+')
            }));
        });

        test('firmware legacy retorna general + identifier + pjsip', async () => {
            mockFirmwareLegacy();
            
            axios.post
                .mockResolvedValueOnce({ 
                    data: { pjsip: { enabled: '1' } } 
                })
                .mockResolvedValueOnce({ 
                    data: { status: 200 } 
                })
                .mockResolvedValueOnce({ 
                    data: { 
                        general: { identification_mode: '1' },
                        identifier: { pin_enabled: '1' }
                    } 
                });

            await controller.getIdentificationConfig(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                firmware_type: 'legacy',
                general: expect.any(Object),
                identifier: expect.any(Object)
            }));
        });
    });

    // ============ SETUP SIMPLES CUSTÓDIA ============
    describe('setupSimpleCustody', () => {
        test('configura PJSIP para todos os firmwares', async () => {
            mockFirmware623();
            req.body = { min_score: '80' };

            axios.post.mockResolvedValue({ data: {} });
            jest.spyOn(idFaceService, 'createObjects').mockResolvedValue({ ids: [1] });

            await controller.setupSimpleCustody(req, res);

            // Deve configurar PJSIP
            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/set_configuration.fcgi'),
                expect.objectContaining({
                    pjsip: expect.objectContaining({
                        dialing_display_mode: '0',
                        facial_id_during_call_enabled: '1',
                        auto_call_button_enabled: '0'
                    })
                }),
                expect.any(Object)
            );
        });

        test('firmware 6.23+ inclui manual_config_required', async () => {
            mockFirmware623();
            req.body = {};

            axios.post.mockResolvedValue({ data: {} });
            jest.spyOn(idFaceService, 'createObjects').mockResolvedValue({ ids: [1] });

            await controller.setupSimpleCustody(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                manual_config_required: expect.arrayContaining([
                    expect.stringContaining('Menu')
                ])
            }));
        });

        test('firmware legacy configura general + identifier', async () => {
            mockFirmwareLegacy();
            req.body = {};

            axios.post.mockResolvedValue({ data: {} });
            jest.spyOn(idFaceService, 'createObjects').mockResolvedValue({ ids: [1] });

            await controller.setupSimpleCustody(req, res);

            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/set_configuration.fcgi'),
                expect.objectContaining({
                    general: expect.objectContaining({
                        identification_mode: '1'
                    }),
                    identifier: expect.objectContaining({
                        pin_enabled: '1',
                        multi_factor_authentication: '1'
                    })
                }),
                expect.any(Object)
            );
        });
    });

    // ============ SETUP DUPLA CUSTÓDIA ============
    describe('setupDualCustody', () => {
        test('retorna 400 sem sip_target', async () => {
            mockFirmware623();
            req.body = {};

            await controller.setupDualCustody(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: expect.stringContaining('sip_target')
            }));
        });

        test('configura auto-call + DTMF door', async () => {
            mockFirmware623();
            req.body = {
                sip_target: '503',
                open_door_command: '#1234',
                video_enabled: '1',
                max_call_time: '120'
            };

            axios.post
                .mockResolvedValueOnce({ data: { status: 200 } }) // sip status
                .mockResolvedValueOnce({ data: {} }); // pjsip config
            jest.spyOn(idFaceService, 'createObjects').mockResolvedValue({ ids: [1] });

            await controller.setupDualCustody(req, res);

            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/set_configuration.fcgi'),
                expect.objectContaining({
                    pjsip: expect.objectContaining({
                        dialing_display_mode: '0',
                        auto_call_button_enabled: '1',
                        auto_call_target: '503',
                        open_door_enabled: '1',
                        open_door_command: '#1234',
                        video_enabled: '1',
                        max_call_time: '120'
                    })
                }),
                expect.any(Object)
            );
        });

        test('adiciona warning quando SIP não registrado', async () => {
            mockFirmware623();
            req.body = { sip_target: '503' };

            axios.post
                .mockResolvedValueOnce({ data: { status: 408 } }) // SIP timeout
                .mockResolvedValueOnce({ data: {} });
            jest.spyOn(idFaceService, 'createObjects').mockResolvedValue({ ids: [1] });

            await controller.setupDualCustody(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                warnings: expect.arrayContaining([
                    expect.stringContaining('SIP')
                ])
            }));
        });

        test('retorna flow_description do processo', async () => {
            mockFirmware623();
            req.body = { sip_target: '503', open_door_command: '#1234' };

            axios.post
                .mockResolvedValueOnce({ data: { status: 200 } })
                .mockResolvedValueOnce({ data: {} });
            jest.spyOn(idFaceService, 'createObjects').mockResolvedValue({ ids: [1] });

            await controller.setupDualCustody(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                flow_description: expect.arrayContaining([
                    expect.stringContaining('PIN'),
                    expect.stringContaining('face'),
                    expect.stringContaining('503'),
                    expect.stringContaining('#1234')
                ])
            }));
        });
    });

    // ============ RESET TO DEFAULT ============
    describe('resetToDefault', () => {
        test('desabilita auto-call e DTMF', async () => {
            mockFirmware623();

            axios.post.mockResolvedValue({ data: {} });

            await controller.resetToDefault(req, res);

            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/set_configuration.fcgi'),
                expect.objectContaining({
                    pjsip: expect.objectContaining({
                        dialing_display_mode: '0',
                        auto_call_button_enabled: '0',
                        auto_call_target: '',
                        open_door_enabled: '0',
                        open_door_command: ''
                    })
                }),
                expect.any(Object)
            );
        });

        test('firmware legacy restaura modo 1:N', async () => {
            mockFirmwareLegacy();

            axios.post.mockResolvedValue({ data: {} });

            await controller.resetToDefault(req, res);

            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/set_configuration.fcgi'),
                expect.objectContaining({
                    general: expect.objectContaining({
                        identification_mode: '0'
                    }),
                    identifier: expect.objectContaining({
                        pin_enabled: '0',
                        multi_factor_authentication: '0'
                    })
                }),
                expect.any(Object)
            );
        });
    });

    // ============ TEST FLOW ============
    describe('testDualCustodyFlow', () => {
        test('valida todas as verificações passando', async () => {
            mockFirmware623();
            req.body = { sip_target: '503' };

            axios.post
                .mockResolvedValueOnce({
                    data: {
                        pjsip: {
                            enabled: '1',
                            auto_call_target: '503',
                            auto_call_button_enabled: '1',
                            open_door_enabled: '1',
                            open_door_command: '#1234',
                            dialing_display_mode: '0'
                        }
                    }
                })
                .mockResolvedValueOnce({ data: { status: 200, in_call: false } });

            await controller.testDualCustodyFlow(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                summary: expect.objectContaining({
                    failed: 0
                })
            }));
        });

        test('retorna failed_checks quando config errada', async () => {
            mockFirmware623();
            req.body = { sip_target: '503' };

            axios.post
                .mockResolvedValueOnce({
                    data: {
                        pjsip: {
                            enabled: '0', // ERRADO
                            auto_call_target: '',
                            auto_call_button_enabled: '0'
                        }
                    }
                })
                .mockResolvedValueOnce({ data: { status: 408 } });

            await controller.testDualCustodyFlow(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                failed_checks: expect.arrayContaining([
                    expect.objectContaining({ pass: false })
                ]),
                recommendations: expect.any(Array)
            }));
        });
    });
});