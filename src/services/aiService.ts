import { GoogleGenAI } from "@google/genai";
import { Transaction, Partner, Commission, FixedCost, OnboardingData } from "../types";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getFinancialAdvice(
  transactions: Transaction[], 
  partners: Partner[], 
  commissions: Commission[], 
  fixedCosts: FixedCost[],
  goal: number, 
  onboardingData: OnboardingData
) {
  const totalIncome = transactions.filter(t => t.type === 'entrada').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'saida').reduce((sum, t) => sum + t.amount, 0);
  
  const prompt = `
    Você é o Consultor Financeiro IA do ${onboardingData.companyName}.
    
    DADOS FINANCEIROS:
    - Faturamento Total: R$ ${totalIncome}
    - Despesas Totais: R$ ${totalExpense}
    - Meta Mensal: R$ ${goal}
    - Serviço Principal: ${onboardingData.mainService}
    - Parceiros: ${partners.length} profissionais
    - Custos Fixos: R$ ${fixedCosts.reduce((acc, c) => acc + c.amount, 0)}
    
    TRANSAÇÕES RECENTES:
    ${transactions.slice(0, 10).map(t => `- ${t.date}: ${t.description} (R$ ${t.amount})`).join('\n')}
    
    TAREFAS:
    1. Analise se os gastos estão subindo (ex: energia, materiais).
    2. Verifique a lucratividade com base nos parceiros e comissões.
    3. Dê conselhos específicos como: "Seu gasto com energia subiu 15%, verifique o ar-condicionado" ou "Sua margem com parceiros está baixa, considere renegociar".
    4. Preveja meses de baixa (ex: Fevereiro no Brasil) e sugira reserva de emergência.
    
    Retorne uma análise detalhada em Markdown, com tom profissional e motivador.
  `;

  try {
    const response = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
    });
    return response.text;
  } catch (error) {
    console.error("Financial Advice error:", error);
    return "Desculpe, não consegui gerar seus conselhos financeiros no momento. Por favor, tente novamente em instantes.";
  }
}

export async function predictCashFlow(transactions: Transaction[]) {
  const response = await genAI.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [{ text: `
    Com base no histórico de transações abaixo, preveja o fluxo de caixa para os próximos 3 meses.
    Considere sazonalidade brasileira (Carnaval, férias, etc).
    
    HISTÓRICO:
    ${transactions.map(t => `${t.date}: ${t.type} R$ ${t.amount}`).join('\n')}
    
    Retorne um JSON com o seguinte formato:
    {
      "predictions": [
        { "month": "Março", "estimatedIncome": 5000, "estimatedExpense": 3000, "reason": "..." },
        ...
      ],
      "advice": "..."
    }
    ` }] }],
  });

  try {
    let text = response.text || "";
    if (text.includes('```json')) {
      text = text.split('```json')[1].split('```')[0];
    } else if (text.includes('```')) {
      text = text.split('```')[1].split('```')[0];
    }
    return JSON.parse(text.trim());
  } catch (e) {
    console.error("Predict Cash Flow error:", e);
    return null;
  }
}

export async function getAIInsights(transactions: Transaction[], goal: number, current: number, companyName: string = 'Studio Sublime') {
  const response = await genAI.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [{ text: `
    Você é um consultor financeiro especializado em pequenos negócios (MEI) no Brasil.
    Dados do ${companyName} este mês:
    - Faturamento Real: R$ ${current}
    - Meta de Faturamento: R$ ${goal}
    - Despesas Totais: R$ ${transactions.reduce((acc, t) => t.type === 'saida' ? acc + t.amount : acc, 0)}
    
    TAREFAS:
    1. Analise o desempenho financeiro.
    2. Forneça 3 insights curtos e práticos em português.
    
    Retorne apenas um array JSON de strings.
    ` }] }],
  });

  try {
    let text = response.text || "";
    if (text.includes('```json')) {
      text = text.split('```json')[1].split('```')[0];
    } else if (text.includes('```')) {
      text = text.split('```')[1].split('```')[0];
    }
    return JSON.parse(text.trim()) as string[];
  } catch (error) {
    console.error("AI Insight error:", error);
    return [
      "Mantenha o foco na sua meta de R$ " + goal,
      "Lembre-se de separar as contas pessoais das do " + companyName + ".",
      "O DAS-MEI vence todo dia 20, não esqueça!"
    ];
  }
}
