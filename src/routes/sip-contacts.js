const express = require('express');
const router = express.Router();
const SipContactsController = require('../controllers/sip-contacts.controller');

const controller = new SipContactsController();

/**
 * ROTAS DE CONTATOS SIP
 * 
 * Usa campo customizado "sip_ramal" nos users do device ControlID
 * Segue estrutura nativa da documentação oficial
 * 
 * MIGRAÇÃO FUTURA (BANCO):
 * ─────────────────────────────────────────────────────────────────
 * - Manter mesmas rotas e responses
 * - Trocar controller por versão com queries SQL
 * - Zero breaking changes na API
 * ─────────────────────────────────────────────────────────────────
 */

// ═══════════════════════════════════════════════════════════════════
// UTILITÁRIOS (deve vir ANTES das rotas com :id para evitar conflito)
// ═══════════════════════════════════════════════════════════════════

// Status do campo customizado no device
router.get('/field/status', controller.getFieldStatus.bind(controller));

// Chamada direta (sem contato, só ramal)
router.post('/call-direct', controller.callDirect.bind(controller));

// ═══════════════════════════════════════════════════════════════════
// CRUD DE CONTATOS (users com ramal SIP)
// ═══════════════════════════════════════════════════════════════════

// Listar todos os contatos (users com ramal)
router.get('/', controller.listContacts.bind(controller));

// Obter contato específico (com foto se tiver)
router.get('/:id', controller.getContact.bind(controller));

// Definir/atualizar ramal de um user
router.put('/:id', controller.setContactRamal.bind(controller));

// Remover ramal de um user
router.delete('/:id', controller.removeContactRamal.bind(controller));

// ═══════════════════════════════════════════════════════════════════
// CHAMADAS SIP
// ═══════════════════════════════════════════════════════════════════

// Chamar contato pelo ID do user
router.post('/:id/call', controller.callContact.bind(controller));

module.exports = router;
