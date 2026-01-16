Lista de Objetos
Veja abaixo a descrição de todos os objetos da linha de acesso, a lista identifica alguns dos diferentes tipos de recursos que você pode utilizar usando a API e também suporta métodos para inserir, atualizar, buscar e excluir muitos deles.

users
Representa um usuário.

Campo	Tipo	Descrição
id	int 64	Identificador único de um usuário (obrigatório).
registration	string	Texto representando a matrícula de um usuário (obrigatório).
name	string	Texto contendo o nome de um usuário (obrigatório).
password	string	String que representa a senha do usuário após o processo de Hash (para definir esse parâmetro não se deve usar o texto simples digitado pelo usuário deve-se gerar seu Hash através do comando user_hash_password. Da mesma forma, a aquisição desse parâmetro através do comando load_objects retorna a senha após o Hash).
salt	string	String representando o Salt usado para calcular o Hash da senha do usuário.
user_type_id	int	Inteiro que representa o tipo de usuário cadastrado. Para um usuário do tipo Visitante, este campo é definido como 1; para o tipo Usuário, o campo não possui valor definido (nulo).
begin_time	int	Inteiro representando a partir de que data e hora (Unix timestamp) o usuário é válido. Se este campo for definido com valor igual a 0 a verificação não é feita. Já para um valor maior que 0, qualquer que seja o tipo de usuário, após a data informada será um usuário válido.
end_time	int	Inteiro representando até que data e hora (Unix timestamp) o usuário é válido. Se este campo for definido com valor igual a 0 a verificação não é feita. Já para um valor maior que 0, qualquer que seja o tipo de usuário, após a sua expiração ocorrerá a exclusão das credenciais como explicado em Suporte a visitantes.
image_timestamp	int	Inteiro representando a data e hora (Unix timestamp) em que a imagem do usuário foi cadastrada. Se o valor do campo for 0, o usuário não possui imagens cadastradas.
last_access	int	Inteiro representando a data e hora (Unix timestamp) do último acesso feito pelo usuário. Se o valor deste campo for 0 o usuário ainda não fez seu primeiro acesso.
change_logs
Registro das operações (inserção, atualização e remoção) realizadas nos objetos: users, templates, face_templates e cards.
Esse registro é importante pois a partir dele podemos mapear alterações feitas no equipamento. Ou seja, através dele pode-se obter:

Registro de inserções, atualizações e remoções de usuários.
Registro de inserções, atualizações e remoções de templates de identificação de usuário.
Registro de inserções, atualizações e remoções de templates faciais de usuário.
Registro de inserções, atualizações e remoções de cartões de usuário.
Observações:
1. Este registro possui limite de armazenamento de 10 mil operações. Quando ele é atingido, ocorre a rotação e somente os últimos 10 mil registros estarão disponíveis.
2. No momento essa funcionalidade só está disponível para o iDFace.

Campo	Tipo	Descrição
id	int 64	Identificador único do registro (obrigatório).
operation_type	string	Texto representando a operação que foi realizada (obrigatório).
table_name	string	Texto contendo o nome do objeto alterado (obrigatório).
table_id	int	Inteiro representando o identificador de qual atributo do objeto foi modificado (obrigatório).
timestamp	int	Inteiro representando o horário em foi feita a operação, em formato UNIX timestamp (obrigatório).
templates
Dados biométricos das impressões digitais dos usuários (referidas a seguir como biometrias).

Campo	Tipo	Descrição
id	int 64	Identificador único de uma biometria (obrigatório).
finger_position	int	Campo reservado.
finger_type	int	Tipo de biometria dedo comum valor 0 ou dedo de pânico valor 1 (obrigatório).
template	string base 64	String em base 64 representando um template biométrico.
user_id	int 64	Identificador único do usuário a quem essa biometria pertence (obrigatório).
cards
Representa os cartões de identificação por proximidade.

Observações do campo value: Este campo indica a numeração do cartão para cartões de proximidade (ASK, FSK, PSK), também chamados de Wiegand. O Wiegand é um padrão de comunicação utilizado para a leitura de cartões de proximidade.

Como fazer a conversão do valor do cartão para ser enviado na API: O valor a ser enviado é: [parte antes da vírgula] * 2^32 + [parte depois da vírgula]. Exemplo: Para o cartão 123,45678 deve-se enviar o valor 123 * 2^32 + 45678, ou seja, 528281023086.

