const axios = require('axios');
jest.mock('axios');

const idFaceService = require('../services/idface.service');
const CustodyController = require('../controllers/custody.controller');

describe('CustodyController - Simples e Dupla Custódia', () => {
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
        idFaceService.firmwareVersion = null;
        idFaceService.firmwareMajor = 0;
        idFaceService.firmwareMinor = 0;
    });

    // ============ HELPER: Mock firmware detection ============
    const mockFirmwareLegacy = () => {
        idFaceService.firmwareVersion = '6.20.0';
        idFaceService.firmwareMajor = 6;
        idFaceService.firmwareMinor = 20;
        jest.spyOn(idFaceService, 'detectFirmwareVersion').mockResolvedValue('6.20.0');
        jest.spyOn(idFaceService, 'isFirmware623OrHigher').mockReturnValue(false);
        jest.spyOn(idFaceService, 'isFirmwareLegacy').mockReturnValue(true);
    };

    const mockFirmware623 = () => {
        idFaceService.firmwareVersion = '6.23.0';
        idFaceService.firmwareMajor = 6;
        idFaceService.firmwareMinor = 23;
        jest.spyOn(idFaceService, 'detectFirmwareVersion').mockResolvedValue('6.23.0');
        jest.spyOn(idFaceService, 'isFirmware623OrHigher').mockReturnValue(true);
        jest.spyOn(idFaceService, 'isFirmwareLegacy').mockReturnValue(false);
    };

    // ============ GET IDENTIFICATION CONFIG ============
    describe('getIdentificationConfig', () => {
        test('reads pjsip config for firmware 6.23+', async () => {
            mockFirmware623();
            
            const mockPjsipConfig = {
                pjsip: {
                    enabled: '1',
                    auto_call_target: '503',
                    open_door_enabled: '1',
                    open_door_command: '#1234',
                    dialing_display_mode: '0'
                }
            };
            
            axios.post
                .mockResolvedValueOnce({ data: mockPjsipConfig }) // pjsip config
                .mockResolvedValueOnce({ data: { status: 200, in_call: false } }); // sip status

            await controller.getIdentificationConfig(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                firmware: '6.23.0',
                firmware_type: '6.23+',
                pjsip: mockPjsipConfig.pjsip,
                note: expect.stringContaining('6.23+')
            }));
        });

        test('reads general, identifier, pjsip config for legacy firmware', async () => {
            mockFirmwareLegacy();
            
            const mockPjsipConfig = {
                pjsip: { enabled: '1', auto_call_target: '503' }
            };
            const mockLegacyConfig = {
                general: { identification_mode: '1', multi_factor_authentication: '1' },
                identifier: { face_identify_enabled: '1', pin_enabled: '1' },
                face_id: { min_score: '80' }
            };

            axios.post
                .mockResolvedValueOnce({ data: mockPjsipConfig }) // pjsip
                .mockResolvedValueOnce({ data: { status: 200 } })  // sip status
                .mockResolvedValueOnce({ data: mockLegacyConfig }); // legacy config

            await controller.getIdentificationConfig(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                firmware: '6.20.0',
                firmware_type: 'legacy',
                pjsip: mockPjsipConfig.pjsip,
                general: mockLegacyConfig.general,
                identifier: mockLegacyConfig.identifier
            }));
        });
    });

    // ============ SETUP SIMPLE CUSTODY ============
    describe('setupSimpleCustody', () => {
        test('configures PJSIP for all firmwares', async () => {
            mockFirmware623();
            req.body = {
                access_rule_name: 'Custódia Simples',
                min_score: '80',
                identification_timeout: '30'
            };

            axios.post.mockResolvedValue({ data: {} });

            await controller.setupSimpleCustody(req, res);

            // Deve configurar PJSIP com dialing_display_mode
            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/set_configuration.fcgi'),
                expect.objectContaining({
                    pjsip: expect.objectContaining({
                        dialing_display_mode: '0',
                        enabled: '1',
                        facial_id_during_call_enabled: '1',
                        auto_call_button_enabled: '0'
                    })
                }),
                expect.any(Object)
            );
        });

        test('configures general+identifier for legacy firmware', async () => {
            mockFirmwareLegacy();
            req.body = {};

            axios.post.mockResolvedValue({ data: {} });

            await controller.setupSimpleCustody(req, res);

            // Deve ter chamada para general/identifier
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

        test('adds manual config required for firmware 6.23+', async () => {
            mockFirmware623();
            req.body = {};

            axios.post.mockResolvedValue({ data: {} });

            await controller.setupSimpleCustody(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                manual_config_required: expect.arrayContaining([
                    expect.stringContaining('Menu')
                ])
            }));
        });
    });

    // ============ SETUP DUAL CUSTODY ============
    describe('setupDualCustody', () => {
        test('returns 400 when sip_target is missing', async () => {
            mockFirmware623();
            req.body = {};

            await controller.setupDualCustody(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: expect.stringContaining('sip_target')
            }));
        });

        test('configures face 1:1 + SIP auto-call + DTMF door', async () => {
            mockFirmware623();
            req.body = {
                sip_target: '503',
                open_door_command: '#1234',
                video_enabled: '1',
                max_call_time: '120'
            };

            // Mock SIP status primeiro
            axios.post
                .mockResolvedValueOnce({ data: { status: 200, in_call: false } }) // sip status
                .mockResolvedValueOnce({ data: {} }) // pjsip config
                .mockResolvedValueOnce({ data: { ids: [1] } }); // access rule

            await controller.setupDualCustody(req, res);

            // Deve configurar PJSIP com auto-call
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

        test('adds warning when SIP not registered', async () => {
            mockFirmware623();
            req.body = { sip_target: '503' };

            axios.post
                .mockResolvedValueOnce({ data: { status: 408, in_call: false } }) // SIP timeout
                .mockResolvedValueOnce({ data: {} }) // pjsip config
                .mockResolvedValueOnce({ data: { ids: [1] } }); // access rule

            await controller.setupDualCustody(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                warnings: expect.arrayContaining([
                    expect.stringContaining('SIP não está registrado')
                ])
            }));
        });

        test('configures general+identifier for legacy firmware', async () => {
            mockFirmwareLegacy();
            req.body = {
                sip_target: '503',
                open_door_command: '#1234'
            };

            axios.post
                .mockResolvedValueOnce({ data: { status: 200 } }) // sip status
                .mockResolvedValueOnce({ data: {} }) // pjsip config
                .mockResolvedValueOnce({ data: {} }) // general+identifier
                .mockResolvedValueOnce({ data: { ids: [1] } }); // access rule

            await controller.setupDualCustody(req, res);

            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/set_configuration.fcgi'),
                expect.objectContaining({
                    general: expect.objectContaining({
                        identification_mode: '1'
                    }),
                    identifier: expect.objectContaining({
                        pin_enabled: '1'
                    })
                }),
                expect.any(Object)
            );
        });
    });

    // ============ RESET TO DEFAULT ============
    describe('resetToDefault', () => {
        test('disables auto-call and DTMF for all firmwares', async () => {
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

        test('restores 1:N mode for legacy firmware', async () => {
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

        test('adds manual config required for firmware 6.23+', async () => {
            mockFirmware623();

            axios.post.mockResolvedValue({ data: {} });

            await controller.resetToDefault(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                manual_config_required: expect.arrayContaining([
                    expect.stringContaining('Menu')
                ])
            }));
        });
    });

    // ============ TEST DUAL CUSTODY FLOW ============
    describe('testDualCustodyFlow', () => {
        test('validates all checks pass', async () => {
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
                            dialing_display_mode: '0',
                            video_enabled: '1',
                            facial_id_during_call_enabled: '1'
                        }
                    }
                }) // pjsip config
                .mockResolvedValueOnce({ data: { status: 200, in_call: false } }); // sip status

            await controller.testDualCustodyFlow(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                summary: expect.objectContaining({
                    passed: expect.any(Number),
                    failed: 0
                })
            }));
        });

        test('returns failed checks when config is wrong', async () => {
            mockFirmware623();
            req.body = { sip_target: '503' };

            axios.post
                .mockResolvedValueOnce({
                    data: {
                        pjsip: {
                            enabled: '0', // WRONG
                            auto_call_target: '',
                            auto_call_button_enabled: '0',
                            open_door_enabled: '0'
                        }
                    }
                })
                .mockResolvedValueOnce({ data: { status: 408 } }); // SIP timeout

            await controller.testDualCustodyFlow(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                failed_checks: expect.arrayContaining([
                    expect.objectContaining({ check: 'pjsip_enabled', pass: false })
                ]),
                recommendations: expect.any(Array)
            }));
        });

        test('includes legacy checks for legacy firmware', async () => {
            mockFirmwareLegacy();
            req.body = { sip_target: '503' };

            axios.post
                .mockResolvedValueOnce({
                    data: {
                        pjsip: { enabled: '1', auto_call_target: '503', auto_call_button_enabled: '1' }
                    }
                })
                .mockResolvedValueOnce({ data: { status: 200 } })
                .mockResolvedValueOnce({
                    data: {
                        general: { identification_mode: '1', multi_factor_authentication: '1' },
                        identifier: { pin_enabled: '1' }
                    }
                });

            await controller.testDualCustodyFlow(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                checks: expect.arrayContaining([
                    expect.objectContaining({ check: 'identification_mode' }),
                    expect.objectContaining({ check: 'pin_enabled' })
                ])
            }));
        });
    });

    // ============ SAFE PJSIP DEFAULTS ============
    describe('getSafePjsipDefaults', () => {
        test('always includes dialing_display_mode', () => {
            const defaults = controller.getSafePjsipDefaults();
            
            expect(defaults).toEqual({
                dialing_display_mode: '0'
            });
        });
    });
});