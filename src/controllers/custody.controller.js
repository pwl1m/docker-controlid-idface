const idFaceService = require('../services/idface.service');
const logger = require('../utils/logger');

/**
 * CONTROLLER DE CUSTÓDIA
 * 
 * Implementa modos de acesso com verificação adicional:
 * - Simples: PIN + Face 1:1 (verify)
 * - Dupla: PIN + Face 1:1 + Chamada SIP + DTMF
 * 
 * COMPATIBILIDADE:
 * - Firmware 6.23+: Apenas PJSIP configurável via API
 * - Firmware Legado: general + identifier + face_id + pjsip
 * 
 * ⚠️ CRÍTICO: dialing_display_mode SEMPRE deve ser enviado para evitar crash
 */
class CustodyController {

    /**
     * Parâmetros base PJSIP que devem SEMPRE ser incluídos
     * para evitar crash do device
     */
    getSafePjsipDefaults() {
        return {
            dialing_display_mode: '0'  // CRÍTICO - sem isso device crasha
        };
    }

    /**
     * GET /api/custody/config
     * Obtém configuração de identificação atual
     */
    async getIdentificationConfig(req, res) {
        try {
            await idFaceService.detectFirmwareVersion();
            
            // PJSIP funciona em todos os firmwares
            const pjsipConfig = await idFaceService.postFcgi('get_configuration.fcgi', {
                pjsip: [
                    'enabled', 
                    'auto_call_target', 
                    'auto_call_button_enabled',
                    'open_door_enabled', 
                    'open_door_command', 
                    'facial_id_during_call_enabled',
                    'dialing_display_mode',
                    'video_enabled',
                    'max_call_time',
                    'auto_answer_enabled'
                ]
            });

            // Status SIP
            let sipStatus = { status: -1, in_call: false };
            try {
                const statusResult = await idFaceService.postFcgi('get_sip_status.fcgi', {});
                sipStatus = statusResult.data || statusResult;
            } catch (e) {
                logger.warn('[CUSTODY] Erro ao obter status SIP:', e.message);
            }

            const result = {
                firmware: idFaceService.firmwareVersion,
                firmware_type: idFaceService.isFirmware623OrHigher() ? '6.23+' : 'legacy',
                pjsip: pjsipConfig.data?.pjsip || {},
                sip_status: sipStatus
            };

            // Firmware legado: tentar obter general/identifier
            if (idFaceService.isFirmwareLegacy()) {
                try {
                    const legacyConfig = await idFaceService.postFcgi('get_configuration.fcgi', {
                        general: ['identification_mode', 'multi_factor_authentication', 'identification_timeout'],
                        identifier: ['face_identify_enabled', 'pin_enabled'],
                        face_id: ['min_score', 'anti_spoofing']
                    });
                    result.general = legacyConfig.data?.general || {};
                    result.identifier = legacyConfig.data?.identifier || {};
                    result.face_id = legacyConfig.data?.face_id || {};
                } catch (e) {
                    result.legacy_config_error = e.message;
                }
            } else {
                result.note = 'Firmware 6.23+ não suporta general/identifier via get_configuration. Configure manualmente no device.';
            }

            res.json(result);
        } catch (error) {
            logger.error('[CUSTODY] getIdentificationConfig error:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * POST /api/custody/setup/simple
     * Configura custódia simples (PIN + Face 1:1)
     */
    async setupSimpleCustody(req, res) {
        try {
            const {
                access_rule_name = 'Custódia Simples - PIN + Face',
                min_score = '80',
                identification_timeout = '30'
            } = req.body || {};

            await idFaceService.detectFirmwareVersion();
            const steps = [];
            const warnings = [];

            // Step 1: Configurar PJSIP com ID facial habilitado
            const pjsipConfig = {
                ...this.getSafePjsipDefaults(),
                enabled: '1',
                facial_id_during_call_enabled: '1',
                auto_call_button_enabled: '0',  // Sem auto-call na custódia simples
                auto_call_target: ''
            };

            const step1 = await idFaceService.postFcgi('set_configuration.fcgi', {
                pjsip: pjsipConfig
            });
            steps.push({ 
                step: 1, 
                description: 'PJSIP configurado', 
                success: true,
                config: pjsipConfig
            });

            // Step 2: Configurar modo 1:1 (apenas firmware legado)
            if (idFaceService.isFirmwareLegacy()) {
                try {
                    const step2 = await idFaceService.postFcgi('set_configuration.fcgi', {
                        general: {
                            identification_mode: '1'  // 1 = verify (1:1)
                        },
                        identifier: {
                            face_identify_enabled: '1',
                            pin_enabled: '1',
                            multi_factor_authentication: '1'
                        },
                        face_id: {
                            min_score: String(min_score),
                            anti_spoofing: '1'
                        }
                    });
                    steps.push({ step: 2, description: 'Modo 1:1 + PIN configurado', success: true });

                    const step3 = await idFaceService.postFcgi('set_configuration.fcgi', {
                        general: {
                            identification_timeout: String(identification_timeout)
                        }
                    });
                    steps.push({ step: 3, description: 'Timeout configurado', success: true });
                } catch (err) {
                    steps.push({ step: 2, description: 'Modo 1:1 + PIN', success: false, error: err.message });
                }
            } else {
                warnings.push('Firmware 6.23+: identification_mode, pin_enabled e face_id.min_score devem ser configurados manualmente no device');
            }

            // Step 3/4: Criar regra de acesso
            try {
                const accessRuleStep = await idFaceService.createObjects('access_rules', [{
                    name: access_rule_name,
                    type: 0,
                    priority: 0
                }]);
                steps.push({ 
                    step: steps.length + 1, 
                    description: 'Regra de acesso criada', 
                    success: true,
                    id: accessRuleStep.ids?.[0] 
                });
            } catch (err) {
                // Pode já existir
                if (err.message?.includes('already exists') || err.message?.includes('duplicate')) {
                    steps.push({ step: steps.length + 1, description: 'Regra de acesso já existe', success: true });
                } else {
                    steps.push({ step: steps.length + 1, description: 'Regra de acesso', success: false, error: err.message });
                }
            }

            res.json({
                mode: 'simple_custody',
                description: 'PIN + Face 1:1 (verify)',
                firmware: idFaceService.firmwareVersion,
                steps,
                warnings: warnings.length ? warnings : undefined,
                manual_config_required: idFaceService.isFirmware623OrHigher() ? [
                    'Menu > Configurações > Acesso > Modo de identificação = Verificar (1:1)',
                    'Menu > Configurações > Acesso > PIN habilitado = Sim',
                    'Menu > Configurações > Acesso > Multi-fator = Face + PIN',
                    `Menu > Configurações > Face > Score mínimo = ${min_score}%`
                ] : undefined
            });
        } catch (error) {
            logger.error('[CUSTODY] setupSimpleCustody error:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * POST /api/custody/setup/dual
     * Configura dupla custódia (PIN + Face + SIP Call + DTMF)
     */
    async setupDualCustody(req, res) {
        try {
            const { 
                sip_target, 
                open_door_command = '#1234',
                video_enabled = '1',
                max_call_time = '120',
                min_score = '80',
                identification_timeout = '30',
                access_rule_name = 'Dupla Custódia - SOC'
            } = req.body;

            if (!sip_target) {
                return res.status(400).json({ 
                    error: 'sip_target é obrigatório',
                    example: { sip_target: '503', open_door_command: '#1234' }
                });
            }

            await idFaceService.detectFirmwareVersion();
            const steps = [];
            const warnings = [];

            // Step 1: Verificar se SIP está registrado
            let sipRegistered = false;
            try {
                const sipStatus = await idFaceService.postFcgi('get_sip_status.fcgi', {});
                sipRegistered = sipStatus.data?.status === 200;
                steps.push({
                    step: 1,
                    description: 'Verificação SIP',
                    success: true,  // Sempre sucesso - só verifica
                    status: sipStatus.data?.status,
                    registered: sipRegistered
                });
            } catch (e) {
                steps.push({ step: 1, description: 'Verificação SIP', success: true, error: e.message });
            }

            if (!sipRegistered) {
                warnings.push('SIP não está registrado (status != 200). Configure o servidor SIP primeiro.');
            }

            // Step 2: Configurar PJSIP com auto-call
            const pjsipConfig = {
                ...this.getSafePjsipDefaults(),
                enabled: '1',
                auto_call_button_enabled: '1',
                auto_call_target: String(sip_target),
                open_door_enabled: '1',
                open_door_command: String(open_door_command),
                facial_id_during_call_enabled: '1',
                video_enabled: String(video_enabled),
                max_call_time: String(max_call_time)
            };

            try {
                await idFaceService.postFcgi('set_configuration.fcgi', {
                    pjsip: pjsipConfig
                });
                steps.push({ 
                    step: 2, 
                    description: 'PJSIP configurado (auto-call + DTMF)', 
                    success: true,
                    config: {
                        auto_call_target: sip_target,
                        auto_call_button_enabled: '1',
                        open_door_command,
                        open_door_enabled: '1',
                        video_enabled,
                        max_call_time
                    }
                });
            } catch (err) {
                steps.push({ step: 2, description: 'PJSIP config', success: false, error: err.message });
            }

            // Step 3: Configurar modo 1:1 (apenas firmware legado)
            if (idFaceService.isFirmwareLegacy()) {
                try {
                    await idFaceService.postFcgi('set_configuration.fcgi', {
                        general: {
                            identification_mode: '1',
                            identification_timeout: String(identification_timeout)
                        },
                        identifier: {
                            face_identify_enabled: '1',
                            pin_enabled: '1',
                            multi_factor_authentication: '1'
                        },
                        face_id: {
                            min_score: String(min_score),
                            anti_spoofing: '1'
                        }
                    });
                    steps.push({ step: 3, description: 'Modo 1:1 + PIN configurado via API', success: true });
                } catch (err) {
                    steps.push({ step: 3, description: 'Modo 1:1 + PIN', success: false, error: err.message });
                }
            }
            // NÃO adicionar warning para 6.23+ aqui - será retornado em manual_config_required

            // Step 4: Criar regra de acesso
            try {
                const accessRuleStep = await idFaceService.createObjects('access_rules', [{
                    name: access_rule_name,
                    type: 0,
                    priority: 0
                }]);
                steps.push({ 
                    step: steps.length + 1, 
                    description: 'Regra de acesso criada', 
                    success: true,
                    id: accessRuleStep.ids?.[0] 
                });
            } catch (err) {
                if (err.message?.includes('already exists') || err.message?.includes('duplicate')) {
                    steps.push({ step: steps.length + 1, description: 'Regra de acesso já existe', success: true });
                } else {
                    steps.push({ step: steps.length + 1, description: 'Regra de acesso', success: false, error: err.message });
                }
            }

            const allSuccess = steps.every(s => s.success !== false);

            res.json({ 
                status: allSuccess ? 'success' : 'partial',
                mode: 'dual_custody',
                description: 'PIN + Face 1:1 + Chamada SIP + Liberação DTMF',
                firmware: idFaceService.firmwareVersion,
                firmware_type: idFaceService.isFirmware623OrHigher() ? '6.23+' : 'legacy',
                config: {
                    sip_target,
                    auto_call_button_enabled: '1',
                    open_door_command,
                    open_door_enabled: '1',
                    video_enabled,
                    max_call_time
                },
                steps,
                warnings: warnings.length ? warnings : undefined,
                // Só mostrar manual_config_required para firmware 6.23+
                manual_config_required: idFaceService.isFirmware623OrHigher() ? [
                    'Menu > Configurações > Acesso > Modo de identificação = Verificar (1:1)',
                    'Menu > Configurações > Acesso > PIN habilitado = Sim',
                    'Menu > Configurações > Acesso > Multi-fator = Face + PIN',
                    `Menu > Configurações > Face > Score mínimo = ${min_score}%`
                ] : undefined,
                flow_description: [
                    '1. Usuário digita PIN',
                    '2. Device verifica face (1:1 com PIN)',
                    `3. Device liga automaticamente para ramal ${sip_target}`,
                    '4. Operador vê vídeo do usuário',
                    `5. Operador digita ${open_door_command} para liberar porta`,
                    '6. Porta abre e chamada encerra automaticamente'
                ]
            });
        } catch (error) {
            logger.error('[CUSTODY] setupDualCustody error:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * POST /api/custody/setup/reset
     * Reseta para modo padrão (1:N Face only, sem custódia)
     */
    async resetToDefault(req, res) {
        try {
            await idFaceService.detectFirmwareVersion();
            const steps = [];

            // Step 1: Desabilitar auto-call e liberação via DTMF
            const pjsipConfig = {
                ...this.getSafePjsipDefaults(),
                auto_call_button_enabled: '0',
                auto_call_target: '',
                open_door_enabled: '0',
                open_door_command: ''
            };

            await idFaceService.postFcgi('set_configuration.fcgi', {
                pjsip: pjsipConfig
            });
            steps.push({ step: 1, description: 'Auto-call e DTMF desabilitados', success: true });

            // Step 2: Restaurar modo 1:N (apenas firmware legado)
            if (idFaceService.isFirmwareLegacy()) {
                try {
                    await idFaceService.postFcgi('set_configuration.fcgi', {
                        general: {
                            identification_mode: '0'  // 0 = identify (1:N)
                        },
                        identifier: {
                            face_identify_enabled: '1',
                            pin_enabled: '0',
                            multi_factor_authentication: '0'
                        }
                    });
                    steps.push({ step: 2, description: 'Modo 1:N restaurado', success: true });
                } catch (err) {
                    steps.push({ step: 2, description: 'Modo 1:N', success: false, error: err.message });
                }
            }

            res.json({ 
                mode: 'default',
                description: 'Face 1:N (identificação simples)',
                firmware: idFaceService.firmwareVersion,
                steps,
                manual_config_required: idFaceService.isFirmware623OrHigher() ? [
                    'Menu > Configurações > Acesso > Modo de identificação = Identificar (1:N)',
                    'Menu > Configurações > Acesso > PIN habilitado = Não',
                    'Menu > Configurações > Acesso > Multi-fator = Desabilitado'
                ] : undefined
            });
        } catch (error) {
            logger.error('[CUSTODY] resetToDefault error:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * POST /api/custody/test
     * Testa e valida o fluxo de dupla custódia
     * Inclui verificação de usuários prontos (com face e PIN)
     */
    async testDualCustodyFlow(req, res) {
        try {
            const { sip_target } = req.body || {};
            await idFaceService.detectFirmwareVersion();
            const checks = [];

            // ============ CHECK 0: Usuários prontos para custódia ============
            let usersReady = [];
            let usersWithFace = 0;
            let usersWithPin = 0;
            try {
                // Buscar usuários diretamente
                const usersResult = await idFaceService.loadObjects('users', { limit: 1000 });
                const users = usersResult.users || [];

                // Firmware 6.23+: face é indicada por image_timestamp > 0
                // Firmware legado: face é indicada por templates
                const usersWithFaceList = users.filter(u => 
                    (u.image_timestamp && u.image_timestamp > 0) || 
                    (u.templates && u.templates.length > 0)
                );
                usersWithFace = usersWithFaceList.length;

                // PIN está no campo password do usuário
                const usersWithPinList = users.filter(u => 
                    u.password && u.password.length > 0
                );
                usersWithPin = usersWithPinList.length;

                // Usuários com AMBOS (face + PIN) - prontos para custódia
                const usersReadyList = users.filter(u => 
                    ((u.image_timestamp && u.image_timestamp > 0) || (u.templates && u.templates.length > 0)) &&
                    (u.password && u.password.length > 0)
                );
                usersReady = usersReadyList.map(u => ({ id: u.id, name: u.name }));

            } catch (e) {
                logger.warn('[CUSTODY] Erro ao verificar usuários:', e.message);
            }

            checks.push({
                check: 'users_with_face',
                description: 'Usuários com face cadastrada',
                expected: '>0',
                actual: usersWithFace,
                pass: usersWithFace > 0
            });

            checks.push({
                check: 'users_with_pin',
                description: 'Usuários com PIN cadastrado',
                expected: '>0',
                actual: usersWithPin,
                pass: usersWithPin > 0
            });

            checks.push({
                check: 'users_ready_for_custody',
                description: 'Usuários prontos (face + PIN)',
                expected: '>0',
                actual: usersReady.length,
                pass: usersReady.length > 0,
                users: usersReady.slice(0, 5) // Mostrar até 5 usuários
            });

            // ============ CHECK 1: PJSIP config ============
            const pjsipResult = await idFaceService.postFcgi('get_configuration.fcgi', {
                pjsip: [
                    'enabled', 
                    'auto_call_target', 
                    'auto_call_button_enabled',
                    'open_door_enabled', 
                    'open_door_command',
                    'dialing_display_mode', 
                    'video_enabled',
                    'facial_id_during_call_enabled',
                    'max_call_time'
                ]
            });
            const pjsip = pjsipResult.data?.pjsip || {};

            // ============ CHECK 2: SIP status ============
            let sipStatus = { status: -1, in_call: false };
            try {
                const statusResult = await idFaceService.postFcgi('get_sip_status.fcgi', {});
                sipStatus = statusResult.data || statusResult;
            } catch (e) {
                // ignore
            }

            // Validações SIP/PJSIP
            checks.push({
                check: 'pjsip_enabled',
                description: 'PJSIP habilitado',
                expected: '1',
                actual: pjsip.enabled,
                pass: String(pjsip.enabled) === '1'
            });

            checks.push({
                check: 'sip_registered',
                description: 'SIP registrado no servidor',
                expected: 200,
                actual: sipStatus.status,
                pass: sipStatus.status === 200
            });

            checks.push({
                check: 'auto_call_enabled',
                description: 'Auto-call habilitado',
                expected: '1',
                actual: pjsip.auto_call_button_enabled,
                pass: String(pjsip.auto_call_button_enabled) === '1'
            });

            checks.push({
                check: 'auto_call_target',
                description: 'Ramal de destino configurado',
                expected: sip_target || '(qualquer)',
                actual: pjsip.auto_call_target || '(vazio)',
                pass: sip_target 
                    ? pjsip.auto_call_target === sip_target 
                    : !!pjsip.auto_call_target && pjsip.auto_call_target.trim() !== ''
            });

            checks.push({
                check: 'open_door_enabled',
                description: 'Liberação via DTMF habilitada',
                expected: '1',
                actual: pjsip.open_door_enabled,
                pass: String(pjsip.open_door_enabled) === '1'
            });

            checks.push({
                check: 'open_door_command',
                description: 'Código DTMF configurado',
                expected: '(qualquer)',
                actual: pjsip.open_door_command || '(vazio)',
                pass: !!pjsip.open_door_command && pjsip.open_door_command.trim() !== ''
            });

            checks.push({
                check: 'video_enabled',
                description: 'Vídeo SIP habilitado',
                expected: '1',
                actual: pjsip.video_enabled,
                pass: String(pjsip.video_enabled) === '1'
            });

            checks.push({
                check: 'facial_id_during_call',
                description: 'ID facial durante chamada',
                expected: '1',
                actual: pjsip.facial_id_during_call_enabled,
                pass: String(pjsip.facial_id_during_call_enabled) === '1'
            });

            checks.push({
                check: 'dialing_display_mode',
                description: 'Modo de discagem (deve estar definido)',
                expected: '0 ou 1',
                actual: pjsip.dialing_display_mode,
                pass: pjsip.dialing_display_mode !== undefined && pjsip.dialing_display_mode !== ''
            });

            // ============ Checks legado (se aplicável) ============
            if (idFaceService.isFirmwareLegacy()) {
                try {
                    const legacyConfig = await idFaceService.postFcgi('get_configuration.fcgi', {
                        general: ['identification_mode', 'multi_factor_authentication'],
                        identifier: ['pin_enabled']
                    });
                    const general = legacyConfig.data?.general || {};
                    const identifier = legacyConfig.data?.identifier || {};

                    checks.push({
                        check: 'identification_mode',
                        description: 'Modo de identificação (1=verify)',
                        expected: '1',
                        actual: general.identification_mode,
                        pass: String(general.identification_mode) === '1'
                    });

                    checks.push({
                        check: 'pin_enabled',
                        description: 'PIN habilitado',
                        expected: '1',
                        actual: identifier.pin_enabled,
                        pass: String(identifier.pin_enabled) === '1'
                    });

                    checks.push({
                        check: 'multi_factor',
                        description: 'Multi-fator habilitado',
                        expected: '1',
                        actual: general.multi_factor_authentication,
                        pass: String(general.multi_factor_authentication) === '1'
                    });
                } catch (e) {
                    checks.push({
                        check: 'legacy_config',
                        description: 'Configuração legado',
                        pass: false,
                        error: e.message
                    });
                }
            }

            const allPass = checks.every(c => c.pass);
            const failedChecks = checks.filter(c => !c.pass);

            // Gerar recomendações
            const recommendations = [];
            if (!allPass) {
                for (const c of failedChecks) {
                    switch (c.check) {
                        case 'users_with_face':
                            recommendations.push('Cadastre faces nos usuários via /api/enrollment/remote');
                            break;
                        case 'users_with_pin':
                            recommendations.push('Cadastre PINs nos usuários ou configure user_roles com pin');
                            break;
                        case 'users_ready_for_custody':
                            recommendations.push('Garanta que os mesmos usuários tenham FACE e PIN');
                            break;
                        case 'sip_registered':
                            recommendations.push('Configure o servidor SIP em /api/interfonia-sip/config');
                            break;
                        case 'auto_call_target':
                            recommendations.push('Defina o ramal de destino em /api/custody/setup/dual');
                            break;
                        case 'open_door_command':
                            recommendations.push('Configure o código DTMF de liberação');
                            break;
                        case 'identification_mode':
                        case 'pin_enabled':
                        case 'multi_factor':
                            recommendations.push('Configure manualmente no device (Menu > Configurações > Acesso)');
                            break;
                        default:
                            recommendations.push(`Verifique: ${c.description}`);
                    }
                }
            }

            // Adicionar nota sobre configuração manual para firmware 6.23+
            const manualConfigNote = idFaceService.isFirmware623OrHigher() ? {
                note: 'Firmware 6.23+ requer configuração MANUAL no device:',
                steps: [
                    'Menu > Configurações > Acesso > Modo de identificação = Verificar (1:1)',
                    'Menu > Configurações > Acesso > PIN habilitado = Sim',
                    'Menu > Configurações > Acesso > Multi-fator = Habilitado',
                    'Menu > Configurações > Face > Score mínimo = 80%'
                ]
            } : null;

            res.json({ 
                success: allPass,
                firmware: idFaceService.firmwareVersion,
                firmware_type: idFaceService.isFirmware623OrHigher() ? '6.23+' : 'legacy',
                summary: {
                    total: checks.length,
                    passed: checks.filter(c => c.pass).length,
                    failed: failedChecks.length,
                    users_ready: usersReady.length
                },
                users: {
                    with_face: usersWithFace,
                    with_pin: usersWithPin,
                    ready_for_custody: usersReady.length,
                    sample: usersReady.slice(0, 5)
                },
                checks, 
                failed_checks: failedChecks.length ? failedChecks : undefined,
                pjsip_config: pjsip,
                sip_status: sipStatus,
                recommendations: recommendations.length ? [...new Set(recommendations)] : undefined,
                manual_config: manualConfigNote
            });
        } catch (error) {
            logger.error('[CUSTODY] testDualCustodyFlow error:', error.message);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = CustodyController;