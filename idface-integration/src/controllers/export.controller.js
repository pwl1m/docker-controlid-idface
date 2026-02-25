const idFaceService = require('../services/idface.service');
const logger = require('../utils/logger');

/**
 * CONTROLLER DE EXPORTAÇÃO
 * 
 * Exporta dados em diferentes formatos: CSV, PDF, JSON
 * 
 * Endpoints:
 * - GET /api/export/users?format=csv|pdf|json
 * - GET /api/export/access-logs?format=csv|pdf|json
 * - GET /api/export/groups?format=csv|pdf|json
 * - POST /api/export/custom (body com filtros)
 */
class ExportController {

    constructor() {
        // Mapeamento de objetos para campos exportáveis
        this.exportableFields = {
            users: ['id', 'name', 'registration', 'begin_time', 'end_time', 'expires', 'user_type_id', 'image_timestamp', 'last_access'],
            access_logs: ['id', 'time', 'event', 'user_id', 'user_name', 'portal_id', 'identification_type'],
            groups: ['id', 'name'],
            holidays: ['id', 'name', 'start', 'end'],
            time_zones: ['id', 'name'],
            cards: ['id', 'value', 'user_id'],
            alarm_logs: ['id', 'time', 'event', 'user_id']
        };
    }

    /**
     * GET /api/export/:object
     * Exporta objetos em formato CSV, PDF ou JSON
     * Query params: format=csv|pdf|json, limit, offset, fields
     */
    async exportObject(req, res) {
        try {
            const { object } = req.params;
            const { 
                format = 'csv', 
                limit = 1000, 
                offset = 0,
                fields,
                ...filters
            } = req.query;

            // Validar objeto
            if (!this.exportableFields[object]) {
                return res.status(400).json({ 
                    error: `Objeto '${object}' não suportado para exportação`,
                    available: Object.keys(this.exportableFields)
                });
            }

            // Buscar dados
            const result = await idFaceService.loadObjects(object, {
                limit: parseInt(limit),
                offset: parseInt(offset)
            });

            const data = result[object] || [];

            if (!data.length) {
                return res.status(404).json({ 
                    error: 'Nenhum dado encontrado para exportar',
                    object,
                    filters
                });
            }

            // Definir campos a exportar
            const exportFields = fields 
                ? fields.split(',').map(f => f.trim())
                : this.exportableFields[object];

            // Filtrar apenas os campos solicitados
            const filteredData = data.map(item => {
                const filtered = {};
                exportFields.forEach(field => {
                    if (item[field] !== undefined) {
                        filtered[field] = this._formatValue(item[field], field);
                    }
                });
                return filtered;
            });

            // Exportar no formato solicitado
            switch (format.toLowerCase()) {
                case 'csv':
                    return this._exportCSV(res, filteredData, object, exportFields);
                case 'pdf':
                    return this._exportPDF(res, filteredData, object, exportFields);
                case 'json':
                default:
                    return res.json({
                        object,
                        total: filteredData.length,
                        fields: exportFields,
                        data: filteredData
                    });
            }

        } catch (error) {
            logger.error('[EXPORT] Erro ao exportar:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * POST /api/export/custom
     * Exportação customizada com filtros avançados
     * Body: { object, format, fields, where, limit, offset }
     */
    async exportCustom(req, res) {
        try {
            const {
                object,
                format = 'csv',
                fields,
                where,
                limit = 1000,
                offset = 0,
                title = null
            } = req.body;

            if (!object) {
                return res.status(400).json({ error: 'object é obrigatório' });
            }

            // Buscar dados com filtros
            const queryParams = { limit, offset };
            if (where) {
                queryParams.where = where;
            }

            const result = await idFaceService.loadObjects(object, queryParams);
            const data = result[object] || [];

            if (!data.length) {
                return res.status(404).json({ 
                    error: 'Nenhum dado encontrado',
                    object,
                    where
                });
            }

            // Definir campos
            const exportFields = fields || Object.keys(data[0]);

            // Filtrar campos
            const filteredData = data.map(item => {
                const filtered = {};
                exportFields.forEach(field => {
                    if (item[field] !== undefined) {
                        filtered[field] = this._formatValue(item[field], field);
                    }
                });
                return filtered;
            });

            // Exportar
            switch (format.toLowerCase()) {
                case 'csv':
                    return this._exportCSV(res, filteredData, title || object, exportFields);
                case 'pdf':
                    return this._exportPDF(res, filteredData, title || object, exportFields);
                case 'json':
                default:
                    return res.json({
                        object,
                        total: filteredData.length,
                        fields: exportFields,
                        data: filteredData
                    });
            }

        } catch (error) {
            logger.error('[EXPORT] Erro ao exportar custom:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Exporta dados para CSV
     */
    _exportCSV(res, data, filename, fields) {
        if (!data.length) {
            return res.status(404).json({ error: 'Sem dados para exportar' });
        }

        // Gerar CSV manualmente (sem dependência externa)
        const headers = fields.join(';');
        const rows = data.map(item => {
            return fields.map(field => {
                let value = item[field];
                if (value === null || value === undefined) {
                    return '';
                }
                // Escapar aspas e quebras de linha
                value = String(value).replace(/"/g, '""');
                if (value.includes(';') || value.includes('"') || value.includes('\n')) {
                    value = `"${value}"`;
                }
                return value;
            }).join(';');
        });

        const csv = [headers, ...rows].join('\n');

        // BOM para UTF-8 correto no Excel
        const bom = '\uFEFF';

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}_${this._getTimestamp()}.csv"`);
        res.send(bom + csv);
    }

    /**
     * Exporta dados para PDF
     * Usa HTML simples que pode ser convertido em PDF pelo navegador
     */
    _exportPDF(res, data, title, fields) {
        if (!data.length) {
            return res.status(404).json({ error: 'Sem dados para exportar' });
        }

        // Gerar HTML formatado para impressão/PDF
        const timestamp = new Date().toLocaleString('pt-BR');
        
        const tableHeaders = fields.map(f => `<th>${this._formatFieldName(f)}</th>`).join('');
        const tableRows = data.map(item => {
            const cells = fields.map(field => `<td>${item[field] ?? ''}</td>`).join('');
            return `<tr>${cells}</tr>`;
        }).join('');

        const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - Exportação</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 12px;
            padding: 20px;
            background: white;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #333;
        }
        .header h1 {
            font-size: 18px;
            color: #333;
            margin-bottom: 5px;
        }
        .header .info {
            font-size: 10px;
            color: #666;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        th {
            background-color: #4a90d9;
            color: white;
            padding: 8px 5px;
            text-align: left;
            font-size: 11px;
            border: 1px solid #3a80c9;
        }
        td {
            padding: 6px 5px;
            border: 1px solid #ddd;
            font-size: 10px;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        tr:hover {
            background-color: #f0f0f0;
        }
        .footer {
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 10px;
            color: #666;
        }
        .total {
            margin-top: 10px;
            text-align: right;
            font-weight: bold;
        }
        @media print {
            body { padding: 0; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${this._formatTitle(title)}</h1>
        <div class="info">Gerado em: ${timestamp}</div>
    </div>
    
    <table>
        <thead>
            <tr>${tableHeaders}</tr>
        </thead>
        <tbody>
            ${tableRows}
        </tbody>
    </table>
    
    <div class="total">
        Total de registros: ${data.length}
    </div>
    
    <div class="footer">
        Relatório gerado automaticamente pelo Sistema iDFace Integration
    </div>
    
    <script class="no-print">
        // Auto-print quando abrir no navegador
        // window.onload = function() { window.print(); }
    </script>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', `inline; filename="${title}_${this._getTimestamp()}.html"`);
        res.send(html);
    }

    /**
     * Formata valores para exportação
     */
    _formatValue(value, field) {
        if (value === null || value === undefined) {
            return '';
        }

        // Campos de timestamp Unix
        if (['time', 'begin_time', 'end_time', 'expires', 'last_access', 'image_timestamp'].includes(field)) {
            if (typeof value === 'number' && value > 0) {
                return new Date(value * 1000).toLocaleString('pt-BR');
            }
        }

        // Campos de evento (access_logs)
        if (field === 'event' && typeof value === 'number') {
            const events = {
                1: 'Acesso Liberado',
                2: 'Acesso Negado',
                3: 'Não Identificado',
                4: 'Timeout',
                5: 'Pânico',
                6: 'Violação',
                7: 'Entrada',
                8: 'Saída'
            };
            return events[value] || `Evento ${value}`;
        }

        return value;
    }

    /**
     * Formata nome do campo para header
     */
    _formatFieldName(field) {
        const names = {
            id: 'ID',
            name: 'Nome',
            registration: 'Matrícula',
            user_id: 'ID Usuário',
            user_name: 'Usuário',
            begin_time: 'Início',
            end_time: 'Fim',
            expires: 'Expira',
            last_access: 'Último Acesso',
            image_timestamp: 'Foto Atualizada',
            time: 'Data/Hora',
            event: 'Evento',
            portal_id: 'Portal',
            identification_type: 'Tipo ID',
            user_type_id: 'Tipo Usuário',
            value: 'Valor',
            start: 'Início',
            end: 'Fim'
        };
        return names[field] || field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ');
    }

    /**
     * Formata título
     */
    _formatTitle(title) {
        const titles = {
            users: 'Lista de Usuários',
            access_logs: 'Logs de Acesso',
            alarm_logs: 'Logs de Alarme',
            groups: 'Departamentos',
            holidays: 'Feriados',
            time_zones: 'Horários',
            cards: 'Cartões'
        };
        return titles[title] || title.charAt(0).toUpperCase() + title.slice(1).replace(/_/g, ' ');
    }

    /**
     * Gera timestamp para nome do arquivo
     */
    _getTimestamp() {
        const now = new Date();
        return now.toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_');
    }
}

module.exports = ExportController;
