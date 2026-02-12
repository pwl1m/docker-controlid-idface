const express = require('express');
const router = express.Router();
const DeviceController = require('../controllers/device.controller');
const PushController = require('../controllers/push.controller');
const SecBoxController = require('../controllers/sec-boxs.controller');
const UtilsController = require('../controllers/utils.controller');
const usersRouter = require('./users');
const deviceTestsRouter = require('./device-tests');
const GenericController = require('../controllers/generic.controller');
const requireAuth = require('../middlewares/auth');
const idFaceService = require('../services/idface.service'); // ADICIONAR
const interfoniaRouter = require('./interfonia-sip');
const registroRouter = require('./registro');
const userGroupsRouter = require('./user-groups');
const userRolesRouter = require('./user-roles');
const reportsRouter = require('./reports');
const objectFieldsRouter = require('./object-fields');

const deviceController = new DeviceController();
const pushController = new PushController();
const secBoxsController = new SecBoxController();
const utilsController = new UtilsController();

// Controllers genéricos para logs
const accessLogsController = new GenericController('access_logs');
const alarmLogsController = new GenericController('alarm_logs');

// Controllers genéricos adicionais
const scheduledUnlocksController = new GenericController('scheduled_unlocks');
const scheduledUnlockAccessRulesController = new GenericController('scheduled_unlock_access_rules');
const accessRuleTimeZonesController = new GenericController('access_rule_time_zones');

// ============ Device ============
router.post('/login', deviceController.login.bind(deviceController));
router.post('/recognize', deviceController.recognize.bind(deviceController));
router.get('/device/info', deviceController.getInfo.bind(deviceController));
router.post('/device/configure-push', deviceController.configurePush.bind(deviceController));

// ============ Push Management (API interna) ============
router.post('/push/enqueue', requireAuth, pushController.enqueueCommand.bind(pushController));
router.get('/push/pending', requireAuth, pushController.getPending.bind(pushController));
router.get('/push/result/:uuid', requireAuth, pushController.getResult.bind(pushController));

// ============ Users ============
router.use('/users', usersRouter);
router.use('/device-tests', requireAuth, deviceTestsRouter);
router.use('/interfonia-sip', requireAuth, interfoniaRouter);
router.use('/registro', registroRouter);
router.use('/user-groups', userGroupsRouter);
router.use('/user-roles', userRolesRouter);
router.use('/reports', reportsRouter);
router.use('/object-fields', objectFieldsRouter);

// ============ Access Logs (Acessos Registrados) ============
router.get('/access-logs', accessLogsController.list.bind(accessLogsController));
router.get('/access-logs/:id', accessLogsController.getById.bind(accessLogsController));

// ============ Alarm Logs (Alerta de Pânico) ============
router.get('/alarm-logs', alarmLogsController.list.bind(alarmLogsController));
router.get('/alarm-logs/:id', alarmLogsController.getById.bind(alarmLogsController));

// ============ SecBox (Acionamento Remoto) ============
router.get('/sec-boxs', secBoxsController.getConfig.bind(secBoxsController));
router.patch('/sec-boxs', requireAuth, secBoxsController.updateConfig.bind(secBoxsController));
router.post('/sec-boxs/action', requireAuth, secBoxsController.action.bind(secBoxsController));

// ============ Templates (Faciais Cadastradas) ============
const templatesController = new GenericController('templates');
router.get('/templates', templatesController.list.bind(templatesController));
router.get('/templates/:id', templatesController.getById.bind(templatesController));
router.post('/templates', requireAuth, templatesController.create.bind(templatesController));
router.delete('/templates/:id', requireAuth, templatesController.delete.bind(templatesController));

// ============ Time Zones (Horários Cadastrados) ============
const timeZonesController = new GenericController('time_zones');
router.get('/time-zones', timeZonesController.list.bind(timeZonesController));
router.get('/time-zones/:id', timeZonesController.getById.bind(timeZonesController));
router.post('/time-zones', requireAuth, timeZonesController.create.bind(timeZonesController));
router.patch('/time-zones/:id', requireAuth, timeZonesController.update.bind(timeZonesController));
router.delete('/time-zones/:id', requireAuth, timeZonesController.delete.bind(timeZonesController));

