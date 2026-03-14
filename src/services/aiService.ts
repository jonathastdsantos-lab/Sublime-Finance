import { GoogleGenAI } from "@google/genai";
import { Transaction } from "../types";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getAIInsights(transactions: Transaction[], goal: number, current: number) {
  const response = await genAI.models.generateContent({
    model: "gemini-3-flash-preview",
    config: {
      tools: [{ googleSearch: {} }]
    },
    contents: [{ parts: [{ text: `
    Você é um consultor financeiro especializado em pequenos negócios (MEI) no Brasil.
    Dados do Studio Sublime este mês:
    - Faturamento Real: R$ ${current}
    - Meta de Faturamento: R$ ${goal}
    - Despesas Totais: R$ ${transactions.reduce((acc, t) => t.type === 'saida' ? acc + t.amount : acc, 0)}
    
    TAREFAS:
    1. Analise o desempenho financeiro.
    2. Pesquise na internet as melhores taxas de investimento atuais no Brasil (CDB, Selic, LCI/LCA) em sites de bancos e portais financeiros confiáveis.
    3. Forneça 3 insights curtos e práticos em português.
    
    Retorne apenas um array JSON de strings.
    ` }] }],
  });

  try {
    const text = response.text;
    const cleaned = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned) as string[];
  } catch (error) {
    console.error("AI Insight error:", error);
    return [
      "Mantenha o foco na sua meta de R$ " + goal,
      "Lembre-se de separar as contas pessoais das do Studio.",
      "O DAS-MEI vence todo dia 20, não esqueça!"
    ];
  }
}
