const idFaceService = require('../services/idface.service');
const axios = require('axios');
jest.mock('axios');

describe('Detecção de Firmware', () => {
    
    beforeEach(() => {
        jest.resetAllMocks();
        idFaceService.session = 'test-session';
        idFaceService.firmwareVersion = null;
        idFaceService.firmwareMajor = 0;
        idFaceService.firmwareMinor = 0;
    });

    // ============ DETECÇÃO AUTOMÁTICA ============
    describe('detectFirmwareVersion', () => {
        test('detecta firmware 6.23.0', async () => {
            axios.post.mockResolvedValueOnce({
                data: { firmware: '6.23.0', version: '6.23.0' }
            });

            const version = await idFaceService.detectFirmwareVersion();

            expect(version).toBe('6.23.0');
            expect(idFaceService.firmwareMajor).toBe(6);
            expect(idFaceService.firmwareMinor).toBe(23);
        });

        test('detecta firmware 6.20.5', async () => {
            axios.post.mockResolvedValueOnce({
                data: { firmware: '6.20.5' }
            });

            const version = await idFaceService.detectFirmwareVersion();

            expect(version).toBe('6.20.5');
            expect(idFaceService.firmwareMajor).toBe(6);
            expect(idFaceService.firmwareMinor).toBe(20);
        });

        test('usa cache se já detectou', async () => {
            idFaceService.firmwareVersion = '6.23.0';
            idFaceService.firmwareMajor = 6;
            idFaceService.firmwareMinor = 23;

            const version = await idFaceService.detectFirmwareVersion();

            expect(version).toBe('6.23.0');
            expect(axios.post).not.toHaveBeenCalled();
        });

        test('retorna unknown em caso de erro', async () => {
            axios.post.mockRejectedValueOnce(new Error('Connection failed'));

            const version = await idFaceService.detectFirmwareVersion();

            expect(version).toBe('unknown');
        });
    });

    // ============ VERIFICAÇÃO DE VERSÃO ============
    describe('isFirmware623OrHigher', () => {
        test('6.23.0 retorna true', () => {
            idFaceService.firmwareMajor = 6;
            idFaceService.firmwareMinor = 23;

            expect(idFaceService.isFirmware623OrHigher()).toBe(true);
        });

        test('6.24.0 retorna true', () => {
            idFaceService.firmwareMajor = 6;
            idFaceService.firmwareMinor = 24;

            expect(idFaceService.isFirmware623OrHigher()).toBe(true);
        });

        test('7.0.0 retorna true', () => {
            idFaceService.firmwareMajor = 7;
            idFaceService.firmwareMinor = 0;

            expect(idFaceService.isFirmware623OrHigher()).toBe(true);
        });

        test('6.22.0 retorna false', () => {
            idFaceService.firmwareMajor = 6;
            idFaceService.firmwareMinor = 22;

            expect(idFaceService.isFirmware623OrHigher()).toBe(false);
        });

        test('6.20.5 retorna false', () => {
            idFaceService.firmwareMajor = 6;
            idFaceService.firmwareMinor = 20;

            expect(idFaceService.isFirmware623OrHigher()).toBe(false);
        });
    });

    describe('isFirmwareLegacy', () => {
        test('6.22.0 retorna true (legacy)', () => {
            idFaceService.firmwareMajor = 6;
            idFaceService.firmwareMinor = 22;

            expect(idFaceService.isFirmwareLegacy()).toBe(true);
        });

        test('6.23.0 retorna false (não legacy)', () => {
            idFaceService.firmwareMajor = 6;
            idFaceService.firmwareMinor = 23;

            expect(idFaceService.isFirmwareLegacy()).toBe(false);
        });
    });
});