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
  DollarSign,
  PieChart as PieChartIcon,
  Calculator,
  Heart,
  LogOut,
  LogIn,
  Search,
  LayoutDashboard,
  Repeat,
  FileText,
  Menu,
  X,
  ChevronRight,
  Bell,
  Download,
  Trash2,
  User,
  Settings,
  Building2,
  RefreshCw,
  Link2,
  ExternalLink,
  Camera,
  HelpCircle,
  Info,
  BookOpen,
  Shield,
  Lock,
  Unlock,
  UserCheck,
  UserX,
  Eye,
  BarChart as BarChartIcon
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { format, differenceInDays, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import StatementImporter from './StatementImporter';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth, signInWithGoogle, registerWithEmail, loginWithEmail, logOut, updateProfile, resetPassword, handleFirestoreError, OperationType } from '../firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { Transaction, ServiceCost, WeddingGoal, OnboardingData, FixedCost, MeiObligation, Goal, BankAccount, UserProfile, BlockedFeature, AppConfig } from '../types';
import { CATEGORIES, INITIAL_INVESTMENTS, PAYMENT_METHODS, FIXED_COST_CATEGORIES } from '../constants';
import { getAIInsights } from '../services/aiService';
import OnboardingForm from './OnboardingForm';
import ErrorBoundary from './ErrorBoundary';
import AdminPanel from './AdminPanel';
import OnboardingGuide from './OnboardingGuide';
import BlockedScreen from './BlockedScreen';

type View = 'dashboard' | 'transactions' | 'fixed_costs' | 'mei' | 'goals' | 'investments' | 'ai' | 'settings' | 'admin';
type AuthMode = 'login' | 'register' | '2fa_start' | '2fa_check';

export default function Dashboard() {
  return (
    <ErrorBoundary>
      <DashboardContent />
    </ErrorBoundary>
  );
}

