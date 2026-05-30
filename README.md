# Discord Color Bot

Bot Discord com seleção de cargos de cor e IA via Groq.

## Funcionalidades

- Menu de seleção de cores: membros escolhem sua cor via dropdown
- Comando `/remover-cores` para remover a cor atual
- IA via Groq: mencione o bot num canal específico para conversar

## Deploy no Railway

### 1. Fork ou clone este repositório

### 2. Crie um projeto no Railway
- Acesse [railway.app](https://railway.app) e clique em **New Project**
- Escolha **Deploy from GitHub repo** e selecione este repositório

### 3. Configure as variáveis de ambiente
No painel do Railway → seu serviço → **Variables**, adicione:

| Variável | Descrição |
|----------|-----------|
| `DISCORD_TOKEN` | Token do bot (discord.com/developers/applications) |
| `GROQ_API_KEY` | Chave da API do Groq (console.groq.com) |

### 4. Deploy
O Railway detecta automaticamente o Node.js e executa `node src/index.js`.

## Configuração do bot

Edite `src/index.js` para ajustar:
- `CHANNEL_ID` — canal onde o menu de cores é postado
- `GROK_CHANNEL_ID` — canal onde o bot responde com IA (apenas quando mencionado)

## Cores disponíveis

🔴 Vermelho · 🟠 Laranja · 🟡 Amarelo · 🟢 Verde · 🔵 Azul · 🟣 Roxo
🩷 Rosa · 🩵 Ciano · ⚪ Branco · ⚫ Preto · 🩶 Cinza · 🟤 Marrom

## Permissões necessárias no Discord

- Gerenciar Cargos
- Enviar Mensagens
- Ver Canal
- Ver Histórico de Mensagens
- Ler Conteúdo das Mensagens (para mencoes)

