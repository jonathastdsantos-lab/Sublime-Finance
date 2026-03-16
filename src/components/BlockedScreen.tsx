import React from 'react';
import { ShieldAlert, LogOut, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';
import { logOut } from '../firebase';

interface BlockedScreenProps {
  message?: string;
  reason?: string;
}

export default function BlockedScreen({ message, reason }: BlockedScreenProps) {
  const getReasonTitle = (r?: string) => {
    switch (r) {
      case 'payment_pending': return 'Pagamento Pendente';
      case 'terms_violation': return 'Violação de Termos';
      case 'account_maintenance': return 'Manutenção na Conta';
      default: return 'Acesso Suspenso';
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[32px] p-8 shadow-2xl shadow-zinc-200 text-center border border-zinc-100"
      >
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <ShieldAlert size={40} />
        </div>
        
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">{getReasonTitle(reason)}</h1>
        
        <div className="bg-zinc-50 rounded-2xl p-6 mb-8 text-zinc-600 text-sm leading-relaxed border border-zinc-100 italic">
          "{message || 'Sua conta foi suspensa temporariamente. Por favor, entre em contato com o suporte para mais informações.'}"
        </div>

        <div className="space-y-3">
          <a 
            href="https://wa.me/5521988843994" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-900/20"
          >
            <MessageSquare size={20} />
            Falar com Suporte
          </a>
          
          <button 
            onClick={() => logOut()}
            className="flex items-center justify-center gap-2 w-full py-4 bg-zinc-100 text-zinc-600 rounded-2xl font-bold hover:bg-zinc-200 transition-all"
          >
            <LogOut size={20} />
            Sair da Conta
          </button>
        </div>

        <p className="mt-8 text-[10px] text-zinc-400 uppercase font-bold tracking-widest">
          Sublime Finance • Sistema de Segurança
        </p>
      </motion.div>
    </div>
  );
}
