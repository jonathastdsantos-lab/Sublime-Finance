import { GoogleGenAI } from "@google/genai";
import { Transaction, Partner, Commission, FixedCost, OnboardingData, Appointment } from "../types";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

async function callGeminiWithRetry(params: any, maxRetries = 3) {
  let delay = 2000;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await genAI.models.generateContent(params);
    } catch (error: any) {
      const errorText = error instanceof Error ? error.message : JSON.stringify(error);
      const isRateLimit = errorText.includes('429') || errorText.includes('RESOURCE_EXHAUSTED');
      
      if (isRateLimit && i < maxRetries - 1) {
        console.warn(`Gemini API rate limit hit. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries reached for Gemini API");
}

const SYSTEM_INSTRUCTION = `
Você é o Consultor Financeiro IA do "Sublime Finance Pro", especialista em gestão de estúdios de beleza. Seu objetivo é analisar dados de fluxo de caixa, investimentos e planos de expansão.

Suas funções principais:
1. ALERTA DE RISCO: Analisar se as saídas superam as entradas ou se gastos fixos estão acima de 30% do faturamento.
2. EVOLUÇÃO DE SALDO: Projetar o saldo para os próximos 3 meses com base no histórico.
3. DICAS DE INVESTIMENTO: Sugerir onde aplicar o excedente (CDB, Tesouro, ou reinvestimento no próprio negócio) conforme o perfil de risco do usuário.
4. PLANO DE CRESCIMENTO: Avaliar a viabilidade de compra de novos equipamentos (ex: laser, cadeiras) ou contratação de parceiros.

Sempre responda de forma profissional, motivadora e com dados objetivos. Use o contexto de "estúdio de beleza" (serviços, produtos, comissões de profissionais).

Análise Preditiva de "Break-even" (Ponto de Equilíbrio):
A IA não deve apenas dizer quanto gastou, mas quando o dinheiro vai acabar se o ritmo continuar o mesmo.

Consultoria de Expansão:
Em estúdios, o custo de pessoal (comissão) é o maior peso. Analise se o volume de agendamentos atual suporta o custo fixo de novos parceiros.

Investimentos Gamificados:
Sugira a criação de uma "Reserva de Emergência do Salão" e sugira mover lucros extras para fundos de reserva.
`;

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
  const totalFixed = fixedCosts.reduce((acc, c) => acc + c.amount, 0);
  
  const prompt = `
    DADOS DO STUDIO:
    - Nome: ${onboardingData.companyName}
    - Faturamento Total: R$ ${totalIncome}
    - Despesas Totais: R$ ${totalExpense}
    - Custos Fixos: R$ ${totalFixed}
    - Meta Mensal: R$ ${goal}
    - Serviço Principal: ${onboardingData.mainService}
    - Parceiros: ${partners.length} profissionais
    
    TRANSAÇÕES RECENTES:
    ${transactions.slice(0, 10).map(t => `- ${t.date}: ${t.description} (R$ ${t.amount})`).join('\n')}
    
    TAREFAS:
    1. Forneça um ALERTA DE RISCO se necessário.
    2. Dê DICAS DE INVESTIMENTO baseadas no saldo atual.
    3. Sugira um PLANO DE CRESCIMENTO.
    
    Retorne em Markdown.
  `;

  try {
    const response = await callGeminiWithRetry({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: { systemInstruction: SYSTEM_INSTRUCTION }
    });
    return response.text;
  } catch (error) {
    console.error("Financial Advice error:", error);
    return "Desculpe, não consegui gerar seus conselhos financeiros no momento.";
  }
}

export async function predictCashFlow(transactions: Transaction[]) {
  try {
    const response = await callGeminiWithRetry({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: `
      Com base no histórico abaixo, preveja o fluxo de caixa para os próximos 3 meses e calcule o "Burn Rate".
      
      HISTÓRICO:
      ${transactions.map(t => `${t.date}: ${t.type} R$ ${t.amount}`).join('\n')}
      
      Retorne um JSON:
      {
        "predictions": [
          { "month": "Mês 1", "estimatedIncome": 0, "estimatedExpense": 0, "reason": "..." },
          ...
        ],
        "burnRate": 0,
        "breakEvenMonths": 0,
        "riskLevel": "baixo|médio|alto"
      }
      ` }] }],
      config: { systemInstruction: SYSTEM_INSTRUCTION }
    });

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

export async function askGeisa(
  question: string, 
  context: {
    transactions: Transaction[],
    partners: Partner[],
    appointments: Appointment[],
    fixedCosts: FixedCost[],
    onboardingData: OnboardingData
  }
) {
  const prompt = `
    PERGUNTA DO USUÁRIO: "${question}"
    
    CONTEXTO ATUAL:
    - Faturamento: R$ ${context.transactions.filter(t => t.type === 'entrada').reduce((acc, t) => acc + t.amount, 0)}
    - Despesas: R$ ${context.transactions.filter(t => t.type === 'saida').reduce((acc, t) => acc + t.amount, 0)}
    - Agendamentos: ${context.appointments.length}
    - Parceiros: ${context.partners.length}
    - Custos Fixos: R$ ${context.fixedCosts.reduce((acc, c) => acc + c.amount, 0)}
    
    Responda como Geisa, o assistente do Sublime Finance Pro.
  `;

  try {
    const response = await callGeminiWithRetry({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: { systemInstruction: SYSTEM_INSTRUCTION }
    });

    return response.text;
  } catch (error) {
    console.error("Ask Geisa error:", error);
    return "Desculpe, estou com dificuldade de responder agora. Tente novamente em instantes.";
  }
}

export async function getAIInsights(transactions: Transaction[]) {
  const prompt = `
    Analise as transações abaixo e forneça 3 dicas rápidas (máximo 100 caracteres cada) para o Studio de Beleza.
    
    TRANSAÇÕES:
    ${transactions.slice(0, 20).map(t => `${t.date}: ${t.description} (R$ ${t.amount})`).join('\n')}
    
    Retorne um JSON:
    ["Dica 1", "Dica 2", "Dica 3"]
  `;

  try {
    const response = await callGeminiWithRetry({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: { systemInstruction: SYSTEM_INSTRUCTION }
    });

    let text = response.text || "";
    if (text.includes('```json')) {
      text = text.split('```json')[1].split('```')[0];
    } else if (text.includes('```')) {
      text = text.split('```')[1].split('```')[0];
    }
    return JSON.parse(text.trim());
  } catch (e) {
    console.error("AI Insights error:", e);
    return ["Mantenha o controle diário", "Revise seus custos fixos", "Invista em marketing"];
  }
}

