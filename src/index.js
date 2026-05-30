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
import { perguntarGroq } from "./grok.js";
import { adicionarMensagem, obterHistorico, limparHistorico, obterTamanhoHistorico } from "./memoria.js";
import { definirContextoServidor, obterContextoServidor, lerMensagensServidor } from "./contexto-servidor.js";

const CHANNEL_ID = "1510384876355063848";
const GROK_CHANNEL_ID = "1510393743084355614";
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
  new SlashCommandBuilder()
    .setName("ler-servidor")
    .setDescription("Lê mensagens recentes do servidor para dar contexto à IA. (Apenas admins)")
    .toJSON(),
  new SlashCommandBuilder()
    .setName("limpar-memoria")
    .setDescription("Limpa o histórico de conversa da IA neste canal.")
    .toJSON(),
  new SlashCommandBuilder()
    .setName("memoria-status")
    .setDescription("Mostra quantas mensagens estão na memória deste canal.")
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
      }

      await enviarMenuCores(channel);
    } catch (err) {
      console.error(`❌ Erro no servidor ${guild.name}:`, err.message);
    }
  }
});

client.on(Events.Error, (err) => {
  console.error("❌ Erro no client Discord:", err.message);
});

process.on("unhandledRejection", (err) => {
  if (err?.code === 10062) return;
  console.error("❌ Rejeição não tratada:", err?.message ?? err);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const { commandName, guild, member } = interaction;

    if (commandName === "remover-cores") {
      await interaction.deferReply({ ephemeral: true });
      await guild.roles.fetch();
      const cargosDeCorIds = guild.roles.cache
        .filter((r) => /^Cor: /.test(r.name))
        .map((r) => r.id);
      const removidos = cargosDeCorIds.filter((id) => member.roles.cache.has(id));
      if (removidos.length === 0) {
        await interaction.editReply({ content: "Você não possui nenhum cargo de cor." });
        return;
      }
      for (const id of removidos) await member.roles.remove(id).catch(() => {});
      await interaction.editReply({ content: "🗑️ Sua cor foi removida com sucesso!" });
      return;
    }

    if (commandName === "ler-servidor") {
      const ehAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);
      if (!ehAdmin) {
        await interaction.reply({ content: "❌ Apenas administradores podem usar este comando.", ephemeral: true });
        return;
      }
      await interaction.deferReply({ ephemeral: true });
      console.log(`📖 Lendo mensagens do servidor ${guild.name}...`);
      try {
        const { texto, total } = await lerMensagensServidor(guild, client.user);
        definirContextoServidor(guild.id, texto);
        console.log(`✅ Contexto do servidor atualizado: ${total} mensagens`);
        await interaction.editReply({
          content: `✅ Pronto! Li **${total} mensagens** de ${guild.channels.cache.filter(c => c.isTextBased()).size} canais.\nAgora a IA tem contexto completo do servidor.`,
        });
      } catch (err) {
        console.error("❌ Erro ao ler servidor:", err.message);
        await interaction.editReply({ content: "❌ Erro ao ler as mensagens do servidor." });
      }
      return;
    }

    if (commandName === "limpar-memoria") {
      limparHistorico(interaction.channelId);
      await interaction.reply({ content: "🧹 Memória da conversa limpa neste canal!", ephemeral: true });
      return;
    }

    if (commandName === "memoria-status") {
      const qtd = obterTamanhoHistorico(interaction.channelId);
      const temContexto = obterContextoServidor(guild.id) !== null;
      await interaction.reply({
        content: `🧠 **Memória deste canal:** ${qtd} mensagens\n📖 **Contexto do servidor:** ${temContexto ? "✅ carregado" : "❌ não carregado (use /ler-servidor)"}`,
        ephemeral: true,
      });
      return;
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

  const cargosDeCorIds = guild.roles.cache
    .filter((r) => /^Cor: /.test(r.name))
    .map((r) => r.id);
  const cargoDesejado = guild.roles.cache.find((r) => r.name === corEscolhida);

  if (!cargoDesejado) {
    await interaction.editReply({ content: "❌ Cargo não encontrado. Tente novamente em alguns instantes." });
    return;
  }

  const temCargo = member.roles.cache.has(cargoDesejado.id);
  for (const id of cargosDeCorIds) {
    if (member.roles.cache.has(id)) await member.roles.remove(id).catch(() => {});
  }

  if (temCargo) {
    await interaction.editReply({ content: `🗑️ Seu cargo de cor **${corEscolhida.replace("Cor: ", "")}** foi removido.` });
  } else {
    await member.roles.add(cargoDesejado);
    await interaction.editReply({ content: `✅ Você recebeu o cargo **${corEscolhida.replace("Cor: ", "")}**!` });
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (message.channelId !== GROK_CHANNEL_ID) return;
  if (!message.mentions.has(client.user)) return;

  const pergunta = message.content.replace(/<@!?[0-9]+>/g, "").trim();

  if (!pergunta) {
    await message.reply("Pode falar! Me mencione com uma pergunta. 😄");
    return;
  }

  try {
    await message.channel.sendTyping();

    const historico = obterHistorico(GROK_CHANNEL_ID);
    const contextoServidor = obterContextoServidor(message.guild.id);

    const resposta = await perguntarGroq(pergunta, historico, contextoServidor);

    adicionarMensagem(GROK_CHANNEL_ID, "user", pergunta, message.author.username);
    adicionarMensagem(GROK_CHANNEL_ID, "assistant", resposta);

    const partes = resposta.match(/[\s\S]{1,2000}/g) || [resposta];
    for (const parte of partes) {
      await message.reply(parte);
    }
  } catch (err) {
    console.error("❌ Erro ao chamar Groq:", err.message);
    await message.reply("❌ Ocorreu um erro ao consultar a IA. Tente novamente.");
  }
});

client.login(TOKEN);
