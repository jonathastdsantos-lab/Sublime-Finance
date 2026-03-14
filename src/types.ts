export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
}

export interface FinancialGoal {
  target: number;
  current: number;
  month: string;
}

export interface MEIObligation {
  name: string;
  dueDate: string;
  status: 'pending' | 'paid';
}

export interface InvestmentOption {
  objective: string;
  where: string;
  why: string;
}
