const axios = require('axios');
jest.mock('axios');

const idFaceService = require('../services/idface.service');
const SipContactsController = require('../controllers/sip-contacts.controller');

describe('SIP Contacts - Gerenciamento de Ramais', () => {
    let controller;
    let req;
    let res;

    beforeEach(() => {
        jest.resetAllMocks();
        controller = new SipContactsController();
        req = { body: {}, params: {}, query: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        idFaceService.session = 'test-session';
    });

    // ============ FIELD STATUS ============
    describe('getFieldStatus', () => {
        test('retorna status do campo sip_ramal', async () => {
            jest.spyOn(idFaceService, 'loadObjects').mockResolvedValue({
                users: [{ id: 1, name: 'Teste', sip_ramal: '1001' }]
            });

            await controller.getFieldStatus(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                field_name: 'sip_ramal',
                exists: expect.any(Boolean)
            }));
        });
    });

    // ============ LIST CONTACTS ============
    describe('listContacts', () => {
        test('lista users com ramal configurado', async () => {
            jest.spyOn(idFaceService, 'loadObjects').mockResolvedValue({
                users: [
                    { id: 1, name: 'User 1', sip_ramal: '1001' },
                    { id: 2, name: 'User 2', sip_ramal: '1002' },
                    { id: 3, name: 'User 3', sip_ramal: '' } // sem ramal
                ]
            });

            await controller.listContacts(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                total: 2, // apenas com ramal
                contacts: expect.arrayContaining([
                    expect.objectContaining({ ramal: '1001' }),
                    expect.objectContaining({ ramal: '1002' })
                ])
            }));
        });
    });

    // ============ SET RAMAL ============
    describe('setContactRamal', () => {
        test('define ramal para user existente', async () => {
            req.params = { id: '10' };
            req.body = { ramal: '1001' };

            jest.spyOn(idFaceService, 'loadObjects').mockResolvedValue({
                users: [{ id: 10, name: 'Teste' }]
            });
            jest.spyOn(idFaceService, 'modifyObjects').mockResolvedValue({});

            await controller.setContactRamal(req, res);

            expect(idFaceService.modifyObjects).toHaveBeenCalledWith(
                'users',
                10,
                expect.objectContaining({ sip_ramal: '1001' })
            );
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        test('retorna 400 sem ramal', async () => {
            req.params = { id: '10' };
            req.body = {};

            await controller.setContactRamal(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('retorna 404 se user não existe', async () => {
            req.params = { id: '999' };
            req.body = { ramal: '1001' };

            jest.spyOn(idFaceService, 'loadObjects').mockResolvedValue({
                users: []
            });

            await controller.setContactRamal(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    // ============ CALL CONTACT ============
    describe('callContact', () => {
        test('inicia chamada para ramal do contato', async () => {
            req.params = { id: '10' };

            jest.spyOn(idFaceService, 'loadObjects').mockResolvedValue({
                users: [{ id: 10, name: 'Teste', sip_ramal: '1001' }]
            });
            axios.post.mockResolvedValueOnce({ data: { success: true } });

            await controller.callContact(req, res);

            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/make_sip_call.fcgi'),
                { target: '1001' },
                expect.any(Object)
            );
        });

        test('retorna 400 se contato sem ramal', async () => {
            req.params = { id: '10' };

            jest.spyOn(idFaceService, 'loadObjects').mockResolvedValue({
                users: [{ id: 10, name: 'Teste', sip_ramal: '' }]
            });

            await controller.callContact(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    // ============ CALL DIRECT ============
    describe('callDirect', () => {
        test('inicia chamada direta para ramal', async () => {
            req.body = { ramal: '503' };

            axios.post.mockResolvedValueOnce({ data: { success: true } });

            await controller.callDirect(req, res);

            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/make_sip_call.fcgi'),
                { target: '503' },
                expect.any(Object)
            );
        });

        test('retorna 400 sem ramal', async () => {
            req.body = {};

            await controller.callDirect(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });
});