Como fazer a conversão do valor da API para o valor do cartão: O código de área, parte antes da vírgula, será a parte inteira, ou seja, a parte antes da vírgula do valor da divisão entre o valor da API e 2^32. O número do cartão, parte após a vírgula, será o resultado de: [valor da API] - [código de área] * 2^32. Exemplo: Para o valor da API 528281023086: [código de área]: 528281023086 / 2^32 = 123,0000106. Então, [código de área] = 123. [número do cartão]: 528281023086 - 123 * 2^32 = 45678. Portanto, o valor do cartão é 123,45678.

Campo	Tipo	Descrição
id	int 64	Identificador único de uma cartão de identificação (obrigatório).
value	unsigned int 64	Este campo indica a numeração do cartão. Leia atentamente como realizar a conversão para o valor a ser enviado na API (obrigatório e único, não podem existir dois cartões com mesmo value no banco de dados).
user_id	int 64	Identificador único do usuário ao qual pertence o cartão de identificação (obrigatório).
qrcodes
Representa os QR Codes utilizados para identificação. O QR Code possui dois modos de operação configuráveis. O QR Code só será armazenado como um objeto qrcodes caso o Modo Alfanumérico esteja ativo, caso contrário, o mesmo será tratado como um cartão, sendo armazenado como um objeto cards.

Campo	Tipo	Descrição
id	int 64	Identificador único de um QR Code de identificação (obrigatório).
value	string	Este campo indica o conteúdo representado no QR Code. Este também é o valor a ser recebido da API (obrigatório e único, não podem existir dois QR Codes com mesmo value no banco de dados).
user_id	int 64	Identificador único do usuário ao qual pertence o QR Code de identificação (obrigatório).
uhf_tags
Representa as tags UHF utilizadas para identificação. As tags UHF possuem dois modos de operação configuráveis: extended e standard". As tags UHF só serão armazenadas como um objeto uhf_tags caso o modo extended esteja ativo, nesse caso as tag podem ser registradas com até 96 bits em representação nvchar e armazenadas em hexadecimal, uma tag "0xCAFEDAD0" será armazenada como "CAFEDAD0". No caso contrário, com o modo standard" ativado, o mesmo será tratado como um cartão, sendo armazenado como um objeto cards.

Campo	Tipo	Descrição
id	int 64	Identificador único de uma tag UHF de identificação (obrigatório).
value	string	Este campo indica o Valor lido pela tag UHF Este também é o valor a ser recebido da API (obrigatório e único, não podem existir duas tags UHF com mesmo value no banco de dados).
user_id	int 64	Identificador único do usuário ao qual pertence a tag UHF de identificação (obrigatório).
pins
Representa os PINs utilizados para identificação.

Campo	Tipo	Descrição
id	int 64	Identificador único de um PIN de identificação (obrigatório).
value	string	Este campo indica o valor do PIN. Este também é o valor a ser recebido da API (obrigatório e único, não podem existir dois PINs com mesmo value no banco de dados).
user_id	int 64	Identificador único do usuário ao qual pertence o PIN de identificação (obrigatório e único, não podem existir dois PINs com mesmo user_id no banco de dados).
alarm_zones
Dados referentes às zonas de alarmes.

Campo	Tipo	Descrição
zone	int	Identificador único de uma zona de alarme (obrigatório).
enabled	int	Indica se a entrada de alarme referente à zona está habilitada (valor 1) ou não (valor 0) (obrigatório).
active_level	int	Indica se a entrada de alarme referente à zona esta configurada como 'ativo alto' (1) ou 'ativo baixo' (0) (obrigatório).
alarm_delay	int	Tempo de atraso no disparo do alarme uma vez que um sinal de alarme tenha sido detectado nesta zona (obrigatório).
user_roles
Relaciona usuários a níveis de privilégio. Contém apenas usuários que tenham algum nível de privilégio diferente do padrão.

Campo	Tipo	Descrição
user_id	int 64	Identificador único do usuário (obrigatório).
role	int	Se este campo estiver definido como 1, o usuário é um administrador (obrigatório).
groups
Representa os grupos de acesso. Nas interfaces nativa do equipamento e na interface web, esse tipo de objeto é referido por departamento.

