import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Shield, 
  Lock, 
  Unlock, 
  Search, 
  Mail, 
  Calendar, 
  UserCheck, 
  UserX,
  MoreVertical,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Settings2
} from 'lucide-react';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc,
  orderBy
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  status: 'active' | 'blocked';
  createdAt: string;
  lastLogin: string;
  blockedFeatures?: string[];
}

const FEATURES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'transactions', label: 'Transações' },
  { id: 'fixed_costs', label: 'Custos Fixos' },
  { id: 'mei', label: 'MEI' },
  { id: 'goals', label: 'Metas' },
  { id: 'investments', label: 'Investimentos' },
  { id: 'ai', label: 'IA Financeira' },
];

export default function AdminPanel() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [editingFeaturesUser, setEditingFeaturesUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as UserProfile));
      setUsers(userData);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const toggleUserStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
    try {
      await updateDoc(doc(db, 'users', userId), { status: newStatus });
      setMessage({ 
        type: 'success', 
        text: `Usuário ${newStatus === 'active' ? 'desbloqueado' : 'bloqueado'} com sucesso!` 
      });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      setMessage({ type: 'error', text: 'Erro ao atualizar status do usuário.' });
    }
  };

  const toggleUserRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setMessage({ 
        type: 'success', 
        text: `Cargo atualizado para ${newRole === 'admin' ? 'Administrador' : 'Usuário'}!` 
      });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      setMessage({ type: 'error', text: 'Erro ao atualizar cargo do usuário.' });
    }
  };

  const toggleFeature = async (userId: string, featureId: string, currentBlocked: string[] = []) => {
    const isBlocked = currentBlocked.includes(featureId);
    const newBlocked = isBlocked 
      ? currentBlocked.filter(id => id !== featureId)
      : [...currentBlocked, featureId];

    try {
      await updateDoc(doc(db, 'users', userId), { blockedFeatures: newBlocked });
      if (editingFeaturesUser?.id === userId) {
        setEditingFeaturesUser(prev => prev ? { ...prev, blockedFeatures: newBlocked } : null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      setMessage({ type: 'error', text: 'Erro ao atualizar permissões.' });
    }
  };

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-sublime border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="text-sublime" />
            Painel Administrativo
          </h2>
          <p className="text-zinc-500 text-sm">Gerencie usuários, permissões e acessos do sistema.</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-sublime/20 outline-none w-full md:w-80 transition-all"
          />
        </div>
      </div>

      {message && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl flex items-center gap-3 ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-medium">{message.text}</span>
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-4">
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-100">
                  <th className="p-4 text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Usuário</th>
                  <th className="p-4 text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Cargo</th>
                  <th className="p-4 text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Status</th>
                  <th className="p-4 text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Criado em</th>
                  <th className="p-4 text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Último Login</th>
                  <th className="p-4 text-[10px] font-bold uppercase text-zinc-400 tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500 font-bold">
                          {user.name?.charAt(0).toUpperCase() || <Users size={18} />}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-zinc-900">{user.name || 'Sem nome'}</p>
                          <p className="text-xs text-zinc-500 flex items-center gap-1">
                            <Mail size={12} />
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                        user.role === 'admin' ? 'bg-sublime/10 text-sublime' : 'bg-zinc-100 text-zinc-500'
                      }`}>
                        {user.role === 'admin' ? 'Administrador' : 'Usuário'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                        user.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {user.status === 'active' ? 'Ativo' : 'Bloqueado'}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-zinc-500">
                      {user.createdAt ? format(new Date(user.createdAt), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                    </td>
                    <td className="p-4 text-xs text-zinc-500">
                      {user.lastLogin ? format(new Date(user.lastLogin), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-'}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setEditingFeaturesUser(user)}
                          className="p-2 text-zinc-400 hover:text-sublime transition-colors"
                          title="Gerenciar Funções"
                        >
                          <Settings2 size={18} />
                        </button>
                        <button 
                          onClick={() => toggleUserRole(user.id, user.role)}
                          className="p-2 text-zinc-400 hover:text-sublime transition-colors"
                          title={user.role === 'admin' ? 'Remover Admin' : 'Tornar Admin'}
                        >
                          <Shield size={18} className={user.role === 'admin' ? 'fill-sublime' : ''} />
                        </button>
                        <button 
                          onClick={() => toggleUserStatus(user.id, user.status)}
                          className={`p-2 transition-colors ${user.status === 'active' ? 'text-zinc-400 hover:text-red-500' : 'text-red-500 hover:text-emerald-500'}`}
                          title={user.status === 'active' ? 'Bloquear Usuário' : 'Desbloquear Usuário'}
                        >
                          {user.status === 'active' ? <Lock size={18} /> : <Unlock size={18} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-zinc-500 text-sm">
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-3 text-sublime">
            <Users size={24} />
            <h3 className="font-bold">Total de Usuários</h3>
          </div>
          <p className="text-3xl font-bold">{users.length}</p>
          <p className="text-xs text-zinc-500">Usuários cadastrados no sistema.</p>
        </div>
        
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-3 text-emerald-600">
            <UserCheck size={24} />
            <h3 className="font-bold">Usuários Ativos</h3>
          </div>
          <p className="text-3xl font-bold">{users.filter(u => u.status === 'active').length}</p>
          <p className="text-xs text-zinc-500">Usuários com acesso liberado.</p>
        </div>

        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-3 text-red-600">
            <UserX size={24} />
            <h3 className="font-bold">Usuários Bloqueados</h3>
          </div>
          <p className="text-3xl font-bold">{users.filter(u => u.status === 'blocked').length}</p>
          <p className="text-xs text-zinc-500">Usuários com acesso suspenso.</p>
        </div>
      </div>

      {editingFeaturesUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Bloquear Funções</h3>
              <button onClick={() => setEditingFeaturesUser(null)} className="p-2 hover:bg-zinc-100 rounded-full transition-all">
                <MoreVertical size={20} className="rotate-90" />
              </button>
            </div>
            
            <p className="text-sm text-zinc-500 mb-6">
              Selecione as funcionalidades que deseja <strong>bloquear</strong> para o usuário <strong>{editingFeaturesUser.name}</strong>.
            </p>

            <div className="space-y-3">
              {FEATURES.map(feature => {
                const isBlocked = editingFeaturesUser.blockedFeatures?.includes(feature.id);
                return (
                  <button
                    key={feature.id}
                    onClick={() => toggleFeature(editingFeaturesUser.id, feature.id, editingFeaturesUser.blockedFeatures)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      isBlocked 
                        ? 'bg-red-50 border-red-100 text-red-600' 
                        : 'bg-white border-zinc-100 text-zinc-600 hover:border-zinc-200'
                    }`}
                  >
                    <span className="font-bold text-sm">{feature.label}</span>
                    {isBlocked ? <Lock size={16} /> : <Unlock size={16} className="opacity-40" />}
                  </button>
                );
              })}
            </div>

            <button 
              onClick={() => setEditingFeaturesUser(null)}
              className="w-full mt-8 bg-zinc-900 text-white py-3.5 rounded-xl font-bold hover:bg-zinc-800 transition-all"
            >
              Concluir
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
