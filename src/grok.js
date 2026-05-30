import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export async function perguntarGrok(pergunta, historico = []) {
  const mensagens = [
    {
      role: "system",
      content:
        "Você é um assistente de IA bem-humorado e direto. Responda sempre em português do Brasil. Seja conciso e útil.",
    },
    ...historico,
    { role: "user", content: pergunta },
  ];

  const resposta = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: mensagens,
    max_tokens: 1024,
  });

  return resposta.choices[0]?.message?.content ?? "Não consegui gerar uma resposta.";
}