Campo	Tipo	Descrição
id	int 64	Identificador único do grupo de acesso (obrigatório).
name	int	Nome do grupo de acesso (obrigatório).
user_groups
Relaciona os usuários as grupos de acesso.

Campo	Tipo	Descrição
user_id	int 64	Identificador do usuário (obrigatório).
group_id	int	Identificador do grupo de acesso (obrigatório).
scheduled_unlocks
Representa as liberações agendadas de acesso.

Campo	Tipo	Descrição
id	int 64	Identificador único da liberação agendada (obrigatório).
name	string	Nome da liberação agendada (obrigatório).
message	string	Mensagem a ser exibida durante a liberação.
actions
Objeto que representa os scripts de ação.

Campo	Tipo	Descrição
group_id	int 64	Identificador único do script de ação no banco de dados (obrigatório).
name	string	Nome descritivo da ação (obrigatório).
action	string	Nome do arquivo do script de ação (obrigatório).
parameters	string	Parâmetros do script de ação (obrigatório).
run_at	int	Pode assumir 3 valores. Caso seja 0, o script é executado no equipamento que o usuário utilizou para a identificação. Caso seja 1, o script é executado em todos os equipamentos conectados. Caso seja 2, o script é executado no servidor de identificação (obrigatório).
areas
Representa as áreas cujo acesso se deseja controlar.

Campo	Tipo	Descrição
id	int 64	Identificador único da área (obrigatório).
name	string	Nome descritivo da área (obrigatório).
portals
Representa os portais. Um portal liga duas áreas e tem uma única direção.

Campo	Tipo	Descrição
id	int 64	Identificador único do portal (obrigatório).
name	string	Nome descritivo do portal (obrigatório).
area_from_id	int 64	Identificador da área de origem (obrigatório).
area_to_id	int 64	Identificador da área de destino (obrigatório).
portal_actions
Relaciona portais e ações.

Campo	Tipo	Descrição
portal_id	int 64	Identificador do portal (obrigatório).
action_id	int 64	Identificador do ação (obrigatório).
access_rules
Representa as regras de acesso. A avaliação das regras de acesso acontece na seguinte ordem:

Dada uma tentativa de acesso, todas as regras de bloqueio são avaliadas antes das regras de liberação. Caso uma ou mais regras de bloqueio tenham seus critérios atendidos, suas ações serão executadas. Apenas caso nenhuma das regras de bloqueio tenham seus critérios atendidos, as regras de liberação são avaliadas e suas ações são executadas caso seus critérios sejam atendidos.

Campo	Tipo	Descrição
id	int 64	Identificador da regra de acesso (obrigatório).
name	string	Nome descritivo da regra de acesso (obrigatório).
type	int	Tipo da regra de acesso: caso valha 0, é uma regra de bloqueio, e caso valha 1, é uma regra de permissão (obrigatório).
priority	int	Campo reservado (obrigatório).
portal_access_rules
Relaciona portais e regras de acesso.

Campo	Tipo	Descrição
portal_id	int 64	Identificador do portal (obrigatório).
access_rule_id	int 64	Identificador da regra de acesso (obrigatório).
group_access_rules
Relaciona grupos e regras de acesso.

Campo	Tipo	Descrição
group_id	int 64	Identificador do grupo (obrigatório).
access_rule_id	int 64	Identificador da regra de acesso (obrigatório).
scheduled_unlock_access_rules
Relaciona liberações agendadas e regras de acesso.

Campo	Tipo	Descrição
scheduled_unlock_id	int 64	Identificador da liberação agendada (obrigatório).
access_rule_id	int 64	Identificador da regra de acesso (obrigatório).
time_zones
Conjunto de intervalos que representa o critério de horário de uma regra de acesso.

Campo	Tipo	Descrição
id	int 64	Identificador do horário (obrigatório).
name	string	Nome descritivo do horário (obrigatório).
time_spans
Um dos intervalos de um horário, o qual representa o critério de horário de uma regra de acesso.

