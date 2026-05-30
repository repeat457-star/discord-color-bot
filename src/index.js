import {
  Client,
  GatewayIntentBits,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  EmbedBuilder,
  Events,
  PermissionsBitField,
  REST,
  Routes,
  SlashCommandBuilder,
} from "discord.js";
import { CORES } from "./colors.js";
import { perguntarGrok } from "./grok.js";

const GROK_CHANNEL_ID = "1510393743084355614";

const CHANNEL_ID = "1510384876355063848";
const TOKEN = process.env.DISCORD_TOKEN;

if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN não encontrado nas variáveis de ambiente.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const COMANDOS = [
  new SlashCommandBuilder()
    .setName("remover-cores")
    .setDescription("Remove sua cor atual do servidor.")
    .toJSON(),
];

async function registrarComandos(clientId, guildId) {
  const rest = new REST().setToken(TOKEN);
  try {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: COMANDOS,
    });
    console.log(`✅ Comandos registrados no servidor ${guildId}`);
  } catch (err) {
    console.error("❌ Erro ao registrar comandos:", err.message);
  }
}

async function garantirCargos(guild) {
  const cargosExistentes = await guild.roles.fetch();
  for (const cor of CORES) {
    const existe = cargosExistentes.find((r) => r.name === cor.nome);
    if (!existe) {
      await guild.roles.create({
        name: cor.nome,
        color: cor.hex,
        reason: "Cargo de cor criado automaticamente pelo bot",
        permissions: [],
      });
      console.log(`✅ Cargo criado: ${cor.nome}`);
    }
  }
}

async function enviarMenuCores(channel) {
  const mensagensAntigas = await channel.messages.fetch({ limit: 20 }).catch(() => null);
  if (mensagensAntigas) {
    const botMsgs = mensagensAntigas.filter(
      (m) => m.author.id === client.user.id && m.components.length > 0
    );
    for (const [, msg] of botMsgs) {
      await msg.delete().catch(() => {});
    }
  }

  const embed = new EmbedBuilder()
    .setTitle("🎨 Escolha sua cor")
    .setDescription(
      "Selecione uma cor no menu abaixo para receber o cargo correspondente.\n" +
      "Escolher a mesma cor duas vezes **remove** o cargo."
    )
    .setColor(0x5865f2)
    .setFooter({ text: "Você só pode ter uma cor por vez." });

  const select = new StringSelectMenuBuilder()
    .setCustomId("selecionar_cor")
    .setPlaceholder("Selecione uma cor...")
    .addOptions(
      CORES.map((cor) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(cor.label)
          .setValue(cor.nome)
      )
    );

  const row = new ActionRowBuilder().addComponents(select);

  await channel.send({ embeds: [embed], components: [row] });
  console.log("📬 Menu de cores enviado no canal.");
}

