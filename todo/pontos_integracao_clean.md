# Lista de Objetos

> Documento reorganizado e formatado em Markdown. Contém a descrição dos objetos usados pela API da linha de acesso e seus campos.
>
> **Fonte oficial:** Control iD — "Lista de Objetos" — https://www.controlid.com.br/docs/access-api-pt/objetos/lista-de-objetos/  (acessado em 2026-01-15)
>
> **Notas de padronização:** Tipos padronizados para clareza (ex.: `int64`, `uint64`); todos os campos de tempo usam **UNIX timestamp em segundos**; campos únicos (ex.: `cards.value`, `qrcodes.value`, `pins.value`) são mantidos conforme o documento oficial. O exemplo de conversão de cartão usa `BigInt` para evitar perda de precisão em JavaScript.

## Sumário

- [users](#users)
- [change_logs](#change_logs)
- [templates](#templates)
- [cards](#cards)
- [qrcodes](#qrcodes)
- [uhf_tags](#uhf_tags)
- [pins](#pins)
- [alarm_zones](#alarm_zones)
- [user_roles](#user_roles)
- [groups](#groups)
- [user_groups](#user_groups)
- [scheduled_unlocks](#scheduled_unlocks)
- [actions](#actions)
- [areas](#areas)
- [portals](#portals)
- [access_rules](#access_rules)
- [time_zones](#time_zones)
- [time_spans](#time_spans)
- [contingency_cards](#contingency_cards)
- [holidays](#holidays)
- [access_logs](#access_logs)
- [alarm_logs](#alarm_logs)
- [devices](#devices)
- [user_access_rules](#user_access_rules)
- [area_access_rules](#area_access_rules)
- [catra_infos](#catra_infos)
- [log_types](#log_types)
- [sec_boxs](#sec_boxs)
- [contacts](#contacts)
- [timed_alarms](#timed_alarms)
- [access_events](#access_events)
- [custom_thresholds](#custom_thresholds)
- [network_interlocking_rules](#network_interlocking_rules)

---

## users
Representa um usuário.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | int64 | Identificador único do usuário (obrigatório). |
| `registration` | string | Matrícula do usuário (obrigatório). |
| `name` | string | Nome completo do usuário (obrigatório). |
| `password` | string | Senha do usuário após hash (use `user_hash_password` para gerar). |
| `salt` | string | Salt utilizado no hash da senha. |
| `user_type_id` | int | Tipo do usuário (visitante = 1). |
| `begin_time` | int (timestamp) | Data/hora (Unix) a partir da qual o usuário é válido (0 = sem verificação). |
| `end_time` | int (timestamp) | Data/hora (Unix) até a qual o usuário é válido (0 = sem verificação). |
| `image_timestamp` | int (timestamp) | Timestamp da imagem cadastrada (0 = sem imagem). |
| `last_access` | int (timestamp) | Timestamp do último acesso (0 = sem acessos). |

---

## change_logs
Registro das operações (inserção, atualização e remoção) realizadas em `users`, `templates`, `face_templates` e `cards`.

> Observações: esse log tem limite de 10.000 operações; quando atingido há rotação (mantém-se apenas os últimos 10k). Atualmente disponível somente para iDFace.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | int64 | Identificador do registro (obrigatório). |
| `operation_type` | string | Tipo de operação (insert, update, delete). |
| `table_name` | string | Nome do objeto alterado. |
| `table_id` | int | ID do objeto alterado. |
| `timestamp` | int (timestamp) | Horário da operação (Unix). |

---

## templates
Dados biométricos (impressões digitais).

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | int64 | Identificador da biometria (obrigatório). |
| `finger_position` | int | Campo reservado. |
| `finger_type` | int | 0 = dedo comum, 1 = dedo de pânico (obrigatório). |
| `template` | base64 string | Template biométrico em Base64. |
| `user_id` | int64 | ID do usuário dono da biometria (obrigatório). |

---

## cards
Cartões de proximidade (ASK, FSK, PSK — Wiegand).

> Observação sobre `value`: Representa a numeração do cartão. Conversões entre formato "área,numero" e o valor enviado pela API seguem abaixo.

### Conversão (exemplos)
- Enviar para API: value = area * 2**32 + number
  - Exemplo: area = 123, number = 45678 => value = 123 * 2**32 + 45678 = 528281023086

- Converter API -> cartão:
  - area = floor(value / 2**32)
  - number = value - area * 2**32

Exemplo em JavaScript:

```js
function cardToApi(area, number) {
  return BigInt(area) * (1n << 32n) + BigInt(number);
}

function apiToCard(value) {
  const v = BigInt(value);
  const area = v >> 32n; // equivale a floor(v / 2**32)
  const number = v - (area << 32n);
  return { area: Number(area), number: Number(number) };
}

// Exemplos de uso:
// cardToApi(123, 45678) -> 528281023086n
// apiToCard("528281023086") -> { area: 123, number: 45678 }
```

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | int64 | Identificador do cartão (obrigatório). |
| `value` | uint64 | Valor convertido conforme descrito (único, obrigatório). |
| `user_id` | int64 | ID do usuário ao qual pertence o cartão (obrigatório). |

---

## qrcodes
QR Codes de identificação. Se o modo alfanumérico estiver desativado, QR Codes são tratados como `cards`.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | int64 | Identificador do QR Code (obrigatório). |
| `value` | string | Conteúdo do QR Code (único, obrigatório). |
| `user_id` | int64 | ID do usuário (obrigatório). |

---

## uhf_tags
Tags UHF (modos `extended` e `standard`). Em `extended` as tags podem ter até 96 bits e são armazenadas em hexadecimal (ex.: `CAFEDAD0`). Em `standard` são tratadas como `cards`.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | int64 | ID da tag (obrigatório). |
| `value` | string | Valor lido/armazenado (único, obrigatório). |
| `user_id` | int64 | ID do usuário (obrigatório). |

---

## pins
PINs de identificação.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | int64 | ID do PIN (obrigatório). |
| `value` | string | Valor do PIN (único, obrigatório). |
| `user_id` | int64 | ID do usuário (único, obrigatório). |

---

## alarm_zones
Zonas de alarme.

| Campo | Tipo | Descrição |
|---|---|---|
| `zone` | int | Identificador da zona (obrigatório). |
| `enabled` | int (0/1) | 1 = habilitada, 0 = desabilitada. |
| `active_level` | int (0/1) | 1 = ativo alto, 0 = ativo baixo. |
| `alarm_delay` | int | Tempo de atraso (ms). |

---

## user_roles
Relaciona usuários a níveis de privilégio.

| Campo | Tipo | Descrição |
|---|---|---|
| `user_id` | int64 | ID do usuário (obrigatório). |
| `role` | int | 1 = administrador. |

---

## groups
Grupos (departamentos).

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | int64 | ID do grupo (obrigatório). |
| `name` | string | Nome do grupo (obrigatório). |

---

## user_groups
Associação entre usuários e grupos.

| Campo | Tipo | Descrição |
|---|---|---|
| `user_id` | int64 | ID do usuário (obrigatório). |
| `group_id` | int64 | ID do grupo (obrigatório). |

---

## scheduled_unlocks
Liberações agendadas de acesso.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | int64 | ID da liberação (obrigatório). |
| `name` | string | Nome da liberação (obrigatório). |
| `message` | string | Mensagem exibida durante a liberação. |

---

## actions
Scripts de ação que podem ser executados localmente, em todos os dispositivos ou no servidor.

| Campo | Tipo | Descrição |
|---|---|---|
| `group_id` | int64 | ID do script no banco. |
| `name` | string | Nome descritivo. |
| `action` | string | Nome do arquivo do script. |
| `parameters` | string | Parâmetros do script. |
| `run_at` | int (0/1/2) | 0 = equipamento do usuário; 1 = todos equipamentos; 2 = servidor. |

---

## areas
Áreas de controle de acesso.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | int64 | ID da área (obrigatório). |
| `name` | string | Nome descritivo (obrigatório). |

---

## portals
Portais (conectam duas áreas, direção única).

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | int64 | ID do portal (obrigatório). |
| `name` | string | Nome descritivo (obrigatório). |
| `area_from_id` | int64 | ID da área de origem (obrigatório). |
| `area_to_id` | int64 | ID da área de destino (obrigatório). |

---

## portal_actions
Associação entre portais e ações.

| Campo | Tipo | Descrição |
|---|---|---|
| `portal_id` | int64 | ID do portal (obrigatório). |
| `action_id` | int64 | ID da ação (obrigatório). |

---

## access_rules
Regras de acesso (bloqueio e liberação). Regras de bloqueio são avaliadas antes das regras de liberação.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | int64 | ID da regra (obrigatório). |
| `name` | string | Nome descritivo (obrigatório). |
| `type` | int | 0 = bloqueio, 1 = permissão (obrigatório). |
| `priority` | int | Campo reservado. |

---

## time_zones
Horários usados por regras de acesso.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | int64 | ID do horário (obrigatório). |
| `name` | string | Nome do horário (obrigatório). |

---

## time_spans
Intervalo pertencente a um `time_zone`.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | int64 | ID do intervalo (obrigatório). |
| `time_zone_id` | int64 | ID do `time_zone` (obrigatório). |
| `start` | int | Início em segundos desde 00:00 (ex.: 01:00 = 3600). |
| `end` | int | Término em segundos desde 00:00. |
| `sun`..`sat` | int (0/1) | Ativo para cada dia da semana. |
| `hol1`..`hol3` | int (0/1) | Ativo para feriados tipo 1/2/3. |

---

## contingency_cards
Cartões válidos em modo contingência.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | int | ID auto-incremental (obrigatório). |
| `value` | int64 | Número do cartão liberado em contingência (obrigatório). |

---

## contingency_card_access_rules
Regra de acesso aplicada aos `contingency_cards`.

| Campo | Tipo | Descrição |
|---|---|---|
| `access_rule_id` | int64 | ID da regra (por padrão 1 = sempre liberado). |

---

## holidays
Feriados e tipos.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | int | ID do feriado (obrigatório). |
| `name` | string | Nome do feriado (obrigatório). |
| `start` | int (timestamp) | Início (Unix). |
| `end` | int (timestamp) | Término (Unix). |
| `hol1`..`hol3` | int (0/1) | Pertença a grupos de feriado. |
| `repeats` | int (0/1) | Repetir anualmente. |

---

## alarm_zone_time_zones
Associação entre zona de alarme e horário.

| Campo | Tipo | Descrição |
|---|---|---|
| `alarm_zone_id` | int64 | ID da zona (obrigatório). |
| `time_zone_id` | int64 | ID do horário (obrigatório). |

---

## access_rule_time_zones
Associação entre regra de acesso e horário.

| Campo | Tipo | Descrição |
|---|---|---|
| `access_rule_id` | int64 | ID da regra (obrigatório). |
| `time_zone_id` | int64 | ID do horário (obrigatório). |

---

## access_logs
Logs de acesso do equipamento.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | int64 | ID do log (obrigatório). |
| `time` | int (timestamp) | Horário da ocorrência. |
| `event` | int | Tipo de evento (veja lista abaixo). |
| `device_id` | int64 | Equipamento que registrou o evento. |
| `identifier_id` | int | Módulo de identificação que registrou o evento. |
| `user_id` | int | Usuário envolvido (quando aplicável). |
| `portal_id` | int | Portal envolvido. |
| `identification_rule_id` | int | Regra de identificação aplicada. |
| `qrcode_value` | string | QR Code usado (quando aplicável). |
| `uhf_tag` | string | Tag UHF lida (quando aplicável). |
| `pin_value` | string | PIN usado (quando aplicável). |
| `card_value` | int64 | Cartão usado (quando aplicável). |
| `confidence` | int | Confiança do reconhecimento facial (0..1800). |
| `mask` | int (0/1) | 1 = máscara presente. |
| `log_type_id` | int64 | Tipo de log (iDFlex Attendance). |

**Tipos de `event` (exemplos)**:
- Equipamento inválido
- Parâmetros de identificação inválidos
- Não identificado
- Identificação pendente
- Tempo de identificação esgotado
- Acesso negado
- Acesso concedido
- Acesso pendente
- Usuário não é administrador
- Acesso não identificado (API)
- Acesso por botoeira
- Acesso pela interface web
- Desistência de entrada (iDBlock)
- Sem resposta
- Acesso pela interfonia (iDFace)

---

## access_log_access_rules
Regras aplicadas a um `access_log`.

| Campo | Tipo | Descrição |
|---|---|---|
| `access_log_id` | int64 | ID do log (obrigatório). |
| `access_rule_id` | int64 | ID da regra (obrigatório). |

---

## alarm_logs
Logs de alarmes.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | int64 | ID do log de alarme (obrigatório). |
| `event` | int | Tipo (Alarme ativado/desativado). |
| `cause` | int | Causa do evento (zonas, porta aberta, arrombamento, etc.). |
| `user_id` | int64 | Usuário envolvido. |
| `time` | int (timestamp) | Horário da ocorrência. |
| `access_log_id` | int | ID do `access_log` relacionado (se houver). |
| `door_id` | int | Porta envolvida (se aplicável). |

---

## devices
Equipamentos registrados para comunicação em rede.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | int64 | ID do equipamento (obrigatório). |
| `name` | string | Nome do equipamento (obrigatório). |
| `ip` | string | IP ou host do equipamento (obrigatório). |

---

## user_access_rules
Associação usuário ↔ regra de acesso.

| Campo | Tipo | Descrição |
|---|---|---|
| `user_id` | int | ID do usuário (obrigatório). |
| `access_rule_id` | int | ID da regra (obrigatório). |

---

## area_access_rules
Associação área ↔ regra de acesso.

| Campo | Tipo | Descrição |
|---|---|---|
| `area_id` | int | ID da área (obrigatório). |
| `access_rule_id` | int | ID da regra (obrigatório). |

---

## catra_infos
Informações da catraca (iDBlock).

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | int | ID da catraca. |
| `left_turns` | int64 | Número de giros à esquerda. |
| `right_turns` | int64 | Número de giros à direita. |
| `entrance_turns` | int64 | Giros de entrada. |
| `exit_turns` | int64 | Giros de saída. |

---

## log_types
Tipos de log disponíveis.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | int | ID do tipo (obrigatório). |
| `name` | string | Nome do tipo (obrigatório). |

---

## sec_boxs
Configuração do módulo externo (MAE / Security Box).

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | int64 | ID da SecBox (sempre 65793). |
| `version` | int | Versão. |
| `name` | string | Nome. |
| `enabled` | bool | Habilitado?. |
| `relay_timeout` | int (ms) | Tempo de abertura do relé. |
| `door_sensor_enabled` | bool | Sensor de porta habilitado?. |
| `door_sensor_idle` | bool | Estado NO=1 / NC=0. |
| `auto_close_enabled` | int (0/1) | Fechamento automático do relé. |

---

## contacts
Contatos para interfonia SIP.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | int | ID do contato. |
| `name` | string | Nome do contato. |
| `number` | string | Número/ramal. |

---

## timed_alarms
Alarmes agendados por dias da semana.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | int64 | ID do alarme (obrigatório). |
| `name` | string | Nome do alarme (obrigatório). |
| `time` | int | Horário em segundos desde 00:00 (ex.: 01:00 = 3600). |
| `sun`..`sat` | int (0/1) | Flags por dia da semana. |

---

## access_events
Registra eventos como abertura de portas e ações da catraca.

> Observação: esse registro tem limite de 10.000 eventos; quando atingido ocorre rotação (mantém últimos 10k).

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | int64 | ID do evento (obrigatório). |
| `event` | string | Categoria: `catra`, `secbox`, `door`. |
| `type` | string | Tipo associado (ex.: `TURN_LEFT`, `OPEN`). |
| `identification` | string | `uuid` (catra) ou id textual (secbox/door). |
| `device_id` | int64 | Equipamento que reportou o evento. |
| `timestamp` | int (timestamp) | Horário do evento. |

---

## custom_thresholds
Thresholds faciais customizados (iDFace) para diferenciar faces semelhantes.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | int | ID do threshold. |
| `user_id` | int | ID do usuário (obrigatório). |
| `threshold` | int | Valor do threshold (obrigatório). |

---

## network_interlocking_rules
Regras de intertravamento remoto para evitar abertura simultânea de portas entre dispositivos.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | int | ID da regra. |
| `ip` | string | IP do dispositivo remoto (B). |
| `login` | string | Login do dispositivo remoto (B). |
| `password` | string | Senha do dispositivo remoto (B). |
| `portal_name` | string | Nome da regra. |
| `enabled` | int (0/1) | 1 = habilitado, 0 = desabilitado. |

---

## Referência e histórico
- **Fonte:** Control iD — "Lista de Objetos" — https://www.controlid.com.br/docs/access-api-pt/objetos/lista-de-objetos/ (acessado em 2026-01-15)
- **Alterações nesta versão:** padronização de tipos e timestamps; inclusão de snippet BigInt para `cards`; correções de exemplos; remoção de caracteres estranhos; formatação para Markdown.

> Se quiser, aplico alterações de estilo adicionais (TOC automático, âncoras, ou sobrescrevo o arquivo original com esta versão).