Campo	Tipo	Descrição
id	int 64	Identificador do intervalo (obrigatório).
time_zone_id	int 64	Horário ao qual esse intervalo pertence (obrigatório).
start	int	Horário de início do intervalo. É armazenado em segundos desde às 0 horas do dia. Exemplo: Uma hora da manhã será 3600, já que 16060 = 3600. Duas horas da manhã será 7200, já que 26060 = 7200 (obrigatório).
end	int	Horário de término do intervalo. É armazenado em segundos desde às 0 horas do dia (obrigatório).
sun	int	Indica se o intervalo está ativo para os domingos (obrigatório).
mon	int	Indica se o intervalo está ativo para as segundas-feiras (obrigatório).
tue	int	Indica se o intervalo está ativo para as terças-feiras (obrigatório).
wed	int	Indica se o intervalo está ativo para as quartas-feiras (obrigatório).
thu	int	Indica se o intervalo está ativo para as quintas-feiras (obrigatório).
fri	int	Indica se o intervalo está ativo para as sextas-feiras (obrigatório).
sat	int	Indica se o intervalo está ativo para os sábados (obrigatório).
hol1	int	Indica se o intervalo está ativo para os feriados do tipo 1 (obrigatório).
hol2	int	Indica se o intervalo está ativo para os feriados do tipo 2 (obrigatório).
hol3	int	Indica se o intervalo está ativo para os feriados do tipo 3 (obrigatório).
contingency_cards
Cadastra uma lista de cartões que estará disponível em modo contingência para acesso aos equipamentos.

Campo	Tipo	Descrição
id	int	Identificador único do cartão, auto-incremental (obrigatório).
value	int 64	Número do cartão liberado no modo de contingência (obrigatório).
contingency_card_access_rules
Vincula a regra de acesso que será válida para os cartões que estiverem cadastrados em contingency_cards.

Campo	Tipo	Descrição
access_rule_id	int 64	Corresponde ao id da regra de acesso que será utilizada em modo de contingência, por padrão é: 1 (Regra de acesso sempre liberado). (obrigatório).
holidays
Essa tabela contém os feriados, assim como indica a qual tipo eles pertencem.

Campo	Tipo	Descrição
id	int	Identificador do feriado (obrigatório).
name	string	Nome descritivo do feriado (obrigatório).
start	int	A data e hora que o feriado começa em formato UNIX timestamp (obrigatório).
end	int	A data e hora que o feriado termina em formato UNIX timestamp (obrigatório).
hol1	int	Se o feriado pertence ao grupo 1. O valor é 0 ou 1 (obrigatório).
hol2	int	Se o feriado pertence ao grupo 2. O valor é 0 ou 1 (obrigatório).
hol3	int	Se o feriado pertence ao grupo 3. O valor é 0 ou 1 (obrigatório).
repeats	int	Se o feriado deve repetir anualmente. O valor é 0 ou 1 (obrigatório).
alarm_zone_time_zones
Relaciona zonas de alarme e horários.

Campo	Tipo	Descrição
alarm_zone_id	int 64	Identificador da zona de alarme (obrigatório).
time_zone_id	int 64	Identificador do horário (obrigatório).
access_rule_time_zones
Relaciona regras de acesso e horários.

Campo	Tipo	Descrição
access_rule_id	int 64	Identificador da regra de acesso (obrigatório).
time_zone_id	int 64	Identificador do horário (obrigatório).
access_logs
Contém os logs de acesso do equipamento.

Campo	Tipo	Descrição
id	int 64	Identificador do log de acesso (obrigatório).
time	int	Horário da ocorrência em Unix Timestamp.
event	int	Tipo do evento, pode ser:
Equipamento inválido
Parâmetros de identificação inválidos
Não identificado
Identificação pendente
Tempo de identificação esgotado
Acesso negado
Acesso concedido
Acesso pendente (usado quando o acesso depende de mais de uma pessoa)
Usuário não é administrador (usado quando um usuário tenta acessar o menu mas não é administrador)
Acesso não identificado (quando o portal é aberto através da API e o motivo não é informado)
Acesso por botoeira
Acesso pela interface web
Desistência de entrada (exclusivo para iDBlock)
Sem resposta (nenhuma ação é tomada)
Acesso pela interfonia (exclusivo para iDFace)
device_id	int 64	Identificador do equipamento onde o evento de acesso ocorreu.
identifier_id	int	Identificador do módulo de identificação que registrou o evento no equipamento.
user_id	int	Identificador do usuário envolvido na ocorrência.
portal_id	int	Identificador do portal envolvido na ocorrência.
identification_rule_id	int	Identificador da regra de identificação envolvida na ocorrência.
qrcode_value	string	Valor alfanumérico do QR Code utilizado durante a identificação.
uhf_tag	string	Valor lido pela tag UHF
pin_value	string	Valor do PIN utilizado durante a identificação.
card_value	int 64	Número do cartão utilizado durante a identificação.
confidence	int 64	Indica o grau de confiança do rosto reconhecido. O valor varia de 0 (mínimo) a 1800 (máximo)
mask	int 64	Indica se o usuário está usando máscara ou não. O valor 1 indica a presença de máscara e o valor 0 indica que o usuário não está usando máscara.
log_type_id	int 64	Identificador único do tipo de log, aplicável somente para o iDFlex Attendance (solução para marcação de ponto disponível apenas para exportação).
access_log_access_rules
Regras de acesso de um log de acesso. O par access_log_id e access_rule_id é único, ou seja, não pode haver nessa mais de um elemento com o mesmo par dessas propriedades.

