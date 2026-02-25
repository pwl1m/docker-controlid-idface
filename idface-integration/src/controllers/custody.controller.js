const idFaceService = require('../services/idface.service');
const logger = require('../utils/logger');

class CustodyController {

    async getIdentificationConfig(req, res) {
        try {
            // Campos que EXISTEM no firmware 6.22.2
            const data = await idFaceService.postFcgi('get_configuration.fcgi', {
                general: ['identification_mode', 'multi_factor_authentication'],
                identifier: ['face_identify_enabled', 'pin_enabled'],
                pjsip: ['enabled', 'auto_call_target', 'open_door_enabled', 'open_door_command']
            });
            res.json(data.data || data);
        } catch (error) {
            logger.error('[CUSTODY] getIdentificationConfig error:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    async setupSimpleCustody(req, res) {
        try {
            const {
                access_rule_name = 'Custódia Simples - PIN + Face',
                min_score = 80,
                identification_timeout = 30
            } = req.body || {};

            const steps = [];

            // Passo 1: Habilitar PIN + Face (modo verify/1:1)
            const step1 = await idFaceService.postFcgi('set_configuration.fcgi', {
                general: {
                    identification_mode: 1  // 1 = verify (1:1), 0 = identify (1:N)
                },
                identifier: {
                    face_identify_enabled: 1,
                    pin_enabled: 1,
                    multi_factor_authentication: 1
                },
                face_id: {
                    min_score: String(min_score),
                    anti_spoofing: 1
                }
            });
            steps.push({ step: 1, description: 'Modo 1:1 + PIN configurado', result: step1.data || step1 });

            // Passo 2: Timeout de identificação
            const step2 = await idFaceService.postFcgi('set_configuration.fcgi', {
                general: {
                    identification_timeout: identification_timeout
                }
            });
            steps.push({ step: 2, description: 'Timeout configurado', result: step2.data || step2 });

            // Passo 3: Criar regra de acesso
            const step3 = await idFaceService.createObjects('access_rules', [{
                name: access_rule_name,
                type: 0,
                priority: 0
            }]);
            steps.push({ step: 3, description: 'Regra de acesso criada', result: step3 });

            res.json({
                mode: 'simple_custody',
                description: 'PIN + Face 1:1',
                steps
            });
        } catch (error) {
            logger.error('[CUSTODY] setupSimpleCustody error:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    async setupDualCustody(req, res) {
        try {
            const { sip_target, open_door_command = '#1234' } = req.body;

            if (!sip_target) {
                return res.status(400).json({ error: 'sip_target é necessário' });
            }

            const steps = [];

            // 1. Configura PIN + Face (Verify Mode)
            const step1 = await idFaceService.postFcgi('set_configuration.fcgi', {
                general: {
                    identification_mode: 1
                },
                identifier: {
                    face_identify_enabled: 1,
                    pin_enabled: 1,
                    multi_factor_authentication: 1
                }
            });
            steps.push({ step: 1, description: 'PIN + Face habilitado', result: step1.data || step1 });

            // 2. Configura Auto-Call e abertura por DTMF
            const step2 = await idFaceService.postFcgi('set_configuration.fcgi', {
                pjsip: {
                    enabled: 1,
                    dialing_display_mode: 0,
                    auto_call_button_enabled: 1,
                    auto_call_target: String(sip_target),
                    open_door_enabled: 1,
                    open_door_command: String(open_door_command),
                    facial_id_during_call_enabled: 1
                }
            });
            steps.push({ step: 2, description: 'SIP Auto-Call configurado', result: step2.data || step2 });

            res.json({ 
                status: 'success', 
                message: 'Dupla custódia configurada',
                sip_target,
                open_door_command,
                steps 
            });
        } catch (error) {
            logger.error('[CUSTODY] setupDualCustody error:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    async resetToDefault(req, res) {
        try {
            const steps = [];

            // Modo 1:N (apenas face)
            const s1 = await idFaceService.postFcgi('set_configuration.fcgi', {
                general: {
                    identification_mode: 0  // 0 = identify (1:N)
                },
                identifier: {
                    face_identify_enabled: 1,
                    pin_enabled: 0,
                    multi_factor_authentication: 0
                }
            });
            steps.push({ step: 1, description: 'Modo 1:N restaurado', result: s1.data || s1 });

            // Desabilitar auto-call
            const s2 = await idFaceService.postFcgi('set_configuration.fcgi', {
                pjsip: {
                    auto_call_button_enabled: 0,
                    auto_call_target: '',
                    open_door_enabled: 0
                }
            });
            steps.push({ step: 2, description: 'Auto-call desabilitado', result: s2.data || s2 });

            res.json({ mode: 'default', steps });
        } catch (error) {
            logger.error('[CUSTODY] resetToDefault error:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    async testDualCustodyFlow(req, res) {
        try {
            const { sip_target } = req.body || {};
            const checks = [];

            // Verificar config atual
            const cfg = await idFaceService.postFcgi('get_configuration.fcgi', {
                general: ['identification_mode', 'multi_factor_authentication'],
                identifier: ['face_identify_enabled', 'pin_enabled'],
                pjsip: ['enabled', 'auto_call_target', 'open_door_enabled', 'open_door_command']
            });
            const d = cfg.data || cfg;

            // Verificar SIP status
            const sipStatus = await idFaceService.postFcgi('get_sip_status.fcgi', {});
            const sip = sipStatus.data || sipStatus;

            checks.push({
                check: 'identification_mode',
                expected: 1,
                actual: d.general?.identification_mode,
                pass: String(d.general?.identification_mode) === '1'
            });

            checks.push({
                check: 'pin_enabled',
                expected: 1,
                actual: d.identifier?.pin_enabled,
                pass: String(d.identifier?.pin_enabled) === '1'
            });

            checks.push({
                check: 'pjsip_enabled',
                expected: 1,
                actual: d.pjsip?.enabled,
                pass: String(d.pjsip?.enabled) === '1'
            });

            checks.push({
                check: 'sip_registered',
                expected: 200,
                actual: sip.status,
                pass: sip.status === 200
            });

            checks.push({
                check: 'auto_call_target',
                expected: sip_target || 'any',
                actual: d.pjsip?.auto_call_target,
                pass: sip_target ? d.pjsip?.auto_call_target === sip_target : !!d.pjsip?.auto_call_target
            });

            const allPass = checks.every(c => c.pass);

            res.json({ 
                success: allPass,
                checks, 
                raw_config: d,
                sip_status: sip
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = CustodyController;