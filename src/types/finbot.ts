export type CurrencyCode = 'USD' | 'MXN' | 'COP' | 'ARS' | 'CLP' | 'PEN';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  locale: string;
  flag: string;
  defaultDailyBudget: number;
  sampleSlang: string;
}

export type ExpenseCategory = 
  | 'comida' 
  | 'transporte' 
  | 'gustitos' 
  | 'servicios' 
  | 'educacion' 
  | 'salud' 
  | 'otros';

export interface ExpenseRecord {
  id: string;
  amount: number;
  category: ExpenseCategory;
  description: string;
  timestamp: string;
  inputMethod: 'text' | 'voice' | 'receipt';
  isHormiga?: boolean;
}

export interface ImpulseItem {
  id: string;
  item: string;
  amount: number;
  reason?: string;
  createdAt: number; // timestamp
  unlockAt: number; // 24 hours later
  status: 'locked' | 'unlocked' | 'cancelled_saved' | 'purchased';
}

export interface DayBudget {
  dayName: string; // "Lunes", "Martes", etc.
  dateStr: string;
  allocated: number;
  spent: number;
  remaining: number;
  isToday?: boolean;
}

export interface BudgetState {
  currency: CurrencyCode;
  dailyBudgetOriginal: number;
  todaySpent: number;
  saldoRealGastable: number;
  weeklyCycleBudget: number;
  weekDays: DayBudget[];
  gastosHormigaToday: number;
  expenses: ExpenseRecord[];
  impulseVault: ImpulseItem[];
}

export type MessageSender = 'user' | 'bot' | 'system';

export interface WhatsAppButton {
  id: string;
  text: string;
  action: string;
  payload?: any;
}

export interface WhatsAppMessage {
  id: string;
  sender: MessageSender;
  text: string;
  timestamp: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  buttons?: WhatsAppButton[];
  mediaType?: 'text' | 'audio' | 'image';
  mediaUrl?: string;
  audioDuration?: string;
  metadata?: {
    flow?: 'flow1_register' | 'flow2_impulse' | 'flow3_recalculate' | 'onboarding' | 'help';
    amount?: number;
    category?: ExpenseCategory;
    saldoAnterior?: number;
    saldoNuevo?: number;
    isAntiImpulseAlert?: boolean;
    isRecalculate?: boolean;
  };
}

export interface NLPParseResult {
  amount: number | null;
  currency: string;
  category: ExpenseCategory;
  description: string;
  confidence: number;
  intent: 'register_expense' | 'ask_impulse' | 'check_balance' | 'undo' | 'unknown';
  rawInput: string;
  processingTimeMs: number;
  matchedRule: string;
}

export interface CopyItem {
  id: string;
  flow: 'Flujo 1: Registro Rápido' | 'Flujo 2: Alerta Anti-Impulso' | 'Flujo 3: Recálculo Flexible' | 'Onboarding & Core';
  trigger: string;
  botMessage: string;
  userOptions: string[];
  rationale: string;
  tonePillars: string[];
}