Campo	Tipo	Descrição
access_log_id	int 64	Identificador do log de acesso (obrigatório).
access_rule_id	int 64	Identificador da regra de acesso (obrigatório).
alarm_logs
Contém os logs de alarmes do equipamento.

Campo	Tipo	Descrição
id	int 64	Identificador do log de alarme (obrigatório).
event	int	Tipo do evento, pode ser:
Alarme ativado
Alarme desativado
cause	int	Causa do evento, pode ser:
Zona de alarme 1
Zona de alarme 2
Zona de alarme 3
Zona de alarme 4
Zona de alarme 5
Porta aberta
Arrombamento de porta
Dedo de pânico
Violação do equipamento
Cartão de pânico
user_id	int 64	Identificador do usuário envolvido na ocorrência.
time	int	Horário da ocorrência em Unix Timestamp.
access_log_id	int	Identificador do registro de log de acesso envolvido na ocorrência.
door_id	int	Identificador da porta envolvida na ocorrência.
devices
Representa os equipamentos cadastrados e reconhecidos pelo dispositivo, incluindo o próprio. É utilizado na comunicação via rede entre equipamentos.

Campo	Tipo	Descrição
id	int 64	Identificador do equipamento (obrigatório).
name	string	Nome descritivo do equipamento (obrigatório).
ip	string	Endereço do equipamento. Exemplo: 192.168.0.129 ou exemplo.controlid.com.br (obrigatório).
user_access_rules
Vincula um usuário a uma regra de acesso.

O par user_id e access_rule_id é único, ou seja, não pode haver mais de um objeto nesta tabela com mesmos valores nesses campos ao mesmo tempo.

Campo	Tipo	Descrição
user_id	int	Identificador único do usuário (obrigatório).
access_rule_id	int	Identificador único da regra de acesso (obrigatório).
area_access_rules
Vincula uma área a uma regra de acesso.

O par area_id e access_rule_id é único, ou seja, não pode haver mais de um objeto nesta tabela com mesmos valores nesses campos ao mesmo tempo.

Campo	Tipo	Descrição
area_id	int	Identificador único da área (obrigatório).
access_rule_id	int	Identificador único da regra de acesso (obrigatório).
catra_infos
Permite consultar informações da catraca (aplicável apenas para catracas iDBlock).

Campo	Tipo	Descrição
id	int	Identificador da catraca.
left_turns	int 64	Corresponde ao número de revoluções a esquerda.
right_turns	int 64	Corresponde ao número de revoluções a direita.
entrance_turns	int 64	Corresponde ao número de revoluções de entrada.
exit_turns	int 64	Corresponde ao número de revoluções de saída.
log_types
Permite consultar os tipo de log.

Campo	Tipo	Descrição
id	int	Identificador do tipo de log (obrigatório).
name	string	Nome do tipo de log (obrigatório).
sec_boxs
Configura o módulo de acionamento externo (MAE/Security Box) usado no iDFlex, iDAccess Pro e iDAccess Nano.

