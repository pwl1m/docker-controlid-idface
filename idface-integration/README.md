# IDFace Integration

API backend para integração com dispositivos **ControlID iDFace** (reconhecimento facial). Abstrai a comunicação FCGI do equipamento e expõe endpoints REST para frontend/integrações.

## Visão Geral

O backend é um “tradutor” entre API HTTP e o device Control iD.
Entrada principal: index.js.
Rotas da API interna são montadas em index.js via prefixo /api.
Quase toda lógica de conversa com o device passa por idface.service.js.
Controllers recebem requisição, validam dados, chamam service, devolvem resposta.

## Como os arquivos se conectam

Fluxo padrão: Route -> Controller -> idface.service -> axios -> device.

## Exemplo real:
rota em system.js
chama método em idface.service.js
que monta URL com sessão e chama endpoint .fcgi do IDFace.

CRUD genérico (users, groups, holidays, etc.) reutiliza generic.controller.js, evitando duplicar código.

Segurança é por API key no middleware auth.js (x-api-key ou api_key).

## Arquivos mais importantes (ordem de prioridade)

idface.service.js — núcleo de integração com o device.

idface-integration/src/index.js — bootstrap, callbacks e entrada HTTP.

idface-integration/src/routes/index.js — mapa de tudo que a API expõe.

idface-integration/src/config/index.js — IP do device, porta, API key, flags.

Controllers de domínio: device.controller.js, statistics.controller.js, enrollment.controller.js, interfonia.controller.js, export.controller.js.

## Quais arquivos falam com o IDFace

Direto (principal): idface.service.js.

Indireto (via service): praticamente todos os controllers em controllers/.

Também há fluxo inverso Device -> Backend em callbacks de enrollment/ e notificações no idface-integration/src/index.js.

## Pontos importantes

O endpoint /api/login existe e autentica no device, mas o middleware de proteção continua sendo API key.

## Funcionalidades

- **Autenticação e Reconhecimento Facial**
- **Gestão de Usuários** (CRUD completo com cadastro facial)
- **Controle de Acesso** (regras, grupos, horários, feriados)
- **Interfonia SIP** (contatos e chamadas)
- **Custódia** (modo customizado para transferência de responsabilidade)
- **Push API** (comunicação bidirecional com o dispositivo)
- **Logs e Relatórios** (acessos, alarmes, estatísticas)
- **Exportação CSV/PDF**
- **SecBox** (acionamento remoto de portas)

## Stack

- **Node.js 18** + Express
- **Docker** (network_mode: host)
- **Dispositivo**: ControlID iDFace (firmware 6.23)

## Estrutura do Projeto

```
idface-integration/
├── src/
│   ├── index.js                    # Entry point
│   ├── config/index.js             # Configurações (env vars)
│   ├── services/
│   │   ├── idface.service.js       # Comunicação FCGI com dispositivo
│   │   ├── custody-call.service.js # Lógica de custódia
│   │   └── push-queue.service.js   # Fila de comandos push
│   ├── controllers/                # 18 controllers especializados
│   ├── routes/                     # Definição de rotas
│   ├── middlewares/auth.js         # Autenticação via API Key
│   └── __tests__/                  # Testes Jest
├── docker/Dockerfile
├── docker-compose.yml
└── package.json
```

## Variáveis de Ambiente

```bash
# Dispositivo iDFace
DEVICE_IP= #Instanciado individualmente a cada container.
DEVICE_LOGIN=admin
DEVICE_PASSWORD=admin

# Servidor
PORT=3001
SERVER_IP= # Testar se vazio auto-conectar

# Push (comunicação com dispositivo)
PUSH_REQUEST_TIMEOUT=4000
PUSH_REQUEST_PERIOD=5

# Segurança
API_KEY=                      # Se vazio, endpoints não requerem auth
# A necessidade maior é ter um $SESSION valida apos o login

# Logs (opcional)
SHOW_HEARTBEAT_LOGS=false
SHOW_POLLING_LOGS=false
```

## Setup
## API Endpoints

Base URL: `http://localhost:3001/api`

### Autenticação

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/login` | Login no dispositivo |
| POST | `/recognize` | Reconhecimento facial |

### Device

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/device/info` | - | Informações do dispositivo |
| POST | `/device/configure-push` | - | Configurar push |
| GET | `/device/config` | ✓ | Obter configurações |
| PUT | `/device/config` | ✓ | Atualizar configurações |
| GET | `/device/config/identification-timeout` | ✓ | Timeout de identificação |
| PUT | `/device/config/identification-timeout` | ✓ | Alterar timeout |

