const contextosPorServidor = new Map();

export function definirContextoServidor(guildId, contexto) {
  contextosPorServidor.set(guildId, contexto);
}

export function obterContextoServidor(guildId) {
  return contextosPorServidor.get(guildId) ?? null;
}

export async function lerMensagensServidor(guild, clientUser) {
  const canais = guild.channels.cache.filter(
    (c) => c.isTextBased() && !c.isThread() && c.permissionsFor(guild.members.me)?.has("ReadMessageHistory")
  );

  const linhas = [];
  linhas.push(`=== CONTEXTO DO SERVIDOR: ${guild.name} ===`);
  linhas.push(`Lido em: ${new Date().toLocaleString("pt-BR")}`);
  linhas.push("");

  let totalMensagens = 0;
  const MAX_POR_CANAL = 100;
  const MAX_TOTAL = 800;

  for (const [, canal] of canais) {
    if (totalMensagens >= MAX_TOTAL) break;

    try {
      const mensagens = await canal.messages.fetch({
        limit: Math.min(MAX_POR_CANAL, MAX_TOTAL - totalMensagens),
      });

      if (mensagens.size === 0) continue;

      linhas.push(`--- #${canal.name} ---`);

      const ordenadas = [...mensagens.values()].reverse();
      for (const msg of ordenadas) {
        if (msg.author.bot) continue;
        if (!msg.content) continue;
        const data = msg.createdAt.toLocaleString("pt-BR");
        linhas.push(`[${data}] ${msg.author.username}: ${msg.content}`);
        totalMensagens++;
      }
      linhas.push("");
    } catch {
    }
  }

  linhas.push(`=== FIM DO CONTEXTO (${totalMensagens} mensagens) ===`);
  return { texto: linhas.join("\n"), total: totalMensagens };
}
