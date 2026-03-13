/**
 * Statistics Controller
 * Fornece estatísticas agregadas dos logs de acesso e alarme
 */
const idFaceService = require('../services/idface.service');
const logger = require('../utils/logger');

// Mapeamento de eventos de access_logs
const ACCESS_EVENTS = {
    1: { code: 'GRANTED', label: 'Acesso Liberado', type: 'unlock' },
    2: { code: 'DENIED', label: 'Acesso Negado', type: 'block' },
    3: { code: 'NOT_IDENTIFIED', label: 'Não Identificado', type: 'block' },
    4: { code: 'TIMEOUT', label: 'Timeout', type: 'block' },
    5: { code: 'PANIC', label: 'Pânico', type: 'alert' },
    6: { code: 'VIOLATION', label: 'Violação', type: 'alert' },
    7: { code: 'ENTRY', label: 'Entrada', type: 'unlock' },
    8: { code: 'EXIT', label: 'Saída', type: 'unlock' }
};

// Eventos que contam como bloqueio
const BLOCK_EVENTS = [2, 3, 4];
// Eventos que contam como liberação/desbloqueio
const UNLOCK_EVENTS = [1, 7, 8];

class StatisticsController {
    
    /**
     * GET /api/statistics/access-summary
     * Retorna resumo de acessos (liberados vs bloqueados)
     * Query: ?from=timestamp&to=timestamp&user_id=&portal_id=
     */
    async getAccessSummary(req, res) {
        try {
            const { from, to, user_id, portal_id, limit = 10000 } = req.query;

            const options = { limit: Number(limit) };
            const where = [];

            if (from) where.push({ object: 'access_logs', field: 'time', operator: '>=', value: Number(from) });
            if (to) where.push({ object: 'access_logs', field: 'time', operator: '<=', value: Number(to) });
            if (user_id) where.push({ object: 'access_logs', field: 'user_id', value: Number(user_id) });
            if (portal_id) where.push({ object: 'access_logs', field: 'portal_id', value: Number(portal_id) });

            if (where.length) options.where = where;

            const result = await idFaceService.loadObjects('access_logs', options);
            const logs = result.access_logs || [];

            // Contadores
            const summary = {
                total: logs.length,
                granted: 0,         // Evento 1: Acesso Liberado
                denied: 0,          // Evento 2: Acesso Negado  
                not_identified: 0,  // Evento 3: Não Identificado
                timeout: 0,         // Evento 4: Timeout
                panic: 0,           // Evento 5: Pânico
                violation: 0,       // Evento 6: Violação
                entry: 0,           // Evento 7: Entrada
                exit: 0,            // Evento 8: Saída
                // Agregados
                blocks: 0,          // Soma de: denied + not_identified + timeout
                unlocks: 0,         // Soma de: granted + entry + exit
                alerts: 0           // Soma de: panic + violation
            };

            // Contar por evento
            logs.forEach(log => {
                const event = Number(log.event);
                switch (event) {
                    case 1: summary.granted++; break;
                    case 2: summary.denied++; break;
                    case 3: summary.not_identified++; break;
                    case 4: summary.timeout++; break;
                    case 5: summary.panic++; break;
                    case 6: summary.violation++; break;
                    case 7: summary.entry++; break;
                    case 8: summary.exit++; break;
                }
            });

            // Calcular agregados
            summary.blocks = summary.denied + summary.not_identified + summary.timeout;
            summary.unlocks = summary.granted + summary.entry + summary.exit;
            summary.alerts = summary.panic + summary.violation;

            // Percentuais
            summary.block_rate = summary.total > 0 
                ? ((summary.blocks / summary.total) * 100).toFixed(2) + '%'
                : '0%';
            summary.success_rate = summary.total > 0
                ? ((summary.unlocks / summary.total) * 100).toFixed(2) + '%'
                : '0%';

            // Período analisado
            const times = logs.map(l => l.time).filter(t => t > 0);
            summary.period = {
                from: times.length ? new Date(Math.min(...times) * 1000).toISOString() : null,
                to: times.length ? new Date(Math.max(...times) * 1000).toISOString() : null,
                records: logs.length
            };

            res.json({
                success: true,
                summary,
                event_reference: ACCESS_EVENTS
            });

        } catch (error) {
            logger.error('[STATISTICS] Erro ao obter resumo de acesso:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * GET /api/statistics/blocks
     * Retorna apenas eventos de bloqueio (negados, não identificados, timeout)
     * Query: ?from=timestamp&to=timestamp&user_id=&portal_id=&limit=100&offset=0
     */
    async getBlocks(req, res) {
        try {
            const { from, to, user_id, portal_id, limit = 100, offset = 0 } = req.query;

            // Primeiro, buscar todos os logs no período
            const options = { limit: Number(limit) + Number(offset) };
            const where = [];

            if (from) where.push({ object: 'access_logs', field: 'time', operator: '>=', value: Number(from) });
            if (to) where.push({ object: 'access_logs', field: 'time', operator: '<=', value: Number(to) });
            if (user_id) where.push({ object: 'access_logs', field: 'user_id', value: Number(user_id) });
            if (portal_id) where.push({ object: 'access_logs', field: 'portal_id', value: Number(portal_id) });

            if (where.length) options.where = where;

            const result = await idFaceService.loadObjects('access_logs', options);
            const logs = result.access_logs || [];

            // Filtrar apenas eventos de bloqueio
            const blocks = logs
                .filter(log => BLOCK_EVENTS.includes(Number(log.event)))
                .slice(Number(offset), Number(offset) + Number(limit))
                .map(log => ({
                    ...log,
                    event_code: ACCESS_EVENTS[log.event]?.code || 'UNKNOWN',
                    event_label: ACCESS_EVENTS[log.event]?.label || `Evento ${log.event}`,
                    time_formatted: log.time ? new Date(log.time * 1000).toLocaleString('pt-BR') : null
                }));

            res.json({
                success: true,
                total: blocks.length,
                blocks,
                block_event_types: BLOCK_EVENTS.map(e => ({
                    event: e,
                    ...ACCESS_EVENTS[e]
                }))
            });

        } catch (error) {
            logger.error('[STATISTICS] Erro ao obter bloqueios:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * GET /api/statistics/user/:user_id
     * Retorna estatísticas de um usuário específico
     */
    async getUserStats(req, res) {
        try {
            const { user_id } = req.params;
            const { from, to, limit = 1000 } = req.query;

            const options = { limit: Number(limit) };
            const where = [
                { object: 'access_logs', field: 'user_id', value: Number(user_id) }
            ];

            if (from) where.push({ object: 'access_logs', field: 'time', operator: '>=', value: Number(from) });
            if (to) where.push({ object: 'access_logs', field: 'time', operator: '<=', value: Number(to) });

            options.where = where;

            const result = await idFaceService.loadObjects('access_logs', options);
            const logs = result.access_logs || [];

            // Calcular estatísticas do usuário
            const stats = {
                user_id: Number(user_id),
                total_events: logs.length,
                granted: logs.filter(l => l.event === 1).length,
                denied: logs.filter(l => BLOCK_EVENTS.includes(Number(l.event))).length,
                last_access: logs.length ? Math.max(...logs.map(l => l.time)) : null,
                last_access_formatted: null,
                has_blocks: false
            };

            if (stats.last_access) {
                stats.last_access_formatted = new Date(stats.last_access * 1000).toLocaleString('pt-BR');
            }

            stats.has_blocks = stats.denied > 0;
            stats.block_rate = stats.total_events > 0
                ? ((stats.denied / stats.total_events) * 100).toFixed(2) + '%'
                : '0%';

            // Últimos 10 eventos
            stats.recent_events = logs
                .sort((a, b) => b.time - a.time)
                .slice(0, 10)
                .map(log => ({
                    time: log.time,
                    time_formatted: new Date(log.time * 1000).toLocaleString('pt-BR'),
                    event: log.event,
                    event_label: ACCESS_EVENTS[log.event]?.label || `Evento ${log.event}`,
                    portal_id: log.portal_id
                }));

            res.json({
                success: true,
                stats
            });

        } catch (error) {
            logger.error('[STATISTICS] Erro ao obter stats do usuário:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * GET /api/statistics/events
     * Retorna referência de todos os tipos de eventos
     */
    async getEventTypes(req, res) {
        res.json({
            success: true,
            events: ACCESS_EVENTS,
            categories: {
                block: {
                    label: 'Bloqueios',
                    events: BLOCK_EVENTS,
                    description: 'Eventos que indicam acesso negado ou falha na identificação'
                },
                unlock: {
                    label: 'Liberações',
                    events: UNLOCK_EVENTS,
                    description: 'Eventos que indicam acesso liberado com sucesso'
                },
                alert: {
                    label: 'Alertas',
                    events: [5, 6],
                    description: 'Eventos que requerem atenção imediata (pânico, violação)'
                }
            }
        });
    }
}

module.exports = StatisticsController;
