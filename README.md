# Discord Color Bot

Bot Discord para seleção de cargos de cor via menu interativo.

## Funcionalidades

- Posta um menu de seleção de cores num canal específico
- Membros clicam para receber/remover cargo de cor automaticamente
- Apenas uma cor por membro de cada vez
- Comando `/remover-cores` para remover a cor atual

## Cores disponíveis

🔴 Vermelho · 🟠 Laranja · 🟡 Amarelo · 🟢 Verde · 🔵 Azul · 🟣 Roxo
🩷 Rosa · 🩵 Ciano · ⚪ Branco · ⚫ Preto · 🩶 Cinza · 🟤 Marrom

## Configuração

1. Instale as dependências: `npm install`
2. Defina a variável de ambiente `DISCORD_TOKEN` com o token do seu bot
3. Defina o `CHANNEL_ID` em `src/index.js` com o ID do canal desejado
4. Execute: `node src/index.js`

## Permissões necessárias

- Gerenciar Cargos
- Enviar Mensagens
- Ver Canal
- Ver Histórico de Mensagens

