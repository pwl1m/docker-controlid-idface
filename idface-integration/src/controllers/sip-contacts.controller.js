const idFaceService = require('../services/idface.service');
const logger = require('../utils/logger');

/**
 * Controller para gerenciamento de contatos SIP
 * 
 * ABORDAGEM: Usa campo customizado "sip_ramal" nos users do device
 * Segue estrutura nativa da ControlID (users + object fields)
 * 
 * MIGRAÇÃO FUTURA (BANCO DE DADOS):
 * ─────────────────────────────────────────────────────────────────
 * Tabela sugerida: sip_contacts
 * 
 * CREATE TABLE sip_contacts (
 *   id SERIAL PRIMARY KEY,
 *   user_id INTEGER REFERENCES users(id),
 *   ramal VARCHAR(50) NOT NULL,
 *   created_at TIMESTAMP DEFAULT NOW(),
 *   updated_at TIMESTAMP DEFAULT NOW()
 * );
 * 
 * Ou adicionar coluna na tabela users existente:
 * ALTER TABLE users ADD COLUMN sip_ramal VARCHAR(50);
 * 
 * Substituir chamadas idFaceService por queries SQL
 * Manter interface da API igual (sem breaking changes)
 * ─────────────────────────────────────────────────────────────────
 */
class SipContactsController {

    constructor() {
        this.FIELD_NAME = 'sip_ramal';  // Campo customizado nos users
        this.OBJECT_TYPE = 'users';
    }

    /**
     * Garante que o campo sip_ramal existe no objeto users
     * Chamado automaticamente antes de operações
     * 
     * MIGRAÇÃO BANCO: Não necessário (campo já existe na tabela)
     */
    async ensureFieldExists() {
        try {
            // Verificar se campo já existe tentando carregar um user com ele
            const test = await idFaceService.loadObjects(this.OBJECT_TYPE, {
                limit: 1,
                fields: [this.FIELD_NAME]
            });
            
            // Se não deu erro, campo existe
            return { exists: true, created: false };
        } catch (error) {
            // Campo não existe, criar
            if (error.message?.includes('400') || error.message?.includes('field')) {
                logger.info(`[SIP-CONTACTS] Criando campo customizado: ${this.FIELD_NAME}`);
                
                try {
                    await idFaceService.postFcgi('object_add_field.fcgi', {
                        object: this.OBJECT_TYPE,
                        field: this.FIELD_NAME,
                        type: 'varchar(50)'  // Tipo string para ramal
                    });
                    return { exists: true, created: true };
                } catch (createError) {
                    logger.error(`[SIP-CONTACTS] Erro ao criar campo: ${createError.message}`);
                    throw createError;
                }
            }
            throw error;
        }
    }

    /**
     * GET /api/sip-contacts
     * Lista todos os users que têm ramal SIP configurado
     * 
     * MIGRAÇÃO BANCO: SELECT * FROM users WHERE sip_ramal IS NOT NULL AND sip_ramal != ''
     */
    async listContacts(req, res) {
        try {
            await this.ensureFieldExists();

            // Carregar users com os campos necessários
            const result = await idFaceService.loadObjects(this.OBJECT_TYPE, {
                fields: ['id', 'name', 'registration', this.FIELD_NAME],
                // where com sip_ramal não vazio seria ideal, mas device pode não suportar
                // Filtramos no código
            });

            const users = result.users || result || [];
            
            // Filtrar apenas users com ramal preenchido
            const contacts = users
                .filter(u => u[this.FIELD_NAME] && String(u[this.FIELD_NAME]).trim() !== '')
                .map(u => ({
                    id: u.id,
                    name: u.name,
                    registration: u.registration || null,
                    ramal: u[this.FIELD_NAME],
                    // photo: seria user_get_image.fcgi, mas aumenta latência
                }));

            res.json({
                total: contacts.length,
                contacts
            });

        } catch (error) {
            logger.error('[SIP-CONTACTS] Erro ao listar:', error.message);
            res.status(error.status || 500).json({ error: error.message });
        }
    }

    /**
     * GET /api/sip-contacts/:id
     * Obtém um contato específico (user com ramal)
     * 
     * MIGRAÇÃO BANCO: SELECT * FROM users WHERE id = $1
     */
    async getContact(req, res) {
        try {
            const { id } = req.params;

            const result = await idFaceService.loadObjects(this.OBJECT_TYPE, {
                where: { [this.OBJECT_TYPE]: { id: parseInt(id) } },
                fields: ['id', 'name', 'registration', this.FIELD_NAME]
            });

            const users = result.users || result || [];
            const user = users[0];

            if (!user) {
                return res.status(404).json({ error: 'Usuário não encontrado' });
            }

            if (!user[this.FIELD_NAME]) {
                return res.status(404).json({ error: 'Usuário não possui ramal SIP' });
            }

            // Tentar obter foto (opcional)
            let photo = null;
            try {
                const imageResult = await idFaceService.postFcgi('user_get_image.fcgi', {
                    user_id: parseInt(id)
                });
                photo = imageResult.data?.user_image || imageResult.user_image || null;
            } catch (e) {
                // Sem foto, não é erro crítico
            }

            res.json({
                id: user.id,
                name: user.name,
                registration: user.registration || null,
                ramal: user[this.FIELD_NAME],
                photo
            });

        } catch (error) {
            logger.error('[SIP-CONTACTS] Erro ao obter contato:', error.message);
            res.status(error.status || 500).json({ error: error.message });
        }
    }

