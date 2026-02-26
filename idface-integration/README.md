# IDFace Integration

API backend para integração com dispositivos **ControlID iDFace** (reconhecimento facial). Abstrai a comunicação FCGI do equipamento e expõe endpoints REST para frontend/integrações.

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
SERVER_IP=192.168.10.18                    # Testar se vazio auto-conectar

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
| POST | `/enrollment/start` | ✓ | Iniciar captura |
| GET | `/enrollment/status/:user_id` | ✓ | Status da captura |
| DELETE | `/enrollment/cancel/:user_id` | ✓ | Cancelar captura |
| POST | `/enrollment/base64` | ✓ | Cadastrar via base64 |

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
curl -s "$BASE_URL/api/session/status" \
  -H "Authorization: Bearer $SESSION" | jq
```

Se `API_KEY` não estiver configurada no `.env`, a autenticação é desabilitada.

### Dispositivo não responde

1. Verificar `DEVICE_IP` no `.env`
2. Testar conectividade: `ping <DEVICE_IP>`
3. Verificar se firmware é 6.23

### Push não funciona

1. Verificar se `SERVER_IP` está acessível pelo dispositivo
2. Checar logs de heartbeat: `SHOW_HEARTBEAT_LOGS=true`

## Documentação Adicional

https://www.controlid.com.br/docs/idface-en/
https://github.com/controlid/integracao/tree/master/Controle%20de%20Acesso
https://github.com/controlid/Exemplos-dedicados-a-linha-Acesso
https://github.com/controlid/integracao
https://documenter.getpostman.com/view/10800185/2s9YJgSKm2#intro
https://www.controlid.com.br/docs/access-api-pt/particularidade-dos-produtos/particulariade-terminais-control-id/#idface
https://www.controlid.com.br/docs/access-api-en/objects/introduction-to-objects/
https://www.controlid.com.br/docs/access-api-pt/particularidade-dos-produtos/interfonia-sip-idface/
https://www.controlid.com.br/docs/idface-pt/interfonia/configuracoes-interfonia/
https://www.controlid.com.br/docs/access-api-en/operating-modes/introduction-to-operating-modes/