import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Target, 
  Sparkles,
  Calendar,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { format, differenceInDays, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Transaction, FinancialGoal, MEIObligation } from '../types';
import { CATEGORIES, INITIAL_INVESTMENTS } from '../constants';
import { getAIInsights } from '../services/aiService';

export default function Dashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: '1', description: 'Corte e Escova', amount: 150, type: 'income', category: 'Serviço', date: new Date().toISOString() },
    { id: '2', description: 'Aluguel', amount: 1200, type: 'expense', category: 'Aluguel', date: new Date().toISOString() },
    { id: '3', description: 'Produtos L\'Oréal', amount: 450, type: 'expense', category: 'Materiais', date: new Date().toISOString() },
  ]);

  const [goal, setGoal] = useState<number>(8000);
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  // Derived stats
  const currentMonthTransactions = transactions.filter(t => {
    const date = parseISO(t.date);
    return date >= startOfMonth(new Date()) && date <= endOfMonth(new Date());
  });

  const totalIncome = currentMonthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = currentMonthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;
  const progress = Math.min((totalIncome / goal) * 100, 100);

  // MEI Alerts
  const today = new Date();
  const dasDueDate = new Date(today.getFullYear(), today.getMonth(), 20);
  const daysToDAS = differenceInDays(dasDueDate, today);

  useEffect(() => {
    const fetchAI = async () => {
      setIsLoadingAI(true);
      const insights = await getAIInsights(transactions, goal, totalIncome);
      setAiInsights(insights);
      setIsLoadingAI(false);
    };
    fetchAI();
  }, [totalIncome, goal]);

  const addTransaction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      description: formData.get('description') as string,
      amount: Number(formData.get('amount')),
      type: formData.get('type') as any,
      category: formData.get('category') as string,
      date: new Date().toISOString(),
    };
    setTransactions([newTransaction, ...transactions]);
    setIsAddingTransaction(false);
  };

  const chartData = [
    { name: 'Receitas', value: totalIncome, color: '#10b981' },
    { name: 'Despesas', value: totalExpense, color: '#ef4444' },
  ];

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 font-display">Studio Sublime</h1>
          <p className="text-zinc-500">Gestão Financeira & Fiscalização</p>
        </div>
        <button 
          onClick={() => setIsAddingTransaction(true)}
          className="flex items-center justify-center gap-2 bg-zinc-900 text-white px-6 py-3 rounded-xl hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200"
        >
          <Plus size={20} />
          Nova Movimentação
        </button>
      </header>

      {/* Alerts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl flex items-center gap-4 border ${
            daysToDAS <= 5 ? 'bg-red-50 border-red-100 text-red-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'
          }`}
        >
          <div className={`p-3 rounded-xl ${daysToDAS <= 5 ? 'bg-red-100' : 'bg-emerald-100'}`}>
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-sm font-medium opacity-80 uppercase tracking-wider">Obrigação MEI (DAS)</p>
            <p className="text-lg font-bold">
              {daysToDAS < 0 ? 'Vencido!' : daysToDAS === 0 ? 'Vence Hoje!' : `Vence em ${daysToDAS} dias`}
            </p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`p-4 rounded-2xl flex items-center gap-4 border ${
            totalExpense > totalIncome ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-zinc-50 border-zinc-100 text-zinc-700'
          }`}
        >
          <div className={`p-3 rounded-xl ${totalExpense > totalIncome ? 'bg-amber-100' : 'bg-zinc-100'}`}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm font-medium opacity-80 uppercase tracking-wider">Saúde Financeira</p>
            <p className="text-lg font-bold">
              {totalExpense > totalIncome ? 'Despesas acima da Receita!' : 'Fluxo de caixa saudável'}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Goal Progress Card */}
        <div className="lg:col-span-2 glass-card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-zinc-900">
              <Target className="text-zinc-400" />
              <h3 className="font-bold text-xl">Meta de Faturamento</h3>
            </div>
            <div className="text-right">
              <span className="text-sm text-zinc-500">Meta: R$ {goal.toLocaleString()}</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span>Progresso: {progress.toFixed(1)}%</span>
              <span>R$ {totalIncome.toLocaleString()}</span>
            </div>
            <div className="h-4 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-zinc-900 transition-all duration-1000"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-100">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Total Receitas</p>
              <p className="text-2xl font-bold text-emerald-600">R$ {totalIncome.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Total Despesas</p>
              <p className="text-2xl font-bold text-red-600">R$ {totalExpense.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* AI Advisor Card */}
        <div className="glass-card p-6 bg-zinc-900 text-white border-none shadow-xl shadow-zinc-200 overflow-hidden relative">
          <Sparkles className="absolute -top-4 -right-4 text-white/10 w-32 h-32" />
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-emerald-400" />
              <h3 className="font-bold text-xl">IA Insight</h3>
            </div>
            
            <div className="space-y-3">
              {isLoadingAI ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-4 bg-white/10 rounded w-full" />
                  <div className="h-4 bg-white/10 rounded w-3/4" />
                  <div className="h-4 bg-white/10 rounded w-5/6" />
                </div>
              ) : (
                aiInsights.map((insight, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex gap-3 text-sm text-zinc-300 leading-relaxed"
                  >
                    <div className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                    {insight}
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Charts & Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="font-bold text-lg mb-6">Receitas vs Despesas</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: '#f4f4f5' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={60}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6 overflow-hidden flex flex-col">
          <h3 className="font-bold text-lg mb-4">Últimas Movimentações</h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {transactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-50 transition-colors border border-transparent hover:border-zinc-100">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                    {t.type === 'income' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-900">{t.description}</p>
                    <p className="text-xs text-zinc-500">{t.category} • {format(parseISO(t.date), 'dd MMM', { locale: ptBR })}</p>
                  </div>
                </div>
                <p className={`font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {t.type === 'income' ? '+' : '-'} R$ {t.amount.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Investment Plan */}
      <div className="glass-card p-6">
        <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
          <TrendingUp className="text-emerald-500" />
          Plano de Investimentos Sugerido
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {INITIAL_INVESTMENTS.map((inv, i) => (
            <div key={i} className="p-5 rounded-2xl bg-zinc-50 border border-zinc-100 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-zinc-900">{inv.objective}</h4>
                <div className="p-1.5 bg-white rounded-lg shadow-sm">
                  <DollarSign size={16} className="text-emerald-500" />
                </div>
              </div>
              <p className="text-sm font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded inline-block">
                {inv.where}
              </p>
              <p className="text-xs text-zinc-500 leading-relaxed">
                {inv.why}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction Modal */}
      <AnimatePresence>
        {isAddingTransaction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
              <h2 className="text-2xl font-bold mb-6">Nova Movimentação</h2>
              <form onSubmit={addTransaction} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Descrição</label>
                  <input required name="description" className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-zinc-900 outline-none" placeholder="Ex: Corte de Cabelo" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Valor (R$)</label>
                    <input required name="amount" type="number" step="0.01" className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-zinc-900 outline-none" placeholder="0,00" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Tipo</label>
                    <select name="type" className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-zinc-900 outline-none">
                      <option value="income">Entrada</option>
                      <option value="expense">Saída</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Categoria</label>
                  <select name="category" className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-zinc-900 outline-none">
                    {[...CATEGORIES.income, ...CATEGORIES.expense].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsAddingTransaction(false)}
                    className="flex-1 px-6 py-3 rounded-xl border border-zinc-200 font-bold hover:bg-zinc-50"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-3 rounded-xl bg-zinc-900 text-white font-bold hover:bg-zinc-800 shadow-lg shadow-zinc-200"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