client.once(Events.ClientReady, async (c) => {
  console.log(`🤖 Bot conectado como ${c.user.tag}`);
  console.log(`📡 Servidores: ${c.guilds.cache.size}`);

  for (const [, guild] of c.guilds.cache) {
    console.log(`🏠 Servidor: ${guild.name} (${guild.id})`);
    try {
      await registrarComandos(c.user.id, guild.id);
      await garantirCargos(guild);

      const channel = await guild.channels.fetch(CHANNEL_ID).catch((err) => {
        console.error(`❌ Erro ao buscar canal ${CHANNEL_ID}:`, err.message);
        return null;
      });

      if (!channel) {
        console.warn(`⚠️ Canal ${CHANNEL_ID} não encontrado no servidor ${guild.name}`);
        continue;
      }
      if (!channel.isTextBased()) {
        console.warn(`⚠️ Canal ${CHANNEL_ID} não é de texto`);
        continue;
      }

      const me = guild.members.me;
      if (!me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        console.warn(`⚠️ Faltando permissão: Gerenciar Cargos no servidor ${guild.name}`);
      }

      const permissaoNoCanal = channel.permissionsFor(me);
      const faltando = [];
      if (!permissaoNoCanal.has(PermissionsBitField.Flags.ViewChannel)) faltando.push("Ver Canal");
      if (!permissaoNoCanal.has(PermissionsBitField.Flags.SendMessages)) faltando.push("Enviar Mensagens");
      if (!permissaoNoCanal.has(PermissionsBitField.Flags.ReadMessageHistory)) faltando.push("Ver Histórico de Mensagens");

      if (faltando.length > 0) {
        console.warn(`⚠️ Permissões faltando no canal #${channel.name}: ${faltando.join(", ")}`);
        console.warn(`👉 Vá em Editar Canal → Permissões → adicione o cargo do bot com essas permissões.`);
      }

      await enviarMenuCores(channel);
    } catch (err) {
      console.error(`❌ Erro no servidor ${guild.name}:`, err.message, err.stack);
    }
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "remover-cores") {
      await interaction.deferReply({ ephemeral: true });

      const member = interaction.member;
      const guild = interaction.guild;

      await guild.roles.fetch();

      const nomesDeCorRegex = /^Cor: /;
      const cargosDeCorIds = guild.roles.cache
        .filter((r) => nomesDeCorRegex.test(r.name))
        .map((r) => r.id);

      const cargosRemovidos = cargosDeCorIds.filter((id) => member.roles.cache.has(id));

      if (cargosRemovidos.length === 0) {
        await interaction.editReply({ content: "Você não possui nenhum cargo de cor." });
        return;
      }

      for (const id of cargosRemovidos) {
        await member.roles.remove(id).catch(() => {});
      }

      await interaction.editReply({ content: "🗑️ Sua cor foi removida com sucesso!" });
    }
    return;
  }

  if (!interaction.isStringSelectMenu()) return;
  if (interaction.customId !== "selecionar_cor") return;

  await interaction.deferReply({ ephemeral: true });

  const corEscolhida = interaction.values[0];
  const member = interaction.member;
  const guild = interaction.guild;

  await guild.roles.fetch();

  const nomesDeCorRegex = /^Cor: /;
  const cargosDeCorIds = guild.roles.cache
    .filter((r) => nomesDeCorRegex.test(r.name))
    .map((r) => r.id);

  const cargoDesejado = guild.roles.cache.find((r) => r.name === corEscolhida);

  if (!cargoDesejado) {
    await interaction.editReply({
      content: "❌ Cargo não encontrado. Tente novamente em alguns instantes.",
    });
    return;
  }

  const temCargo = member.roles.cache.has(cargoDesejado.id);

  for (const id of cargosDeCorIds) {
    if (member.roles.cache.has(id)) {
      await member.roles.remove(id).catch(() => {});
    }
  }

  if (temCargo) {
    await interaction.editReply({
      content: `🗑️ Seu cargo de cor **${corEscolhida.replace("Cor: ", "")}** foi removido.`,
    });
  } else {
    await member.roles.add(cargoDesejado);
    await interaction.editReply({
      content: `✅ Você recebeu o cargo **${corEscolhida.replace("Cor: ", "")}**!`,
    });
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (message.channelId !== GROK_CHANNEL_ID) return;
  if (!message.mentions.has(client.user)) return;

  const pergunta = message.content
    .replace(/<@!?[0-9]+>/g, "")
    .trim();

  if (!pergunta) {
    await message.reply("Pode falar! Me mencione com uma pergunta. 😄");
    return;
  }

  try {
    await message.channel.sendTyping();
    const resposta = await perguntarGrok(pergunta);
    const partes = resposta.match(/[\s\S]{1,2000}/g) || [resposta];
    for (const parte of partes) {
      await message.reply(parte);
    }
  } catch (err) {
    console.error("❌ Erro ao chamar Grok:", err.message);
    await message.reply("❌ Ocorreu um erro ao consultar o Grok. Tente novamente.");
  }
});

client.login(TOKEN);
