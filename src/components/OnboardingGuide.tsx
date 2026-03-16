import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Sparkles, 
  LayoutDashboard, 
  Receipt, 
  Calculator, 
  Target, 
  ShieldCheck 
} from 'lucide-react';

interface OnboardingGuideProps {
  onClose: () => void;
  companyName: string;
}

const steps = [
  {
    title: "Bem-vinda ao Sublime Finance Pro",
    description: "Sua nova plataforma de gestão financeira de elite, desenhada especificamente para Studios de Beleza.",
    icon: Sparkles,
    color: "text-sublime"
  },
  {
    title: "Dashboard Inteligente",
    description: "Tenha uma visão clara do seu faturamento, lucro real e progresso das suas metas em uma única tela.",
    icon: LayoutDashboard,
    color: "text-blue-500"
  },
  {
    title: "Controle de Transações",
    description: "Registre entradas e saídas com facilidade. Importe extratos bancários via CSV para economizar tempo.",
    icon: Receipt,
    color: "text-emerald-500"
  },
  {
    title: "Cálculo de Custos de Serviço",
    description: "Descubra exatamente quanto custa cada procedimento e qual deve ser o preço ideal para lucrar mais.",
    icon: Calculator,
    color: "text-amber-500"
  },
  {
    title: "Metas e Sonhos",
    description: "Defina metas de faturamento e acompanhe seus sonhos (como a reserva de emergência ou o casamento).",
    icon: Target,
    color: "text-rose-500"
  },
  {
    title: "Controle MEI",
    description: "Gerencie suas obrigações MEI, DAS e declarações anuais sem complicações.",
    icon: ShieldCheck,
    color: "text-indigo-500"
  }
];

export default function OnboardingGuide({ onClose, companyName }: OnboardingGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const StepIcon = steps[currentStep].icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/80 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[32px] p-8 w-full max-w-lg shadow-2xl relative overflow-hidden"
      >
        {/* Background Decoration */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-sublime/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-sublime/5 rounded-full blur-3xl" />

        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="relative z-10 flex flex-col items-center text-center space-y-6 py-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="flex flex-col items-center space-y-6"
            >
              <div className={`p-6 rounded-3xl bg-zinc-50 ${steps[currentStep].color}`}>
                <StepIcon size={48} />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-zinc-900">{steps[currentStep].title}</h2>
                <p className="text-zinc-500 leading-relaxed">
                  {steps[currentStep].description.replace('Studio Sublime', companyName)}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex gap-2 py-4">
            {steps.map((_, idx) => (
              <div 
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-8 bg-sublime' : 'w-2 bg-zinc-200'}`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between w-full pt-4">
            <button 
              onClick={prevStep}
              disabled={currentStep === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${currentStep === 0 ? 'opacity-0' : 'text-zinc-400 hover:text-zinc-600'}`}
            >
              <ChevronLeft size={18} />
              Anterior
            </button>
            
            <button 
              onClick={nextStep}
              className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-sublime text-white font-bold shadow-lg shadow-sublime/20 hover:scale-105 active:scale-95 transition-all"
            >
              {currentStep === steps.length - 1 ? 'Começar Agora' : 'Próximo'}
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
