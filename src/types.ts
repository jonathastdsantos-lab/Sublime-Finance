export type TransactionType = 'entrada' | 'saida';

export type TransactionCategory = 
  | 'servico' 
  | 'material' 
  | 'aluguel' 
  | 'luz' 
  | 'emprestimo' 
  | 'mercado' 
  | 'retirada' 
  | 'pix_recebido' 
  | 'pix_enviado' 
  | 'pagamento' 
  | 'mei_das' 
  | 'imposto' 
  | 'outro';

export type PaymentMethod = 
  | 'dinheiro' 
  | 'pix' 
  | 'cartao_debito' 
  | 'cartao_credito' 
  | 'transferencia' 
  | 'boleto';

export interface BlockedFeature {
  id: string;
  expiresAt?: string;
  subAreas?: string[];
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: 'month' | 'year';
  features: string[]; // List of text features to display on the pricing table
  blockedFeatures: (string | BlockedFeature)[]; // Array of feature IDs that are BLOCKED for this plan
  isPopular?: boolean;
  active: boolean;
  paymentLink?: string; // Link for Stripe Checkout or Mercado Pago
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  status: 'active' | 'blocked';
  createdAt: string;
  lastLogin: string;
  blockedFeatures?: (string | BlockedFeature)[];
  isBlocked?: boolean;
  blockMessage?: string;
  blockReason?: 'payment_pending' | 'terms_violation' | 'account_maintenance' | 'other';
  metadata?: Record<string, any>;
  planId?: string; // e.g., 'free', 'pro', 'premium'
  subscriptionStatus?: 'active' | 'past_due' | 'canceled' | 'trialing';
}

export interface AppConfig {
  id: 'global';
  maintenanceMode: boolean;
  globalMessage?: string;
  topBanner?: {
    text: string;
    type: 'info' | 'warning' | 'error';
    active: boolean;
  };
  featureFlags?: Record<string, boolean>;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: TransactionCategory;
  date: string;
  payment_method?: PaymentMethod;
  notes?: string;
  is_recurring?: boolean;
  userId: string;
}

export interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date?: string;
  category: 'casamento' | 'reserva_emergencia' | 'equipamento' | 'reforma' | 'viagem' | 'expansao' | 'outro';
  notes?: string;
  actionPlan?: string;
  userId: string;
}

export interface MeiObligation {
  id: string;
  name: string;
  type: 'das_mensal' | 'dasn_simei' | 'imposto' | 'taxa' | 'outro';
  amount: number;
  due_date: string;
  status: 'pendente' | 'pago' | 'atrasado';
  reference_month?: string;
  notes?: string;
  userId: string;
}

export interface InvestmentOption {
  objective: string;
  where: string;
  why: string;
}

export interface ServiceCost {
  id: string;
  name: string;
  materialCost: number;
  energyCost: number;
  timeInMinutes: number;
  hourlyRate: number;
  currentPrice: number;
  userId: string;
}

export interface WeddingGoal {
  target: number;
  current: number;
  monthlyAporte: number;
  userId: string;
}

export interface OnboardingData {
  name: string;
  companyName?: string;
  photoURL?: string;
  primaryColor: string;
  revenueGoal: number;
  proLabore: number;
  expenseAlertThreshold: number;
  mainService: string;
  hasPartners: boolean;
  weddingGoalAmount?: number;
  weddingDate?: string;
  cnpj?: string;
  meiActivity?: string;
  dataEntryMethod: 'manual' | 'upload';
  onboardingCompleted: boolean;
  userId?: string;
}

export interface FixedCost {
  id: string;
  name: string;
  category: 'aluguel' | 'luz' | 'agua' | 'internet' | 'emprestimo' | 'mei_das' | 'seguro' | 'software' | 'outro';
  amount: number;
  due_day: number;
  is_active: boolean;
  notes?: string;
  userId: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountType: 'checking' | 'savings' | 'business';
  balance: number;
  currency: string;
  lastSync: string;
  institutionId: string;
  userId: string;
  status: 'active' | 'error' | 'disconnected';
}

export interface BankTransaction {
  id: string;
  bankAccountId: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  type: 'DEBIT' | 'CREDIT';
  userId: string;
}

export interface Partner {
  id: string;
  name: string;
  role?: string;
  commissionRate: number;
  email?: string;
  phone?: string;
  userId: string;
}

export interface Commission {
  id: string;
  partnerId: string;
  transactionId: string;
  amount: number;
  status: 'pendente' | 'pago';
  date: string;
  userId: string;
}

export interface Appointment {
  id: string;
  clientName: string;
  service: string;
  price: number;
  time: string;
  status: 'pendente' | 'confirmado' | 'cancelado';
  googleEventId?: string;
  userId: string;
}
