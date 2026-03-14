import { GoogleGenAI } from "@google/genai";
import { Transaction } from "../types";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getAIInsights(transactions: Transaction[], goal: number, current: number) {
  const response = await genAI.models.generateContent({
    model: "gemini-1.5-flash",
    contents: [{ parts: [{ text: `
    Você é um consultor financeiro especializado em pequenos negócios (MEI) no Brasil.
    Dados do Studio Sublime este mês:
    - Faturamento Real: R$ ${current}
    - Meta de Faturamento: R$ ${goal}
    - Despesas Totais: R$ ${transactions.reduce((acc, t) => t.type === 'expense' ? acc + t.amount : acc, 0)}
    - Transações: ${JSON.stringify(transactions.slice(-10))}

    Com base nesses dados, forneça 3 insights curtos e práticos em português.
    Foque em:
    1. Como atingir a meta se estiver longe.
    2. Alerta de gastos se as despesas estiverem altas.
    3. Uma sugestão de investimento ou marketing.
    
    Retorne apenas um array JSON de strings.
    ` }] }],
  });

  try {
    const text = response.text;
    // Clean potential markdown code blocks
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
