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
  Settings2,
  Eye,
  Database,
  Globe,
  Activity,
  Server,
  Terminal,
  MessageSquare,
  AlertTriangle,
  Zap,
  BarChart3,
  RefreshCcw,
  Key,
  Bell,
  CreditCard,
  Plus,
  Trash2,
  Save
} from 'lucide-react';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc,
  orderBy,
  setDoc,
  deleteDoc,
  getDocs,
  limit,
  Timestamp
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, logAudit } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UserProfile, BlockedFeature, AppConfig, SubscriptionPlan } from '../types';

const FEATURES = [
  { 
    id: 'dashboard', 
    label: 'Dashboard',
    subAreas: [
      { id: 'insights', label: 'Insights da IA' },
      { id: 'charts', label: 'Gráficos' },
      { id: 'summary', label: 'Resumo Financeiro' }
    ]
  },
  { 
    id: 'transactions', 
    label: 'Transações',
    subAreas: [
      { id: 'add', label: 'Adicionar' },
      { id: 'edit', label: 'Editar/Excluir' },
      { id: 'export', label: 'Exportar' },
      { id: 'import', label: 'Importar Extrato' }
    ]
  },
  { 
    id: 'fixed_costs', 
    label: 'Custos Fixos',
    subAreas: [
      { id: 'add', label: 'Adicionar' },
      { id: 'edit', label: 'Editar/Excluir' }
    ]
  },
  { 
    id: 'mei', 
    label: 'MEI',
    subAreas: [
      { id: 'das', label: 'Guia DAS' },
      { id: 'obligations', label: 'Obrigações' }
    ]
  },
  { 
    id: 'goals', 
    label: 'Metas',
    subAreas: [
      { id: 'add', label: 'Adicionar' },
      { id: 'edit', label: 'Editar/Excluir' }
    ]
  },
  { 
    id: 'investments', 
    label: 'Investimentos',
    subAreas: [
      { id: 'calculator', label: 'Calculadora' },
      { id: 'options', label: 'Opções de Investimento' }
    ]
  },
  { 
    id: 'ai', 
    label: 'IA Financeira',
    subAreas: [
      { id: 'chat', label: 'Chat com IA' },
      { id: 'reports', label: 'Relatórios Inteligentes' }
    ]
  },
];

