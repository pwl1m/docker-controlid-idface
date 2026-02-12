const idFaceService = require('../services/idface.service');
const logger = require('../utils/logger');

class CustodyController {

    // ============================================================
    // LEITURA: Obter configuração atual de identificação/custódia
    // ============================================================
    async getIdentificationConfig(req, res) {
        try {
            const data = await idFaceService.postFcgi('get_configuration.fcgi', {
                face_id: [
                    'face_id_enabled',
                    'identification_mode',         // "identify" (1:N) ou "verify" (1:1)
                    'multi_factor_authentication',  // 0=face only, 1=face+PIN, 2=face+card
                    'anti_spoofing_enabled',
                    'min_score',
                    'max_identification_attempts'
                ],
                catra: [
                    'enabled',
                    'online_mode',                  // 0=offline, 1=online (valida no server)
                    'dual_custody_enabled',          // dupla custódia
                    'identification_timeout'
                ],
                pjsip: [
                    'enabled',
                    'auto_call_button_enabled',
                    'auto_call_target',
                    'dialing_display_mode',
                    'open_door_enabled',
                    'open_door_command',
                    'facial_id_during_call_enabled'
                ],
                general: [
                    'door_enabled',
                    'portal_id'
                ]
            });
            res.json(data.data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // ============================================================
    // SIMPLES CUSTÓDIA: Autenticação 1:1 (PIN + Face)
    // O usuário digita PIN → device busca template desse user →
    // compara face 1:1 → se match, abre porta
    // ============================================================
    async setupSimpleCustody(req, res) {
        try {
            const {
                access_rule_name = 'Custódia Simples - PIN + Face',
                time_zone_id,
                portal_id = 1,
                min_score = '0.83',
                identification_timeout = '30'
            } = req.body || {};

            const steps = [];
            const errors = [];

            // ─── Passo 1: Configurar modo de identificação 1:1 (verify) com PIN ───
            logger.info('[CUSTODY] Passo 1: Configurando identificação 1:1 + PIN');
            try {
                const step1 = await idFaceService.postFcgi('set_configuration.fcgi', {
                    face_id: {
                        face_id_enabled: '1',
                        identification_mode: 'verify',           // 1:1 (verifica contra user específico)
                        multi_factor_authentication: '1',        // 1 = face + PIN
                        min_score: String(min_score),
                        anti_spoofing_enabled: '1'
                    }
                });
                steps.push({ step: 1, description: 'Modo 1:1 + PIN configurado', result: step1.data });
            } catch (e) {
                errors.push({ step: 1, error: e.message });
            }

            // ─── Passo 2: Configurar timeout de identificação ───
            logger.info('[CUSTODY] Passo 2: Configurando timeout');
            try {
                const step2 = await idFaceService.postFcgi('set_configuration.fcgi', {
                    catra: {
                        enabled: '1',
                        identification_timeout: String(identification_timeout)
                    }
                });
                steps.push({ step: 2, description: 'Timeout configurado', result: step2.data });
            } catch (e) {
                errors.push({ step: 2, error: e.message });
            }

            // ─── Passo 3: Criar/atualizar regra de acesso (se não informada) ───
            logger.info('[CUSTODY] Passo 3: Criando regra de acesso');
            try {
                const step3 = await idFaceService.createObjects('access_rules', [{
                    name: access_rule_name,
                    type: 0,       // 0 = liberação
                    priority: 0
                }]);
                const ruleId = step3.ids?.[0];
                steps.push({ step: 3, description: 'Regra de acesso criada', result: step3, access_rule_id: ruleId });

                // Vincular time_zone se informada
                if (time_zone_id && ruleId) {
                    const step3b = await idFaceService.createObjects('access_rule_time_zones', [{
                        access_rule_id: ruleId,
                        time_zone_id: Number(time_zone_id)
                    }]);
                    steps.push({ step: '3b', description: 'Time zone vinculada à regra', result: step3b });
                }
            } catch (e) {
                errors.push({ step: 3, error: e.message });
            }

            res.json({
                mode: 'simple_custody',
                description: 'Autenticação 1:1 — Usuário digita PIN, depois valida face contra o template desse PIN',
                flow: [
                    '1. Usuário digita PIN no teclado do device',
                    '2. Device busca o template facial associado ao user do PIN',
                    '3. Device captura face e compara 1:1',
                    '4. Se score >= min_score, porta abre',
                    '5. Se falha, acesso negado'
                ],
                steps,
                errors: errors.length ? errors : undefined
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // ============================================================
    // DUPLA CUSTÓDIA: PIN + Face + Chamada SIP + DTMF
    // O usuário digita PIN → face 1:1 → device liga para SOC →
    // operador atende → vê vídeo → digita código DTMF → porta abre
    // ============================================================
    async setupDualCustody(req, res) {
        try {
            const {
                access_rule_name = 'Dupla Custódia - PIN + Face + SIP',
                sip_target,                          // ramal do SOC (obrigatório)
                open_door_command = '#1234',          // código DTMF que o operador digita
                time_zone_id,
                portal_id = 1,
                min_score = '0.83',
                identification_timeout = '30',
                max_call_time = '120',
                video_enabled = '1'
            } = req.body || {};

            if (!sip_target) {
                return res.status(400).json({
                    error: 'sip_target é obrigatório (ramal do SOC/central de monitoramento)'
                });
            }

            const steps = [];
            const errors = [];

            // ─── Passo 1: Configurar modo de identificação 1:1 + PIN ───
            logger.info('[DUAL-CUSTODY] Passo 1: Configurando identificação 1:1 + PIN');
            try {
                const step1 = await idFaceService.postFcgi('set_configuration.fcgi', {
                    face_id: {
                        face_id_enabled: '1',
                        identification_mode: 'verify',
                        multi_factor_authentication: '1',
                        min_score: String(min_score),
                        anti_spoofing_enabled: '1'
                    }
                });
                steps.push({ step: 1, description: 'Modo 1:1 + PIN configurado', result: step1.data });
            } catch (e) {
                errors.push({ step: 1, error: e.message });
            }

            // ─── Passo 2: Configurar SIP com auto-call após identificação ───
            logger.info('[DUAL-CUSTODY] Passo 2: Configurando SIP auto-call para SOC');
            try {
                const step2 = await idFaceService.postFcgi('set_configuration.fcgi', {
                    pjsip: {
                        enabled: '1',
                        // Após identificação, liga automaticamente para o SOC
                        auto_call_button_enabled: '1',
                        dialing_display_mode: '0',           // 0 = auto dialing (liga direto)
                        auto_call_target: String(sip_target),
                        custom_identifier_auto_call: 'SOC - Central de Monitoramento',
                        // Operador abre porta via DTMF
                        open_door_enabled: '1',
                        open_door_command: String(open_door_command),
                        // Vídeo SIP para operador ver quem está na porta
                        video_enabled: String(video_enabled),
                        // Identificação facial durante chamada (opcional, firmware >= 6.13.1)
                        facial_id_during_call_enabled: '1',
                        // Timers
                        max_call_time: String(max_call_time)
                    }
                });
                steps.push({ step: 2, description: 'SIP configurado para auto-call ao SOC', result: step2.data });
            } catch (e) {
                errors.push({ step: 2, error: e.message });
            }

            // ─── Passo 3: Configurar timeout e custódia ───
            logger.info('[DUAL-CUSTODY] Passo 3: Habilitando dupla custódia');
            try {
                const step3 = await idFaceService.postFcgi('set_configuration.fcgi', {
                    catra: {
                        enabled: '1',
                        online_mode: '1',
                        dual_custody_enabled: '1',
                        identification_timeout: String(identification_timeout)
                    }
                });
                steps.push({ step: 3, description: 'Dupla custódia habilitada', result: step3.data });
            } catch (e) {
                errors.push({ step: 3, error: e.message });
            }

            // ─── Passo 4: Criar regra de acesso ───
            logger.info('[DUAL-CUSTODY] Passo 4: Criando regra de acesso');
            try {
                const step4 = await idFaceService.createObjects('access_rules', [{
                    name: access_rule_name,
                    type: 0,
                    priority: 0
                }]);
                const ruleId = step4.ids?.[0];
                steps.push({ step: 4, description: 'Regra de acesso criada', result: step4, access_rule_id: ruleId });

                if (time_zone_id && ruleId) {
                    const step4b = await idFaceService.createObjects('access_rule_time_zones', [{
                        access_rule_id: ruleId,
                        time_zone_id: Number(time_zone_id)
                    }]);
                    steps.push({ step: '4b', description: 'Time zone vinculada', result: step4b });
                }
            } catch (e) {
                errors.push({ step: 4, error: e.message });
            }

            res.json({
                mode: 'dual_custody',
                description: 'Dupla Custódia — PIN + Face + Chamada SIP + DTMF do operador',
                flow: [
                    '1. Usuário digita PIN no teclado do device',
                    '2. Device busca template facial do user (1:1)',
                    '3. Device captura face e compara 1:1',
                    '4. Se match, device liga automaticamente para o SOC (ramal: ' + sip_target + ')',
                    '5. Operador do SOC atende e vê vídeo do visitante',
                    '6. Operador decide: digita DTMF "' + open_door_command + '" para abrir',
                    '7. Device recebe DTMF e aciona porta',
                    '8. Se operador não atende ou nega, chamada encerra e porta NÃO abre'
                ],
                config: {
                    sip_target,
                    open_door_command,
                    video_enabled: video_enabled === '1',
                    max_call_time: Number(max_call_time),
                    min_score: Number(min_score)
                },
                steps,
                errors: errors.length ? errors : undefined
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // ============================================================
    // RESET: Voltar para modo padrão (1:N face only, sem SIP call)
    // ============================================================
    async resetToDefault(req, res) {
        try {
            const steps = [];
            const errors = [];

            // Modo 1:N padrão
            try {
                const s1 = await idFaceService.postFcgi('set_configuration.fcgi', {
                    face_id: {
                        face_id_enabled: '1',
                        identification_mode: 'identify',     // 1:N
                        multi_factor_authentication: '0',    // face only
                        anti_spoofing_enabled: '1'
                    }
                });
                steps.push({ step: 1, description: 'Modo 1:N face-only restaurado', result: s1.data });
            } catch (e) {
                errors.push({ step: 1, error: e.message });
            }

            // Desabilitar dupla custódia
            try {
                const s2 = await idFaceService.postFcgi('set_configuration.fcgi', {
                    catra: {
                        dual_custody_enabled: '0',
                        online_mode: '0'
                    }
                });
                steps.push({ step: 2, description: 'Dupla custódia desabilitada', result: s2.data });
            } catch (e) {
                errors.push({ step: 2, error: e.message });
            }

            // Desabilitar auto-call e DTMF door
            try {
                const s3 = await idFaceService.postFcgi('set_configuration.fcgi', {
                    pjsip: {
                        dialing_display_mode: '2',           // teclado + contatos
                        auto_call_target: '',
                        open_door_enabled: '0',
                        open_door_command: '',
                        facial_id_during_call_enabled: '0'
                    }
                });
                steps.push({ step: 3, description: 'SIP auto-call e DTMF resetados', result: s3.data });
            } catch (e) {
                errors.push({ step: 3, error: e.message });
            }

            res.json({
                mode: 'default',
                description: 'Restaurado para modo padrão: 1:N face-only, sem dupla custódia',
                steps,
                errors: errors.length ? errors : undefined
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // ============================================================
    // TESTE: Simula o fluxo de dupla custódia (para validação)
    // Não abre porta, apenas verifica se cada etapa funciona
    // ============================================================
    async testDualCustodyFlow(req, res) {
        try {
            const { sip_target } = req.body || {};
            const checks = [];

            // Check 1: Config de identificação
            try {
                const cfg = await idFaceService.postFcgi('get_configuration.fcgi', {
                    face_id: ['identification_mode', 'multi_factor_authentication', 'face_id_enabled'],
                    catra: ['dual_custody_enabled', 'online_mode'],
                    pjsip: ['enabled', 'auto_call_target', 'open_door_enabled', 'open_door_command', 'video_enabled']
                });
                const d = cfg.data;

                checks.push({
                    check: 'face_id_enabled',
                    expected: '1',
                    actual: d.face_id?.face_id_enabled,
                    pass: d.face_id?.face_id_enabled === '1'
                });
                checks.push({
                    check: 'identification_mode',
                    expected: 'verify (1:1)',
                    actual: d.face_id?.identification_mode,
                    pass: d.face_id?.identification_mode === 'verify'
                });
                checks.push({
                    check: 'multi_factor_authentication',
                    expected: '1 (face+PIN)',
                    actual: d.face_id?.multi_factor_authentication,
                    pass: d.face_id?.multi_factor_authentication === '1'
                });
                checks.push({
                    check: 'dual_custody_enabled',
                    expected: '1',
                    actual: d.catra?.dual_custody_enabled,
                    pass: d.catra?.dual_custody_enabled === '1'
                });
                checks.push({
                    check: 'sip_enabled',
                    expected: '1',
                    actual: d.pjsip?.enabled,
                    pass: d.pjsip?.enabled === '1'
                });
                checks.push({
                    check: 'auto_call_target',
                    expected: sip_target || '(any)',
                    actual: d.pjsip?.auto_call_target,
                    pass: sip_target ? d.pjsip?.auto_call_target === String(sip_target) : !!d.pjsip?.auto_call_target
                });
                checks.push({
                    check: 'open_door_enabled',
                    expected: '1',
                    actual: d.pjsip?.open_door_enabled,
                    pass: d.pjsip?.open_door_enabled === '1'
                });
                checks.push({
                    check: 'video_enabled',
                    expected: '1',
                    actual: d.pjsip?.video_enabled,
                    pass: d.pjsip?.video_enabled === '1'
                });
            } catch (e) {
                checks.push({ check: 'get_configuration', pass: false, error: e.message });
            }

            // Check 2: SIP registrado?
            try {
                const status = await idFaceService.postFcgi('get_sip_status.fcgi', {});
                checks.push({
                    check: 'sip_registered',
                    expected: 'status 200 (Connected)',
                    actual: `status ${status.data?.status}`,
                    pass: status.data?.status === 200
                });
                checks.push({
                    check: 'sip_not_in_call',
                    expected: 'in_call: false',
                    actual: `in_call: ${status.data?.in_call}`,
                    pass: status.data?.in_call === false
                });
            } catch (e) {
                checks.push({ check: 'sip_status', pass: false, error: e.message });
            }

            // Check 3: Existem usuários com PIN + face cadastrados?
            try {
                const users = await idFaceService.postFcgi('load_objects.fcgi', {
                    object: 'users',
                    where: [
                        { object: 'users', field: 'image_timestamp', operator: '!=', value: 0 }
                    ]
                });
                const usersWithFace = users.data?.users?.length || 0;
                checks.push({
                    check: 'users_with_face',
                    expected: '>= 1',
                    actual: String(usersWithFace),
                    pass: usersWithFace >= 1
                });
            } catch (e) {
                checks.push({ check: 'users_with_face', pass: false, error: e.message });
            }

            const allPassed = checks.every(c => c.pass);

            res.json({
                mode: 'dual_custody_test',
                all_passed: allPassed,
                total_checks: checks.length,
                passed: checks.filter(c => c.pass).length,
                failed: checks.filter(c => !c.pass).length,
                checks,
                next_steps: allPassed
                    ? [
                        '✅ Tudo configurado! Para testar na prática:',
                        '1. Vá ao device e digite o PIN de um usuário cadastrado',
                        '2. Posicione o rosto para match 1:1',
                        '3. O device deve ligar automaticamente para o ramal configurado',
                        '4. Atenda no softphone/app SIP',
                        '5. Digite o código DTMF configurado para abrir a porta'
                    ]
                    : [
                        '❌ Há checks falhando. Corrija antes de testar:',
                        ...checks.filter(c => !c.pass).map(c => `  → ${c.check}: esperado ${c.expected}, atual: ${c.actual || c.error}`)
                    ]
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = CustodyController;