### Usuários

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/users` | - | Listar usuários |
| GET | `/users/:id` | - | Obter usuário |
| POST | `/users` | ✓ | Criar usuário |
| PATCH | `/users/:id` | ✓ | Atualizar usuário |
| DELETE | `/users/:id` | ✓ | Remover usuário |
| GET | `/users/:id/photo` | - | Foto do usuário |
| PUT | `/users/:id/photo` | ✓ | Upload de foto |

### Cadastro Facial (Enrollment)

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| POST | `/enrollment/remote` | ✓ | Iniciar captura remota (face/card/pin) |
| POST | `/enrollment/cancel` | ✓ | Cancelar captura em andamento |
| GET | `/enrollment/face/list` | ✓ | Listar usuários com foto |
| GET | `/enrollment/face/:user_id` | ✓ | Obter foto do usuário |
| POST | `/enrollment/face/upload` | ✓ | Upload via base64 |
| POST | `/enrollment/face/upload-binary` | ✓ | Upload via binary |
| POST | `/enrollment/face/upload-multiple` | ✓ | Upload múltiplas fotos |
| POST | `/enrollment/face/test` | ✓ | Testar se imagem é válida |
| DELETE | `/enrollment/face/:user_id` | ✓ | Remover foto facial |

### Session

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/session/status` | ✓ | Verificar se sessão é válida |
| POST | `/logout` | ✓ | Encerrar sessão |

### Sistema (System)

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/system/info` | - | Informações completas do dispositivo |
| GET | `/system/session` | - | Status da sessão atual |
| POST | `/system/sync-time` | ✓ | Sincronizar hora com servidor |
| POST | `/system/reboot` | ✓ | Reiniciar dispositivo |
| POST | `/system/message` | ✓ | Enviar mensagem para tela |
| POST | `/system/backup` | ✓ | Backup dos objects |
| POST | `/system/restore` | ✓ | Restaurar backup |
| GET | `/system/config/:module` | - | Obter configuração por módulo |
| POST | `/system/config` | ✓ | Definir configuração |
| GET | `/system/network` | ✓ | Obter configurações de rede |
| PUT | `/system/network` | ✓ | Alterar IP/gateway/DNS |
| POST | `/system/hash-password` | ✓ | Gerar hash de senha |

### Logs e Estatísticas

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/access-logs` | - | Logs de acesso |
| GET | `/alarm-logs` | - | Logs de alarme |
| GET | `/statistics/access-summary` | ✓ | Resumo de acessos |
| GET | `/statistics/blocks` | ✓ | Bloqueios |
| GET | `/statistics/user/:user_id` | ✓ | Stats por usuário |

### Controle de Acesso

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET/POST/PATCH/DELETE | `/access-rules` | ✓* | Regras de acesso |
| GET/POST/PATCH/DELETE | `/groups` | ✓* | Grupos/Departamentos |
| GET/POST/PATCH/DELETE | `/user-groups` | ✓* | Usuário ↔ Grupo |
| GET/POST/PATCH/DELETE | `/time-zones` | ✓* | Horários |
| GET/POST/PATCH/DELETE | `/time-spans` | ✓* | Intervalos de horário |
| GET/POST/PATCH/DELETE | `/holidays` | ✓* | Feriados |
| GET/POST/PATCH/DELETE | `/areas` | ✓* | Áreas |
| GET/POST/PATCH/DELETE | `/portals` | ✓* | Portais |

*GET não requer auth, demais operações requerem.

### Interfonia SIP

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET/POST/PATCH/DELETE | `/sip-contacts` | ✓* | Contatos SIP |
| POST | `/interfonia-sip/call` | ✓ | Iniciar chamada |
| POST | `/interfonia-sip/hangup` | ✓ | Encerrar chamada |

### Custódia

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| POST | `/custody/start` | ✓ | Iniciar modo custódia |
| GET | `/custody/status` | ✓ | Status da custódia |
| POST | `/custody/transfer` | ✓ | Transferir custódia |
| POST | `/custody/end` | ✓ | Encerrar custódia |

### Outros Recursos

| Recurso | Endpoint Base | Descrição |
|---------|---------------|-----------|
| Templates | `/templates` | Faces cadastradas |
| Cards | `/cards` | Cartões RFID |
| QR Codes | `/qrcodes` | Códigos QR |
| PINs | `/pins` | Senhas numéricas |
| SecBox | `/sec-boxs` | Acionamento remoto |
| Actions | `/actions` | Ações programáveis |
| Reports | `/reports` | Relatórios |
| Export | `/export` | Export CSV/PDF |


## Custodia 
### Modo Padrão (1:N Face Only)
[Pessoa chega] → [Device captura rosto] → [Compara com TODOS os templates]
                                                      ↓
                                             [Match encontrado?]
                                                   /        \
                                                 SIM        NÃO
                                                  ↓          ↓
                                            [Porta abre]  [Acesso negado]

### Simples Custódia (1:1 PIN + Face)
      Precisa saber o PIN E ter o rosto