type AdminTab = 'users' | 'plans' | 'global' | 'infra' | 'logs';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [editingFeaturesUser, setEditingFeaturesUser] = useState<UserProfile | null>(null);
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null);
  const [jsonEditorUser, setJsonEditorUser] = useState<UserProfile | null>(null);
  const [jsonContent, setJsonContent] = useState('');
  const [blockingUser, setBlockingUser] = useState<UserProfile | null>(null);
  const [blockReason, setBlockReason] = useState<UserProfile['blockReason']>('other');
  const [blockMessage, setBlockMessage] = useState('');
  const [auditReport, setAuditReport] = useState<{ type: 'info' | 'warning' | 'error', message: string }[] | null>(null);
  const [isPerformingAction, setIsPerformingAction] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribeUsers = onSnapshot(q, (snapshot) => {
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

    const unsubscribeConfig = onSnapshot(doc(db, 'app_config', 'global'), (doc) => {
      if (doc.exists()) {
        setAppConfig({ id: 'global', ...doc.data() } as AppConfig);
      }
    });

    const unsubscribePlans = onSnapshot(collection(db, 'plans'), (snapshot) => {
      const plansData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as SubscriptionPlan));
      setPlans(plansData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'plans');
    });

    const qLogs = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(50));
    const unsubscribeLogs = onSnapshot(qLogs, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAuditLogs(logs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'audit_logs');
    });

    return () => {
      unsubscribeUsers();
      unsubscribeConfig();
      unsubscribePlans();
      unsubscribeLogs();
    };
  }, []);

  const toggleUserStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
    if (newStatus === 'blocked') {
      const user = users.find(u => u.id === userId);
      if (user) setBlockingUser(user);
      return;
    }

    try {
      await updateDoc(doc(db, 'users', userId), { 
        status: 'active',
        isBlocked: false,
        blockMessage: '',
        blockReason: null
      });
      await logAudit('user_unblocked', { targetUserId: userId });
      setMessage({ type: 'success', text: 'Usuário desbloqueado com sucesso!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const confirmBlock = async () => {
    if (!blockingUser) return;
    try {
      await updateDoc(doc(db, 'users', blockingUser.id), { 
        status: 'blocked',
        isBlocked: true,
        blockMessage,
        blockReason
      });
      await logAudit('user_blocked', { 
        targetUserId: blockingUser.id, 
        reason: blockReason,
        message: blockMessage
      });
      setMessage({ type: 'success', text: 'Usuário bloqueado com sucesso!' });
      setBlockingUser(null);
      setBlockMessage('');
      setBlockReason('other');
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${blockingUser.id}`);
    }
  };

  const impersonateUser = async (userId: string) => {
    // In a real app, this would involve a backend session swap or a specialized token.
    // For this demo/prototype, we'll store the impersonated ID in localStorage
    // and the Dashboard will use it to fetch data instead of auth.currentUser.uid
    await logAudit('impersonation_start', { targetUserId: userId });
    localStorage.setItem('impersonated_user_id', userId);
    window.location.reload();
  };

  const saveJsonMetadata = async () => {
    if (!jsonEditorUser) return;
    try {
      const metadata = JSON.parse(jsonContent);
      await updateDoc(doc(db, 'users', jsonEditorUser.id), { metadata });
      await logAudit('metadata_update', { targetUserId: jsonEditorUser.id });
      setMessage({ type: 'success', text: 'Metadados atualizados com sucesso!' });
      setJsonEditorUser(null);
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'JSON inválido ou erro ao salvar.' });
    }
  };

  const updateGlobalConfig = async (updates: Partial<AppConfig>) => {
    try {
      await setDoc(doc(db, 'app_config', 'global'), updates, { merge: true });
      await logAudit('global_config_update', { updates });
      setMessage({ type: 'success', text: 'Configuração global atualizada!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'app_config/global');
    }
  };

  const toggleUserRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      await logAudit('role_update', { targetUserId: userId, newRole });
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

  const toggleFeature = async (userId: string, featureId: string, currentBlocked: (string | BlockedFeature)[] = []) => {
    const block = getFeatureBlock(currentBlocked, featureId);
    const newBlocked = block 
      ? currentBlocked.filter(f => (typeof f === 'string' ? f !== featureId : f.id !== featureId))
      : [...currentBlocked, { id: featureId }];

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

  const updateFeatureBlock = async (userId: string, featureId: string, updates: Partial<BlockedFeature>, currentBlocked: (string | BlockedFeature)[] = []) => {
    const newBlocked = currentBlocked.map(f => {
      const id = typeof f === 'string' ? f : f.id;
      if (id === featureId) {
        const base = typeof f === 'string' ? { id: f } : f;
        return { ...base, ...updates };
      }
      return f;
    });

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

  const toggleSubArea = async (userId: string, featureId: string, subAreaId: string, currentBlocked: (string | BlockedFeature)[] = []) => {
    const block = getFeatureBlock(currentBlocked, featureId);
    if (!block) return;

    const currentSubAreas = block.subAreas || [];
    const newSubAreas = currentSubAreas.includes(subAreaId)
      ? currentSubAreas.filter(id => id !== subAreaId)
      : [...currentSubAreas, subAreaId];

    await updateFeatureBlock(userId, featureId, { subAreas: newSubAreas }, currentBlocked);
  };

  const handleGlobalPasswordReset = async () => {
    if (!window.confirm('Isso enviará um e-mail de redefinição de senha para TODOS os usuários cadastrados. Continuar?')) return;
    
    setIsPerformingAction(true);
    const { sendPasswordResetEmail } = await import('firebase/auth');
    let successCount = 0;
    let failCount = 0;

    for (const user of users) {
      if (user.email) {
        try {
          await sendPasswordResetEmail(auth, user.email);
          successCount++;
        } catch (error) {
          failCount++;
        }
      }
    }

    await logAudit('global_password_reset_triggered', { successCount, failCount });
    setMessage({ 
      type: 'success', 
      text: `Processo concluído: ${successCount} e-mails enviados, ${failCount} falhas.` 
    });
    setIsPerformingAction(false);
    setTimeout(() => setMessage(null), 5000);
  };

  const runPermissionAudit = async () => {
    setIsPerformingAction(true);
    const report: { type: 'info' | 'warning' | 'error', message: string }[] = [];
    
    report.push({ type: 'info', message: `Iniciando auditoria em ${users.length} usuários...` });

    const adminEmail = "jonathastdsantos@gmail.com";
    
    users.forEach(u => {
      // Check for unauthorized admins
      if (u.role === 'admin' && u.email !== adminEmail) {
        report.push({ type: 'warning', message: `Usuário Admin detectado: ${u.email} (Verifique se isso é esperado)` });
      }

      // Check for blocked users
      if (u.status === 'blocked') {
        report.push({ type: 'info', message: `Usuário bloqueado: ${u.email} - Motivo: ${u.blockReason || 'Não especificado'}` });
      }

      // Check for missing metadata
      if (!u.metadata) {
        report.push({ type: 'warning', message: `Usuário sem metadados: ${u.email}` });
      }
    });

    if (appConfig?.maintenanceMode) {
      report.push({ type: 'error', message: "O SISTEMA ESTÁ EM MODO MANUTENÇÃO." });
    }

    setAuditReport(report);
    await logAudit('permission_audit_performed', { issueCount: report.filter(r => r.type !== 'info').length });
    setIsPerformingAction(false);
  };

  const savePlan = async () => {
    if (!editingPlan) return;
    try {
      await setDoc(doc(db, 'plans', editingPlan.id), editingPlan);
      setMessage({ type: 'success', text: 'Plano salvo com sucesso!' });
      setEditingPlan(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `plans/${editingPlan.id}`);
      setMessage({ type: 'error', text: 'Erro ao salvar plano.' });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const deletePlan = async (planId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este plano?')) return;
    try {
      await deleteDoc(doc(db, 'plans', planId));
      setMessage({ type: 'success', text: 'Plano excluído com sucesso!' });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `plans/${planId}`);
      setMessage({ type: 'error', text: 'Erro ao excluir plano.' });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const getFeatureBlock = (blockedFeatures: (string | BlockedFeature)[] = [], featureId: string): BlockedFeature | null => {
    const block = blockedFeatures.find(f => 
      typeof f === 'string' ? f === featureId : f.id === featureId
    );
    if (!block) return null;
    return typeof block === 'string' ? { id: block } : block;
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
          <p className="text-zinc-500 text-sm">Gerencie usuários, permissões e infraestrutura do sistema.</p>
        </div>

        <div className="flex bg-zinc-100 p-1 rounded-2xl">
          {[
            { id: 'users', label: 'Usuários', icon: Users },
            { id: 'plans', label: 'Planos', icon: CreditCard },
            { id: 'global', label: 'Global', icon: Globe },
            { id: 'infra', label: 'Infra', icon: Server },
            { id: 'logs', label: 'Logs', icon: Terminal }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.id ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
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

      {activeTab === 'users' && (
        <div className="space-y-6">
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

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-100">
                    <th className="p-4 text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Usuário</th>
                    <th className="p-4 text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Cargo</th>
                    <th className="p-4 text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Plano</th>
                    <th className="p-4 text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Status</th>
                    <th className="p-4 text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500 font-bold">
                            {user.name?.charAt(0).toUpperCase() || <Users size={18} />}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-zinc-900">{user.name || 'Sem nome'}</p>
                            <p className="text-xs text-zinc-500">{user.email}</p>
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
                        <select
                          value={user.planId || 'free'}
                          onChange={async (e) => {
                            try {
                              await updateDoc(doc(db, 'users', user.id), { planId: e.target.value });
                              setMessage({ type: 'success', text: 'Plano do usuário atualizado!' });
                            } catch (error) {
                              handleFirestoreError(error, OperationType.UPDATE, `users/${user.id}`);
                              setMessage({ type: 'error', text: 'Erro ao atualizar plano.' });
                            }
                            setTimeout(() => setMessage(null), 3000);
                          }}
                          className="p-1 rounded-lg text-xs border border-zinc-200 bg-white outline-none focus:border-sublime"
                        >
                          <option value="free">Gratuito</option>
                          {plans.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                          user.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                        }`}>
                          {user.status === 'active' ? 'Ativo' : 'Bloqueado'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => impersonateUser(user.id)}
                            className="p-2 text-zinc-400 hover:text-blue-500 transition-colors"
                            title="Logar como este usuário"
                          >
                            <Eye size={18} />
                          </button>
                          <button 
                            onClick={() => { setJsonEditorUser(user); setJsonContent(JSON.stringify(user.metadata || {}, null, 2)); }}
                            className="p-2 text-zinc-400 hover:text-orange-500 transition-colors"
                            title="Editor de Metadados"
                          >
                            <Database size={18} />
                          </button>
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">Planos de Assinatura</h3>
            <button
              onClick={() => setEditingPlan({
                id: `plan_${Date.now()}`,
                name: 'Novo Plano',
                description: '',
                price: 0,
                interval: 'month',
                features: [],
                blockedFeatures: [],
                active: true
              })}
              className="flex items-center gap-2 px-4 py-2 bg-sublime text-white rounded-xl font-bold text-sm hover:bg-sublime/90 transition-colors"
            >
              <Plus size={16} />
              Criar Plano
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map(plan => (
              <div key={plan.id} className={`glass-card p-6 border-2 ${plan.isPopular ? 'border-sublime' : 'border-transparent'}`}>
                {plan.isPopular && (
                  <div className="text-xs font-bold text-sublime uppercase tracking-wider mb-2">Mais Popular</div>
                )}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-xl">{plan.name}</h4>
                    <p className="text-sm text-zinc-500">{plan.description}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${plan.active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                    {plan.active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                
                <div className="mb-6">
                  <span className="text-3xl font-bold">R$ {plan.price.toFixed(2)}</span>
                  <span className="text-zinc-500 text-sm">/{plan.interval === 'month' ? 'mês' : 'ano'}</span>
                </div>

                <div className="space-y-2 mb-6">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 size={16} className="text-sublime" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-6 border-t border-zinc-100 flex gap-2">
                  <button
                    onClick={() => setEditingPlan(plan)}
                    className="flex-1 py-2 bg-zinc-100 text-zinc-900 rounded-xl font-bold text-sm hover:bg-zinc-200 transition-colors"
                  >
                    Editar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'global' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-red-600">
                <AlertTriangle size={24} />
                <h3 className="font-bold">Modo Manutenção</h3>
              </div>
              <button 
                onClick={() => updateGlobalConfig({ maintenanceMode: !appConfig?.maintenanceMode })}
                className={`w-12 h-6 rounded-full transition-all relative ${appConfig?.maintenanceMode ? 'bg-red-500' : 'bg-zinc-200'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${appConfig?.maintenanceMode ? 'right-1' : 'left-1'}`} />
              </button>
            </div>
            <p className="text-sm text-zinc-500">Ative para travar o acesso de todos os usuários (exceto administradores) e exibir uma tela de manutenção.</p>
          </div>

          <div className="glass-card p-6 space-y-6">
            <div className="flex items-center gap-3 text-sublime">
              <Bell size={24} />
              <h3 className="font-bold">Banner de Aviso (Global)</h3>
            </div>
            <div className="space-y-4">
              <input 
                type="text"
                placeholder="Texto do banner..."
                value={appConfig?.topBanner?.text || ''}
                onChange={(e) => updateGlobalConfig({ topBanner: { ...appConfig?.topBanner, text: e.target.value, active: appConfig?.topBanner?.active || false, type: appConfig?.topBanner?.type || 'info' } })}
                className="w-full p-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-sublime/20"
              />
              <div className="flex gap-2">
                {['info', 'warning', 'error'].map(type => (
                  <button
                    key={type}
                    onClick={() => updateGlobalConfig({ topBanner: { ...appConfig?.topBanner!, type: type as any } })}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                      appConfig?.topBanner?.type === type ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-500 border-zinc-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => updateGlobalConfig({ topBanner: { ...appConfig?.topBanner!, active: !appConfig?.topBanner?.active } })}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                  appConfig?.topBanner?.active ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                }`}
              >
                {appConfig?.topBanner?.active ? 'Desativar Banner' : 'Ativar Banner'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'infra' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-emerald-500">
                <Zap size={24} />
                <h3 className="font-bold">Status da API</h3>
              </div>
              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Firebase Firestore</span>
                <span className="text-emerald-600 font-bold">Online</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Google Auth</span>
                <span className="text-emerald-600 font-bold">Online</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Gemini AI</span>
                <span className="text-emerald-600 font-bold">Online</span>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center gap-3 text-blue-500">
              <BarChart3 size={24} />
              <h3 className="font-bold">Uso de Cota (Firebase)</h3>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold uppercase text-zinc-400">
                  <span>Leituras</span>
                  <span>12%</span>
                </div>
                <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-[12%]" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold uppercase text-zinc-400">
                  <span>Escritas</span>
                  <span>5%</span>
                </div>
                <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-[5%]" />
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center gap-3 text-orange-500">
              <Key size={24} />
              <h3 className="font-bold">Ações de Segurança</h3>
            </div>
            <button 
              disabled={isPerformingAction}
              onClick={handleGlobalPasswordReset}
              className="w-full py-2 bg-zinc-50 text-zinc-600 rounded-xl text-xs font-bold hover:bg-zinc-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isPerformingAction ? <RefreshCcw size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
              Forçar Reset de Senhas
            </button>
            <button 
              disabled={isPerformingAction}
              onClick={runPermissionAudit}
              className="w-full py-2 bg-zinc-50 text-zinc-600 rounded-xl text-xs font-bold hover:bg-zinc-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isPerformingAction ? <RefreshCcw size={14} className="animate-spin" /> : <Shield size={14} />}
              Auditar Permissões
            </button>
          </div>
        </div>
      )}

      {/* Audit Report Modal */}
      <AnimatePresence>
        {auditReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[32px] p-8 w-full max-w-2xl shadow-2xl max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center">
                    <Shield size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Relatório de Auditoria</h3>
                    <p className="text-sm text-zinc-500">Resultados da verificação de segurança</p>
                  </div>
                </div>
                <button onClick={() => setAuditReport(null)} className="p-2 hover:bg-zinc-100 rounded-full transition-all">
                  <XCircle size={24} className="text-zinc-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-2">
                {auditReport.map((item, i) => (
                  <div key={i} className={`p-3 rounded-xl border text-xs flex items-start gap-3 ${
                    item.type === 'error' ? 'bg-red-50 border-red-100 text-red-700' :
                    item.type === 'warning' ? 'bg-orange-50 border-orange-100 text-orange-700' :
                    'bg-zinc-50 border-zinc-100 text-zinc-600'
                  }`}>
                    <div className="mt-0.5">
                      {item.type === 'error' ? <AlertTriangle size={14} /> : 
                       item.type === 'warning' ? <AlertCircle size={14} /> : 
                       <CheckCircle2 size={14} />}
                    </div>
                    <p className="font-medium">{item.message}</p>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setAuditReport(null)}
                className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-all"
              >
                Fechar Relatório
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {activeTab === 'logs' && (
        <div className="glass-card overflow-hidden">
          <div className="p-4 bg-zinc-900 text-zinc-400 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal size={16} />
              <span className="text-xs font-mono">system_audit_logs</span>
            </div>
            <button className="p-1 hover:text-white transition-colors">
              <RefreshCcw size={14} />
            </button>
          </div>
          <div className="p-4 bg-zinc-950 font-mono text-[10px] space-y-1 min-h-[300px] overflow-y-auto max-h-[500px]">
            {auditLogs.length === 0 ? (
              <p className="text-zinc-600">Nenhum log de auditoria encontrado.</p>
            ) : (
              auditLogs.map(log => (
                <p key={log.id} className={
                  log.action.includes('error') ? 'text-red-500' :
                  log.action.includes('blocked') ? 'text-orange-500' :
                  'text-zinc-400'
                }>
                  <span className="text-zinc-600">[{format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}]</span>{' '}
                  <span className="text-emerald-500">[{log.action.toUpperCase()}]</span>{' '}
                  {log.userEmail}: {JSON.stringify(log.details)}
                </p>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {blockingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center">
                  <Lock size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Bloquear Usuário</h3>
                  <p className="text-sm text-zinc-500">{blockingUser.name}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400">Motivo do Bloqueio</label>
                  <select 
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value as any)}
                    className="w-full p-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-sublime/20 text-sm"
                  >
                    <option value="payment_pending">Pagamento Pendente</option>
                    <option value="terms_violation">Violação de Termos</option>
                    <option value="account_maintenance">Manutenção na Conta</option>
                    <option value="other">Outro</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400">Mensagem Personalizada</label>
                  <textarea 
                    value={blockMessage}
                    onChange={(e) => setBlockMessage(e.target.value)}
                    placeholder="Escreva a mensagem que o usuário verá..."
                    className="w-full p-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-sublime/20 text-sm min-h-[100px] resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setBlockingUser(null)}
                    className="flex-1 py-3 rounded-xl font-bold text-zinc-600 hover:bg-zinc-100 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={confirmBlock}
                    className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                  >
                    Bloquear Agora
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {jsonEditorUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[32px] p-8 w-full max-w-2xl shadow-2xl h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center">
                    <Database size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Editor de Metadados</h3>
                    <p className="text-sm text-zinc-500">{jsonEditorUser.name}</p>
                  </div>
                </div>
                <button onClick={() => setJsonEditorUser(null)} className="p-2 hover:bg-zinc-100 rounded-full transition-all">
                  <XCircle size={24} className="text-zinc-400" />
                </button>
              </div>

              <div className="flex-1 bg-zinc-950 rounded-2xl overflow-hidden mb-6 border border-zinc-800">
                <textarea 
                  value={jsonContent}
                  onChange={(e) => setJsonContent(e.target.value)}
                  className="w-full h-full p-6 bg-transparent text-emerald-500 font-mono text-xs outline-none resize-none"
                  spellCheck={false}
                />
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setJsonEditorUser(null)}
                  className="flex-1 py-3 rounded-xl font-bold text-zinc-600 hover:bg-zinc-100 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={saveJsonMetadata}
                  className="flex-1 py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-900/20"
                >
                  Salvar Alterações
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {editingPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl my-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Editar Plano</h3>
                <button onClick={() => setEditingPlan(null)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <XCircle size={24} className="text-zinc-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase">Nome do Plano</label>
                    <input 
                      type="text" 
                      value={editingPlan.name}
                      onChange={e => setEditingPlan({...editingPlan, name: e.target.value})}
                      className="w-full p-3 rounded-xl border border-zinc-200 outline-none focus:border-sublime"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase">Preço (R$)</label>
                    <input 
                      type="number" 
                      value={editingPlan.price}
                      onChange={e => setEditingPlan({...editingPlan, price: Number(e.target.value)})}
                      className="w-full p-3 rounded-xl border border-zinc-200 outline-none focus:border-sublime"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase">Descrição</label>
                  <input 
                    type="text" 
                    value={editingPlan.description}
                    onChange={e => setEditingPlan({...editingPlan, description: e.target.value})}
                    className="w-full p-3 rounded-xl border border-zinc-200 outline-none focus:border-sublime"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase">Intervalo</label>
                    <select 
                      value={editingPlan.interval}
                      onChange={e => setEditingPlan({...editingPlan, interval: e.target.value as 'month' | 'year'})}
                      className="w-full p-3 rounded-xl border border-zinc-200 outline-none focus:border-sublime"
                    >
                      <option value="month">Mensal</option>
                      <option value="year">Anual</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase">Link de Pagamento (Stripe/MercadoPago)</label>
                    <input 
                      type="text" 
                      value={editingPlan.paymentLink || ''}
                      onChange={e => setEditingPlan({...editingPlan, paymentLink: e.target.value})}
                      placeholder="https://buy.stripe.com/..."
                      className="w-full p-3 rounded-xl border border-zinc-200 outline-none focus:border-sublime"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input 
                      type="checkbox" 
                      checked={editingPlan.active}
                      onChange={e => setEditingPlan({...editingPlan, active: e.target.checked})}
                      className="rounded text-sublime focus:ring-sublime"
                    />
                    Plano Ativo
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input 
                      type="checkbox" 
                      checked={editingPlan.isPopular || false}
                      onChange={e => setEditingPlan({...editingPlan, isPopular: e.target.checked})}
                      className="rounded text-sublime focus:ring-sublime"
                    />
                    Destacar como Mais Popular
                  </label>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Funcionalidades (Lista de Vantagens)</label>
                  <textarea 
                    value={editingPlan.features.join('\n')}
                    onChange={e => setEditingPlan({...editingPlan, features: e.target.value.split('\n').filter(f => f.trim() !== '')})}
                    placeholder="Uma vantagem por linha..."
                    className="w-full p-3 rounded-xl border border-zinc-200 outline-none focus:border-sublime h-24"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Funcionalidades Bloqueadas (Sistema)</label>
                  <div className="space-y-4 max-h-96 overflow-y-auto p-2 border border-zinc-200 rounded-xl">
                    {FEATURES.map(feature => {
                      const block = getFeatureBlock(editingPlan.blockedFeatures, feature.id);
                      const isBlocked = !!block;
                      const isExpanded = expandedFeature === feature.id;

                      return (
                        <div key={feature.id} className="space-y-2">
                          <div
                            className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                              isBlocked 
                                ? 'bg-red-50 border-red-100 text-red-600' 
                                : 'bg-white border-zinc-100 text-zinc-600 hover:border-zinc-200'
                            }`}
                          >
                            <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => {
                              const newBlocked = block 
                                ? editingPlan.blockedFeatures.filter(f => (typeof f === 'string' ? f !== feature.id : f.id !== feature.id))
                                : [...editingPlan.blockedFeatures, { id: feature.id }];
                              setEditingPlan({...editingPlan, blockedFeatures: newBlocked});
                            }}>
                              {isBlocked ? <Lock size={16} /> : <Unlock size={16} className="opacity-40" />}
                              <span className="font-bold text-sm">{feature.label}</span>
                            </div>
                            
                            {isBlocked && (
                              <button 
                                onClick={() => setExpandedFeature(isExpanded ? null : feature.id)}
                                className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                              >
                                <Settings2 size={16} />
                              </button>
                            )}
                          </div>

                          <AnimatePresence>
                            {isBlocked && isExpanded && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="ml-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-4"
                              >
                                <div className="space-y-2">
                                  <label className="text-[10px] font-bold uppercase text-zinc-400">Sub-áreas Bloqueadas</label>
                                  <div className="grid grid-cols-1 gap-2">
                                    {feature.subAreas.map(sub => {
                                      const isSubBlocked = block.subAreas?.includes(sub.id);
                                      return (
                                        <button
                                          key={sub.id}
                                          onClick={() => {
                                            const newSubAreas = isSubBlocked
                                              ? (block.subAreas || []).filter(id => id !== sub.id)
                                              : [...(block.subAreas || []), sub.id];
                                            
                                            const newBlocked = editingPlan.blockedFeatures.map(f => {
                                              const id = typeof f === 'string' ? f : f.id;
                                              if (id === feature.id) {
                                                const base = typeof f === 'string' ? { id: f } : f;
                                                return { ...base, subAreas: newSubAreas };
                                              }
                                              return f;
                                            });
                                            setEditingPlan({...editingPlan, blockedFeatures: newBlocked});
                                          }}
                                          className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-all ${
                                            isSubBlocked 
                                              ? 'bg-red-100 border-red-200 text-red-700' 
                                              : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300'
                                          }`}
                                        >
                                          <span>{sub.label}</span>
                                          {isSubBlocked ? <Lock size={12} /> : <Unlock size={12} className="opacity-40" />}
                                        </button>
                                      );
                                    })}
                                    {feature.subAreas.length === 0 && (
                                      <p className="text-xs text-zinc-400 italic">Nenhuma sub-área disponível para esta funcionalidade.</p>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1">Marque as áreas que o usuário NÃO terá acesso neste plano.</p>
                </div>

                <div className="flex justify-between pt-6 border-t border-zinc-100">
                  <button 
                    onClick={() => deletePlan(editingPlan.id)}
                    className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors font-bold text-sm"
                  >
                    <Trash2 size={16} /> Excluir Plano
                  </button>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setEditingPlan(null)}
                      className="px-6 py-2 bg-zinc-100 text-zinc-600 rounded-xl font-bold text-sm hover:bg-zinc-200 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={savePlan}
                      className="flex items-center gap-2 px-6 py-2 bg-sublime text-white rounded-xl font-bold text-sm hover:bg-sublime/90 transition-colors shadow-lg shadow-sublime/20"
                    >
                      <Save size={16} /> Salvar Plano
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {editingFeaturesUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Bloquear Funções</h3>
                <button onClick={() => { setEditingFeaturesUser(null); setExpandedFeature(null); }} className="p-2 hover:bg-zinc-100 rounded-full transition-all">
                  <XCircle size={24} className="text-zinc-400" />
                </button>
              </div>
              
              <p className="text-sm text-zinc-500 mb-6">
                Selecione as funcionalidades que deseja <strong>bloquear</strong> para o usuário <strong>{editingFeaturesUser.name}</strong>.
              </p>

              <div className="space-y-4">
                {FEATURES.map(feature => {
                  const block = getFeatureBlock(editingFeaturesUser.blockedFeatures, feature.id);
                  const isBlocked = !!block;
                  const isExpanded = expandedFeature === feature.id;

                  return (
                    <div key={feature.id} className="space-y-2">
                      <div
                        className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                          isBlocked 
                            ? 'bg-red-50 border-red-100 text-red-600' 
                            : 'bg-white border-zinc-100 text-zinc-600 hover:border-zinc-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => toggleFeature(editingFeaturesUser.id, feature.id, editingFeaturesUser.blockedFeatures)}>
                          {isBlocked ? <Lock size={16} /> : <Unlock size={16} className="opacity-40" />}
                          <span className="font-bold text-sm">{feature.label}</span>
                        </div>
                        
                        {isBlocked && (
                          <button 
                            onClick={() => setExpandedFeature(isExpanded ? null : feature.id)}
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            <Settings2 size={16} />
                          </button>
                        )}
                      </div>

                      {isBlocked && isExpanded && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          className="ml-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-4"
                        >
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-zinc-400">Tempo de Bloqueio (Opcional)</label>
                            <input 
                              type="datetime-local"
                              value={block.expiresAt ? block.expiresAt.slice(0, 16) : ''}
                              onChange={(e) => updateFeatureBlock(editingFeaturesUser.id, feature.id, { expiresAt: e.target.value ? new Date(e.target.value).toISOString() : undefined }, editingFeaturesUser.blockedFeatures)}
                              className="w-full p-2 rounded-lg border border-zinc-200 text-xs outline-none focus:ring-2 focus:ring-sublime/20"
                            />
                            <p className="text-[10px] text-zinc-400 italic">Deixe vazio para bloqueio permanente.</p>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-zinc-400">Sub-áreas Bloqueadas</label>
                            <div className="grid grid-cols-1 gap-2">
                              {feature.subAreas.map(sub => {
                                const isSubBlocked = block.subAreas?.includes(sub.id);
                                return (
                                  <button
                                    key={sub.id}
                                    onClick={() => toggleSubArea(editingFeaturesUser.id, feature.id, sub.id, editingFeaturesUser.blockedFeatures)}
                                    className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-all ${
                                      isSubBlocked 
                                        ? 'bg-red-100 border-red-200 text-red-700' 
                                        : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300'
                                    }`}
                                  >
                                    <span>{sub.label}</span>
                                    {isSubBlocked ? <Lock size={12} /> : <Unlock size={12} className="opacity-40" />}
                                  </button>
                                );
                              })}
                            </div>
                            <p className="text-[10px] text-zinc-400 italic">Se nenhuma sub-área for selecionada, toda a função será bloqueada.</p>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button 
                onClick={() => { setEditingFeaturesUser(null); setExpandedFeature(null); }}
                className="w-full mt-8 bg-zinc-900 text-white py-3.5 rounded-xl font-bold hover:bg-zinc-800 transition-all"
              >
                Concluir
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
