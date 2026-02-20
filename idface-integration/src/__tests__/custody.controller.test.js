const axios = require('axios');
jest.mock('axios');

const idFaceService = require('../services/idface.service');

describe('CustodyController - Simples e Dupla Custódia', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        idFaceService.session = 'test-session';
    });

    describe('getIdentificationConfig', () => {
        test('reads general, identifier, pjsip config', async () => {
            const mockConfig = {
                general: {
                    identification_mode: '1',
                    multi_factor_authentication: '1'
                },
                identifier: { face_identify_enabled: '1', pin_enabled: '1' },
                pjsip: { enabled: '1', auto_call_target: '503', open_door_enabled: '1', open_door_command: '#1234' }
            };
            axios.post.mockResolvedValueOnce({ data: mockConfig });

            const result = await idFaceService.postFcgi('get_configuration.fcgi', {
                general: ['identification_mode', 'multi_factor_authentication'],
                identifier: ['face_identify_enabled', 'pin_enabled'],
                pjsip: ['enabled', 'auto_call_target', 'open_door_enabled', 'open_door_command']
            });

            expect(result.data.general.identification_mode).toBe('1');
            expect(result.data.identifier.pin_enabled).toBe('1');
            expect(result.data.pjsip.auto_call_target).toBe('503');
        });
    });

    describe('setupSimpleCustody', () => {
        test('configures device for 1:1 + PIN mode', async () => {
            // Step 1: general + identifier + face_id config
            axios.post.mockResolvedValueOnce({ data: {} });
            // Step 2: timeout config
            axios.post.mockResolvedValueOnce({ data: {} });
            // Step 3: create access rule
            axios.post.mockResolvedValueOnce({ data: { ids: [10] } });

            const s1 = await idFaceService.postFcgi('set_configuration.fcgi', {
                general: { identification_mode: 1 },
                identifier: {
                    face_identify_enabled: 1,
                    pin_enabled: 1,
                    multi_factor_authentication: 1
                },
                face_id: {
                    min_score: '80',
                    anti_spoofing: 1
                }
            });

            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/set_configuration.fcgi'),
                expect.objectContaining({
                    general: expect.objectContaining({
                        identification_mode: 1
                    }),
                    identifier: expect.objectContaining({
                        pin_enabled: 1,
                        multi_factor_authentication: 1
                    })
                }),
                expect.any(Object)
            );
        });
    });

    describe('setupDualCustody', () => {
        test('configures face 1:1 + SIP auto-call + DTMF door', async () => {
            // Step 1: general + identifier
            axios.post.mockResolvedValueOnce({ data: {} });
            // Step 2: pjsip
            axios.post.mockResolvedValueOnce({ data: {} });

            // general + identifier
            await idFaceService.postFcgi('set_configuration.fcgi', {
                general: { identification_mode: 1 },
                identifier: { face_identify_enabled: 1, pin_enabled: 1, multi_factor_authentication: 1 }
            });

            // pjsip
            const sipResult = await idFaceService.postFcgi('set_configuration.fcgi', {
                pjsip: {
                    enabled: 1,
                    dialing_display_mode: 0,
                    auto_call_button_enabled: 1,
                    auto_call_target: '503',
                    open_door_enabled: 1,
                    open_door_command: '#1234',
                    facial_id_during_call_enabled: 1
                }
            });

            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/set_configuration.fcgi'),
                expect.objectContaining({
                    pjsip: expect.objectContaining({
                        auto_call_target: '503',
                        open_door_enabled: 1,
                        open_door_command: '#1234'
                    })
                }),
                expect.any(Object)
            );
        });
    });

    describe('testDualCustodyFlow', () => {
        test('validates all checks pass', async () => {
            // get_configuration
            axios.post.mockResolvedValueOnce({
                data: {
                    general: { identification_mode: '1', multi_factor_authentication: '1' },
                    identifier: { face_identify_enabled: '1', pin_enabled: '1' },
                    pjsip: { enabled: '1', auto_call_target: '503', open_door_enabled: '1', open_door_command: '#1234' }
                }
            });
            // get_sip_status
            axios.post.mockResolvedValueOnce({
                data: { status: 200, in_call: false }
            });
            // load users with face
            axios.post.mockResolvedValueOnce({
                data: { users: [{ id: 1, name: 'Test', image_timestamp: 12345 }] }
            });

            const cfg = await idFaceService.postFcgi('get_configuration.fcgi', {
                general: ['identification_mode', 'multi_factor_authentication'],
                identifier: ['face_identify_enabled', 'pin_enabled'],
                pjsip: ['enabled', 'auto_call_target', 'open_door_enabled', 'open_door_command']
            });

            expect(cfg.data.general.identification_mode).toBe('1');
            expect(cfg.data.identifier.pin_enabled).toBe('1');
            expect(cfg.data.pjsip.auto_call_target).toBe('503');

            const status = await idFaceService.postFcgi('get_sip_status.fcgi', {});
            expect(status.data.status).toBe(200);

            const users = await idFaceService.postFcgi('load_objects.fcgi', { object: 'users' });
            expect(users.data.users.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('resetToDefault', () => {
        test('restores 1:N face-only mode', async () => {
            axios.post.mockResolvedValueOnce({ data: {} }); // general + identifier
            axios.post.mockResolvedValueOnce({ data: {} }); // pjsip

            await idFaceService.postFcgi('set_configuration.fcgi', {
                general: { identification_mode: 0 },
                identifier: { face_identify_enabled: 1, pin_enabled: 0, multi_factor_authentication: 0 }
            });

            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/set_configuration.fcgi'),
                expect.objectContaining({
                    general: expect.objectContaining({
                        identification_mode: 0
                    }),
                    identifier: expect.objectContaining({
                        pin_enabled: 0,
                        multi_factor_authentication: 0
                    })
                }),
                expect.any(Object)
            );
        });
    });
});