[Pessoa chega] → [Digita PIN: 1234] → [Device busca user do PIN]
                                               ↓
                                    [Captura rosto]
                                               ↓
                                    [Compara 1:1 com template DO USUÁRIO DO PIN]
                                               ↓
                                       [Match?]
                                      /        \
                                    SIM        NÃO
                                     ↓          ↓
                               [Porta abre]  [Negado: "Rosto não confere"]


### Dupla Custódia (PIN + Face + Operador SOC)
      3 fatores + decisão humana
[Pessoa chega] → [Digita PIN] → [Face 1:1 OK]
                                      ↓
                            [Device liga para SOC]
                                      ↓
                            [Operador atende]
                                      ↓
                            [Vê vídeo da pessoa]
                                      ↓
                            [Decide: liberar?]
                                   /        \
                         [Digita #1234]    [Desliga]
                           (DTMF)
                              ↓               ↓
                        [Porta abre]    [Porta NÃO abre

## Autenticação

### Login no Backend
```bash
# API: POST /api/login
# Retorna: session token para usar nas demais requisições
curl -s -X POST "$BASE_URL/api/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' | jq
```

### Salvar Session em Variável
```bash
# Extrair session do login
SESSION=$(curl -s -X POST "$BASE_URL/api/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' | jq -r '.session')
echo "SESSION=$SESSION"
```

### Login Direto no Device (Fallback)
```bash
# FCGI: POST /login.fcgi
SESSION=$(curl -s -X POST "http://$DEVICE_IP/login.fcgi" \
  -H "Content-Type: application/json" \
  -d '{"login":"admin","password":"admin"}' | jq -r '.session')
echo "SESSION=$SESSION"
```

### Verificar Status da Sessão
```bash
# API: GET /api/session/status
curl -s "$BASE_URL/api/session/status" | jq
# Retorna: { "valid": true, "session_is_valid": true }
```

### Logout (Encerrar Sessão)
```bash
# API: POST /api/logout
curl -s -X POST "$BASE_URL/api/logout" | jq
# Retorna: { "success": true, "message": "Sessão encerrada" }
```

## Configurações de Rede

### Obter Configurações Atuais
```bash
# API: GET /api/system/network
curl -s "$BASE_URL/api/system/network" | jq
# Retorna: ip, netmask, gateway, dns_primary, dns_secondary, mac, hostname
```

### Alterar IP do Dispositivo
```bash
# API: PUT /api/system/network
# Alterar IP pode reiniciar o dispositivo
curl -s -X PUT "$BASE_URL/api/system/network" \
  -H "Content-Type: application/json" \
  -d '{
    "ip": "192.168.10.100",
    "netmask": "255.255.255.0",
    "gateway": "192.168.10.1",
    "dns_primary": "8.8.8.8"
  }' | jq
```

## Cadastro Facial

### Upload de Foto via Base64
```bash
# API: POST /api/enrollment/face/upload
curl -s -X POST "$BASE_URL/api/enrollment/face/upload" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 10,
    "image_base64": "/9j/4AAQSkZJRgABAQ...",
    "match": true
  }' | jq
```

### Listar Usuários com Foto
```bash
# API: GET /api/enrollment/face/list
curl -s "$BASE_URL/api/enrollment/face/list" | jq
```

### Obter Foto de um Usuário
```bash
# API: GET /api/enrollment/face/:user_id
curl -s "$BASE_URL/api/enrollment/face/10" --output foto.jpg
```

### Testar se Imagem é Válida
```bash
# API: POST /api/enrollment/face/test
# Retorna scores de qualidade e se face foi detectada
curl -s -X POST "$BASE_URL/api/enrollment/face/test" \
  -H "Content-Type: application/json" \
  -d '{"image_base64": "/9j/4AAQ..."}' | jq
```

### Dispositivo não responde

1. Verificar `DEVICE_IP` no `.env`
2. Testar conectividade: `ping <DEVICE_IP>`
3. Verificar se firmware é 6.23

### Push não funciona

1. Verificar se `SERVER_IP` está acessível pelo dispositivo
2. Checar logs de heartbeat: `SHOW_HEARTBEAT_LOGS=true`




## Documentação Adicional

- https://www.controlid.com.br/docs/idface-en/
- https://github.com/controlid/integracao/tree/master/Controle%20de%20Acesso
- https://github.com/controlid/Exemplos-dedicados-a-linha-Acesso
- https://github.com/controlid/integracao
- https://documenter.getpostman.com/view/10800185/2s9YJgSKm2#intro
- https://www.controlid.com.br/docs/access-api-pt/particularidade-dos-produtos/particulariade-terminais-control-id/#idface
- https://www.controlid.com.br/docs/access-api-en/objects/introduction-to-objects/
- https://www.controlid.com.br/docs/access-api-pt/particularidade-dos-produtos/interfonia-sip-idface/
- https://www.controlid.com.br/docs/idface-pt/interfonia/configuracoes-interfonia/
- https://www.controlid.com.br/docs/access-api-en/operating-modes/introduction-to-operating-modes/