// ============ Time Spans (Intervalos de Horários) ============
const timeSpansController = new GenericController('time_spans');
router.get('/time-spans', timeSpansController.list.bind(timeSpansController));
router.get('/time-spans/:id', timeSpansController.getById.bind(timeSpansController));
router.post('/time-spans', requireAuth, timeSpansController.create.bind(timeSpansController));
router.patch('/time-spans/:id', requireAuth, timeSpansController.update.bind(timeSpansController));
router.delete('/time-spans/:id', requireAuth, timeSpansController.delete.bind(timeSpansController));

// ============ Utils (Senha Randômica, Cópia de Usuário) ============
router.get('/utils/generate-password', utilsController.generatePassword.bind(utilsController));
router.post('/users/:id/copy', requireAuth, utilsController.copyUser.bind(utilsController));

// ============ Objetos Genéricos Adicionais ============
// Cards
const cardsController = new GenericController('cards');
router.get('/cards', cardsController.list.bind(cardsController));
router.get('/cards/:id', cardsController.getById.bind(cardsController));
router.post('/cards', requireAuth, cardsController.create.bind(cardsController));
router.delete('/cards/:id', requireAuth, cardsController.delete.bind(cardsController));

// QR Codes
const qrcodesController = new GenericController('qrcodes');
router.get('/qrcodes', qrcodesController.list.bind(qrcodesController));
router.get('/qrcodes/:id', qrcodesController.getById.bind(qrcodesController));
router.post('/qrcodes', requireAuth, qrcodesController.create.bind(qrcodesController));
router.delete('/qrcodes/:id', requireAuth, qrcodesController.delete.bind(qrcodesController));

// PINs
const pinsController = new GenericController('pins');
router.get('/pins', pinsController.list.bind(pinsController));
router.get('/pins/:id', pinsController.getById.bind(pinsController));
router.post('/pins', requireAuth, pinsController.create.bind(pinsController));
router.delete('/pins/:id', requireAuth, pinsController.delete.bind(pinsController));

// Groups (Departamentos)
const groupsController = new GenericController('groups');
router.get('/groups', groupsController.list.bind(groupsController));
router.get('/groups/:id', groupsController.getById.bind(groupsController));
router.post('/groups', requireAuth, groupsController.create.bind(groupsController));
router.patch('/groups/:id', requireAuth, groupsController.update.bind(groupsController));
router.delete('/groups/:id', requireAuth, groupsController.delete.bind(groupsController));

// Access Rules
const accessRulesController = new GenericController('access_rules');
router.get('/access-rules', accessRulesController.list.bind(accessRulesController));
router.get('/access-rules/:id', accessRulesController.getById.bind(accessRulesController));
router.post('/access-rules', requireAuth, accessRulesController.create.bind(accessRulesController));
router.patch('/access-rules/:id', requireAuth, accessRulesController.update.bind(accessRulesController));
router.delete('/access-rules/:id', requireAuth, accessRulesController.delete.bind(accessRulesController));

// Areas
const areasController = new GenericController('areas');
router.get('/areas', areasController.list.bind(areasController));
router.get('/areas/:id', areasController.getById.bind(areasController));
router.post('/areas', requireAuth, areasController.create.bind(areasController));
router.patch('/areas/:id', requireAuth, areasController.update.bind(areasController));
router.delete('/areas/:id', requireAuth, areasController.delete.bind(areasController));

// Portals
const portalsController = new GenericController('portals');
router.get('/portals', portalsController.list.bind(portalsController));
router.get('/portals/:id', portalsController.getById.bind(portalsController));
router.post('/portals', requireAuth, portalsController.create.bind(portalsController));
router.patch('/portals/:id', requireAuth, portalsController.update.bind(portalsController));
router.delete('/portals/:id', requireAuth, portalsController.delete.bind(portalsController));

