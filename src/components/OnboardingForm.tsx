import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, DollarSign, Heart, LayoutDashboard, FileText, Building2, X } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { OnboardingData } from '../types';

interface OnboardingFormProps {
  userId: string;
  onComplete: (data: OnboardingData) => void;
  onCancel?: () => void;
}

export default function OnboardingForm({ userId, onComplete, onCancel }: OnboardingFormProps) {
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState<Partial<OnboardingData>>({
    name: '',
    companyName: '',
    primaryColor: '#8b5cf6',
    revenueGoal: 8000,
    proLabore: 2500,
    expenseAlertThreshold: 70,
    mainService: 'Cabelo',
    hasPartners: false,
    cnpj: '',
    meiActivity: 'Prestação de Serviços',
    dataEntryMethod: 'manual',
    onboardingCompleted: false
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleRadioChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const finalData = { ...formData, onboardingCompleted: true, userId } as OnboardingData;
    try {
      await setDoc(doc(db, 'onboarding', userId), finalData);
      setIsSuccess(true);
      setTimeout(() => {
        onComplete(finalData);
      }, 3000);
    } catch (err: any) {
      console.error("Onboarding error:", err);
      setError("Erro ao salvar suas configurações. Verifique os campos e tente novamente.");
      handleFirestoreError(err, OperationType.WRITE, `onboarding/${userId}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 md:p-12 max-w-2xl w-full space-y-8 relative"
      >
        {onCancel && (
          <button 
            onClick={onCancel}
            className="absolute top-6 right-6 p-2 text-zinc-400 hover:text-zinc-600 transition-colors"
            title="Cancelar e Sair"
          >
            <X size={24} />
          </button>
        )}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-sublime rounded-2xl flex items-center justify-center mx-auto shadow-xl mb-4">
            <Sparkles className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold font-display">Bem-vinda ao seu Studio</h1>
          <p className="text-zinc-500">Vamos configurar sua inteligência financeira em poucos passos.</p>
        </div>

        <div className="flex justify-between mb-8">
          {[1, 2, 3, 4, 5].map((s) => (
            <div 
              key={s} 
              className={`h-2 flex-1 mx-1 rounded-full transition-all ${s <= step ? 'bg-sublime' : 'bg-zinc-200'}`}
            />
          ))}
        </div>

        {isSuccess ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6 py-12"
          >
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-100/50">
              <Sparkles size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-zinc-900">Configuração Concluída!</h2>
              <p className="text-zinc-500">
                Seu Studio Sublime está pronto. <br />
                Estamos preparando seu painel inteligente...
              </p>
            </div>
            <div className="flex justify-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium flex items-center gap-2">
              <Sparkles size={18} className="shrink-0" />
              {error}
            </div>
          )}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="flex items-center gap-2 text-sublime mb-4">
                <LayoutDashboard size={20} />
                <h2 className="text-xl font-bold">1. Perfil e Identidade</h2>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Nome do seu negócio</label>
                <input 
                  required 
                  name="companyName" 
                  value={formData.companyName} 
                  onChange={handleChange}
                  className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-sublime/20 outline-none transition-all" 
                  placeholder="Ex: Studio Sublime" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Seu Nome</label>
                <input 
                  required 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange}
                  className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-sublime/20 outline-none transition-all" 
                  placeholder="Ex: Maria Silva" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Escolha a cor principal do seu Dashboard</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="color" 
                    name="primaryColor" 
                    value={formData.primaryColor} 
                    onChange={handleChange}
                    className="w-12 h-12 rounded-lg cursor-pointer border-none" 
                  />
                  <span className="text-sm text-zinc-500">{formData.primaryColor}</span>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="flex items-center gap-2 text-sublime mb-4">
                <DollarSign size={20} />
                <h2 className="text-xl font-bold">2. Parâmetros Financeiros</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Meta de Faturamento Mensal (R$)</label>
                  <input 
                    required 
                    type="number" 
                    name="revenueGoal" 
                    value={formData.revenueGoal} 
                    onChange={handleChange}
                    className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-sublime/20 outline-none transition-all" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Seu Pró-labore fixo (R$)</label>
                  <input 
                    required 
                    type="number" 
                    name="proLabore" 
                    value={formData.proLabore} 
                    onChange={handleChange}
                    className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-sublime/20 outline-none transition-all" 
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Alerta de gastos (% da receita): {formData.expenseAlertThreshold}%</label>
                <input 
                  type="range" 
                  name="expenseAlertThreshold" 
                  min="50" 
                  max="95" 
                  value={formData.expenseAlertThreshold} 
                  onChange={handleChange}
                  className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-sublime" 
                />
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="flex items-center gap-2 text-sublime mb-4">
                <Building2 size={20} />
                <h2 className="text-xl font-bold">3. Dados do MEI</h2>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">CNPJ (Opcional)</label>
                <input 
                  name="cnpj" 
                  value={formData.cnpj} 
                  onChange={handleChange}
                  className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-sublime/20 outline-none transition-all" 
                  placeholder="00.000.000/0000-00" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Tipo de Atividade</label>
                <select 
                  name="meiActivity" 
                  value={formData.meiActivity} 
                  onChange={handleChange}
                  className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-sublime/20 outline-none transition-all"
                >
                  <option value="Prestação de Serviços">Prestação de Serviços</option>
                  <option value="Comércio">Comércio</option>
                  <option value="Indústria">Indústria</option>
                </select>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="flex items-center gap-2 text-sublime mb-4">
                <FileText size={20} />
                <h2 className="text-xl font-bold">4. Operação</h2>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Qual seu serviço 'carro-chefe'?</label>
                <select 
                  name="mainService" 
                  value={formData.mainService} 
                  onChange={handleChange}
                  className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-sublime/20 outline-none transition-all"
                >
                  <option value="Cabelo">Cabelo</option>
                  <option value="Manicure">Manicure</option>
                  <option value="Estética">Estética</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Trabalha com parceiros (comissão)?</label>
                <div className="flex gap-4">
                  <button 
                    type="button" 
                    onClick={() => handleRadioChange('hasPartners', true)}
                    className={`flex-1 p-3 rounded-xl border transition-all font-bold ${formData.hasPartners ? 'bg-sublime text-white border-sublime' : 'bg-white text-zinc-500 border-zinc-200'}`}
                  >
                    Sim
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleRadioChange('hasPartners', false)}
                    className={`flex-1 p-3 rounded-xl border transition-all font-bold ${!formData.hasPartners ? 'bg-sublime text-white border-sublime' : 'bg-white text-zinc-500 border-zinc-200'}`}
                  >
                    Não
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="flex items-center gap-2 text-sublime mb-4">
                <Sparkles size={20} />
                <h2 className="text-xl font-bold">5. Fiscalização por IA</h2>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Como prefere alimentar os dados?</label>
                <div className="flex gap-4">
                  <button 
                    type="button" 
                    onClick={() => handleRadioChange('dataEntryMethod', 'manual')}
                    className={`flex-1 p-3 rounded-xl border transition-all font-bold ${formData.dataEntryMethod === 'manual' ? 'bg-sublime text-white border-sublime' : 'bg-white text-zinc-500 border-zinc-200'}`}
                  >
                    Manual
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleRadioChange('dataEntryMethod', 'upload')}
                    className={`flex-1 p-3 rounded-xl border transition-all font-bold ${formData.dataEntryMethod === 'upload' ? 'bg-sublime text-white border-sublime' : 'bg-white text-zinc-500 border-zinc-200'}`}
                  >
                    Upload (CSV/PDF)
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          <div className="flex gap-4 pt-6">
            {step > 1 && (
              <button 
                type="button" 
                onClick={prevStep}
                className="flex-1 p-4 rounded-xl border border-zinc-200 font-bold text-zinc-500 hover:bg-zinc-50 transition-all"
              >
                Voltar
              </button>
            )}
            {step < 5 ? (
              <button 
                type="button" 
                onClick={nextStep}
                className="flex-1 p-4 rounded-xl bg-sublime text-white font-bold hover:bg-sublime-dark transition-all shadow-lg shadow-sublime/20"
              >
                Continuar
              </button>
            ) : (
              <button 
                type="submit"
                disabled={isSubmitting}
                className="flex-1 p-4 rounded-xl bg-sublime text-white font-bold hover:bg-sublime-dark transition-all shadow-lg shadow-sublime/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>Gerar meu Plano com IA 🤖</>
                )}
              </button>
            )}
          </div>
        </form>
        )}
      </motion.div>
    </div>
  );
}