export async function getRiskAlert(
  transactions: Transaction[],
  fixedCosts: FixedCost[],
  totalIncome: number,
  totalExpense: number
) {
  const totalFixed = fixedCosts.reduce((acc, c) => acc + c.amount, 0);
  const fixedCostRatio = totalIncome > 0 ? (totalFixed / totalIncome) : 0;
  const isOutflowHigh = totalExpense > totalIncome * 1.1; // 10% higher than income

  if (fixedCostRatio <= 0.3 && !isOutflowHigh) return null;

  const prompt = `
    DADOS FINANCEIROS DO MÊS:
    - Faturamento: R$ ${totalIncome}
    - Saídas Totais: R$ ${totalExpense}
    - Custos Fixos: R$ ${totalFixed} (${(fixedCostRatio * 100).toFixed(1)}% do faturamento)
    
    CONDIÇÕES DETECTADAS:
    ${fixedCostRatio > 0.3 ? "- Custos fixos acima de 30% do faturamento." : ""}
    ${isOutflowHigh ? "- Saídas significativamente maiores que as entradas." : ""}
    
    TAREFA:
    Como Geisa, gere um alerta de risco curto e direto (máximo 200 caracteres) e 3 ações corretivas rápidas e acionáveis (ex: "Reduzir gastos com X", "Revisar comissão de Y").
    
    Retorne um JSON:
    {
      "alert": "Mensagem de alerta...",
      "actions": ["Ação 1", "Ação 2", "Ação 3"],
      "severity": "high"
    }
  `;

  try {
    const response = await callGeminiWithRetry({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: { systemInstruction: SYSTEM_INSTRUCTION, responseMimeType: "application/json" }
    });

    let text = response.text || "";
    if (text.includes('```json')) {
      text = text.split('```json')[1].split('```')[0];
    } else if (text.includes('```')) {
      text = text.split('```')[1].split('```')[0];
    }
    return JSON.parse(text.trim());
  } catch (error) {
    console.error("Risk Alert error:", error);
    return null;
  }
}

export async function getOnboardingQuizPlan(quizAnswers: any) {
  try {
    const response = await callGeminiWithRetry({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: `
      Com base nas respostas do Quiz de Saúde Financeira abaixo, trace o primeiro plano de 90 dias para o Studio.
      
      RESPOSTAS:
      ${JSON.stringify(quizAnswers, null, 2)}
      
      Retorne um plano detalhado em Markdown.
      ` }] }],
      config: { systemInstruction: SYSTEM_INSTRUCTION }
    });

    return response.text;
  } catch (error) {
    console.error("Onboarding Quiz Plan error:", error);
    return "Não consegui gerar seu plano agora devido a uma alta demanda. Por favor, tente novamente em alguns minutos.";
  }
}

export async function getGoalActionPlan(goal: { name: string, target_amount: number, target_date: string, category: string }, onboardingData: OnboardingData) {
  const prompt = `
    NOVA META/SONHO DEFINIDA:
    - Nome: ${goal.name}
    - Valor Alvo: R$ ${goal.target_amount}
    - Data Alvo: ${goal.target_date}
    - Categoria: ${goal.category}
    
    DADOS DO STUDIO:
    - Empresa: ${onboardingData.companyName}
    - Serviço Principal: ${onboardingData.mainService}
    
    TAREFA:
    Como Geisa, monte um plano de ação estratégico e motivador para a realização deste projeto (especialmente se for um Projeto de Expansão).
    O plano deve conter:
    1. Análise de Viabilidade.
    2. 3 Passos Práticos Imediatos.
    3. Uma dica de economia ou aumento de receita específica para este objetivo.
    
    Retorne em Markdown.
  `;

  try {
    const response = await callGeminiWithRetry({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: { systemInstruction: SYSTEM_INSTRUCTION }
    });
    return response.text;
  } catch (error) {
    console.error("Goal Action Plan error:", error);
    return "Não consegui gerar o plano de ação no momento, mas continue firme no seu objetivo!";
  }
}