    /**
     * PUT /api/sip-contacts/:id
     * Define/atualiza o ramal SIP de um user existente
     * Body: { ramal: "1001" }
     * 
     * MIGRAÇÃO BANCO: UPDATE users SET sip_ramal = $1, updated_at = NOW() WHERE id = $2
     */
    async setContactRamal(req, res) {
        try {
            const { id } = req.params;
            const { ramal } = req.body;

            if (!ramal) {
                return res.status(400).json({ error: 'ramal é obrigatório' });
            }

            await this.ensureFieldExists();

            // Verificar se user existe
            const checkResult = await idFaceService.loadObjects(this.OBJECT_TYPE, {
                where: { [this.OBJECT_TYPE]: { id: parseInt(id) } },
                fields: ['id', 'name']
            });

            const users = checkResult.users || checkResult || [];
            if (!users.length) {
                return res.status(404).json({ error: 'Usuário não encontrado' });
            }

            // CORREÇÃO: Usar postFcgi diretamente com modify_objects.fcgi
            // A assinatura de modifyObjects no service pode não estar compatível
            const updateResult = await idFaceService.postFcgi('modify_objects.fcgi', {
                object: this.OBJECT_TYPE,
                values: { [this.FIELD_NAME]: String(ramal).trim() },
                where: { [this.OBJECT_TYPE]: { id: parseInt(id) } }
            });

            logger.info(`[SIP-CONTACTS] Ramal ${ramal} definido para user ${id}`);

            res.json({
                success: true,
                user_id: parseInt(id),
                ramal: String(ramal).trim(),
                name: users[0].name,
                message: `Ramal ${ramal} configurado para ${users[0].name}`
            });

        } catch (error) {
            logger.error('[SIP-CONTACTS] Erro ao definir ramal:', error.message);
            res.status(error.status || 500).json({ error: error.message });
        }
    }

    /**
     * DELETE /api/sip-contacts/:id
     * Remove o ramal SIP de um user (não exclui o user)
     * 
     * MIGRAÇÃO BANCO: UPDATE users SET sip_ramal = NULL, updated_at = NOW() WHERE id = $1
     */
    async removeContactRamal(req, res) {
        try {
            const { id } = req.params;

            // Limpar campo sip_ramal
            const updateResult = await idFaceService.modifyObjects(
                this.OBJECT_TYPE,
                parseInt(id),
                { [this.FIELD_NAME]: '' }
            );

            logger.info(`[SIP-CONTACTS] Ramal removido do user ${id}`);

            res.json({
                success: true,
                user_id: parseInt(id),
                message: 'Ramal SIP removido'
            });

        } catch (error) {
            logger.error('[SIP-CONTACTS] Erro ao remover ramal:', error.message);
            res.status(error.status || 500).json({ error: error.message });
        }
    }

    /**
     * POST /api/sip-contacts/:id/call
     * Faz chamada SIP para o ramal do contato
     * 
     * Usa make_sip_call.fcgi do device
     */
    async callContact(req, res) {
        try {
            const { id } = req.params;

            // Buscar ramal do user
            const result = await idFaceService.loadObjects(this.OBJECT_TYPE, {
                where: { [this.OBJECT_TYPE]: { id: parseInt(id) } },
                fields: ['id', 'name', this.FIELD_NAME]
            });

            const users = result.users || result || [];
            const user = users[0];

            if (!user) {
                return res.status(404).json({ error: 'Usuário não encontrado' });
            }

            if (!user[this.FIELD_NAME]) {
                return res.status(400).json({ error: 'Usuário não possui ramal SIP configurado' });
            }

            const ramal = user[this.FIELD_NAME];

            // Fazer chamada
            logger.info(`[SIP-CONTACTS] Iniciando chamada para ${user.name} (${ramal})`);

            const callResult = await idFaceService.postFcgi('make_sip_call.fcgi', {
                target: ramal
            });

            res.json({
                success: true,
                calling: {
                    user_id: user.id,
                    name: user.name,
                    ramal
                },
                result: callResult.data || callResult
            });

        } catch (error) {
            logger.error('[SIP-CONTACTS] Erro ao chamar:', error.message);
            res.status(error.status || 500).json({ error: error.message });
        }
    }

    /**
     * POST /api/sip-contacts/call-direct
     * Faz chamada direta para um ramal (sem precisar de contato)
     * Body: { ramal: "1001" }
     */
    async callDirect(req, res) {
        try {
            const { ramal } = req.body;

            if (!ramal) {
                return res.status(400).json({ error: 'ramal é obrigatório' });
            }

            logger.info(`[SIP-CONTACTS] Chamada direta para ramal ${ramal}`);

            const callResult = await idFaceService.postFcgi('make_sip_call.fcgi', {
                target: String(ramal)
            });

            res.json({
                success: true,
                ramal,
                result: callResult.data || callResult
            });

        } catch (error) {
            logger.error('[SIP-CONTACTS] Erro chamada direta:', error.message);
            res.status(error.status || 500).json({ error: error.message });
        }
    }

    /**
     * GET /api/sip-contacts/field/status
     * Verifica se o campo sip_ramal existe no device
     * Útil para debug/setup
     */
    async getFieldStatus(req, res) {
        try {
            const status = await this.ensureFieldExists();
            res.json({
                field_name: this.FIELD_NAME,
                object_type: this.OBJECT_TYPE,
                ...status
            });
        } catch (error) {
            res.status(500).json({ 
                field_name: this.FIELD_NAME,
                exists: false,
                error: error.message 
            });
        }
    }
}

module.exports = SipContactsController;