function DashboardContent() {
  const [user, setUser] = useState(auth.currentUser);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [is2FABypassed, setIs2FABypassed] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [isLoadingOnboarding, setIsLoadingOnboarding] = useState(true);

  const [activeView, setActiveView] = useState<View>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [serviceCosts, setServiceCosts] = useState<ServiceCost[]>([]);
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);
  const [meiObligations, setMeiObligations] = useState<MeiObligation[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [weddingGoal, setWeddingGoal] = useState<WeddingGoal | null>(null);
  const [goal, setGoal] = useState<number>(8000);
  
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [isImportingStatement, setIsImportingStatement] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [formType, setFormType] = useState<'entrada' | 'saida'>('entrada');
  const [isAddingService, setIsAddingService] = useState(false);
  const [isAddingFixedCost, setIsAddingFixedCost] = useState(false);
  const [isAddingMei, setIsAddingMei] = useState(false);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [isShowingBankGuide, setIsShowingBankGuide] = useState(false);
  const [isShowingOnboardingGuide, setIsShowingOnboardingGuide] = useState(false);

  useEffect(() => {
    if (onboardingData?.primaryColor) {
      document.documentElement.style.setProperty('--primary-color', onboardingData.primaryColor);
      // Generate a darker version for the hover state (simple approach)
      document.documentElement.style.setProperty('--primary-color-dark', onboardingData.primaryColor + 'dd');
    }
  }, [onboardingData?.primaryColor]);
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [googleTokens, setGoogleTokens] = useState<any>(() => {
    const saved = localStorage.getItem('google_calendar_tokens');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        const tokens = event.data.tokens;
        setGoogleTokens(tokens);
        localStorage.setItem('google_calendar_tokens', JSON.stringify(tokens));
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const connectGoogleCalendar = async () => {
    try {
      const res = await fetch('/api/auth/google/url');
      const { url } = await res.json();
      window.open(url, 'google_auth', 'width=600,height=700');
    } catch (error) {
      console.error('Error getting Google Auth URL:', error);
    }
  };

  const syncToGoogleCalendar = async () => {
    if (!googleTokens) return;
    setIsSyncingCalendar(true);
    try {
      const events = [
        ...meiObligations.map(mei => ({
          summary: `MEI: ${mei.name}`,
          description: `Vencimento da obrigação MEI: ${mei.name}. Valor: R$ ${mei.amount}`,
          date: mei.due_date
        })),
        ...fixedCosts.map(cost => {
          const today = new Date();
          const dueDate = new Date(today.getFullYear(), today.getMonth(), cost.due_day);
          return {
            summary: `Custo Fixo: ${cost.name}`,
            description: `Vencimento do custo fixo: ${cost.name}. Valor: R$ ${cost.amount}`,
            date: dueDate.toISOString().split('T')[0]
          };
        })
      ];

      const res = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens: googleTokens, events })
      });
      const data = await res.json();
      if (data.success) {
        alert('Calendário sincronizado com sucesso!');
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Error syncing calendar:', error);
      if (error.message?.includes('invalid_grant')) {
        setGoogleTokens(null);
        localStorage.removeItem('google_calendar_tokens');
        alert('Sua sessão do Google expirou. Por favor, conecte novamente.');
      } else {
        alert('Erro ao sincronizar calendário.');
      }
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  useEffect(() => {
    const testConnection = async () => {
      try {
        const { getDocFromServer, doc } = await import('firebase/firestore');
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error: any) {
        if (error.message?.includes('the client is offline')) {
          console.error("Firestore connection error: client is offline. Check Firebase config.");
          setAuthError("Erro de conexão com o banco de dados. Verifique sua internet.");
        }
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      // Check for impersonation
      const impersonatedId = localStorage.getItem('impersonated_user_id');
      
      if (impersonatedId && u) {
        // We are in impersonation mode. 
        // In a real app, we'd verify the admin status of 'u' before allowing this.
        // For this prototype, we'll fetch the impersonated user's profile.
        const impersonatedDoc = await getDoc(doc(db, 'users', impersonatedId));
        if (impersonatedDoc.exists()) {
          const data = impersonatedDoc.data() as UserProfile;
          setUserProfile({ id: impersonatedId, ...data });
          // We don't change 'user' (auth.currentUser) but we'll use impersonatedId for queries
        }
      }

      setUser(u);
      if (u) {
        // Ensure users document exists
        try {
          const userDocRef = doc(db, 'users', u.uid);
          const userDoc = await getDoc(userDocRef);
          const isAdminEmail = u.email === "jonathastdsantos@gmail.com";
          
          if (!userDoc.exists()) {
            const userData = {
              name: u.displayName || 'Usuário',
              displayName: u.displayName || 'Usuário',
              email: u.email || '',
              photoURL: u.photoURL || '',
              role: isAdminEmail ? 'admin' : 'user',
              status: 'active',
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
              blockedFeatures: []
            };
            await setDoc(userDocRef, userData);
          } else {
            const updateData: any = {
              lastLogin: new Date().toISOString(),
              displayName: u.displayName || userDoc.data().displayName || 'Usuário',
              photoURL: u.photoURL || userDoc.data().photoURL || ''
            };
            // Auto-upgrade to admin if email matches
            if (isAdminEmail && userDoc.data().role !== 'admin') {
              updateData.role = 'admin';
            }
            await updateDoc(userDocRef, updateData);
          }
        } catch (err) {
          console.error("Error ensuring user document:", err);
          handleFirestoreError(err, OperationType.WRITE, `users/${u.uid}`);
        }
      } else {
        setOnboardingData(null);
        setIsLoadingOnboarding(false);
        setTransactions([]);
        setServiceCosts([]);
        setFixedCosts([]);
        setMeiObligations([]);
        setGoals([]);
        setWeddingGoal(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setIsLoadingOnboarding(false);
      return;
    }

    const unsubOnboarding = onSnapshot(doc(db, 'onboarding', user.uid), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as OnboardingData;
        setOnboardingData(data);
        setGoal(data.revenueGoal);
        
        // Show guide if just finished onboarding
        if (data.onboardingCompleted && !localStorage.getItem(`guide_shown_${user.uid}`)) {
          setIsShowingOnboardingGuide(true);
          localStorage.setItem(`guide_shown_${user.uid}`, 'true');
        }
      }
      setIsLoadingOnboarding(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `onboarding/${user.uid}`);
    });

    return () => unsubOnboarding();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      return;
    }
    const unsub = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        setUserProfile({ id: doc.id, ...doc.data() } as UserProfile);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'transactions'), where('userId', '==', user.uid));
    const unsubTrans = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });

    const qService = query(collection(db, 'serviceCosts'), where('userId', '==', user.uid));
    const unsubService = onSnapshot(qService, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceCost));
      setServiceCosts(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'serviceCosts');
    });

    const unsubWedding = onSnapshot(doc(db, 'weddingGoals', user.uid), (doc) => {
      if (doc.exists()) {
        setWeddingGoal(doc.data() as WeddingGoal);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `weddingGoals/${user.uid}`);
    });

    const qFixed = query(collection(db, 'fixedCosts'), where('userId', '==', user.uid));
    const unsubFixed = onSnapshot(qFixed, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FixedCost));
      setFixedCosts(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'fixedCosts');
    });

    const qMei = query(collection(db, 'meiObligations'), where('userId', '==', user.uid));
    const unsubMei = onSnapshot(qMei, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MeiObligation));
      setMeiObligations(data.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'meiObligations');
    });

    const qGoals = query(collection(db, 'goals'), where('userId', '==', user.uid));
    const unsubGoals = onSnapshot(qGoals, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Goal));
      setGoals(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'goals');
    });

    const qBank = query(collection(db, 'bank_accounts'), where('userId', '==', user.uid));
    const unsubBank = onSnapshot(qBank, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BankAccount));
      setBankAccounts(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bank_accounts');
    });

    const unsubConfig = onSnapshot(doc(db, 'app_config', 'global'), (doc) => {
      if (doc.exists()) {
        setAppConfig({ id: 'global', ...doc.data() } as AppConfig);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'app_config/global');
    });

    return () => {
      unsubTrans();
      unsubService();
      unsubWedding();
      unsubFixed();
      unsubMei();
      unsubGoals();
      unsubBank();
      unsubConfig();
    };
  }, [user]);

  useEffect(() => {
    if (!user || transactions.length === 0) return;
    const fetchAI = async () => {
      setIsLoadingAI(true);
      const insights = await getAIInsights(transactions, goal, totalIncome, onboardingData?.companyName);
      setAiInsights(insights);
      setIsLoadingAI(false);
    };
    fetchAI();
  }, [transactions.length, goal]);

  // Stats
  const currentMonthTransactions = transactions.filter(t => {
    const date = parseISO(t.date);
    return date >= startOfMonth(new Date()) && date <= endOfMonth(new Date());
  });

  const totalIncome = currentMonthTransactions
    .filter(t => t.type === 'entrada')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = currentMonthTransactions
    .filter(t => t.type === 'saida')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalBankBalance = bankAccounts.reduce((sum, acc) => sum + acc.balance, 0);

  const progress = Math.min((totalIncome / goal) * 100, 100);

  const monthlyData = transactions.reduce((acc: any[], t) => {
    const date = parseISO(t.date);
    const monthYear = format(date, 'MMM/yy', { locale: ptBR });
    const existing = acc.find(d => d.name === monthYear);
    if (existing) {
      if (t.type === 'entrada') existing.entrada += t.amount;
      else existing.saida += t.amount;
    } else {
      acc.push({
        name: monthYear,
        entrada: t.type === 'entrada' ? t.amount : 0,
        saida: t.type === 'saida' ? t.amount : 0,
        rawDate: date
      });
    }
    return acc;
  }, []).sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime()).slice(-6);

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || t.category === filterCategory;
    const matchesType = filterType === 'all' || t.type === filterType;
    
    const transactionDate = new Date(t.date);
    const matchesStartDate = !startDate || transactionDate >= new Date(startDate);
    const matchesEndDate = !endDate || transactionDate <= new Date(endDate + 'T23:59:59');
    
    return matchesSearch && matchesCategory && matchesType && matchesStartDate && matchesEndDate;
  });

  // Pie Chart Data
  const expenseByCategory = currentMonthTransactions
    .filter(t => t.type === 'saida')
    .reduce((acc: any, t) => {
      const categoryLabel = CATEGORIES.saida.find(c => c.id === t.category)?.label || t.category;
      acc[categoryLabel] = (acc[categoryLabel] || 0) + t.amount;
      return acc;
    }, {});

  const pieData = Object.keys(expenseByCategory).map(cat => ({
    name: cat,
    value: expenseByCategory[cat]
  }));

  const COLORS = ['#8b5cf6', '#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#ec4899'];

  // MEI Alerts
  const today = new Date();
  const dasDueDate = new Date(today.getFullYear(), today.getMonth(), 20);
  const daysToDAS = differenceInDays(dasDueDate, today);

  const handleAddTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const formData = new FormData(e.currentTarget);
    
    const amount = Number(formData.get('amount'));
    const date = formData.get('date') as string;
    
    if (isNaN(amount) || amount <= 0) {
      setAuthError("O valor deve ser um número positivo.");
      return;
    }
    
    if (!date) {
      setAuthError("A data é obrigatória.");
      return;
    }

    try {
      const transactionData = {
        description: formData.get('description'),
        amount: amount,
        type: formData.get('type'),
        category: formData.get('category'),
        payment_method: formData.get('payment_method'),
        notes: formData.get('notes'),
        is_recurring: formData.get('is_recurring') === 'on',
        date: date,
        userId: user.uid
      };

      if (editingTransaction) {
        await updateDoc(doc(db, 'transactions', editingTransaction.id), transactionData);
        setEditingTransaction(null);
      } else {
        await addDoc(collection(db, 'transactions'), transactionData);
        setIsAddingTransaction(false);
      }
      setAuthError(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'transactions');
    }
  };

  const handleAddService = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const formData = new FormData(e.currentTarget);
    await addDoc(collection(db, 'serviceCosts'), {
      name: formData.get('name'),
      materialCost: Number(formData.get('materialCost')),
      energyCost: Number(formData.get('energyCost')),
      timeInMinutes: Number(formData.get('timeInMinutes')),
      hourlyRate: Number(formData.get('hourlyRate')),
      currentPrice: Number(formData.get('currentPrice')),
      userId: user.uid
    });
    setIsAddingService(false);
  };

  const handleAddFixedCost = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const formData = new FormData(e.currentTarget);
    try {
      await addDoc(collection(db, 'fixedCosts'), {
        name: formData.get('name'),
        category: formData.get('category'),
        amount: Number(formData.get('amount')),
        due_day: Number(formData.get('due_day')),
        is_active: true,
        notes: formData.get('notes'),
        userId: user.uid
      });
      setIsAddingFixedCost(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'fixedCosts');
    }
  };

  const deleteFixedCost = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este custo fixo?')) return;
    try {
      await deleteDoc(doc(db, 'fixedCosts', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `fixedCosts/${id}`);
    }
  };

  const toggleFixedCostStatus = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'fixedCosts', id), {
        is_active: !currentStatus
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `fixedCosts/${id}`);
    }
  };

  const handleAddMei = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const formData = new FormData(e.currentTarget);
    try {
      await addDoc(collection(db, 'meiObligations'), {
        name: formData.get('name'),
        type: formData.get('type'),
        amount: Number(formData.get('amount')),
        due_date: formData.get('due_date'),
        status: formData.get('status') || 'pendente',
        reference_month: formData.get('reference_month'),
        notes: formData.get('notes'),
        userId: user.uid
      });
      setIsAddingMei(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'meiObligations');
    }
  };

  const updateMeiStatus = async (id: string, status: 'pendente' | 'pago' | 'atrasado') => {
    try {
      await updateDoc(doc(db, 'meiObligations', id), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `meiObligations/${id}`);
    }
  };

  const deleteMei = async (id: string) => {
    if (!confirm('Excluir esta obrigação?')) return;
    try {
      await deleteDoc(doc(db, 'meiObligations', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `meiObligations/${id}`);
    }
  };

  const handleAddGoal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const formData = new FormData(e.currentTarget);
    try {
      await addDoc(collection(db, 'goals'), {
        name: formData.get('name'),
        target_amount: Number(formData.get('target_amount')),
        current_amount: Number(formData.get('current_amount')) || 0,
        target_date: formData.get('target_date'),
        category: formData.get('category') || 'outro',
        notes: formData.get('notes'),
        userId: user.uid
      });
      setIsAddingGoal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'goals');
    }
  };

  const updateGoalAmount = async (id: string, amount: number) => {
    try {
      await updateDoc(doc(db, 'goals', id), { current_amount: amount });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `goals/${id}`);
    }
  };

  const exportToCSV = () => {
    const headers = ['Data', 'Descrição', 'Tipo', 'Categoria', 'Valor', 'Método', 'Notas'];
    const rows = filteredTransactions.map(t => [
      format(parseISO(t.date), 'dd/MM/yyyy'),
      t.description,
      t.type === 'entrada' ? 'Entrada' : 'Saída',
      t.category,
      t.amount.toString(),
      t.payment_method || '',
      t.notes || ''
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `transacoes_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sendReminders = async () => {
    if (!user?.email) return;
    
    const pendingMei = meiObligations.filter(m => m.status === 'pendente');
    const upcomingFixed = fixedCosts.filter(fc => {
      const today = new Date().getDate();
      return fc.is_active && fc.due_day >= today && fc.due_day <= today + 2;
    });

    if (pendingMei.length === 0 && upcomingFixed.length === 0) {
      alert('Nenhum lembrete necessário para os próximos 2 dias.');
      return;
    }

    setIsLoadingAI(true);
    try {
      const text = `Lembrete ${onboardingData?.companyName || 'Studio Sublime'}:\n\n` +
        (pendingMei.length > 0 ? `MEI Pendentes:\n${pendingMei.map(m => `- ${m.name}: R$ ${m.amount}`).join('\n')}\n\n` : '') +
        (upcomingFixed.length > 0 ? `Custos Fixos Próximos:\n${upcomingFixed.map(fc => `- ${fc.name}: R$ ${fc.amount} (Dia ${fc.due_day})`).join('\n')}` : '');

      await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: user.email,
          subject: `Lembrete de Vencimentos - ${onboardingData?.companyName || 'Studio Sublime'}`,
          text,
          html: `<div style="font-family: sans-serif;">${text.replace(/\n/g, '<br>')}</div>`
        })
      });
      alert('Lembretes enviados com sucesso para seu e-mail!');
    } catch (error) {
      console.error('Error sending reminders:', error);
      alert('Erro ao enviar lembretes.');
    } finally {
      setIsLoadingAI(false);
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'transactions', id));
      setTransactionToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `transactions/${id}`);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const formData = new FormData(e.currentTarget);
    
    const updatedData: any = {
      name: formData.get('name') as string,
      companyName: formData.get('companyName') as string,
      photoURL: profilePhoto || onboardingData?.photoURL || '',
      mainService: formData.get('mainService') as string,
      revenueGoal: Number(formData.get('revenueGoal')),
      userId: user.uid
    };

    try {
      await setDoc(doc(db, 'onboarding', user.uid), updatedData, { merge: true });
      alert('Configurações atualizadas com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `onboarding/${user.uid}`);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const connectBank = async () => {
    if (!user) return;
    
    // In a real app, this would open a widget from Pluggy, Belvo, or Plaid
    // We'll simulate the successful connection of a "Nubank" account
    const mockBanks = [
      { name: 'Nubank', institutionId: 'nubank_br' },
      { name: 'Itaú', institutionId: 'itau_br' },
      { name: 'Bradesco', institutionId: 'bradesco_br' },
      { name: 'Inter', institutionId: 'inter_br' }
    ];
    
    const selectedBank = mockBanks[Math.floor(Math.random() * mockBanks.length)];
    
    const newAccount: Omit<BankAccount, 'id'> = {
      bankName: selectedBank.name,
      accountType: 'checking',
      balance: Math.floor(Math.random() * 15000) + 500,
      currency: 'BRL',
      lastSync: new Date().toISOString(),
      institutionId: selectedBank.institutionId,
      userId: user.uid,
      status: 'active'
    };

    try {
      await addDoc(collection(db, 'bank_accounts'), newAccount);
      alert(`${selectedBank.name} conectado com sucesso!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'bank_accounts');
    }
  };

  const syncBank = async (accountId: string) => {
    // Simulate syncing new transactions
    try {
      const accountRef = doc(db, 'bank_accounts', accountId);
      await updateDoc(accountRef, {
        lastSync: new Date().toISOString(),
        balance: Math.floor(Math.random() * 15000) + 500 // Update balance randomly for demo
      });
      alert('Sincronização concluída!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bank_accounts/${accountId}`);
    }
  };

  const disconnectBank = async (accountId: string) => {
    // In an iframe, window.confirm can be problematic. 
    // For now, we'll proceed directly or you could implement a custom modal.
    // Given the request "não funciona o icone de excluir", removing the confirm might fix it if it was being blocked.
    try {
      await deleteDoc(doc(db, 'bank_accounts', accountId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `bank_accounts/${accountId}`);
    }
  };

  const updatePrimaryColor = async (color: string) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'onboarding', user.uid), { primaryColor: color }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `onboarding/${user.uid}`);
    }
  };

  const deleteGoal = async (id: string) => {
    if (!confirm('Excluir esta meta?')) return;
    try {
      await deleteDoc(doc(db, 'goals', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `goals/${id}`);
    }
  };

  const handleLogOut = () => {
    if (isDemoMode) {
      setIsDemoMode(false);
      setIs2FABypassed(false);
    } else {
      logOut();
    }
  };

  const isFeatureBlocked = (view: string, subArea?: string) => {
    if (!userProfile?.blockedFeatures) return false;
    
    const block = userProfile.blockedFeatures.find((f: any) => 
      typeof f === 'string' ? f === view : f.id === view
    );
    
    if (!block) return false;
    
    const blockObj = typeof block === 'string' ? { id: block } : (block as BlockedFeature);
    
    // Check expiration
    if (blockObj.expiresAt && new Date(blockObj.expiresAt) < new Date()) {
      return false;
    }
    
    // If subArea is provided, check if it's blocked
    if (subArea && blockObj.subAreas && blockObj.subAreas.length > 0) {
      return blockObj.subAreas.includes(subArea);
    }
    
    // If no subArea provided or subAreas list is empty, the whole feature is blocked
    return !subArea || !blockObj.subAreas || blockObj.subAreas.length === 0;
  };

  useEffect(() => {
    if (isFeatureBlocked(activeView)) {
      setActiveView('dashboard');
    }
  }, [userProfile?.blockedFeatures, activeView]);

  const NavItem = ({ view, icon: Icon, label }: { view: View, icon: any, label: string }) => {
    const isBlocked = isFeatureBlocked(view);
    
    return (
      <button 
        disabled={isBlocked}
        onClick={() => {
          if (isBlocked) return;
          setActiveView(view);
          setIsMobileMenuOpen(false);
        }}
        className={`w-full nav-item ${activeView === view ? 'nav-item-active' : ''} ${isBlocked ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
      >
        <Icon size={20} />
        <span className="font-medium flex-1 text-left">{label}</span>
        {isBlocked && <Lock size={14} className="opacity-60" />}
      </button>
    );
  };

  const handleEmailAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError(null);
    setIsLoadingAuth(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;

    try {
      if (authMode === 'register') {
        const userCredential = await registerWithEmail(email, password);
        await updateProfile(userCredential.user, { displayName: name });
        setAuthMode('2fa_start');
      } else {
        await loginWithEmail(email, password);
        setAuthMode('2fa_start');
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      let message = 'Ocorreu um erro ao acessar. Verifique seus dados.';
      
      if (error.code === 'auth/email-already-in-use') {
        message = 'Este e-mail já está em uso. Tente fazer login em vez de criar uma nova conta.';
      } else if (error.code === 'auth/weak-password') {
        message = 'A senha deve ter pelo menos 6 caracteres.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'E-mail inválido.';
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = 'E-mail ou senha incorretos.';
      } else if (error.code === 'auth/operation-not-allowed') {
        const projectId = firebaseConfig.projectId;
        message = `O provedor de login (E-mail ou Google) não está ativado no projeto "${projectId}". 
        
        Para corrigir:
        1. Vá em https://console.firebase.google.com/project/${projectId}/authentication/providers
        2. Ative "E-mail/Senha" e "Google".
        3. Verifique se este domínio está em "Domínios Autorizados".`;
      }
      
      setAuthError(message);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const start2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/verify/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAuthMode('2fa_check');
    } catch (error: any) {
      setAuthError('Erro ao enviar SMS. Verifique o número.');
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const check2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/verify/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, code: verificationCode })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.valid) {
        setAuthMode('login'); // Reset mode to allow dashboard to show
      } else {
        setAuthError('Código inválido.');
      }
    } catch (error: any) {
      setAuthError('Erro na verificação.');
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError(null);
    setIsLoadingAuth(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error("Google Auth error:", error);
      let message = "Erro ao entrar com Google. Tente novamente.";
      
      if (error.code === 'auth/operation-not-allowed') {
        message = 'O login com Google não está ativado no seu Console do Firebase. Por favor, ative o provedor "Google" nas configurações de Autenticação.';
      } else if (error.code === 'auth/popup-closed-by-user') {
        message = 'A janela de login foi fechada antes da conclusão. Por favor, tente novamente e mantenha a janela aberta.';
      } else if (error.code === 'auth/unauthorized-domain') {
        const domain = window.location.hostname;
        message = `Este domínio (${domain}) não está autorizado para login com Google. 
        
        Para corrigir:
        1. Vá no Console do Firebase > Authentication > Settings > Authorized Domains.
        2. Adicione "${domain}" à lista.`;
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        message = 'Já existe uma conta com este e-mail usando um método de login diferente (ex: senha). Tente entrar com seu e-mail e senha.';
      } else {
        message = `Erro na autenticação Google: ${error.message || 'Erro desconhecido'}. Código: ${error.code}`;
      }
      setAuthError(message);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const [resetEmailSent, setResetEmailSent] = useState(false);
  const handleResetPassword = async (email: string) => {
    if (!email) {
      setAuthError('Por favor, informe seu e-mail para recuperar a senha.');
      return;
    }
    setIsLoadingAuth(true);
    try {
      await resetPassword(email);
      setResetEmailSent(true);
      setAuthError(null);
    } catch (error: any) {
      setAuthError('Erro ao enviar e-mail de recuperação. Verifique o endereço informado.');
    } finally {
      setIsLoadingAuth(false);
    }
  };

  if (isLoadingAuth || isLoadingOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="w-12 h-12 border-4 border-sublime border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user && (!onboardingData || !onboardingData.onboardingCompleted) && !isDemoMode) {
    return <OnboardingForm userId={user.uid} onComplete={setOnboardingData} onCancel={handleLogOut} />;
  }

  const isImpersonating = !!localStorage.getItem('impersonated_user_id');

  if (userProfile?.status === 'blocked' || userProfile?.isBlocked) {
    return <BlockedScreen message={userProfile.blockMessage} reason={userProfile.blockReason} />;
  }

  if (appConfig?.maintenanceMode && userProfile?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <div className="glass-card p-12 text-center space-y-6 max-w-md w-full">
          <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl">
            <RefreshCw size={40} className="animate-spin-slow" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold font-display">Manutenção</h1>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Estamos realizando melhorias no sistema para melhor atendê-la. Voltamos em instantes!
            </p>
          </div>
          <div className="pt-4">
            <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">Sublime Finance</p>
          </div>
        </div>
      </div>
    );
  }

  if ((!user && !isDemoMode) || (authMode === '2fa_start' || authMode === '2fa_check') && !is2FABypassed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <div className="glass-card p-8 md:p-12 text-center space-y-6 max-w-md w-full relative">
          <button 
            onClick={() => {
              setIsDemoMode(true);
              setIs2FABypassed(true);
            }}
            className="absolute top-6 right-6 p-2 text-zinc-400 hover:text-zinc-600 transition-colors"
            title="Fechar e entrar no modo demonstração"
          >
            <X size={24} />
          </button>
          <div className="w-16 h-16 bg-sublime rounded-2xl flex items-center justify-center mx-auto shadow-xl">
            <DollarSign className="text-white" size={32} />
          </div>
          
          {(authMode === 'login' || authMode === 'register') && (
            <>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold font-display">Sublime Finance</h1>
                <p className="text-zinc-500 text-sm">
                  {authMode === 'login' ? 'Bem-vinda de volta ao seu Studio.' : 'Crie sua conta para começar a gerir.'}
                </p>
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
                {authMode === 'register' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Seu Nome</label>
                    <input required name="name" className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-sublime/20 outline-none transition-all" placeholder="Ex: Maria Silva" />
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">E-mail</label>
                  <input required name="email" type="email" className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-sublime/20 outline-none transition-all" placeholder="seu@email.com" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Senha</label>
                  <input required name="password" type="password" className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-sublime/20 outline-none transition-all" placeholder="••••••••" />
                </div>

                {authError && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium space-y-2">
                      <p className="whitespace-pre-line">{authError}</p>
                      {authError.includes('já está em uso') && authMode === 'register' && (
                        <div className="flex flex-col gap-2">
                          <button 
                            type="button"
                            onClick={() => {
                              setAuthMode('login');
                              setAuthError(null);
                            }}
                            className="w-full py-2 bg-white border border-red-200 rounded-lg text-red-700 font-bold hover:bg-red-100 transition-colors"
                          >
                            Ir para Login
                          </button>
                          <button 
                            type="button"
                            onClick={() => {
                              const email = (document.querySelector('input[name="email"]') as HTMLInputElement)?.value;
                              handleResetPassword(email);
                            }}
                            className="w-full py-2 text-[10px] font-bold text-red-500 hover:underline uppercase"
                          >
                            Esqueci minha senha
                          </button>
                        </div>
                      )}
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        setIs2FABypassed(true);
                        setIsDemoMode(true);
                        setAuthMode('login');
                      }}
                      className="w-full py-2 text-[10px] font-bold text-zinc-400 hover:text-sublime transition-colors uppercase tracking-wider border border-dashed border-zinc-200 rounded-lg"
                    >
                      Acessar Modo de Demonstração (Bypass)
                    </button>
                  </div>
                )}

                {resetEmailSent && (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-medium text-center">
                    E-mail de recuperação enviado! Verifique sua caixa de entrada.
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={isLoadingAuth}
                  className="w-full bg-sublime text-white px-6 py-3.5 rounded-xl font-bold hover:bg-sublime-dark transition-all shadow-lg shadow-sublime/20 disabled:opacity-50"
                >
                  {isLoadingAuth ? 'Processando...' : authMode === 'login' ? 'Entrar' : 'Criar Conta'}
                </button>
                {authMode === 'login' && (
                  <button 
                    type="button"
                    onClick={() => {
                      const email = (document.querySelector('input[name="email"]') as HTMLInputElement)?.value;
                      handleResetPassword(email);
                    }}
                    className="w-full text-[10px] font-bold text-zinc-400 hover:text-sublime transition-colors uppercase tracking-wider text-center"
                  >
                    Esqueci minha senha
                  </button>
                )}
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-100"></div></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-zinc-400 font-bold">Ou continue com</span></div>
              </div>

              <button 
                onClick={handleGoogleLogin}
                disabled={isLoadingAuth}
                className="w-full flex items-center justify-center gap-3 border border-zinc-200 text-zinc-600 px-6 py-3.5 rounded-xl font-bold hover:bg-zinc-50 transition-all disabled:opacity-50"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                Google
              </button>

              <p className="text-sm text-zinc-500">
                {authMode === 'login' ? 'Não tem uma conta?' : 'Já possui uma conta?'}
                <button 
                  onClick={() => {
                    setAuthMode(authMode === 'login' ? 'register' : 'login');
                    setAuthError(null);
                  }}
                  className="ml-1 text-sublime font-bold hover:underline"
                >
                  {authMode === 'login' ? 'Cadastre-se' : 'Faça Login'}
                </button>
              </p>
            </>
          )}

          {authMode === '2fa_start' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-xl font-bold">Verificação em Duas Etapas</h2>
                <p className="text-sm text-zinc-500">Para sua segurança, informe seu celular para receber um código via SMS.</p>
              </div>
              <form onSubmit={start2FA} className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Celular (com DDD)</label>
                  <input 
                    required 
                    type="tel" 
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-sublime/20 outline-none transition-all" 
                    placeholder="+55 11 99999-9999" 
                  />
                </div>
                {authError && <p className="text-xs text-red-500 text-center whitespace-pre-line">{authError}</p>}
                <button 
                  type="submit"
                  disabled={isLoadingAuth}
                  className="w-full bg-sublime text-white px-6 py-3.5 rounded-xl font-bold hover:bg-sublime-dark transition-all shadow-lg shadow-sublime/20 disabled:opacity-50"
                >
                  {isLoadingAuth ? 'Enviando...' : 'Enviar Código'}
                </button>
                <button 
                  type="button"
                  onClick={() => setIs2FABypassed(true)}
                  className="w-full py-3.5 rounded-xl border-2 border-dashed border-orange-200 text-orange-600 font-bold hover:bg-orange-50 transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles size={18} />
                  Pular Verificação (Modo de Teste)
                </button>
                <p className="text-[10px] text-zinc-400 text-center italic">
                  Dica: Se o SMS não chegar, é porque o serviço Twilio não foi configurado no ambiente. Use o botão acima para entrar.
                </p>
              </form>
            </div>
          )}

          {authMode === '2fa_check' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-xl font-bold">Digite o Código</h2>
                <p className="text-sm text-zinc-500">Enviamos um SMS para {phoneNumber}.</p>
              </div>
              <form onSubmit={check2FA} className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Código de 6 dígitos</label>
                  <input 
                    required 
                    type="text" 
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-sublime/20 outline-none transition-all text-center tracking-[1em] font-bold text-lg" 
                    placeholder="000000" 
                  />
                </div>
                {authError && <p className="text-xs text-red-500 text-center whitespace-pre-line">{authError}</p>}
                <button 
                  type="submit"
                  disabled={isLoadingAuth}
                  className="w-full bg-sublime text-white px-6 py-3.5 rounded-xl font-bold hover:bg-sublime-dark transition-all shadow-lg shadow-sublime/20 disabled:opacity-50"
                >
                  {isLoadingAuth ? 'Verificando...' : 'Confirmar'}
                </button>
                <button 
                  type="button"
                  onClick={() => setAuthMode('2fa_start')}
                  className="w-full text-xs text-zinc-400 font-bold"
                >
                  Reenviar código
                </button>
                <button 
                  type="button"
                  onClick={() => setIs2FABypassed(true)}
                  className="w-full text-xs text-zinc-300 font-bold mt-4 hover:underline"
                >
                  Pular Verificação
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  const monthsRemaining = onboardingData?.weddingDate ? (() => {
    const today = new Date();
    const target = new Date(onboardingData.weddingDate);
    const diff = (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth());
    return diff > 0 ? diff : 0;
  })() : 0;

  const monthlyAporte = onboardingData?.weddingGoalAmount && monthsRemaining > 0 
    ? onboardingData.weddingGoalAmount / monthsRemaining 
    : 0;

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-zinc-100 p-6 space-y-8 sticky top-0 h-screen overflow-y-auto">
        <div className="flex items-center gap-3 px-2">
          {onboardingData?.photoURL ? (
            <img src={onboardingData.photoURL} alt="Logo" className="w-10 h-10 rounded-xl object-cover shadow-lg shadow-sublime/20" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-10 h-10 bg-sublime rounded-xl flex items-center justify-center shadow-lg shadow-sublime/20">
              <DollarSign className="text-white" size={20} />
            </div>
          )}
          <h2 className="text-xl font-bold font-display text-sublime truncate">
            {onboardingData?.companyName || 'Sublime'}
          </h2>
        </div>

        <nav className="flex-1 space-y-2">
          <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem view="transactions" icon={Repeat} label="Transações" />
          <NavItem view="fixed_costs" icon={DollarSign} label="Custos Fixos" />
          <NavItem view="mei" icon={FileText} label="MEI" />
          <NavItem view="goals" icon={Heart} label="Metas & Sonhos" />
          <NavItem view="investments" icon={TrendingUp} label="Investimentos" />
          <NavItem view="ai" icon={Sparkles} label="IA Financeira" />
          <NavItem view="settings" icon={Settings} label="Perfil & Ajustes" />
          {userProfile?.role === 'admin' && (
            <NavItem view="admin" icon={Shield} label="Painel Admin" />
          )}
        </nav>

        <div className="p-4 rounded-2xl bg-sublime/5 border border-sublime/10 space-y-3">
          <div className="flex items-center gap-2 text-sublime">
            <Sparkles size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">IA Financeira</span>
          </div>
          <p className="text-[10px] text-zinc-500 leading-relaxed">
            {onboardingData 
              ? (onboardingData.weddingGoalAmount 
                  ? `${onboardingData.name}, se você aumentar as vendas de '${onboardingData.mainService}' em 10%, conseguiremos antecipar a meta do casamento em 3 meses!`
                  : `${onboardingData.name}, se você aumentar as vendas de '${onboardingData.mainService}' em 10%, sua meta de faturamento será atingida mais rápido!`)
              : 'Peça sugestões e análises inteligentes para o seu Studio.'}
          </p>
        </div>

        <button 
          onClick={() => {
            if (isImpersonating) {
              localStorage.removeItem('impersonated_user_id');
              window.location.reload();
            } else {
              handleLogOut();
            }
          }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-all"
        >
          <LogOut size={20} />
          <span className="font-medium">{isImpersonating ? 'Parar Impersonação' : 'Sair'}</span>
        </button>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-zinc-100 p-4 sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onboardingData?.photoURL ? (
            <img src={onboardingData.photoURL} alt="Logo" className="w-8 h-8 rounded-lg object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-8 h-8 bg-sublime rounded-lg flex items-center justify-center">
              <DollarSign className="text-white" size={16} />
            </div>
          )}
          <h2 className="font-bold font-display text-sublime truncate max-w-[150px]">
            {onboardingData?.companyName || 'Sublime'}
          </h2>
        </div>
        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-zinc-500">
          <Menu size={24} />
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-zinc-900/60 backdrop-blur-sm md:hidden"
          >
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="absolute right-0 top-0 bottom-0 w-80 bg-white p-6 flex flex-col space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-xl">Menu</h2>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2">
                  <X size={24} />
                </button>
              </div>
              <nav className="flex-1 space-y-2">
                <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" />
                <NavItem view="transactions" icon={Repeat} label="Transações" />
                <NavItem view="fixed_costs" icon={DollarSign} label="Custos Fixos" />
                <NavItem view="mei" icon={FileText} label="MEI" />
                <NavItem view="goals" icon={Heart} label="Metas & Sonhos" />
                <NavItem view="investments" icon={TrendingUp} label="Investimentos" />
                <NavItem view="ai" icon={Sparkles} label="IA Financeira" />
                <NavItem view="settings" icon={Settings} label="Perfil & Ajustes" />
                {userProfile?.role === 'admin' && (
                  <NavItem view="admin" icon={Shield} label="Painel Admin" />
                )}
              </nav>
              <button onClick={handleLogOut} className="flex items-center gap-3 p-4 text-red-500 font-bold">
                <LogOut size={20} />
                Sair
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 space-y-8 overflow-y-auto max-w-5xl mx-auto w-full">
        {appConfig?.topBanner?.active && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className={`p-3 rounded-xl flex items-center justify-center gap-3 text-xs font-bold ${
              appConfig.topBanner.type === 'error' ? 'bg-red-500 text-white' :
              appConfig.topBanner.type === 'warning' ? 'bg-orange-500 text-white' :
              'bg-sublime text-white'
            }`}
          >
            <Info size={16} />
            {appConfig.topBanner.text}
          </motion.div>
        )}

        {isImpersonating && (
          <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl flex items-center justify-between text-orange-700">
            <div className="flex items-center gap-2 text-xs font-bold">
              <Eye size={16} />
              Você está visualizando como: {userProfile?.name}
            </div>
            <button 
              onClick={() => {
                localStorage.removeItem('impersonated_user_id');
                window.location.reload();
              }}
              className="text-[10px] font-bold uppercase hover:underline"
            >
              Sair
            </button>
          </div>
        )}

        {/* Top Profile Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isDemoMode ? (
              <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center shadow-sm">
                <Sparkles size={20} />
              </div>
            ) : (
              <img src={user?.photoURL || ''} className="w-10 h-10 rounded-xl border-2 border-white shadow-sm" alt="User" />
            )}
            <div>
              <p className="text-xs text-zinc-400 font-medium">
                {isDemoMode ? 'Modo de Demonstração' : 'Bem-vinda de volta,'}
              </p>
              <h1 className="text-lg font-bold text-zinc-900">
                {isDemoMode ? 'Usuária Demo' : user?.displayName?.split(' ')[0]}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsImportingStatement(true)}
              className="bg-zinc-100 text-zinc-600 p-2.5 rounded-xl hover:bg-zinc-200 transition-all md:px-4 md:flex md:items-center md:gap-2"
              title="Importar Extrato"
            >
              <FileText size={20} />
              <span className="hidden md:inline font-bold">Importar</span>
            </button>
            <button 
              onClick={() => setIsAddingTransaction(true)}
              className="bg-sublime text-white p-2.5 rounded-xl shadow-lg shadow-sublime/20 md:px-4 md:flex md:items-center md:gap-2"
            >
              <Plus size={20} />
              <span className="hidden md:inline font-bold">Novo</span>
            </button>
          </div>
        </div>

        {activeView === 'dashboard' && (
          <div className="space-y-8">
            {/* Alerts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  <p className="text-xs font-bold uppercase tracking-wider opacity-60">Obrigação MEI</p>
                  <p className="text-lg font-bold">
                    {daysToDAS < 0 ? 'DAS Vencido!' : daysToDAS === 0 ? 'Vence Hoje!' : `Vence em ${daysToDAS} dias`}
                  </p>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-4 rounded-2xl flex items-center gap-4 border bg-orange-50 border-orange-100 text-orange-700"
              >
                <div className="p-3 rounded-xl bg-orange-100">
                  <DollarSign size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider opacity-60">Próximos Custos</p>
                  <p className="text-lg font-bold">
                    {fixedCosts.filter(fc => fc.due_day >= new Date().getDate()).length} pendentes
                  </p>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="p-4 rounded-2xl flex items-center gap-4 border bg-blue-50 border-blue-100 text-blue-700"
              >
                <div className="p-3 rounded-xl bg-blue-100">
                  <Building2 size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider opacity-60">Saldo Bancário</p>
                  <p className="text-lg font-bold">
                    R$ {totalBankBalance.toLocaleString()}
                  </p>
                </div>
              </motion.div>

              {onboardingData?.weddingGoalAmount && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="p-4 rounded-2xl flex items-center gap-4 border bg-pink-50 border-pink-100 text-pink-700"
                >
                  <div className="p-3 rounded-xl bg-pink-100">
                    <Heart size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider opacity-60">O Sonho: Casamento</p>
                    <p className="text-lg font-bold">
                      {monthsRemaining} meses • R$ {monthlyAporte.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
                    </p>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Main Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 glass-card p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="text-zinc-400" />
                    <h3 className="font-bold text-lg">Meta de Faturamento</h3>
                  </div>
                  <span className="text-sm font-bold text-zinc-500">R$ {goal.toLocaleString()}</span>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className="h-full bg-sublime"
                    />
                  </div>
                  <div className="flex justify-between text-xs font-bold text-zinc-400">
                    <span>{progress.toFixed(1)}% atingido</span>
                    <span>Faltam R$ {(goal - totalIncome).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="glass-card p-6 bg-sublime text-white relative overflow-hidden">
                <Sparkles className="absolute -top-6 -right-6 text-white/5 w-32 h-32" />
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-white/80" />
                    <h3 className="font-bold">IA Insight</h3>
                  </div>
                  <div className="space-y-2">
                    {isLoadingAI ? (
                      <div className="space-y-2 animate-pulse">
                        <div className="h-3 bg-white/10 rounded w-full" />
                        <div className="h-3 bg-white/10 rounded w-3/4" />
                      </div>
                    ) : (
                      <>
                        {onboardingData && (
                          <p className="text-xs text-white/90 leading-relaxed">
                            {onboardingData?.weddingGoalAmount 
                          ? `• ${onboardingData.name}, aumentar as vendas de '${onboardingData.mainService}' em 10% antecipa o casamento em 3 meses!`
                          : `• ${onboardingData.name}, aumentar as vendas de '${onboardingData.mainService}' em 10% acelerará o crescimento do seu Studio!`}
                          </p>
                        )}
                        {aiInsights.slice(0, 1).map((ins, i) => (
                          <p key={i} className="text-xs text-white/90 leading-relaxed">• {ins}</p>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass-card p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingUp size={20} className="text-zinc-400" />
                  <h3 className="font-bold">Fluxo de Caixa (6 meses)</h3>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        cursor={{ fill: '#f4f4f5' }}
                      />
                      <Bar dataKey="entrada" fill="#10b981" radius={[4, 4, 0, 0]} name="Entradas" />
                      <Bar dataKey="saida" fill="#ef4444" radius={[4, 4, 0, 0]} name="Saídas" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-card p-6">
                <div className="flex items-center gap-2 mb-6">
                  <PieChartIcon size={20} className="text-zinc-400" />
                  <h3 className="font-bold">Gastos por Categoria</h3>
                </div>

                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-card p-6 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Calculator size={20} className="text-zinc-400" />
                    <h3 className="font-bold">Lucratividade por Serviço</h3>
                  </div>
                  <button onClick={() => setIsAddingService(true)} className="p-2 bg-zinc-100 rounded-lg hover:bg-zinc-200">
                    <Plus size={16} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-4 max-h-64">
                  {serviceCosts.map(s => {
                    const laborCost = (s.timeInMinutes / 60) * s.hourlyRate;
                    const totalCost = s.materialCost + s.energyCost + laborCost;
                    const profit = s.currentPrice - totalCost;
                    const isProfitable = profit > 0;

                    return (
                      <div key={s.id} className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100 space-y-2">
                        <div className="flex justify-between items-center">
                          <h4 className="font-bold text-sm">{s.name}</h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isProfitable ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {isProfitable ? 'Lucrativo' : 'Prejuízo'}
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px] text-zinc-500">
                          <span>Custo: R$ {totalCost.toFixed(2)}</span>
                          <span className="font-bold text-zinc-900">Preço: R$ {s.currentPrice.toFixed(2)}</span>
                        </div>
                        <div className="h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${isProfitable ? 'bg-emerald-500' : 'bg-red-500'}`} 
                            style={{ width: `${Math.min((s.currentPrice / totalCost) * 50, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Transactions List - Mobile Friendly */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg">Últimas Transações</h3>
                <button onClick={() => setActiveView('transactions')} className="text-sublime text-sm font-bold flex items-center gap-1">
                  Ver tudo <ChevronRight size={16} />
                </button>
              </div>
              <div className="space-y-3">
                {transactions.slice(0, 5).map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${t.type === 'entrada' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                        {t.type === 'entrada' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-zinc-900">{t.description}</p>
                        <p className="text-[10px] text-zinc-500">
                          {CATEGORIES[t.type as 'entrada' | 'saida'].find(c => c.id === t.category)?.label || t.category} • {format(parseISO(t.date), 'dd/MM')}
                          {t.payment_method && ` • ${PAYMENT_METHODS.find(pm => pm.id === t.payment_method)?.label}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className={`font-bold text-sm ${t.type === 'entrada' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {t.type === 'entrada' ? '+' : '-'} R$ {t.amount.toLocaleString()}
                        </p>
                        {t.is_recurring && <span className="text-[8px] font-bold uppercase text-zinc-400">Recorrente</span>}
                      </div>
                      <button 
                        onClick={() => {
                          if (isFeatureBlocked('transactions', 'edit')) return;
                          setEditingTransaction(t);
                          setFormType(t.type as 'entrada' | 'saida');
                        }}
                        className={`p-2 transition-colors ${isFeatureBlocked('transactions', 'edit') ? 'opacity-30 cursor-not-allowed' : 'text-zinc-400 hover:text-sublime'}`}
                        title={isFeatureBlocked('transactions', 'edit') ? "Acesso bloqueado" : "Editar"}
                      >
                        <Settings size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Other views would be implemented here */}
        {activeView === 'fixed_costs' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-zinc-900 font-display">Custos Fixos</h2>
                <p className="text-sm text-zinc-500">Gerencie as despesas recorrentes do seu Studio.</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={sendReminders}
                  disabled={isLoadingAI}
                  className="bg-zinc-100 text-zinc-900 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-zinc-200 transition-all disabled:opacity-50"
                >
                  <Bell size={18} />
                  <span>Lembretes</span>
                </button>
                {!isFeatureBlocked('fixed_costs', 'add') && (
                  <button 
                    onClick={() => setIsAddingFixedCost(true)}
                    className="bg-sublime text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-sublime/20"
                  >
                    <Plus size={20} />
                    <span>Adicionar</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-card p-6 bg-emerald-50 border-emerald-100">
                <p className="text-xs font-bold uppercase text-emerald-600 mb-1">Total Ativo</p>
                <p className="text-2xl font-bold text-emerald-700">
                  R$ {fixedCosts.filter(c => c.is_active).reduce((sum, c) => sum + c.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="glass-card p-6 bg-zinc-50 border-zinc-100">
                <p className="text-xs font-bold uppercase text-zinc-400 mb-1">Total Inativo</p>
                <p className="text-2xl font-bold text-zinc-500">
                  R$ {fixedCosts.filter(c => !c.is_active).reduce((sum, c) => sum + c.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="glass-card p-6 bg-sublime/5 border-sublime/10">
                <p className="text-xs font-bold uppercase text-sublime mb-1">Próximo Vencimento</p>
                <p className="text-2xl font-bold text-sublime">
                  {(() => {
                    const today = new Date().getDate();
                    const next = fixedCosts
                      .filter(c => c.is_active)
                      .sort((a, b) => {
                        const da = a.due_day >= today ? a.due_day : a.due_day + 31;
                        const db = b.due_day >= today ? b.due_day : b.due_day + 31;
                        return da - db;
                      })[0];
                    return next ? `Dia ${next.due_day}` : '--';
                  })()}
                </p>
              </div>
            </div>

            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-100">
                      <th className="p-4 text-[10px] font-bold uppercase text-zinc-400">Status</th>
                      <th className="p-4 text-[10px] font-bold uppercase text-zinc-400">Nome</th>
                      <th className="p-4 text-[10px] font-bold uppercase text-zinc-400">Categoria</th>
                      <th className="p-4 text-[10px] font-bold uppercase text-zinc-400">Vencimento</th>
                      <th className="p-4 text-[10px] font-bold uppercase text-zinc-400 text-right">Valor</th>
                      <th className="p-4 text-[10px] font-bold uppercase text-zinc-400 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {fixedCosts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-10 text-center text-zinc-400">Nenhum custo fixo cadastrado.</td>
                      </tr>
                    ) : (
                      fixedCosts.map(cost => (
                        <tr key={cost.id} className={`hover:bg-zinc-50 transition-all ${!cost.is_active ? 'opacity-50' : ''}`}>
                          <td className="p-4">
                            <button 
                              onClick={() => toggleFixedCostStatus(cost.id, cost.is_active)}
                              className={`w-10 h-6 rounded-full relative transition-all ${cost.is_active ? 'bg-emerald-500' : 'bg-zinc-300'}`}
                            >
                              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${cost.is_active ? 'right-1' : 'left-1'}`} />
                            </button>
                          </td>
                          <td className="p-4">
                            <p className="font-bold text-zinc-900">{cost.name}</p>
                            {cost.notes && <p className="text-[10px] text-zinc-400">{cost.notes}</p>}
                          </td>
                          <td className="p-4">
                            <span className="text-xs font-medium px-2 py-1 rounded-lg bg-zinc-100 text-zinc-600">
                              {FIXED_COST_CATEGORIES.find(c => c.id === cost.category)?.label || cost.category}
                            </span>
                          </td>
                          <td className="p-4 text-sm font-medium text-zinc-600">Dia {cost.due_day}</td>
                          <td className="p-4 text-sm font-bold text-zinc-900 text-right">R$ {cost.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => {
                                  if (isFeatureBlocked('fixed_costs', 'edit')) return;
                                  deleteFixedCost(cost.id);
                                }}
                                className={`p-2 transition-all ${isFeatureBlocked('fixed_costs', 'edit') ? 'opacity-30 cursor-not-allowed' : 'text-zinc-400 hover:text-red-500'}`}
                                title={isFeatureBlocked('fixed_costs', 'edit') ? "Acesso bloqueado" : "Excluir"}
                              >
                                <X size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeView === 'mei' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-zinc-900 font-display">Controle MEI</h2>
                <p className="text-sm text-zinc-500">Gestão completa do seu Microempreendedor Individual.</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={sendReminders}
                  disabled={isLoadingAI}
                  className="bg-zinc-100 text-zinc-900 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-zinc-200 transition-all disabled:opacity-50"
                >
                  <Bell size={18} />
                  <span>Lembretes</span>
                </button>
                {!isFeatureBlocked('mei', 'das') && (
                  <button 
                    onClick={() => setIsAddingMei(true)}
                    className="bg-sublime text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-sublime/20"
                  >
                    <Plus size={20} />
                    <span>Nova Guia</span>
                  </button>
                )}
              </div>
            </div>

            {/* MEI Profile Card */}
            <div className="glass-card p-6 grid grid-cols-1 md:grid-cols-3 gap-6 bg-gradient-to-br from-zinc-900 to-zinc-800 text-white border-none shadow-xl">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase text-zinc-400">CNPJ</p>
                <p className="text-lg font-bold tracking-wider">{onboardingData?.cnpj || 'Não informado'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase text-zinc-400">Atividade Principal</p>
                <p className="text-lg font-bold">{onboardingData?.meiActivity || 'Prestação de Serviços'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase text-zinc-400">Limite de Faturamento Anual</p>
                <div className="flex items-end gap-2">
                  <p className="text-lg font-bold">R$ 81.000,00</p>
                  <span className="text-[10px] text-zinc-400 mb-1">/ R$ 6.750,00 mês</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-card p-6 border-l-4 border-l-amber-500">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                    <AlertTriangle size={20} />
                  </div>
                  <h3 className="font-bold">Pendentes</h3>
                </div>
                <div className="space-y-3">
                  {meiObligations.filter(m => m.status !== 'pago').map(m => (
                    <div key={m.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                      <div>
                        <p className="font-bold text-sm">{m.name}</p>
                        <p className="text-[10px] text-zinc-400">Vence em {format(parseISO(m.due_date), 'dd/MM/yyyy')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm">R$ {m.amount.toLocaleString()}</p>
                        {!isFeatureBlocked('mei', 'obligations') && (
                          <button 
                            onClick={() => updateMeiStatus(m.id, 'pago')}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                          >
                            <CheckCircle2 size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {meiObligations.filter(m => m.status !== 'pago').length === 0 && (
                    <p className="text-center py-4 text-zinc-400 text-sm italic">Tudo em dia! Nenhuma pendência encontrada.</p>
                  )}
                </div>
              </div>

              <div className="glass-card p-6 border-l-4 border-l-emerald-500">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                    <CheckCircle2 size={20} />
                  </div>
                  <h3 className="font-bold">Pagos Recentemente</h3>
                </div>
                <div className="space-y-3">
                  {meiObligations.filter(m => m.status === 'pago').slice(0, 5).map(m => (
                    <div key={m.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100 opacity-75">
                      <div>
                        <p className="font-bold text-sm">{m.name}</p>
                        <p className="text-[10px] text-zinc-400">Pago em {format(parseISO(m.due_date), 'dd/MM/yyyy')}</p>
                      </div>
                      <p className="font-bold text-sm text-emerald-600">R$ {m.amount.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="font-bold mb-4">Histórico Completo</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-bold uppercase text-zinc-400 border-b border-zinc-100">
                      <th className="pb-4">Obrigação</th>
                      <th className="pb-4">Vencimento</th>
                      <th className="pb-4">Valor</th>
                      <th className="pb-4">Status</th>
                      <th className="pb-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {meiObligations.map(m => (
                      <tr key={m.id} className="hover:bg-zinc-50/50">
                        <td className="py-4">
                          <p className="font-bold text-sm">{m.name}</p>
                          <p className="text-[10px] text-zinc-400">{m.type.replace('_', ' ').toUpperCase()}</p>
                        </td>
                        <td className="py-4 text-sm">{format(parseISO(m.due_date), 'dd/MM/yyyy')}</td>
                        <td className="py-4 text-sm font-bold">R$ {m.amount.toLocaleString()}</td>
                        <td className="py-4">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                            m.status === 'pago' ? 'bg-emerald-100 text-emerald-600' : 
                            m.status === 'atrasado' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                          }`}>
                            {m.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <button onClick={() => deleteMei(m.id)} className="text-zinc-300 hover:text-red-500">
                            <X size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeView === 'goals' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-zinc-900 font-display">Metas & Sonhos</h2>
                <p className="text-sm text-zinc-500">Planeje o futuro do seu Studio e seus sonhos pessoais.</p>
              </div>
              <button 
                onClick={() => setIsAddingGoal(true)}
                className="bg-sublime text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-sublime/20"
              >
                <Plus size={20} />
                <span>Nova Meta</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {goals.map(g => {
                const progress = Math.min((g.current_amount / g.target_amount) * 100, 100);
                return (
                  <div key={g.id} className="glass-card p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!isFeatureBlocked('goals', 'edit') && (
                        <button onClick={() => deleteGoal(g.id)} className="text-zinc-300 hover:text-red-500">
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-sublime/10 text-sublime rounded-2xl">
                        {g.category === 'casamento' ? <Heart size={24} /> : 
                         g.category === 'reserva_emergencia' ? <Target size={24} /> :
                         g.category === 'equipamento' ? <Calculator size={24} /> : <Sparkles size={24} />}
                      </div>
                      <div>
                        <h3 className="font-bold text-zinc-900">{g.name}</h3>
                        <p className="text-[10px] font-bold uppercase text-zinc-400">{g.category.replace('_', ' ')}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[10px] font-bold uppercase text-zinc-400">Acumulado</p>
                          <p className="text-xl font-bold text-sublime">R$ {g.current_amount.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold uppercase text-zinc-400">Objetivo</p>
                          <p className="font-bold text-zinc-900">R$ {g.target_amount.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="h-3 bg-zinc-100 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="h-full bg-sublime rounded-full"
                          />
                        </div>
                        <div className="flex justify-between text-[10px] font-bold text-zinc-400">
                          <span>{progress.toFixed(1)}%</span>
                          {g.target_date && <span>Alvo: {format(parseISO(g.target_date), 'MM/yyyy')}</span>}
                        </div>
                      </div>

                      <div className="pt-2">
                        <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Atualizar Valor</label>
                        <div className="flex gap-2">
                          <input 
                            type="number" 
                            disabled={isFeatureBlocked('goals', 'edit')}
                            className={`flex-1 p-2 text-xs rounded-lg border border-zinc-100 bg-zinc-50 ${isFeatureBlocked('goals', 'edit') ? 'opacity-50 cursor-not-allowed' : ''}`}
                            placeholder={isFeatureBlocked('goals', 'edit') ? "Bloqueado" : "Novo valor..."}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateGoalAmount(g.id, Number((e.target as HTMLInputElement).value));
                                (e.target as HTMLInputElement).value = '';
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {goals.length === 0 && (
                <div className="col-span-full py-20 text-center glass-card border-dashed">
                  <div className="mx-auto w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-300 mb-4">
                    <Target size={32} />
                  </div>
                  <h3 className="font-bold text-zinc-900">Nenhuma meta cadastrada</h3>
                  <p className="text-zinc-500 text-sm max-w-xs mx-auto mt-2">Comece a planejar seus sonhos! Clique no botão "Nova Meta" para começar.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === 'transactions' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-2xl font-bold">Transações</h2>
              <div className="flex flex-wrap gap-2">
                {!isFeatureBlocked('transactions', 'export') && (
                  <button 
                    onClick={exportToCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-all"
                  >
                    <Download size={18} />
                    Exportar CSV
                  </button>
                )}
                {!isFeatureBlocked('transactions', 'add') && (
                  <button 
                    onClick={() => setIsAddingTransaction(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-sublime text-white rounded-xl font-bold text-sm hover:bg-sublime/90 transition-all"
                  >
                    <Plus size={18} />
                    Nova Transação
                  </button>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className="glass-card p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Buscar descrição..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-100 bg-zinc-50 text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select 
                  className="w-full px-4 py-2 rounded-xl border border-zinc-100 bg-zinc-50 text-sm"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="all">Todos os Tipos</option>
                  <option value="entrada">Entradas</option>
                  <option value="saida">Saídas</option>
                </select>
                <select 
                  className="w-full px-4 py-2 rounded-xl border border-zinc-100 bg-zinc-50 text-sm"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="all">Todas as Categorias</option>
                  {Array.from(new Map([...CATEGORIES.entrada, ...CATEGORIES.saida].map(c => [c.id, c])).values()).map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
                <div className="flex items-center justify-end text-xs font-bold text-zinc-400">
                  {filteredTransactions.length} registros encontrados
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-zinc-100 pt-4">
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 whitespace-nowrap">Início:</label>
                  <input 
                    type="date" 
                    className="flex-1 px-4 py-2 rounded-xl border border-zinc-100 bg-zinc-50 text-sm"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 whitespace-nowrap">Fim:</label>
                  <input 
                    type="date" 
                    className="flex-1 px-4 py-2 rounded-xl border border-zinc-100 bg-zinc-50 text-sm"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Category Spending Chart */}
            <div className="glass-card p-6">
              <h3 className="font-bold text-zinc-900 mb-6 flex items-center gap-2">
                <BarChartIcon size={18} className="text-sublime" />
                Gastos por Categoria (Mês Atual)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pieData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 10 }} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                      tickFormatter={(value) => `R$ ${value}`}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => [`R$ ${value.toLocaleString()}`, 'Gasto']}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50/50">
                      <th className="p-4 text-[10px] font-bold uppercase text-zinc-400">Data</th>
                      <th className="p-4 text-[10px] font-bold uppercase text-zinc-400">Descrição</th>
                      <th className="p-4 text-[10px] font-bold uppercase text-zinc-400">Categoria</th>
                      <th className="p-4 text-[10px] font-bold uppercase text-zinc-400 text-right">Valor</th>
                      <th className="p-4 text-[10px] font-bold uppercase text-zinc-400">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredTransactions.map((t) => (
                      <tr key={t.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="p-4 text-xs text-zinc-500">{format(parseISO(t.date), 'dd/MM/yyyy')}</td>
                        <td className="p-4">
                          <p className="text-sm font-bold text-zinc-900">{t.description}</p>
                          <p className="text-[10px] text-zinc-400 uppercase">{t.payment_method}</p>
                          {t.notes && (
                            <p className="text-[10px] text-zinc-400 italic mt-1">Obs: {t.notes}</p>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-1 rounded-md bg-zinc-100 text-[10px] font-bold text-zinc-600 uppercase">
                            {t.category}
                          </span>
                        </td>
                        <td className={`p-4 text-sm font-bold text-right ${t.type === 'entrada' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {t.type === 'entrada' ? '+' : '-'} R$ {t.amount.toLocaleString()}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => {
                                if (isFeatureBlocked('transactions', 'edit')) return;
                                setEditingTransaction(t);
                                setFormType(t.type as 'entrada' | 'saida');
                              }}
                              className={`p-2 transition-colors ${isFeatureBlocked('transactions', 'edit') ? 'opacity-30 cursor-not-allowed' : 'text-zinc-400 hover:text-sublime'}`}
                              title={isFeatureBlocked('transactions', 'edit') ? "Acesso bloqueado" : "Editar"}
                            >
                              <Settings size={16} />
                            </button>
                            <button 
                              onClick={() => {
                                if (isFeatureBlocked('transactions', 'edit')) return;
                                setTransactionToDelete(t.id);
                              }}
                              className={`p-2 transition-colors ${isFeatureBlocked('transactions', 'edit') ? 'opacity-30 cursor-not-allowed' : 'text-zinc-400 hover:text-red-600'}`}
                              title={isFeatureBlocked('transactions', 'edit') ? "Acesso bloqueado" : "Excluir"}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredTransactions.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-12 text-center text-zinc-400 italic text-sm">
                          Nenhuma transação encontrada com os filtros selecionados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeView === 'investments' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Investimentos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {!isFeatureBlocked('investments', 'calculator') && (
                <div className="glass-card p-6">
                  <Calculator size={24} className="text-sublime mb-4" />
                  <h3 className="font-bold mb-2">Calculadora de Rentabilidade</h3>
                  <p className="text-sm text-zinc-500">Simule o crescimento do seu capital.</p>
                </div>
              )}
              {!isFeatureBlocked('investments', 'options') && (
                <div className="glass-card p-6">
                  <TrendingUp size={24} className="text-emerald-500 mb-4" />
                  <h3 className="font-bold mb-2">Opções de Investimento</h3>
                  <p className="text-sm text-zinc-500">Conheça as melhores opções para o seu perfil.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === 'ai' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">IA Financeira</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {!isFeatureBlocked('ai', 'chat') && (
                <div className="glass-card p-6">
                  <Sparkles size={24} className="text-sublime mb-4" />
                  <h3 className="font-bold mb-2">Chat com IA</h3>
                  <p className="text-sm text-zinc-500">Tire suas dúvidas financeiras em tempo real.</p>
                </div>
              )}
              {!isFeatureBlocked('ai', 'reports') && (
                <div className="glass-card p-6">
                  <FileText size={24} className="text-zinc-900 mb-4" />
                  <h3 className="font-bold mb-2">Relatórios Inteligentes</h3>
                  <p className="text-sm text-zinc-500">Análises detalhadas geradas automaticamente.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === 'settings' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-zinc-900 font-display">Perfil & Ajustes</h2>
                <p className="text-sm text-zinc-500">Personalize sua experiência no {onboardingData?.companyName || 'Studio Sublime'}.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                <div className="glass-card p-6 space-y-6">
                  <h3 className="font-bold flex items-center gap-2">
                    <User size={18} className="text-sublime" />
                    Informações do Studio
                  </h3>
                  
                  <form onSubmit={handleUpdateSettings} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Nome da Empresa</label>
                        <input 
                          required 
                          name="companyName" 
                          defaultValue={onboardingData?.companyName || 'Studio Sublime'}
                          className="w-full p-3 rounded-xl border border-zinc-200" 
                          placeholder="Ex: Studio Sublime"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Nome do Profissional</label>
                        <input 
                          required 
                          name="name" 
                          defaultValue={onboardingData?.name}
                          className="w-full p-3 rounded-xl border border-zinc-200" 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Serviço Principal</label>
                        <input 
                          required 
                          name="mainService" 
                          defaultValue={onboardingData?.mainService}
                          className="w-full p-3 rounded-xl border border-zinc-200" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Meta de Faturamento Mensal (R$)</label>
                        <input 
                          required 
                          name="revenueGoal" 
                          type="number"
                          defaultValue={onboardingData?.revenueGoal}
                          className="w-full p-3 rounded-xl border border-zinc-200" 
                        />
                      </div>
                    </div>

                    <div className="pt-4">
                      <button 
                        type="submit"
                        className="w-full md:w-auto px-8 py-3 bg-sublime text-white rounded-xl font-bold shadow-lg shadow-sublime/20 hover:bg-sublime/90 transition-all"
                      >
                        Salvar Alterações
                      </button>
                    </div>
                  </form>
                </div>

                <div className="glass-card p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold flex items-center gap-2">
                      <Building2 size={18} className="text-sublime" />
                      Contas Bancárias
                      <button 
                        onClick={() => setIsShowingBankGuide(true)}
                        className="p-1 text-zinc-400 hover:text-sublime transition-colors"
                        title="Guia de Conexão"
                      >
                        <HelpCircle size={14} />
                      </button>
                    </h3>
                    <button 
                      onClick={connectBank}
                      className="text-[10px] font-bold text-sublime bg-sublime/10 px-3 py-1.5 rounded-lg hover:bg-sublime/20 transition-all flex items-center gap-1"
                    >
                      <Link2 size={14} />
                      Conectar Conta
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {bankAccounts.map((account) => (
                      <div key={account.id} className="p-4 rounded-2xl border border-zinc-100 bg-zinc-50 flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white border border-zinc-100 flex items-center justify-center text-sublime shadow-sm">
                            <Building2 size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-zinc-900">{account.bankName}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-zinc-400 uppercase">{account.accountType === 'checking' ? 'Conta Corrente' : 'Poupança'}</span>
                              <span className="w-1 h-1 rounded-full bg-zinc-300" />
                              <span className="text-[10px] text-zinc-400">Sincronizado: {format(parseISO(account.lastSync), 'dd/MM HH:mm')}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-bold text-zinc-900">R$ {account.balance.toLocaleString()}</p>
                            <span className={`text-[10px] font-bold uppercase ${account.status === 'active' ? 'text-emerald-600' : 'text-red-600'}`}>
                              {account.status === 'active' ? 'Ativo' : 'Erro'}
                            </span>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => syncBank(account.id)}
                              className="p-2 text-zinc-400 hover:text-sublime transition-colors"
                              title="Sincronizar"
                            >
                              <RefreshCw size={16} />
                            </button>
                            <button 
                              onClick={() => disconnectBank(account.id)}
                              className="p-2 text-zinc-400 hover:text-red-600 transition-colors"
                              title="Desconectar"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {bankAccounts.length === 0 && (
                      <div className="py-8 text-center border-2 border-dashed border-zinc-100 rounded-2xl">
                        <p className="text-xs text-zinc-400 italic">Nenhuma conta bancária conectada.</p>
                        <button 
                          onClick={connectBank}
                          className="mt-2 text-[10px] font-bold text-sublime hover:underline"
                        >
                          Conectar agora para sincronizar extratos
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex gap-3">
                    <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                    <p className="text-[10px] text-amber-700 leading-relaxed">
                      <strong>Segurança:</strong> O {onboardingData?.companyName || 'Studio Sublime'} utiliza criptografia de ponta a ponta e protocolos de Open Finance para garantir que seus dados bancários estejam sempre protegidos. Nós nunca armazenamos suas senhas bancárias.
                    </p>
                  </div>
                </div>

                <div className="glass-card p-6 space-y-4">
                  <h3 className="font-bold flex items-center gap-2">
                    <Sparkles size={18} className="text-sublime" />
                    Personalização Visual
                  </h3>
                  <p className="text-sm text-zinc-500">Escolha como o {onboardingData?.companyName || 'Studio Sublime'} deve se parecer para você.</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button 
                      onClick={() => updatePrimaryColor('#8b5cf6')}
                      className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${onboardingData?.primaryColor === '#8b5cf6' ? 'border-sublime bg-sublime/5' : 'border-zinc-100 bg-white hover:border-zinc-200'}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-[#8b5cf6] shadow-sm" />
                      <span className="text-[10px] font-bold uppercase">Sublime (Padrão)</span>
                    </button>
                    <button 
                      onClick={() => updatePrimaryColor('#18181b')}
                      className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${onboardingData?.primaryColor === '#18181b' ? 'border-sublime bg-sublime/5' : 'border-zinc-100 bg-white hover:border-zinc-200'}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-[#18181b] shadow-sm" />
                      <span className="text-[10px] font-bold uppercase">Onyx</span>
                    </button>
                    <button 
                      onClick={() => updatePrimaryColor('#fb7185')}
                      className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${onboardingData?.primaryColor === '#fb7185' ? 'border-sublime bg-sublime/5' : 'border-zinc-100 bg-white hover:border-zinc-200'}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-[#fb7185] shadow-sm" />
                      <span className="text-[10px] font-bold uppercase">Rose Gold</span>
                    </button>
                    <button 
                      onClick={() => updatePrimaryColor('#34d399')}
                      className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${onboardingData?.primaryColor === '#34d399' ? 'border-sublime bg-sublime/5' : 'border-zinc-100 bg-white hover:border-zinc-200'}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-[#34d399] shadow-sm" />
                      <span className="text-[10px] font-bold uppercase">Emerald</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="glass-card p-6 text-center space-y-4">
                  <div className="relative group mx-auto w-24 h-24">
                    <div className="w-24 h-24 bg-sublime/10 rounded-full flex items-center justify-center overflow-hidden text-sublime border-4 border-white shadow-xl">
                      {(profilePhoto || onboardingData?.photoURL) ? (
                        <img src={profilePhoto || onboardingData?.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <User size={48} />
                      )}
                    </div>
                    <label className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg border border-zinc-100 cursor-pointer hover:bg-zinc-50 transition-all">
                      <Camera size={16} className="text-sublime" />
                      <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                    </label>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{onboardingData?.name}</h3>
                    <p className="text-xs text-zinc-500">{onboardingData?.companyName || 'Studio Sublime'}</p>
                    <p className="text-[10px] text-zinc-400 mt-1">{user?.email}</p>
                  </div>
                  <div className="pt-4 border-t border-zinc-100">
                    <p className="text-[10px] font-bold uppercase text-zinc-400 mb-2">Status da Conta</p>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase">Premium</span>
                  </div>
                </div>

                <div className="glass-card p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm">Integrações</h3>
                    <Calendar size={18} className="text-sublime" />
                  </div>
                  <p className="text-xs text-zinc-500">Sincronize seus vencimentos com o Google Calendar para nunca mais esquecer um pagamento.</p>
                  
                  {!googleTokens ? (
                    <button 
                      onClick={connectGoogleCalendar}
                      className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-50 transition-all font-bold text-sm"
                    >
                      <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
                      Conectar Google Calendar
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] font-bold text-emerald-700 uppercase">Google Conectado</span>
                        </div>
                        <button 
                          onClick={() => {
                            setGoogleTokens(null);
                            localStorage.removeItem('google_calendar_tokens');
                          }}
                          className="text-[10px] font-bold text-red-600 hover:underline"
                        >
                          Desconectar
                        </button>
                      </div>
                      <button 
                        onClick={syncToGoogleCalendar}
                        disabled={isSyncingCalendar}
                        className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-sublime text-white hover:bg-sublime/90 transition-all font-bold text-sm disabled:opacity-50"
                      >
                        {isSyncingCalendar ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                        Sincronizar Vencimentos Agora
                      </button>
                    </div>
                  )}
                </div>

                <div className="glass-card p-6 space-y-4">
                  <h3 className="font-bold text-sm">Segurança</h3>
                  <button className="w-full flex items-center justify-between p-3 rounded-xl border border-zinc-100 hover:bg-zinc-50 transition-all text-sm">
                    <span>Alterar Senha</span>
                    <ChevronRight size={16} className="text-zinc-400" />
                  </button>
                  <button className="w-full flex items-center justify-between p-3 rounded-xl border border-zinc-100 hover:bg-zinc-50 transition-all text-sm">
                    <span>Autenticação 2FA</span>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase">Ativo</span>
                  </button>
                </div>

                <div className="glass-card p-6 space-y-4 bg-sublime/5 border-sublime/10">
                  <div className="flex items-center gap-3 text-sublime">
                    <Shield size={20} />
                    <h3 className="font-bold text-sm">Desenvolvedor</h3>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-zinc-900">Jonathas Santos</p>
                    <p className="text-[10px] text-zinc-500">Criador e Administrador do Sistema</p>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    Este aplicativo foi desenvolvido para proporcionar uma gestão financeira de elite para Studios de Beleza.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'admin' && <AdminPanel />}

        {activeView !== 'dashboard' && activeView !== 'fixed_costs' && activeView !== 'mei' && activeView !== 'goals' && activeView !== 'transactions' && activeView !== 'settings' && activeView !== 'admin' && (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="p-6 bg-zinc-100 rounded-full text-zinc-400">
              <LayoutDashboard size={48} />
            </div>
            <h2 className="text-2xl font-bold text-zinc-900">Em Breve</h2>
            <p className="text-zinc-500 max-w-xs">Esta funcionalidade está sendo preparada para o {onboardingData?.companyName || 'Studio Sublime'}.</p>
            <button onClick={() => setActiveView('dashboard')} className="text-sublime font-bold">Voltar para Dashboard</button>
          </div>
        )}
      </main>

      {/* Modals */}
      <AnimatePresence>
        {(isAddingTransaction || editingTransaction) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]">
              <h2 className="text-xl font-bold mb-6">{editingTransaction ? 'Editar Transação' : 'Nova Transação'}</h2>
              <form onSubmit={handleAddTransaction} className="space-y-4">
                {authError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle size={14} />
                    {authError}
                  </div>
                )}
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Descrição</label>
                  <input 
                    required 
                    name="description" 
                    defaultValue={editingTransaction?.description}
                    className="w-full p-3 rounded-xl border border-zinc-200" 
                    placeholder="Ex: Compra de materiais" 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Valor</label>
                    <input 
                      required 
                      name="amount" 
                      type="number" 
                      step="0.01" 
                      min="0.01"
                      defaultValue={editingTransaction?.amount}
                      className="w-full p-3 rounded-xl border border-zinc-200" 
                      placeholder="0.00" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Tipo</label>
                    <select 
                      name="type" 
                      defaultValue={editingTransaction?.type || 'entrada'}
                      className="w-full p-3 rounded-xl border border-zinc-200"
                      onChange={(e) => {
                        const type = e.target.value as 'entrada' | 'saida';
                        setFormType(type);
                      }}
                    >
                      <option value="entrada">Entrada</option>
                      <option value="saida">Saída</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Categoria</label>
                    <select 
                      name="category" 
                      defaultValue={editingTransaction?.category}
                      className="w-full p-3 rounded-xl border border-zinc-200"
                    >
                      {CATEGORIES[formType].map(c => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Pagamento</label>
                    <select 
                      name="payment_method" 
                      defaultValue={editingTransaction?.payment_method}
                      className="w-full p-3 rounded-xl border border-zinc-200"
                    >
                      {PAYMENT_METHODS.map(pm => (
                        <option key={pm.id} value={pm.id}>{pm.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Data</label>
                  <input 
                    required 
                    name="date" 
                    type="date" 
                    defaultValue={editingTransaction ? format(parseISO(editingTransaction.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')}
                    className="w-full p-3 rounded-xl border border-zinc-200" 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Observações</label>
                  <textarea 
                    name="notes" 
                    defaultValue={editingTransaction?.notes}
                    className="w-full p-3 rounded-xl border border-zinc-200 h-20" 
                    placeholder="Opcional..." 
                  />
                </div>

                <div className="flex items-center gap-2 py-2">
                  <input 
                    type="checkbox" 
                    name="is_recurring" 
                    id="is_recurring" 
                    defaultChecked={editingTransaction?.is_recurring}
                    className="w-4 h-4 rounded border-zinc-300 text-sublime focus:ring-sublime" 
                  />
                  <label htmlFor="is_recurring" className="text-sm text-zinc-600 font-medium">Transação Recorrente</label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsAddingTransaction(false);
                      setEditingTransaction(null);
                      setAuthError(null);
                    }} 
                    className="flex-1 p-3 rounded-xl border font-bold text-zinc-500 hover:bg-zinc-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="flex-1 p-3 rounded-xl bg-sublime text-white font-bold hover:bg-sublime-dark transition-all shadow-lg shadow-sublime/20">
                    {editingTransaction ? 'Atualizar' : 'Salvar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isAddingFixedCost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
              <h2 className="text-xl font-bold mb-6">Novo Custo Fixo</h2>
              <form onSubmit={handleAddFixedCost} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Nome do Custo</label>
                  <input required name="name" className="w-full p-3 rounded-xl border border-zinc-200" placeholder="Ex: Aluguel do Studio" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Valor Mensal</label>
                    <input required name="amount" type="number" step="0.01" className="w-full p-3 rounded-xl border border-zinc-200" placeholder="0.00" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Dia Vencimento</label>
                    <input required name="due_day" type="number" min="1" max="31" className="w-full p-3 rounded-xl border border-zinc-200" placeholder="1-31" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Categoria</label>
                  <select name="category" className="w-full p-3 rounded-xl border border-zinc-200">
                    {FIXED_COST_CATEGORIES.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Observações</label>
                  <textarea name="notes" className="w-full p-3 rounded-xl border border-zinc-200 h-20" placeholder="Opcional..." />
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsAddingFixedCost(false)} className="flex-1 p-3 rounded-xl border font-bold text-zinc-500">Cancelar</button>
                  <button type="submit" className="flex-1 p-3 rounded-xl bg-sublime text-white font-bold shadow-lg shadow-sublime/20">Salvar</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isAddingMei && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
              <h2 className="text-xl font-bold mb-6">Nova Obrigação MEI</h2>
              <form onSubmit={handleAddMei} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Nome da Obrigação</label>
                  <input required name="name" className="w-full p-3 rounded-xl border border-zinc-200" placeholder="Ex: DAS Janeiro 2026" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Valor</label>
                    <input required name="amount" type="number" step="0.01" className="w-full p-3 rounded-xl border border-zinc-200" placeholder="0.00" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Vencimento</label>
                    <input required name="due_date" type="date" className="w-full p-3 rounded-xl border border-zinc-200" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Tipo</label>
                    <select name="type" className="w-full p-3 rounded-xl border border-zinc-200">
                      <option value="das_mensal">DAS Mensal</option>
                      <option value="dasn_simei">DASN-SIMEI</option>
                      <option value="imposto">Imposto</option>
                      <option value="taxa">Taxa</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Status</label>
                    <select name="status" className="w-full p-3 rounded-xl border border-zinc-200">
                      <option value="pendente">Pendente</option>
                      <option value="pago">Pago</option>
                      <option value="atrasado">Atrasado</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Mês de Referência</label>
                  <input name="reference_month" className="w-full p-3 rounded-xl border border-zinc-200" placeholder="Ex: 2026-01" />
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsAddingMei(false)} className="flex-1 p-3 rounded-xl border font-bold text-zinc-500">Cancelar</button>
                  <button type="submit" className="flex-1 p-3 rounded-xl bg-sublime text-white font-bold shadow-lg shadow-sublime/20">Salvar</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isAddingGoal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
              <h2 className="text-xl font-bold mb-6">Nova Meta ou Sonho</h2>
              <form onSubmit={handleAddGoal} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Nome da Meta</label>
                  <input required name="name" className="w-full p-3 rounded-xl border border-zinc-200" placeholder="Ex: Reforma do Studio" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Valor Objetivo</label>
                    <input required name="target_amount" type="number" step="0.01" className="w-full p-3 rounded-xl border border-zinc-200" placeholder="0.00" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Valor Inicial</label>
                    <input name="current_amount" type="number" step="0.01" className="w-full p-3 rounded-xl border border-zinc-200" placeholder="0.00" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Data Alvo</label>
                    <input name="target_date" type="date" className="w-full p-3 rounded-xl border border-zinc-200" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Categoria</label>
                    <select name="category" className="w-full p-3 rounded-xl border border-zinc-200">
                      <option value="casamento">Casamento</option>
                      <option value="reserva_emergencia">Reserva de Emergência</option>
                      <option value="equipamento">Equipamento</option>
                      <option value="reforma">Reforma</option>
                      <option value="viagem">Viagem</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Observações</label>
                  <textarea name="notes" className="w-full p-3 rounded-xl border border-zinc-200 h-20" placeholder="Opcional..." />
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsAddingGoal(false)} className="flex-1 p-3 rounded-xl border font-bold text-zinc-500">Cancelar</button>
                  <button type="submit" className="flex-1 p-3 rounded-xl bg-sublime text-white font-bold shadow-lg shadow-sublime/20">Salvar</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isAddingService && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
              <h2 className="text-xl font-bold mb-6">Novo Cálculo de Serviço</h2>
              <form onSubmit={handleAddService} className="space-y-4">
                <input required name="name" className="w-full p-3 rounded-xl border border-zinc-200" placeholder="Nome do Serviço (ex: Progressiva)" />
                <div className="grid grid-cols-2 gap-4">
                  <input required name="materialCost" type="number" step="0.01" className="w-full p-3 rounded-xl border border-zinc-200" placeholder="Custo Material" />
                  <input required name="energyCost" type="number" step="0.01" className="w-full p-3 rounded-xl border border-zinc-200" placeholder="Custo Energia" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input required name="timeInMinutes" type="number" className="w-full p-3 rounded-xl border border-zinc-200" placeholder="Tempo (min)" />
                  <input required name="hourlyRate" type="number" step="0.01" className="w-full p-3 rounded-xl border border-zinc-200" placeholder="Sua Hora (R$)" />
                </div>
                <input required name="currentPrice" type="number" step="0.01" className="w-full p-3 rounded-xl border border-zinc-200" placeholder="Preço Cobrado" />
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsAddingService(false)} className="flex-1 p-3 rounded-xl border font-bold">Cancelar</button>
                  <button type="submit" className="flex-1 p-3 rounded-xl bg-sublime text-white font-bold">Calcular</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {transactionToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h2 className="text-xl font-bold mb-2">Excluir Transação?</h2>
              <p className="text-zinc-500 text-sm mb-6">Esta ação não pode ser desfeita. Deseja realmente excluir este registro?</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setTransactionToDelete(null)}
                  className="flex-1 p-3 rounded-xl border font-bold text-zinc-500 hover:bg-zinc-50 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => deleteTransaction(transactionToDelete)}
                  className="flex-1 p-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isShowingBankGuide && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-sublime/10 rounded-xl text-sublime">
                    <BookOpen size={24} />
                  </div>
                  <h2 className="text-xl font-bold">Guia de Conexão Bancária</h2>
                </div>
                <button onClick={() => setIsShowingBankGuide(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-all">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    Passo 1: Escolha sua Instituição
                  </h4>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Clique no botão "Conectar Conta" e selecione o seu banco na lista de instituições suportadas pelo Open Finance.
                  </p>
                </div>

                <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    Passo 2: Autorização Segura
                  </h4>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Você será redirecionado para o ambiente seguro do seu banco. Lá, você deve autorizar o compartilhamento de dados (extratos e saldos) com o {onboardingData?.companyName || 'Studio Sublime'}.
                  </p>
                </div>

                <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    Passo 3: Sincronização Automática
                  </h4>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Após a autorização, seus dados serão sincronizados automaticamente. Você poderá ver seus saldos e transações diretamente no Dashboard, facilitando sua gestão financeira.
                  </p>
                </div>

                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3">
                  <Info size={18} className="text-blue-600 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-blue-800">Dica de Conexão</p>
                    <p className="text-[10px] text-blue-700 leading-relaxed">
                      Se a conexão automática falhar, você também pode importar seus extratos manualmente usando a opção "Importar Extrato (PDF/CSV)" na tela principal de transações.
                    </p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setIsShowingBankGuide(false)}
                className="w-full mt-8 p-4 bg-sublime text-white rounded-xl font-bold shadow-lg shadow-sublime/20 hover:bg-sublime/90 transition-all"
              >
                Entendi, vamos lá!
              </button>
            </motion.div>
          </div>
        )}

        {isImportingStatement && (
          <StatementImporter 
            onClose={() => setIsImportingStatement(false)} 
            onSuccess={() => {
              // The onSnapshot listener will handle the update
            }}
          />
        )}
      </AnimatePresence>
      {isShowingOnboardingGuide && (
        <OnboardingGuide 
          onClose={() => setIsShowingOnboardingGuide(false)} 
          companyName={onboardingData?.companyName || 'Studio Sublime'} 
        />
      )}
    </div>
  );
}