Campo	Tipo	Descrição
id	int 64	id da SecBox. Esse valor sempre será 65793.
version	int	Corresponde a versão da SecBox.
name	string	Corresponde ao nome da SecBox.
enabled	bool	Indica se a SecBox está habilitada ou não.
relay_timeout	int	Esse campo representa o tempo de abertura do relê da SecBox em (ms).
door_sensor_enabled	bool	Esse campo representa se o sensor de porta está habilitado ou não.
door_sensor_idle	bool	Esse campo representa se o sensor de porta está NO = 1 ou NC = 0.
auto_close_enabled	int	Inteiro (0 ou 1) indicando se o relê deverá fechar quando o sensor de porta abrir.
contacts
Permite manipular os contatos que podem ser utilizados em ligações de interfonia SIP.

Campo	Tipo	Descrição
id	int	Identificador do contato.
name	string	Nome do contato.
number	string	Número (ramal) do contato.
timed_alarms
Permite manipular horários fixos de sirene para determinados dias da semana.

Campo	Tipo	Descrição
id	int 64	Identificador do alarme (obrigatório).
name	string	Nome de identificação do alarme (obrigatório).
time	int	Horário de acionamento da sirene. É armazenado em segundos desde às 0 horas do dia. Exemplo: Uma hora da manhã será 3600, já que 16060 = 3600. Duas horas da manhã será 7200, já que 26060 = 7200 (obrigatório).
sun	int	Indica se o alarme está ativo para os domingos (obrigatório).
mon	int	Indica se o alarme está ativo para as segundas-feiras (obrigatório).
tue	int	Indica se o alarme está ativo para as terças-feiras (obrigatório).
wed	int	Indica se o alarme está ativo para as quartas-feiras (obrigatório).
thu	int	Indica se o alarme está ativo para as quintas-feiras (obrigatório).
fri	int	Indica se o alarme está ativo para as sextas-feiras (obrigatório).
sat	int	Indica se o alarme está ativo para os sábados (obrigatório).
access_events
Registra eventos de acesso como abertura de portas e ações da catraca.

Observação:

Este registro possui limite de armazenamento de 10 mil eventos. Quando ele é atingido, ocorre a rotação e somente os últimos 10 mil registros estarão disponíveis.
Campo	Tipo	Descrição
id	int 64	Identificador do evento de acesso (obrigatório).
event	string	Indica a categoria de evento, possíveis valores:
catra
secbox
door
(obrigatório).
type	string	Indica o tipo de evento em sua categoria. Para event igual a catra, são válidos os valores:
TURN_LEFT
TURN_RIGHT
GIVE_UP
Já para event com valor door ou secbox, são válidos:
OPEN
CLOSE
(obrigatório).
identification	string	Caso event seja secbox ou door, indica o id em texto da SecBox ou porta correspondente, caso event seja catra, indica a uuid do evento (obrigatório).
device_id	int 64	Id associado ao equipamento que reportou o evento (obrigatório).
timestamp	int	Horário da ocorrência em Unix Timestamp (obrigatório).
custom_thresholds
Permite manipular a rigidez da identificação facial no iDFace para poder diferenciar faces semelhantes.

Campo	Tipo	Descrição
id	int	Identificador do threshold customizado.
user_id	int	Identificador único do usuário a quem o valor do threshold pertence (obrigatório).
threshold	int	Número do threshold customizado do usuário (obrigatório).
network_interlocking_rules
Representa as regras de intertravamento remoto. O funcionamento do intertravamento remoto é o seguinte: - Nesse dispositivo (chamaremos de dispositivo A), cadastramos as informações do dispositivo remoto (chamaremos de dispositivo B). - Após o cadastro das informações, o dispositivo A irá se conectar ao dispositivo B para verificar o estado de sua porta. - Caso a porta do dispositivo B esteja aberta, o dispositivo A não irá permitir a abertura de sua porta.

O objetivo do intertravamento remoto é impedir a abertura simultânea das portas de dois ou mais dispositivos.

Campo	Tipo	Descrição
id	int	Identificador da regra de intertravamento.
ip	string	IP do dispositivo remoto (dispositivo B) (obrigatório).
login	string	Login do dispositivo remoto (dispositivo B). É o mesmo login utilizado para acessar a interface Web (obrigatório).
password	string	Senha do dispositivo remoto (dispositivo B). É a mesma senha utilizada para acessar a interface Web (obrigatório).
portal_name	string	Nome da regra de intertravamento (obrigatório).
enabled	int	Habilita ou desabilita esta regra de intertravamento. 1 = Habilitado, 0 = Desabilitado (obrigatório).
