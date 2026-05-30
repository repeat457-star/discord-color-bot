const historicos = new Map();
const MAX_MENSAGENS = 80;

export function adicionarMensagem(channelId, role, content, username = null) {
  if (!historicos.has(channelId)) {
    historicos.set(channelId, []);
  }
  const hist = historicos.get(channelId);
  const entrada = { role, content };
  if (username && role === "user") {
    entrada.content = `[${username}]: ${content}`;
  }
  hist.push(entrada);
  if (hist.length > MAX_MENSAGENS) {
    hist.splice(0, hist.length - MAX_MENSAGENS);
  }
}

export function obterHistorico(channelId) {
  return historicos.get(channelId) ?? [];
}

export function limparHistorico(channelId) {
  historicos.delete(channelId);
}

export function obterTamanhoHistorico(channelId) {
  return (historicos.get(channelId) ?? []).length;
}
