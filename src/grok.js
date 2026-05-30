import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export async function perguntarGroq(pergunta, historico = [], contextoServidor = null) {
  const systemBase =
    "Você é um assistente de IA bem-humorado, direto e inteligente integrado num servidor Discord. " +
    "Responda sempre em português do Brasil. Seja conciso mas completo. " +
    "Quando tiver contexto do servidor, use-o para dar respostas relevantes ao que está acontecendo lá.";

  const systemContent = contextoServidor
    ? `${systemBase}\n\n${contextoServidor}`
    : systemBase;

  const mensagens = [
    { role: "system", content: systemContent },
    ...historico,
    { role: "user", content: pergunta },
  ];

  const resposta = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: mensagens,
    max_tokens: 8192,
  });

  return resposta.choices[0]?.message?.content ?? "Não consegui gerar uma resposta.";
}