// Holidays
const holidaysController = new GenericController('holidays');
router.get('/holidays', holidaysController.list.bind(holidaysController));
router.get('/holidays/:id', holidaysController.getById.bind(holidaysController));
router.post('/holidays', requireAuth, holidaysController.create.bind(holidaysController));
router.patch('/holidays/:id', requireAuth, holidaysController.update.bind(holidaysController));
router.delete('/holidays/:id', requireAuth, holidaysController.delete.bind(holidaysController));

// ============ Group Access Rules (Regras -> Grupos) ============
const groupAccessRulesController = new GenericController('group_access_rules');
router.get('/group-access-rules', groupAccessRulesController.list.bind(groupAccessRulesController));
router.get('/group-access-rules/:id', groupAccessRulesController.getById.bind(groupAccessRulesController));
router.post('/group-access-rules', requireAuth, groupAccessRulesController.create.bind(groupAccessRulesController));
router.patch('/group-access-rules/:id', requireAuth, groupAccessRulesController.update.bind(groupAccessRulesController));
router.delete('/group-access-rules/:id', requireAuth, groupAccessRulesController.delete.bind(groupAccessRulesController));

// ============ User Access Rules (Regras -> Usuários) ============
const userAccessRulesController = new GenericController('user_access_rules');
router.get('/user-access-rules', userAccessRulesController.list.bind(userAccessRulesController));
router.get('/user-access-rules/:id', userAccessRulesController.getById.bind(userAccessRulesController));
router.post('/user-access-rules', requireAuth, userAccessRulesController.create.bind(userAccessRulesController));
router.patch('/user-access-rules/:id', requireAuth, userAccessRulesController.update.bind(userAccessRulesController));
router.delete('/user-access-rules/:id', requireAuth, userAccessRulesController.delete.bind(userAccessRulesController));

// ============ Scheduled Unlocks ============
router.get('/scheduled-unlocks', scheduledUnlocksController.list.bind(scheduledUnlocksController));
router.get('/scheduled-unlocks/:id', scheduledUnlocksController.getById.bind(scheduledUnlocksController));
router.post('/scheduled-unlocks', requireAuth, scheduledUnlocksController.create.bind(scheduledUnlocksController));
router.patch('/scheduled-unlocks/:id', requireAuth, scheduledUnlocksController.update.bind(scheduledUnlocksController));
router.delete('/scheduled-unlocks/:id', requireAuth, scheduledUnlocksController.delete.bind(scheduledUnlocksController));

router.get('/scheduled-unlock-access-rules', scheduledUnlockAccessRulesController.list.bind(scheduledUnlockAccessRulesController));
router.get('/scheduled-unlock-access-rules/:id', scheduledUnlockAccessRulesController.getById.bind(scheduledUnlockAccessRulesController));
router.post('/scheduled-unlock-access-rules', requireAuth, scheduledUnlockAccessRulesController.create.bind(scheduledUnlockAccessRulesController));
router.patch('/scheduled-unlock-access-rules/:id', requireAuth, scheduledUnlockAccessRulesController.update.bind(scheduledUnlockAccessRulesController));
router.delete('/scheduled-unlock-access-rules/:id', requireAuth, scheduledUnlockAccessRulesController.delete.bind(scheduledUnlockAccessRulesController));

router.get('/access-rule-time-zones', accessRuleTimeZonesController.list.bind(accessRuleTimeZonesController));
router.get('/access-rule-time-zones/:id', accessRuleTimeZonesController.getById.bind(accessRuleTimeZonesController));
router.post('/access-rule-time-zones', requireAuth, accessRuleTimeZonesController.create.bind(accessRuleTimeZonesController));
router.patch('/access-rule-time-zones/:id', requireAuth, accessRuleTimeZonesController.update.bind(accessRuleTimeZonesController));
router.delete('/access-rule-time-zones/:id', requireAuth, accessRuleTimeZonesController.delete.bind(accessRuleTimeZonesController));


module.exports = router;