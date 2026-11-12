import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  ArrowLeft, 
  CheckCheck, 
  Sparkles,
  Mic,
  Camera,
  Menu as MenuIcon,
  X,
  ChevronRight,
  RotateCcw,
  Sliders
} from 'lucide-react';

// ============================================================================
// TIPOS Y MODELO DE DATOS CANÓNICO
// ============================================================================
type ExpenseCategory = 'Alimentación' | 'Ocio' | 'Transporte' | 'Otros';

interface Expense {
  id: string;
  amount: number;
  category: ExpenseCategory;
  description: string;
  time: string;
  dayNumber: number; // 1 a 7
}

interface Income {
  id: string;
  amount: number;
  timeframe: 'today' | 'week';
  source: string;
  fixedPayments: number;
  bovedaAmount: number;
  dayAdded: number; // Día en que se registró
  time: string;
}

interface BovedaConfig {
  configured: boolean;
  active: boolean;
  targetAmount: number;
  reason: string;
  deadline: string;
  percentage: number;
}

interface PausedPurchase {
  id: string;
  item: string;
  amount: number;
  time: string;
}

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  time: string;
  quickReplies?: {
    id: string;
    label: string;
    action: string;
    payload?: any;
  }[];
  selectedReplyId?: string;
  isAmberAlert?: boolean;
}

type FlowState = 
  | 'WELCOME'
  | 'MENU'
  | 'AWAITING_INCOME_AMOUNT'
  | 'AWAITING_INCOME_TIMEFRAME'
  | 'AWAITING_INCOME_FIXED_AMOUNT'
  | 'BOVEDA_OFFER_DECISION'
  | 'BOVEDA_ASK_REASON'
  | 'BOVEDA_ASK_AMOUNT'
  | 'BOVEDA_ASK_DEADLINE'
  | 'BOVEDA_ASK_PERCENTAGE'
  | 'AWAITING_EXPENSE_INPUT'
  | 'AWAITING_PURCHASE_QUERY'
  | 'AWAITING_PAUSED_DECISION';

// Diccionario semántico estricto con límites de palabra para evitar falsos positivos
const CATEGORY_MATCHERS: Record<ExpenseCategory, RegExp[]> = {
  Alimentación: [
    /\b(empanada|empanadas|almuerzo|comida|cena|desayuno|café|cafe|cafecito|pizza|hamburguesa|sushi|tacos)\b/i,
    /\b(pan|panadería|panaderia|supermercado|super|mercado|merienda|snack|restaurante|starbucks)\b/i,
    /\b(sandwich|sándwich|helado|postre|delivery|rappi|pedidosya|chuchería|galletas|gaseosa|refresco|jugo)\b/i,
    /\b(botella de agua|agua mineral|tomar agua)\b/i
  ],
  Ocio: [
    /\b(cine|pelicula|película|salida|fiesta|boliche|bar|chela|chelas|cerveza|birra|trago)\b/i,
    /\b(ropa|shopping|compras|juego|videojuego|steam|playstation|netflix|spotify|concierto|evento)\b/i,
    /\b(entradas|zara|h&m|zapatillas|tenis|championes|disco|discoteca|pantalón|pantalon|pantalones)\b/i
  ],
  Transporte: [
    /\b(taxi|uber|didi|cabify|bus|colectivo|subte|metro|pasaje|pasajes)\b/i,
    /\b(gasolina|nafta|combustible|peaje|estacionamiento|micro|transporte|recarga bip|parquímetro)\b/i
  ],
  Otros: [
    /\b(farmacia|medicina|remedio|pastillas|médico|dentista|fotocopias|impresiones|cuaderno|libro)\b/i,
    /\b(arriendo|alquiler|luz|internet|plan de celular|servicio de agua|recibo de agua|recibo|barbería|barberia|corte de pelo)\b/i
  ]
};

// Opciones para simular notas de voz
const VOICE_SIMULATION_OPTIONS = [
  { id: 'v1', transcript: 'Gasté $10 en almuerzo', amount: 10, category: 'Alimentación' as const, desc: 'Almuerzo' },
  { id: 'v2', transcript: 'Pagué 5 de taxi', amount: 5, category: 'Transporte' as const, desc: 'Taxi' },
  { id: 'v3', transcript: 'Cine $8 con amigos', amount: 8, category: 'Ocio' as const, desc: 'Cine' },
  { id: 'v4', transcript: 'Café de $3', amount: 3, category: 'Alimentación' as const, desc: 'Café' },
  { id: 'v5', transcript: 'Farmacia $7 en medicina', amount: 7, category: 'Otros' as const, desc: 'Medicina' },
];

// Opciones para simular fotos de recibos
const PHOTO_SIMULATION_OPTIONS = [
  { id: 'p1', merchant: 'Menú Ejecutivo', amount: 10, category: 'Alimentación' as const, desc: 'Menú del día' },
  { id: 'p2', merchant: 'Cafetería', amount: 4, category: 'Alimentación' as const, desc: 'Café y snack' },
  { id: 'p3', merchant: 'Farmacia San Pablo', amount: 7, category: 'Otros' as const, desc: 'Medicamentos' },
  { id: 'p4', merchant: 'Supermercado', amount: 15, category: 'Alimentación' as const, desc: 'Víveres' },
  { id: 'p5', merchant: 'Cinépolis', amount: 8, category: 'Ocio' as const, desc: 'Entrada de cine' },
];

// Formato de hora HH:MM
const getFormattedTime = (): string => {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
};

// Formato de dinero positivo limpio
const formatMoney = (val: number): string => {
  if (isNaN(val)) return '0';
  const rounded = Math.round(val * 100) / 100;
  return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(2);
};

// Formato de saldo con soporte de negativos
const formatBalance = (val: number): string => {
  if (isNaN(val)) return '$0';
  const rounded = Math.round(val * 100) / 100;
  const absVal = Math.abs(rounded);
  const formattedAbs = absVal % 1 === 0 ? absVal.toString() : absVal.toFixed(2);
  if (rounded < 0) return `−$${formattedAbs}`;
  return `$${formattedAbs}`;
};

// Limpieza de descripción para evitar "Gasté $3 en empanadas: $3"
const cleanExpenseDescription = (rawText: string, detectedCategory: ExpenseCategory): string => {
  let clean = rawText
    .replace(/(?:gasté|gaste|pagué|pague|compré|compre|en|de|por|\$|\d+(?:[.,]\d{1,2})?)/gi, '')
    .trim();
  clean = clean.replace(/^[,\s.-]+|[,\s.-]+$/g, '');
  if (clean.length >= 2) {
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }
  return detectedCategory;
};

// Parser robusto de montos y categorías
const parseExpenseInput = (input: string) => {
  const clean = input.toLowerCase().trim();

  // Buscar todos los números
  const matches = clean.match(/(?:\$?\s*(\d+(?:[.,]\d{1,2})?)\s*(?:usd|dólares|dolares|bucks)?)/g);
  let amount: number | null = null;
  let hasMultipleAmounts = false;

  if (matches && matches.length > 0) {
    if (matches.length > 1) hasMultipleAmounts = true;
    const rawNum = matches[0].replace(/[^\d.,]/g, '').replace(',', '.');
    const parsed = parseFloat(rawNum);
    if (!isNaN(parsed) && parsed > 0) {
      amount = parsed;
    }
  }

  // Detectar categoría con límites de palabra
  let category: ExpenseCategory | null = null;
  for (const [cat, regexList] of Object.entries(CATEGORY_MATCHERS) as [ExpenseCategory, RegExp[]][]) {
    for (const regex of regexList) {
      if (regex.test(clean)) {
        category = cat;
        break;
      }
    }
    if (category) break;
  }

  return { amount, category, hasMultipleAmounts, clean };
};

export default function App() {
  // Pantalla activa
  const [screen, setScreen] = useState<'welcome' | 'chat'>('welcome');
  const [flowState, setFlowState] = useState<FlowState>('WELCOME');

  // Menús modales
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTestPanelOpen, setIsTestPanelOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  // Estados del ciclo financiero
  const [diaActual, setDiaActual] = useState(1); // 1 a 7
  const [semanaActual, setSemanaActual] = useState(1);
  const [incomesList, setIncomesList] = useState<Income[]>([]);
  const [expensesList, setExpensesList] = useState<Expense[]>([]);
  const [bovedaTotal, setBovedaTotal] = useState(0);
  const [extraBovedaSemanal, setExtraBovedaSemanal] = useState(0);

  // Configuración de Bóveda Anti-Impulso
  const [bovedaConfig, setBovedaConfig] = useState<BovedaConfig>({
    configured: false,
    active: false,
    targetAmount: 0,
    reason: '',
    deadline: '',
    percentage: 0
  });

  // Compras en pausa de 24 horas
  const [pausedPurchases, setPausedPurchases] = useState<PausedPurchase[]>([]);

  // Alerta de gasto al 80% (se dispara máximo 1 vez por día)
  const [hasTriggered80Today, setHasTriggered80Today] = useState(false);

  // Snapshots para deshacer
  const [lastAction, setLastAction] = useState<{
    type: 'expense' | 'income';
    id: string;
  } | null>(null);

  // Estados temporales de flujos conversacionales
  const [pendingIncome, setPendingIncome] = useState<{
    amount?: number;
    timeframe?: 'today' | 'week';
    source?: string;
    fixedPayments?: number;
  } | null>(null);

  const [pendingBovedaSetup, setPendingBovedaSetup] = useState<{
    reason?: string;
    targetAmount?: number;
    deadline?: string;
    percentage?: number;
  } | null>(null);

  // Chat
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // ==========================================================================
  // MOTOR MATEMÁTICO CANÓNICO (D1 RECOMENDADA)
  // Saldo de hoy = (ingresos de la semana − bóveda − fijos − gastos de días anteriores) ÷ días que quedan − gastos de hoy
  // ==========================================================================
  // 1. Días que quedan en la semana actual (de hoy al día 7)
  const diasQueQuedan = Math.max(1, 7 - diaActual + 1);

  // 2. Gastos de días anteriores de esta semana
  const gastosDiasAnteriores = expensesList
    .filter((e) => e.dayNumber < diaActual)
    .reduce((sum, e) => sum + e.amount, 0);

  // 3. Gastos de hoy
  const gastosHoy = expensesList
    .filter((e) => e.dayNumber === diaActual)
    .reduce((sum, e) => sum + e.amount, 0);

  // 4. Ingresos de la semana (todos los ingresos entran al mismo fondo)
  const ingresosDeLaSemana = incomesList.reduce((sum, i) => sum + i.amount, 0);

  // 5. Bóveda apartada en la semana (porcentajes de ingresos + aportes directos)
  const bovedaDeLaSemana = incomesList.reduce((sum, i) => sum + i.bovedaAmount, 0) + extraBovedaSemanal;

  // 6. Pagos fijos de la semana
  const fijosDeLaSemana = incomesList.reduce((sum, i) => sum + i.fixedPayments, 0);

  // 7. Fondo disponible de la semana antes de los gastos de hoy
  // Fondo = (ingresos de la semana − bóveda − fijos − gastos de días anteriores)
  const fondoDisponibleSemana = ingresosDeLaSemana - bovedaDeLaSemana - fijosDeLaSemana - gastosDiasAnteriores;

  // 8. Cuota calculada para hoy
  const cuotaBaseHoy = Math.round((fondoDisponibleSemana / diasQueQuedan) * 100) / 100;

  // 9. Saldo de hoy en tiempo real (Fórmula A exacta):
  // Saldo de hoy = (ingresos de la semana − bóveda − fijos − gastos de días anteriores) ÷ días que quedan − gastos de hoy
  const saldoDeHoy = Math.round((cuotaBaseHoy - gastosHoy) * 100) / 100;

  // 10. Saldo de la semana restante (fondo total neto menos todos los gastos)
  const totalGastosSemana = gastosDiasAnteriores + gastosHoy;
  const saldoDeLaSemana = Math.round((ingresosDeLaSemana - bovedaDeLaSemana - fijosDeLaSemana - totalGastosSemana) * 100) / 100;
  const disponibleHoyInicial = cuotaBaseHoy;

  // ==========================================================================
  // BOTONES DEL MENÚ PRINCIPAL (REGLA D7: UN SOLO EMOJI EN BOTONES DE ACCIÓN)
  // ==========================================================================
  const MAIN_MENU_BUTTONS = [
    { id: 'btn_inc', label: '💵 Registrar ingreso', action: 'action_income_start' },
    { id: 'btn_reg', label: '➕ Registrar gasto', action: 'action_register' },
    { id: 'btn_sal', label: '💰 Mi saldo', action: 'action_balance' },
    { id: 'btn_buy', label: '🛍️ ¿Puedo comprar?', action: 'action_can_i_buy' },
    { id: 'btn_sum', label: '📊 Resumen semanal', action: 'action_summary' },
    { id: 'btn_end', label: '🌙 Finalizar día', action: 'action_end_day' },
    { id: 'btn_bov', label: '🔒 Mi bóveda', action: 'action_boveda_menu' }
  ];

  // Helper para enviar respuestas del bot
  const sendBotReply = (
    text: string, 
    quickReplies?: Message['quickReplies'], 
    options?: { isAmberAlert?: boolean; delayMs?: number }
  ) => {
    setIsTyping(true);
    const delay = options?.delayMs !== undefined ? options.delayMs : 650;
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: 'bot_' + Date.now(),
          sender: 'bot',
          text,
          time: getFormattedTime(),
          quickReplies,
          isAmberAlert: options?.isAmberAlert
        }
      ]);
      setIsTyping(false);
    }, delay);
  };

  const showMainMenu = () => {
    setFlowState('MENU');
    setPendingIncome(null);
    setPendingBovedaSetup(null);
    setIsMenuOpen(false);
    sendBotReply('¿En qué te ayudo ahora?', MAIN_MENU_BUTTONS);
  };

  const handleStartChat = () => {
    setScreen('chat');
    setFlowState('MENU');
    if (messages.length === 0) {
      setMessages([
        {
          id: 'msg_init',
          sender: 'bot',
          text: '¡Hola! Para calcular cuánto puedes gastar hoy, cuéntame cuánta plata recibiste.',
          time: getFormattedTime(),
          quickReplies: [
            { id: 'w_inc', label: '💵 Registrar ingreso', action: 'action_income_start' },
            { id: 'w_menu', label: '☰ Menú', action: 'action_menu' }
          ]
        }
      ]);
    }
  };

  // ==========================================================================
  // FLUJO DE INGRESOS (D2: ORDEN DIRECTO Y CONFIRMACIÓN INMEDIATA)
  // ==========================================================================
  const startIncomeFlow = () => {
    setFlowState('AWAITING_INCOME_AMOUNT');
    setPendingIncome({});
    sendBotReply(
      '¿Cuánto recibiste? 💵 Escríbelo normal o toca una opción:',
      [
        { id: 'inc_100', label: '$100', action: 'action_income_amount_chosen', payload: 100 },
        { id: 'inc_50', label: '$50', action: 'action_income_amount_chosen', payload: 50 },
        { id: 'inc_20', label: '$20', action: 'action_income_amount_chosen', payload: 20 },
        { id: 'inc_otro', label: 'Otro monto', action: 'action_income_custom_amount' },
        { id: 'inc_back', label: '⬅️ Atrás', action: 'action_menu' }
      ]
    );
  };

  const handleIncomeAmountStep = (amount: number) => {
    setPendingIncome((prev) => ({ ...prev, amount }));
    setFlowState('AWAITING_INCOME_TIMEFRAME');
    sendBotReply(
      '¿Esta plata es para hoy o para toda la semana?',
      [
        { id: 'tf_today', label: 'Solo hoy', action: 'action_income_timeframe', payload: 'today' },
        { id: 'tf_week', label: 'Toda la semana', action: 'action_income_timeframe', payload: 'week' },
        { id: 'tf_back', label: '⬅️ Atrás', action: 'action_income_start' }
      ]
    );
  };

  const handleIncomeTimeframeStep = (timeframe: 'today' | 'week') => {
    const updated = { ...pendingIncome, timeframe };
    setPendingIncome(updated);

    // Si es "Toda la semana", preguntamos pagos fijos. Si es "Solo hoy", no aplica.
    if (timeframe === 'week') {
      setFlowState('AWAITING_INCOME_FIXED_AMOUNT');
      sendBotReply(
        '¿Tienes pagos fijos esta semana (arriendo, internet)? Si tienes, pon el monto:',
        [
          { id: 'fix_0', label: 'Sin pagos fijos', action: 'action_income_fixed_chosen', payload: 0 },
          { id: 'fix_30', label: '$30', action: 'action_income_fixed_chosen', payload: 30 },
          { id: 'fix_50', label: '$50', action: 'action_income_fixed_chosen', payload: 50 },
          { id: 'fix_otro', label: 'Otro monto', action: 'action_income_custom_fixed' },
          { id: 'fix_back', label: '⬅️ Atrás', action: 'action_income_back_to_timeframe' }
        ]
      );
    } else {
      finalizeIncome(updated.amount || 0, 'today', 0);
    }
  };

  const finalizeIncome = (amount: number, timeframe: 'today' | 'week', fixedPayments: number) => {
    // Si la bóveda está activa y configurada, calculamos su apartado si no ha llegado a la meta
    let bovedaApartada = 0;
    if (bovedaConfig.configured && bovedaConfig.active && bovedaConfig.percentage > 0) {
      if (bovedaConfig.targetAmount === 0 || bovedaTotal < bovedaConfig.targetAmount) {
        bovedaApartada = Math.round((amount * (bovedaConfig.percentage / 100)) * 100) / 100;
        // No pasar de la meta si hay una meta fija
        if (bovedaConfig.targetAmount > 0 && bovedaTotal + bovedaApartada > bovedaConfig.targetAmount) {
          bovedaApartada = Math.max(0, bovedaConfig.targetAmount - bovedaTotal);
        }
      }
    }

    const newIncome: Income = {
      id: 'inc_' + Date.now(),
      amount,
      timeframe,
      source: 'Ingreso',
      fixedPayments,
      bovedaAmount: bovedaApartada,
      dayAdded: diaActual,
      time: getFormattedTime()
    };

    setIncomesList((prev) => [newIncome, ...prev]);
    if (bovedaApartada > 0) {
      setBovedaTotal((prev) => Math.round((prev + bovedaApartada) * 100) / 100);
    }

    setLastAction({ type: 'income', id: newIncome.id });
    setPendingIncome(null);
    setFlowState('MENU');

    // Cálculo exacto del nuevo saldo de hoy según la fórmula:
    // Saldo de hoy = (ingresos de la semana − bóveda − fijos − gastos de días anteriores) ÷ días que quedan − gastos de hoy
    const newIngresosSemana = ingresosDeLaSemana + amount;
    const newBovedaSemana = bovedaDeLaSemana + bovedaApartada;
    const newFijosSemana = fijosDeLaSemana + fixedPayments;
    const newFondoSemana = newIngresosSemana - newBovedaSemana - newFijosSemana - gastosDiasAnteriores;
    const newCuota = Math.round((newFondoSemana / diasQueQuedan) * 100) / 100;
    const newSaldoHoyCalculado = Math.round((newCuota - gastosHoy) * 100) / 100;

    let confirmMsg = `¡Listo! Sumé tu ingreso de $${formatMoney(amount)}.`;
    if (bovedaApartada > 0) {
      confirmMsg += ` Guardé $${formatMoney(bovedaApartada)} en tu Bóveda Anti-Impulso 🔒.`;
    }
    confirmMsg += ` Hoy puedes gastar ${formatBalance(newSaldoHoyCalculado)}.`;

    sendBotReply(
      confirmMsg,
      [
        { id: 'btn_undo_inc', label: '↩️ Deshacer', action: 'action_undo_last_action' },
        { id: 'btn_reg_after_inc', label: '➕ Registrar gasto', action: 'action_register' },
        { id: 'btn_sal_after_inc', label: '💰 Mi saldo', action: 'action_balance' },
        { id: 'btn_menu_after_inc', label: '☰ Menú', action: 'action_menu' }
      ]
    );

    // D2: Si la bóveda NUNCA ha sido configurada, se ofrece en un mensaje aparte DESPUÉS
    if (!bovedaConfig.configured) {
      setTimeout(() => {
        startBovedaSetupOffer(amount);
      }, 1300);
    }
  };

  // ==========================================================================
  // FLUJO DE BÓVEDA (D2: PARA QUÉ -> CUÁNTO -> PLAZO -> PROPUESTA INTELIGENTE)
  // ==========================================================================
  const startBovedaSetupOffer = (incomeContextAmount?: number) => {
    setFlowState('BOVEDA_OFFER_DECISION');
    setPendingBovedaSetup({ percentage: 0 });
    sendBotReply(
      '¿Quieres apartar un ahorro para una meta en tu Bóveda Anti-Impulso? 🔒',
      [
        { id: 'bov_yes', label: 'Sí, quiero ahorrar', action: 'action_boveda_accept_offer', payload: incomeContextAmount },
        { id: 'bov_no', label: 'Ahora no', action: 'action_boveda_decline_offer' }
      ]
    );
  };

  const handleBovedaAskReason = () => {
    setFlowState('BOVEDA_ASK_REASON');
    sendBotReply(
      '¿Para qué es este ahorro? Cuéntame tu meta:',
      [
        { id: 'br_viaje', label: 'Un viaje', action: 'action_boveda_reason_chosen', payload: 'Un viaje' },
        { id: 'br_celular', label: 'Un celular', action: 'action_boveda_reason_chosen', payload: 'Un celular' },
        { id: 'br_emerg', label: 'Emergencias', action: 'action_boveda_reason_chosen', payload: 'Emergencias' },
        { id: 'br_otro', label: 'Otra meta', action: 'action_boveda_reason_custom' },
        { id: 'br_back', label: '⬅️ Atrás', action: 'action_menu' }
      ]
    );
  };

  const handleBovedaAskAmount = (reason: string) => {
    setPendingBovedaSetup((prev) => ({ ...prev, reason }));
    setFlowState('BOVEDA_ASK_AMOUNT');
    sendBotReply(
      '¿Cuánto quieres lograr en total?',
      [
        { id: 'ba_50', label: '$50', action: 'action_boveda_amount_chosen', payload: 50 },
        { id: 'ba_100', label: '$100', action: 'action_boveda_amount_chosen', payload: 100 },
        { id: 'ba_200', label: '$200', action: 'action_boveda_amount_chosen', payload: 200 },
        { id: 'ba_otro', label: 'Otro monto', action: 'action_boveda_amount_custom' },
        { id: 'ba_back', label: '⬅️ Atrás', action: 'action_boveda_back_to_reason' }
      ]
    );
  };

  const handleBovedaAskDeadline = (targetAmount: number) => {
    setPendingBovedaSetup((prev) => ({ ...prev, targetAmount }));
    setFlowState('BOVEDA_ASK_DEADLINE');
    sendBotReply(
      '¿En cuánto tiempo quieres lograrlo?',
      [
        { id: 'bd_1m', label: '1 mes', action: 'action_boveda_deadline_chosen', payload: { deadline: '1 mes', months: 1 } },
        { id: 'bd_3m', label: '3 meses', action: 'action_boveda_deadline_chosen', payload: { deadline: '3 meses', months: 3 } },
        { id: 'bd_6m', label: '6 meses', action: 'action_boveda_deadline_chosen', payload: { deadline: '6 meses', months: 6 } },
        { id: 'bd_otro', label: 'Otro plazo', action: 'action_boveda_deadline_custom' },
        { id: 'bd_back', label: '⬅️ Atrás', action: 'action_boveda_back_to_amount' }
      ]
    );
  };

  const handleBovedaProposal = (deadlineStr: string, monthsCount: number) => {
    const target = pendingBovedaSetup?.targetAmount || 100;
    const weeks = Math.max(1, monthsCount * 4);
    const aporteSemanalEstimado = Math.round((target / weeks) * 100) / 100;

    // Calcular el porcentaje sugerido respecto al ingreso semanal (o base $100 si no hay aún)
    const baseIngreso = ingresosDeLaSemana > 0 ? ingresosDeLaSemana : 100;
    const suggestedPct = Math.min(30, Math.max(5, Math.round((aporteSemanalEstimado / baseIngreso) * 100)));

    setPendingBovedaSetup((prev) => ({ ...prev, deadline: deadlineStr }));
    setFlowState('BOVEDA_ASK_PERCENTAGE');

    sendBotReply(
      `Para $${formatMoney(target)} en ${deadlineStr} necesitas ~$${formatMoney(aporteSemanalEstimado)} por semana (aprox. ${suggestedPct}% de tu ingreso). ¿Qué porcentaje apartamos de tus ingresos?`,
      [
        { id: 'bp_sug', label: `${suggestedPct}%`, action: 'action_boveda_percentage_chosen', payload: suggestedPct },
        { id: 'bp_10', label: '10%', action: 'action_boveda_percentage_chosen', payload: 10 },
        { id: 'bp_15', label: '15%', action: 'action_boveda_percentage_chosen', payload: 15 },
        { id: 'bp_otro', label: 'Otro %', action: 'action_boveda_percentage_custom' },
        { id: 'bp_back', label: '⬅️ Atrás', action: 'action_boveda_back_to_deadline' }
      ]
    );
  };

  const finalizeBovedaSetup = (percentage: number) => {
    const validPct = Math.min(50, Math.max(1, percentage));
    const target = pendingBovedaSetup?.targetAmount || 100;
    const reason = pendingBovedaSetup?.reason || 'Ahorro';
    const deadline = pendingBovedaSetup?.deadline || '3 meses';

    setBovedaConfig({
      configured: true,
      active: true,
      targetAmount: target,
      reason,
      deadline,
      percentage: validPct
    });

    setPendingBovedaSetup(null);
    setFlowState('MENU');

    sendBotReply(
      `Listo 🔒 Apartaré el ${validPct}% de tus próximos ingresos para tu meta de $${formatMoney(target)} en ${reason}.`,
      MAIN_MENU_BUTTONS
    );
  };

  // Ver estado de Bóveda desde el menú
  const handleShowBovedaStatus = () => {
    if (!bovedaConfig.configured || !bovedaConfig.active) {
      sendBotReply(
        'Tu Bóveda Anti-Impulso está inactiva (0% de ahorro). ¿Quieres configurarla para guardar algo de tus ingresos?',
        [
          { id: 'bv_act', label: 'Configurar bóveda', action: 'action_boveda_start_setup' },
          { id: 'bv_men', label: '⬅️ Menú', action: 'action_menu' }
        ]
      );
      return;
    }

    const pct = bovedaConfig.targetAmount > 0 
      ? Math.min(100, Math.round((bovedaTotal / bovedaConfig.targetAmount) * 100))
      : 0;
    const filledBlocks = Math.round(pct / 10);
    const bar = '█'.repeat(filledBlocks) + '░'.repeat(Math.max(0, 10 - filledBlocks));

    sendBotReply(
      `🔒 Tu Bóveda Anti-Impulso\n\nMeta: $${formatMoney(bovedaConfig.targetAmount)} para ${bovedaConfig.reason}\nAhorrado: $${formatMoney(bovedaTotal)} / $${formatMoney(bovedaConfig.targetAmount)} (${pct}%)\n[${bar}]\nPlazo: en ${bovedaConfig.deadline}\nAporte: ${bovedaConfig.percentage}% por ingreso`,
      [
        { id: 'bvm_edit', label: 'Cambiar meta', action: 'action_boveda_start_setup' },
        { id: 'bvm_pause', label: 'Pausar bóveda', action: 'action_boveda_pause_toggle' },
        { id: 'bvm_men', label: '⬅️ Menú', action: 'action_menu' }
      ]
    );
  };

  // ==========================================================================
  // FLUJO DE REGISTRO DE GASTO (D6: REGISTRAR DIRECTO EN 'OTROS' SI NO HAY CATEGORÍA)
  // ==========================================================================
  const executeRegisterExpense = (
    amount: number, 
    category: ExpenseCategory, 
    desc: string,
    wasCategoryAssignedAutomatically: boolean = false
  ) => {
    const timeStr = getFormattedTime();
    const cleanDesc = cleanExpenseDescription(desc, category);

    const newExpense: Expense = {
      id: 'exp_' + Date.now(),
      amount,
      category,
      description: cleanDesc,
      time: timeStr,
      dayNumber: diaActual
    };

    setExpensesList((prev) => [newExpense, ...prev]);
    setLastAction({ type: 'expense', id: newExpense.id });
    setFlowState('MENU');

    const newSaldo = Math.round((saldoDeHoy - amount) * 100) / 100;
    const formattedAmount = formatMoney(amount);

    // D5: Alerta del 80% (una vez al día cuando se gaste el 80% del saldo inicial)
    const totalDespuesDeGasto = gastosHoy + amount;
    const check80 = !hasTriggered80Today && disponibleHoyInicial > 0 && totalDespuesDeGasto >= disponibleHoyInicial * 0.8;

    if (newSaldo < 0) {
      sendBotReply(
        `✅ Gasto registrado: $${formattedAmount} en ${category}. Hoy estás en ${formatBalance(newSaldo)} 💛 Lo equilibraremos en los siguientes días.`,
        [
          { id: 'u_exp', label: '↩️ Deshacer', action: 'action_undo_last_action' },
          ...(wasCategoryAssignedAutomatically ? [{ id: 'cat_chg', label: 'Cambiar categoría', action: 'action_change_last_category', payload: newExpense.id }] : []),
          { id: 'r_another', label: '➕ Registrar otro', action: 'action_register' },
          { id: 'r_menu', label: '☰ Menú', action: 'action_menu' }
        ],
        { isAmberAlert: true }
      );
    } else {
      sendBotReply(
        `✅ Gasto registrado: $${formattedAmount} en ${category} (${timeStr}).\n\nTu saldo de hoy es ${formatBalance(newSaldo)}.`,
        [
          { id: 'u_exp', label: '↩️ Deshacer', action: 'action_undo_last_action' },
          ...(wasCategoryAssignedAutomatically ? [{ id: 'cat_chg', label: 'Cambiar categoría', action: 'action_change_last_category', payload: newExpense.id }] : []),
          { id: 'r_another', label: '➕ Registrar otro', action: 'action_register' },
          { id: 'r_menu', label: '☰ Menú', action: 'action_menu' }
        ]
      );
    }

    if (check80) {
      setHasTriggered80Today(true);
      setTimeout(() => {
        sendBotReply(
          `⚠️ Llevas gastado el 80% de tu saldo de hoy ($${formatMoney(totalDespuesDeGasto)} de $${formatMoney(disponibleHoyInicial)}). Reto: evita otro gasto y guarda $2 en tu Bóveda 🔒 ¿Te sumas?`,
          [
            { id: 'n_yes', label: 'Me sumo ($2 a bóveda)', action: 'action_nudge_accept_2usd' },
            { id: 'n_no', label: 'Ahora no', action: 'action_nudge_decline' }
          ],
          { isAmberAlert: true }
        );
      }, 1200);
    }
  };

  // Deshacer el último movimiento
  const handleUndoLastAction = () => {
    if (!lastAction) {
      sendBotReply('No hay ninguna acción reciente para deshacer 👍', MAIN_MENU_BUTTONS);
      return;
    }

    if (lastAction.type === 'expense') {
      const targetExpense = expensesList.find((e) => e.id === lastAction.id);
      if (targetExpense) {
        setExpensesList((prev) => prev.filter((e) => e.id !== lastAction.id));
        setLastAction(null);
        const restoredSaldo = Math.round((saldoDeHoy + targetExpense.amount) * 100) / 100;
        sendBotReply(
          `Listo ↩️ Cancelé el gasto de $${formatMoney(targetExpense.amount)} en ${targetExpense.category}. Tu saldo de hoy es ${formatBalance(restoredSaldo)}.`,
          MAIN_MENU_BUTTONS
        );
        return;
      }
    } else if (lastAction.type === 'income') {
      const targetIncome = incomesList.find((i) => i.id === lastAction.id);
      if (targetIncome) {
        setIncomesList((prev) => prev.filter((i) => i.id !== lastAction.id));
        if (targetIncome.bovedaAmount > 0) {
          setBovedaTotal((prev) => Math.max(0, Math.round((prev - targetIncome.bovedaAmount) * 100) / 100));
        }
        setLastAction(null);
        sendBotReply(
          `Listo ↩️ Cancelé ese ingreso de $${formatMoney(targetIncome.amount)}.`,
          MAIN_MENU_BUTTONS
        );
        return;
      }
    }

    sendBotReply('No hay ninguna acción para deshacer 👍', MAIN_MENU_BUTTONS);
  };

  // Cambiar categoría de gasto
  const handleChangeExpenseCategory = (expenseId: string, newCat: ExpenseCategory) => {
    setExpensesList((prev) =>
      prev.map((e) => (e.id === expenseId ? { ...e, category: newCat } : e))
    );
    sendBotReply(`Listo, cambié la categoría a ${newCat} 👍`, MAIN_MENU_BUTTONS);
  };

  // ==========================================================================
  // FLUJO ¿PUEDO COMPRAR? (D4: PAUSA 24 H REAL, REGISTRAR IGUAL, CONSULTA LIMPIA)
  // ==========================================================================
  const evaluatePurchase = (amount: number, itemDesc: string) => {
    const formattedAmount = formatMoney(amount);

    if (saldoDeHoy > 0 && amount <= saldoDeHoy) {
      const rem = Math.round((saldoDeHoy - amount) * 100) / 100;
      sendBotReply(
        `🟢 Sí puedes. Si compras ${itemDesc} por $${formattedAmount}, te quedarían $${formatMoney(rem)} de saldo hoy. Esta consulta no resta nada.`,
        [
          { id: 'b_reg_now', label: '🛍️ Registrar compra', action: 'action_register_purchase_now', payload: { amount, item: itemDesc } },
          { id: 'b_menu', label: '⬅️ Menú', action: 'action_menu' }
        ]
      );
    } else {
      const nuevoEstimado = Math.round((saldoDeHoy - amount) * 100) / 100;
      sendBotReply(
        `🟡 Si compras ${itemDesc} por $${formattedAmount}, quedarías en ${formatBalance(nuevoEstimado)} hoy. Recuerda que no se ha restado nada:`,
        [
          { id: 'b_pause', label: '⏱️ Pausa de 24 h', action: 'action_pause_purchase_24h', payload: { amount, item: itemDesc } },
          { id: 'b_reg_anyway', label: '🛍️ Registrar igual', action: 'action_register_purchase_now', payload: { amount, item: itemDesc } },
          { id: 'b_menu_neg', label: '⬅️ Menú', action: 'action_menu' }
        ],
        { isAmberAlert: true }
      );
    }
  };

  // Pausa de 24 horas real
  const handleSavePausedPurchase = (amount: number, item: string) => {
    const newPause: PausedPurchase = {
      id: 'pause_' + Date.now(),
      item,
      amount,
      time: getFormattedTime()
    };
    setPausedPurchases((prev) => [newPause, ...prev]);
    sendBotReply(
      `Listo ⏱️ Pausé ${item} ($${formatMoney(amount)}) por 24 h para enfriar el impulso. Te recordaré al cerrar el día.`,
      MAIN_MENU_BUTTONS
    );
  };

  // ==========================================================================
  // MI SALDO
  // ==========================================================================
  const handleShowBalance = () => {
    let bovedaLine = '';
    if (bovedaConfig.configured && bovedaConfig.active && bovedaConfig.percentage > 0) {
      const pct = bovedaConfig.targetAmount > 0 
        ? Math.min(100, Math.round((bovedaTotal / bovedaConfig.targetAmount) * 100)) 
        : 0;
      bovedaLine = `\n🔒 Bóveda: $${formatMoney(bovedaTotal)} / $${formatMoney(bovedaConfig.targetAmount)} (${pct}%)`;
    } else {
      bovedaLine = `\n🔒 Bóveda: Inactiva (0% de ahorro)`;
    }

    if (saldoDeHoy < 0) {
      sendBotReply(
        `💰 Hoy estás en *${formatBalance(saldoDeHoy)}* 💛\n\nSaldo de la semana: *${formatBalance(saldoDeLaSemana)}*${bovedaLine}\n\nNo te preocupes, lo equilibraremos en los días siguientes.`,
        [
          { id: 'b_inc', label: '💵 Registrar ingreso', action: 'action_income_start' },
          { id: 'b_men', label: '⬅️ Menú', action: 'action_menu' }
        ],
        { isAmberAlert: true }
      );
    } else {
      sendBotReply(
        `💰 Saldo de hoy: *${formatBalance(saldoDeHoy)}*\n\nSaldo de la semana: *${formatBalance(saldoDeLaSemana)}*${bovedaLine}\n\nDinero disponible libre de culpa para lo que queda del día.`,
        [
          { id: 'b_inc', label: '💵 Registrar ingreso', action: 'action_income_start' },
          { id: 'b_reg', label: '➕ Registrar gasto', action: 'action_register' },
          { id: 'b_buy', label: '🛍️ ¿Puedo comprar?', action: 'action_can_i_buy' },
          { id: 'b_men', label: '☰ Menú', action: 'action_menu' }
        ]
      );
    }
  };

  // ==========================================================================
  // RESUMEN SEMANAL
  // ==========================================================================
  const handleShowWeeklySummary = () => {
    const totalIngresos = incomesList.reduce((sum, i) => sum + i.amount, 0);
    const totalGastos = expensesList.reduce((sum, e) => sum + e.amount, 0);

    if (totalIngresos === 0 && totalGastos === 0) {
      sendBotReply(
        'Aún no hay movimientos. Registra tu primer ingreso 💵',
        [
          { id: 'sum_inc', label: '💵 Registrar ingreso', action: 'action_income_start' },
          { id: 'sum_men', label: '☰ Menú', action: 'action_menu' }
        ]
      );
      return;
    }

    const expensesTodayList = expensesList.filter((e) => e.dayNumber === diaActual);
    const todayStr = expensesTodayList.length > 0
      ? expensesTodayList.map((e) => `• ${e.time} - ${e.description}: $${formatMoney(e.amount)} (${e.category})`).join('\n')
      : 'Sin gastos registrados hoy.';

    const totalAli = expensesList.filter((e) => e.category === 'Alimentación').reduce((s, e) => s + e.amount, 0);
    const totalOci = expensesList.filter((e) => e.category === 'Ocio').reduce((s, e) => s + e.amount, 0);
    const totalTra = expensesList.filter((e) => e.category === 'Transporte').reduce((s, e) => s + e.amount, 0);
    const totalOtr = expensesList.filter((e) => e.category === 'Otros').reduce((s, e) => s + e.amount, 0);

    let bovedaLine = '';
    if (bovedaConfig.configured && bovedaConfig.active) {
      const pct = bovedaConfig.targetAmount > 0 
        ? Math.min(100, Math.round((bovedaTotal / bovedaConfig.targetAmount) * 100))
        : 0;
      bovedaLine = `\n\n🔒 Bóveda (${bovedaConfig.reason || 'Meta'}): $${formatMoney(bovedaTotal)} / $${formatMoney(bovedaConfig.targetAmount)} (${pct}%)`;
    }

    const summaryText = 
      `📊 Resumen de tu semana\n\n` +
      `💵 Ingresos totales: $${formatMoney(totalIngresos)}\n` +
      `💰 Gastos totales: $${formatMoney(totalGastos)}\n\n` +
      `📅 Gastos de hoy:\n${todayStr}\n\n` +
      `🍽️ Alimentación: $${formatMoney(totalAli)}\n` +
      `🎉 Ocio: $${formatMoney(totalOci)}\n` +
      `🚌 Transporte: $${formatMoney(totalTra)}\n` +
      `📦 Otros: $${formatMoney(totalOtr)}` +
      bovedaLine;

    sendBotReply(summaryText, [
      { id: 'sum_reg', label: '➕ Registrar gasto', action: 'action_register' },
      { id: 'sum_men2', label: '☰ Menú', action: 'action_menu' }
    ]);
  };

  // ==========================================================================
  // FINALIZAR DÍA (D1 & D4: PAUSAS 24H PRIMERO, SOBRANTE A BÓVEDA O REPARTO LIMPIO)
  // ==========================================================================
  const handleStartEndDay = () => {
    // Si hay compras en pausa de 24 horas, preguntar primero por ellas
    if (pausedPurchases.length > 0) {
      const firstPause = pausedPurchases[0];
      setFlowState('AWAITING_PAUSED_DECISION');
      sendBotReply(
        `Tienes en pausa de 24 h: ${firstPause.item} ($${formatMoney(firstPause.amount)}). ¿Sigues queriendo comprarlo?`,
        [
          { id: 'p_buy_now', label: 'Comprar ahora', action: 'action_paused_buy_now', payload: firstPause },
          { id: 'p_discard', label: 'Ya no lo quiero', action: 'action_paused_discard', payload: firstPause },
          { id: 'p_keep', label: 'Dejarlo en pausa', action: 'action_paused_keep' }
        ]
      );
      return;
    }

    proceedEndDayDialog();
  };

  const proceedEndDayDialog = () => {
    const gastadoHoy = gastosHoy;
    const quedaHoy = saldoDeHoy;

    if (incomesList.length === 0 && expensesList.length === 0) {
      sendBotReply(
        'Aún no hay movimientos registrados hoy. ¿Avanzamos al día siguiente?',
        [
          { id: 'ed_advance', label: '🌙 Sí, avanzar', action: 'action_execute_close_day' },
          { id: 'ed_stay', label: 'Seguir hoy', action: 'action_menu' }
        ]
      );
      return;
    }

    if (quedaHoy > 0) {
      sendBotReply(
        `¿Cerramos el día? Gastaste $${formatMoney(gastadoHoy)} y te sobran $${formatMoney(quedaHoy)}.`,
        [
          { id: 'ed_repartir', label: '🌙 Cerrar día y repartir', action: 'action_execute_close_day' },
          { id: 'ed_boveda', label: '🔒 Guardar sobrante en Bóveda', action: 'action_close_day_save_leftover_vault' },
          { id: 'ed_stay', label: 'Seguir hoy', action: 'action_menu' }
        ]
      );
    } else if (quedaHoy < 0) {
      sendBotReply(
        `¿Cerramos el día? Gastaste $${formatMoney(gastadoHoy)} y hoy estás en ${formatBalance(quedaHoy)} 💛 Lo repartiremos en los próximos días.`,
        [
          { id: 'ed_close_neg', label: '🌙 Sí, cerrar día', action: 'action_execute_close_day' },
          { id: 'ed_stay', label: 'Seguir hoy', action: 'action_menu' }
        ],
        { isAmberAlert: true }
      );
    } else {
      sendBotReply(
        `¿Cerramos el día? Gastaste $${formatMoney(gastadoHoy)} y usaste justo tu saldo de hoy.`,
        [
          { id: 'ed_close_exact', label: '🌙 Sí, cerrar día', action: 'action_execute_close_day' },
          { id: 'ed_stay', label: 'Seguir hoy', action: 'action_menu' }
        ]
      );
    }
  };

  // Guardar sobrante en Bóveda al cerrar día
  const handleSaveLeftoverToVaultAndClose = () => {
    const leftover = Math.max(0, saldoDeHoy);
    if (leftover > 0) {
      setExtraBovedaSemanal((prev) => Math.round((prev + leftover) * 100) / 100);
      setBovedaTotal((prev) => Math.round((prev + leftover) * 100) / 100);

      sendBotReply(
        `¡Genial! 🔒 Guardé $${formatMoney(leftover)} en tu Bóveda Anti-Impulso.`,
        undefined,
        { delayMs: 400 }
      );
    }

    setTimeout(() => {
      executeCloseDayLogic(leftover);
    }, 900);
  };

  // Ejecutar el avance de día o semana
  const executeCloseDayLogic = (extraVaultSaved: number = 0) => {
    setHasTriggered80Today(false);

    if (diaActual < 7) {
      const proximoDia = diaActual + 1;
      setDiaActual(proximoDia);

      // Calcular el nuevo saldo para mañana según la fórmula D1:
      // Saldo de mañana = (ingresos de la semana − bóveda − fijos − gastos de días anteriores hasta hoy) ÷ días que quedan
      const diasRestantesManana = 7 - proximoDia + 1;
      const gastosHastaHoy = expensesList.reduce((s, e) => s + e.amount, 0);
      const bovedaActualizada = bovedaDeLaSemana + extraVaultSaved;
      const fondoRestanteManana = ingresosDeLaSemana - bovedaActualizada - fijosDeLaSemana - gastosHastaHoy;
      const saldoManana = Math.round((fondoRestanteManana / diasRestantesManana) * 100) / 100;

      sendBotReply(
        `Día ${proximoDia} iniciado ☀️ Tu saldo de hoy es ${formatBalance(saldoManana)}.`,
        MAIN_MENU_BUTTONS,
        { delayMs: 800 }
      );
    } else {
      // Fin de la semana (Día 7 cerrado)
      const nuevaSemana = semanaActual + 1;
      setSemanaActual(nuevaSemana);
      setDiaActual(1);
      setExpensesList([]);
      setIncomesList([]);
      setExtraBovedaSemanal(0);

      sendBotReply(
        `¡Completaste la semana! 🎉 Resumen archivado.\n\nSemana ${nuevaSemana} - Día 1 iniciado ☀️ Tu saldo de hoy es $0. Registra tu nuevo ingreso para comenzar.`,
        [
          { id: 'w_new_inc', label: '💵 Registrar ingreso', action: 'action_income_start' },
          { id: 'w_new_men', label: '☰ Menú', action: 'action_menu' }
        ],
        { delayMs: 800 }
      );
    }
  };

  // ==========================================================================
  // MANEJADOR CENTRAL DE CLICS EN BOTONES (D3: SOLO EL ÚLTIMO ES CLICKEABLE)
  // ==========================================================================
  const handleQuickReplyClick = (msgId: string, reply: { id: string; label: string; action: string; payload?: any }) => {
    // Marcar como seleccionado
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, selectedReplyId: reply.id } : m))
    );

    // Agregar mensaje del usuario en el chat
    setMessages((prev) => [
      ...prev,
      {
        id: 'u_' + Date.now(),
        sender: 'user',
        text: reply.label,
        time: getFormattedTime()
      }
    ]);

    switch (reply.action) {
      case 'action_menu':
        showMainMenu();
        break;

      case 'action_income_start':
        startIncomeFlow();
        break;

      case 'action_income_amount_chosen':
        if (reply.payload) handleIncomeAmountStep(reply.payload);
        break;

      case 'action_income_custom_amount':
        setFlowState('AWAITING_INCOME_AMOUNT');
        sendBotReply('Escribe cuánto recibiste en el campo de texto 👇 (ej: "Me pagaron 120"):');
        break;

      case 'action_income_timeframe':
        if (reply.payload) handleIncomeTimeframeStep(reply.payload);
        break;

      case 'action_income_back_to_timeframe':
        if (pendingIncome?.amount) handleIncomeAmountStep(pendingIncome.amount);
        else startIncomeFlow();
        break;

      case 'action_income_fixed_chosen':
        finalizeIncome(
          pendingIncome?.amount || 0,
          pendingIncome?.timeframe || 'week',
          reply.payload || 0
        );
        break;

      case 'action_income_custom_fixed':
        setFlowState('AWAITING_INCOME_FIXED_AMOUNT');
        sendBotReply('Escribe el monto total de tus pagos fijos de esta semana:');
        break;

      case 'action_undo_last_action':
        handleUndoLastAction();
        break;

      case 'action_change_last_category':
        if (reply.payload) {
          sendBotReply('Elige la categoría correcta:', [
            { id: 'c_ali', label: 'Alimentación', action: 'action_set_category', payload: { id: reply.payload, cat: 'Alimentación' } },
            { id: 'c_oci', label: 'Ocio', action: 'action_set_category', payload: { id: reply.payload, cat: 'Ocio' } },
            { id: 'c_tra', label: 'Transporte', action: 'action_set_category', payload: { id: reply.payload, cat: 'Transporte' } },
            { id: 'c_otr', label: 'Otros', action: 'action_set_category', payload: { id: reply.payload, cat: 'Otros' } }
          ]);
        }
        break;

      case 'action_set_category':
        if (reply.payload) {
          handleChangeExpenseCategory(reply.payload.id, reply.payload.cat);
        }
        break;

      // Bóveda
      case 'action_boveda_accept_offer':
        handleBovedaAskReason();
        break;

      case 'action_boveda_decline_offer':
        setBovedaConfig({
          configured: true,
          active: false,
          targetAmount: 0,
          reason: '',
          deadline: '',
          percentage: 0
        });
        sendBotReply('¡Sin problema! Tu dinero queda 100% disponible para gastar 👍', MAIN_MENU_BUTTONS);
        break;

      case 'action_boveda_menu':
        handleShowBovedaStatus();
        break;

      case 'action_boveda_start_setup':
        handleBovedaAskReason();
        break;

      case 'action_boveda_pause_toggle':
        setBovedaConfig((prev) => ({ ...prev, active: !prev.active }));
        sendBotReply(
          bovedaConfig.active ? 'Bóveda pausada. No apartaremos dinero de tus ingresos.' : 'Bóveda reactivada.',
          MAIN_MENU_BUTTONS
        );
        break;

      case 'action_boveda_reason_chosen':
        if (reply.payload) handleBovedaAskAmount(reply.payload);
        break;

      case 'action_boveda_reason_custom':
        setFlowState('BOVEDA_ASK_REASON');
        sendBotReply('Escribe tu meta en una frase corta (ej: Comprar una laptop):');
        break;

      case 'action_boveda_amount_chosen':
        if (reply.payload) handleBovedaAskDeadline(reply.payload);
        break;

      case 'action_boveda_amount_custom':
        setFlowState('BOVEDA_ASK_AMOUNT');
        sendBotReply('Escribe el monto total de tu meta en números (ej: 150):');
        break;

      case 'action_boveda_back_to_reason':
        handleBovedaAskReason();
        break;

      case 'action_boveda_deadline_chosen':
        if (reply.payload) {
          handleBovedaProposal(reply.payload.deadline, reply.payload.months);
        }
        break;

      case 'action_boveda_deadline_custom':
        setFlowState('BOVEDA_ASK_DEADLINE');
        sendBotReply('Escribe el plazo estimado (ej: 4 meses):');
        break;

      case 'action_boveda_back_to_amount':
        if (pendingBovedaSetup?.reason) handleBovedaAskAmount(pendingBovedaSetup.reason);
        else handleBovedaAskReason();
        break;

      case 'action_boveda_percentage_chosen':
        if (reply.payload !== undefined) finalizeBovedaSetup(reply.payload);
        break;

      case 'action_boveda_percentage_custom':
        setFlowState('BOVEDA_ASK_PERCENTAGE');
        sendBotReply('Escribe el porcentaje que deseas guardar (ej: 12%):');
        break;

      case 'action_boveda_back_to_deadline':
        if (pendingBovedaSetup?.targetAmount) handleBovedaAskDeadline(pendingBovedaSetup.targetAmount);
        else handleBovedaAskReason();
        break;

      // Gastos
      case 'action_register':
        setFlowState('AWAITING_EXPENSE_INPUT');
        sendBotReply(
          'Escribe lo que gastaste como hablas con un amigo 👇\n\n_Ejemplos: "Gasté $3 en empanadas" o "pagué 5 de taxi"_',
          [
            { id: 'eg_emp', label: 'Gasté $3 en empanadas', action: 'action_sample_text', payload: 'Gasté $3 en empanadas' },
            { id: 'eg_tax', label: 'Pagué 5 de taxi', action: 'action_sample_text', payload: 'Pagué 5 de taxi' },
            { id: 'eg_cin', label: 'Cine $8', action: 'action_sample_text', payload: 'Cine $8' },
            { id: 'eg_back', label: '⬅️ Atrás', action: 'action_menu' }
          ]
        );
        break;

      case 'action_sample_text':
        if (reply.payload) handleUserSendRawText(reply.payload, true);
        break;

      case 'action_balance':
        handleShowBalance();
        break;

      case 'action_can_i_buy':
        setFlowState('AWAITING_PURCHASE_QUERY');
        sendBotReply(
          '¿De cuánto es la compra que estás pensando? 🛍️',
          [
            { id: 'cq_5', label: '$5', action: 'action_eval_buy_quick', payload: { amount: 5, item: 'esta compra' } },
            { id: 'cq_20', label: '$20', action: 'action_eval_buy_quick', payload: { amount: 20, item: 'esta compra' } },
            { id: 'cq_50', label: '$50', action: 'action_eval_buy_quick', payload: { amount: 50, item: 'esta compra' } },
            { id: 'cq_back', label: '⬅️ Atrás', action: 'action_menu' }
          ]
        );
        break;

      case 'action_eval_buy_quick':
        if (reply.payload) evaluatePurchase(reply.payload.amount, reply.payload.item);
        break;

      case 'action_register_purchase_now':
        if (reply.payload) {
          executeRegisterExpense(reply.payload.amount, 'Ocio', reply.payload.item);
        }
        break;

      case 'action_pause_purchase_24h':
        if (reply.payload) {
          handleSavePausedPurchase(reply.payload.amount, reply.payload.item);
        }
        break;

      case 'action_summary':
        handleShowWeeklySummary();
        break;

      case 'action_end_day':
        handleStartEndDay();
        break;

      case 'action_execute_close_day':
        executeCloseDayLogic();
        break;

      case 'action_close_day_save_leftover_vault':
        handleSaveLeftoverToVaultAndClose();
        break;

      case 'action_nudge_accept_2usd':
        // El reto de $2 sale del saldo del usuario y entra a la bóveda
        const transferNudge: Expense = {
          id: 'nudge_save_' + Date.now(),
          amount: 2,
          category: 'Otros',
          description: 'Reto de ahorro: $2 a Bóveda',
          time: getFormattedTime(),
          dayNumber: diaActual
        };
        setExpensesList((prev) => [transferNudge, ...prev]);
        setBovedaTotal((prev) => Math.round((prev + 2) * 100) / 100);
        sendBotReply(
          `¡Gran trabajo! 🔒 Guardé $2 en tu Bóveda Anti-Impulso. Llevas $${formatMoney(bovedaTotal + 2)} acumulados.`,
          MAIN_MENU_BUTTONS
        );
        break;

      case 'action_nudge_decline':
        sendBotReply('¡Sin problema! Aquí estoy cuando lo necesites.', MAIN_MENU_BUTTONS);
        break;

      // Pausas de 24h decisiones
      case 'action_paused_buy_now':
        if (reply.payload) {
          setPausedPurchases((prev) => prev.filter((p) => p.id !== reply.payload.id));
          executeRegisterExpense(reply.payload.amount, 'Ocio', reply.payload.item);
          setTimeout(() => proceedEndDayDialog(), 1200);
        }
        break;

      case 'action_paused_discard':
        if (reply.payload) {
          setPausedPurchases((prev) => prev.filter((p) => p.id !== reply.payload.id));
          sendBotReply(`¡Frenaste un gasto impulsivo! 💪 Ese dinero sigue a salvo.`, undefined, { delayMs: 400 });
          setTimeout(() => proceedEndDayDialog(), 1200);
        }
        break;

      case 'action_paused_keep':
        proceedEndDayDialog();
        break;

      default:
        showMainMenu();
        break;
    }
  };

  // ==========================================================================
  // MANEJADOR PRINCIPAL DE TEXTO LIBRE DEL USUARIO
  // ==========================================================================
  const handleUserSendRawText = (rawTextToSend?: string, skipAddingUserMessage: boolean = false) => {
    const text = (rawTextToSend || inputText).trim();
    if (!text || isTyping) return;

    if (!skipAddingUserMessage) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'u_' + Date.now(),
          sender: 'user',
          text,
          time: getFormattedTime()
        }
      ]);
    }

    if (!rawTextToSend) setInputText('');
    const cleanLower = text.toLowerCase().trim();

    // 1. Detección global de solicitud de menú
    if (['menú', 'menu', 'inicio', 'ayuda', 'opciones'].includes(cleanLower)) {
      showMainMenu();
      return;
    }

    // 2. Si el usuario escribe una frase de ingreso en cualquier pantalla (ej: "Me pagaron 120" o "Recibí 50")
    const isIncomeExpression = /\b(me pagaron|recibí|recibi|ingreso|ingresaron|cobre|cobré|depósito|deposito|sueldo|pago de)\b/i.test(cleanLower);
    if (isIncomeExpression) {
      const { amount } = parseExpenseInput(text);
      if (amount !== null && amount > 0) {
        handleIncomeAmountStep(amount);
      } else {
        startIncomeFlow();
      }
      return;
    }

    // 3. Manejo contextual según el estado activo del bot
    if (flowState === 'AWAITING_INCOME_AMOUNT') {
      const { amount } = parseExpenseInput(text);
      if (amount !== null && amount > 0) {
        handleIncomeAmountStep(amount);
      } else {
        sendBotReply('¿Cuánto fue? 💵 Escribe solo el número (ej: 120):');
      }
      return;
    }

    if (flowState === 'AWAITING_INCOME_FIXED_AMOUNT') {
      const { amount } = parseExpenseInput(text);
      finalizeIncome(pendingIncome?.amount || 0, 'week', amount || 0);
      return;
    }

    if (flowState === 'BOVEDA_OFFER_DECISION') {
      if (['si', 'sí', 'sip', 'claro', 'quiero', 'dale'].includes(cleanLower)) {
        handleBovedaAskReason();
      } else {
        setBovedaConfig({ configured: true, active: false, targetAmount: 0, reason: '', deadline: '', percentage: 0 });
        sendBotReply('¡Listo! Tu dinero queda libre para gastar 👍', MAIN_MENU_BUTTONS);
      }
      return;
    }

    if (flowState === 'BOVEDA_ASK_REASON') {
      handleBovedaAskAmount(text);
      return;
    }

    if (flowState === 'BOVEDA_ASK_AMOUNT') {
      const { amount } = parseExpenseInput(text);
      if (amount !== null && amount > 0) {
        handleBovedaAskDeadline(amount);
      } else {
        sendBotReply('Escribe el monto en números (ej: 100):');
      }
      return;
    }

    if (flowState === 'BOVEDA_ASK_DEADLINE') {
      handleBovedaProposal(text, 3);
      return;
    }

    if (flowState === 'BOVEDA_ASK_PERCENTAGE') {
      const { amount } = parseExpenseInput(text);
      finalizeBovedaSetup(amount || 10);
      return;
    }

    if (flowState === 'AWAITING_PURCHASE_QUERY') {
      const { amount } = parseExpenseInput(text);
      if (amount !== null) {
        evaluatePurchase(amount, 'esta compra');
      } else {
        sendBotReply('Escribe el monto de la compra que estás pensando (ej: 25):');
      }
      return;
    }

    // 4. Consulta directa de "¿Puedo comprar...?" desde cualquier punto
    if (cleanLower.includes('puedo comprar') || cleanLower.includes('me alcanza') || cleanLower.includes('me compro')) {
      const { amount } = parseExpenseInput(text);
      // Extraer nombre del producto si fue escrito
      const itemMatch = text.match(/(?:puedo comprar|me compro|me alcanza para)\s+(?:un|una|unos|unas|el|la|los|las)?\s*([a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+?)(?:\s+(?:de|por|\$)\s*\d+|$)/i);
      const extractedItem = itemMatch && itemMatch[1].trim().length > 1 ? itemMatch[1].trim() : 'esta compra';

      if (amount !== null) {
        evaluatePurchase(amount, extractedItem);
      } else {
        setFlowState('AWAITING_PURCHASE_QUERY');
        sendBotReply(`¿De cuánto es ${extractedItem}? Escribe el monto o toca una opción:`, [
          { id: 'cq_5_2', label: '$5', action: 'action_eval_buy_quick', payload: { amount: 5, item: extractedItem } },
          { id: 'cq_20_2', label: '$20', action: 'action_eval_buy_quick', payload: { amount: 20, item: extractedItem } },
          { id: 'cq_50_2', label: '$50', action: 'action_eval_buy_quick', payload: { amount: 50, item: extractedItem } },
          { id: 'cq_back', label: '⬅️ Atrás', action: 'action_menu' }
        ]);
      }
      return;
    }

    // 5. Palabras globales en estado MENU
    if (['saldo', 'mi saldo', 'cuanto me queda', 'cuánto me queda'].includes(cleanLower)) {
      handleShowBalance();
      return;
    }

    if (['resumen', 'resumen semanal', 'semana'].includes(cleanLower)) {
      handleShowWeeklySummary();
      return;
    }

    if (['boveda', 'bóveda', 'mi boveda', 'mi bóveda'].includes(cleanLower)) {
      handleShowBovedaStatus();
      return;
    }

    // 6. Registro de gastos natural
    const parsed = parseExpenseInput(text);

    if (parsed.hasMultipleAmounts) {
      sendBotReply('Vi más de un número en tu mensaje. ¿Cuál fue el monto del gasto?');
      return;
    }

    // Caso A: Monto y categoría reconocidos
    if (parsed.amount !== null && parsed.category !== null) {
      executeRegisterExpense(parsed.amount, parsed.category, text, false);
      return;
    }

    // Caso B: Solo monto detectado -> D6: Asignar a 'Otros' directamente con botón para cambiar categoría
    if (parsed.amount !== null && parsed.category === null) {
      executeRegisterExpense(parsed.amount, 'Otros', text, true);
      return;
    }

    // Caso C: No se entendió el mensaje
    sendBotReply(
      'No te entendí bien. ¿Quieres registrar un gasto, ver tu saldo o registrar un ingreso?',
      MAIN_MENU_BUTTONS
    );
  };

  // ==========================================================================
  // PANEL DE PRUEBAS DE EVALUADORES
  // ==========================================================================
  const loadScenario1Data = () => {
    setIsTestPanelOpen(false);
    setIsMenuOpen(false);
    setDiaActual(1);
    setExpensesList([]);
    setIncomesList([
      {
        id: 'inc_test_120',
        amount: 120,
        timeframe: 'week',
        source: 'Trabajo',
        fixedPayments: 0,
        bovedaAmount: 0,
        dayAdded: 1,
        time: '09:00'
      }
    ]);
    sendBotReply('⚡ [Escenario 1 cargado]: Ingreso de $120 para toda la semana. Tu saldo de hoy es $17.14.', MAIN_MENU_BUTTONS);
  };

  const loadScenario2Data = () => {
    setIsTestPanelOpen(false);
    setIsMenuOpen(false);
    setDiaActual(1);
    setIncomesList([
      {
        id: 'inc_test_sc2',
        amount: 120,
        timeframe: 'week',
        source: 'Trabajo',
        fixedPayments: 0,
        bovedaAmount: 0,
        dayAdded: 1,
        time: '09:00'
      }
    ]);
    // Gastos que superen el 80% de $17.14 (~$14 gastados)
    const mockExpense: Expense = {
      id: 'exp_sc2',
      amount: 14,
      category: 'Alimentación',
      description: 'Almuerzo y compras',
      time: '13:00',
      dayNumber: 1
    };
    setExpensesList([mockExpense]);
    setHasTriggered80Today(true);

    sendBotReply('⚡ [Escenario 2 cargado]: Gasto del 80% del saldo de hoy ($14 / $17.14). Lanzando alerta...', undefined, { delayMs: 400 });
    setTimeout(() => {
      sendBotReply(
        '⚠️ Llevas gastado el 80% de tu saldo de hoy ($14 de $17.14). Reto: evita otro gasto y guarda $2 en tu Bóveda 🔒 ¿Te sumas?',
        [
          { id: 'n_yes', label: 'Me sumo ($2 a bóveda)', action: 'action_nudge_accept_2usd' },
          { id: 'n_no', label: 'Ahora no', action: 'action_nudge_decline' }
        ],
        { isAmberAlert: true }
      );
    }, 1000);
  };

  const loadScenario3Data = () => {
    setIsTestPanelOpen(false);
    setIsMenuOpen(false);
    setDiaActual(3);
    setBovedaConfig({
      configured: true,
      active: true,
      targetAmount: 100,
      reason: 'Emergencias',
      deadline: '3 meses',
      percentage: 20
    });
    setBovedaTotal(24);
    setIncomesList([
      {
        id: 'inc_test_sc3',
        amount: 120,
        timeframe: 'week',
        source: 'Trabajo',
        fixedPayments: 0,
        bovedaAmount: 24,
        dayAdded: 1,
        time: '09:00'
      }
    ]);
    setExpensesList([
      { id: 'm1', amount: 15, category: 'Alimentación', description: 'Supermercado', time: '13:00', dayNumber: 1 },
      { id: 'm2', amount: 8, category: 'Ocio', description: 'Cine', time: '18:00', dayNumber: 2 },
      { id: 'm3', amount: 5, category: 'Transporte', description: 'Uber', time: '10:00', dayNumber: 3 }
    ]);

    sendBotReply('⚡ [Escenario 3 cargado]: Día 3, $24 en Bóveda y gastos registrados. Mostrando resumen...', undefined, { delayMs: 400 });
    setTimeout(() => {
      handleShowWeeklySummary();
    }, 900);
  };

  const handleResetDemoCompletely = () => {
    setDiaActual(1);
    setSemanaActual(1);
    setIncomesList([]);
    setExpensesList([]);
    setBovedaTotal(0);
    setBovedaConfig({
      configured: false,
      active: false,
      targetAmount: 0,
      reason: '',
      deadline: '',
      percentage: 0
    });
    setPausedPurchases([]);
    setHasTriggered80Today(false);
    setLastAction(null);
    setPendingIncome(null);
    setPendingBovedaSetup(null);
    setInputText('');
    setIsTyping(false);
    setMessages([]);
    setIsMenuOpen(false);
    setIsTestPanelOpen(false);
    setFlowState('WELCOME');
    setScreen('welcome');
  };

  // Buscar el ID del último mensaje del bot que tiene quickReplies
  const lastBotMsgWithReplies = [...messages]
    .reverse()
    .find((m) => m.sender === 'bot' && m.quickReplies && m.quickReplies.length > 0);
  const lastBotMsgWithRepliesId = lastBotMsgWithReplies?.id;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-0 sm:p-4 font-sans select-none antialiased">
      <div className="w-full max-w-[420px] h-screen sm:h-[740px] bg-[#efeae2] flex flex-col relative sm:rounded-3xl shadow-2xl sm:border sm:border-slate-800 overflow-hidden">
        
        {/* PANTALLA DE BIENVENIDA */}
        {screen === 'welcome' && (
          <div className="flex-1 flex flex-col justify-between p-6 bg-gradient-to-b from-[#075e54] via-[#008069] to-[#054c44] text-white relative">
            <div className="flex items-center justify-between text-xs text-emerald-100 font-medium">
              <span>9:41</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px]">5G</span>
                <div className="w-4 h-2 border border-current rounded-xs flex items-center p-0.5">
                  <div className="w-full h-full bg-current rounded-2xs" />
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center text-center my-auto py-6">
              <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-md border-2 border-white/20 flex items-center justify-center shadow-xl mb-6">
                <span className="text-5xl" role="img" aria-label="FinBot">🤖</span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
                FinBot
              </h1>
              <p className="text-emerald-100 text-base font-semibold max-w-[280px] leading-snug">
                Tu saldo de hoy, directo en el chat
              </p>
            </div>

            <div className="w-full pb-6">
              <button
                onClick={handleStartChat}
                className="w-full min-h-[52px] py-4 px-6 bg-[#25d366] hover:bg-[#20ba59] active:scale-[0.98] text-[#075e54] font-bold text-base rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Iniciar chat</span>
                <ChevronRight className="w-5 h-5 text-[#075e54]" />
              </button>
            </div>
          </div>
        )}

        {/* PANTALLA DE CHAT WHATSAPP */}
        {screen === 'chat' && (
          <div className="flex-1 flex flex-col h-full bg-[#efeae2] relative overflow-hidden">
            
            {/* ENCABEZADO */}
            <header className="bg-[#008069] text-white px-3 py-2.5 flex items-center justify-between shadow-md z-20 shrink-0">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setScreen('welcome')}
                  className="p-1 -ml-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                  title="Volver a bienvenida"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-[#075e54] border border-white/20 flex items-center justify-center text-xl shadow-xs">
                    🤖
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full bg-[#25d366] absolute bottom-0 right-0 border-2 border-[#008069]" />
                </div>

                <div className="flex flex-col">
                  <div className="font-semibold text-sm leading-tight flex items-center gap-1">
                    <span>FinBot</span>
                    <span className="text-[10px] text-emerald-200">✓</span>
                  </div>
                  <div className="text-[11px] text-emerald-100/90 leading-tight">
                    {isTyping ? 'escribiendo...' : 'en línea'}
                  </div>
                </div>
              </div>

              {/* Botón Menú fijo en el encabezado */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="min-h-[44px] px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <MenuIcon className="w-4 h-4" />
                  <span>Menú</span>
                </button>

                <button
                  onClick={() => setIsTestPanelOpen(!isTestPanelOpen)}
                  className="min-h-[44px] p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-emerald-100 transition-all cursor-pointer"
                  title="Panel de pruebas"
                >
                  <Sliders className="w-4 h-4" />
                </button>
              </div>
            </header>

            {/* MENÚ DESPLEGABLE */}
            {isMenuOpen && (
              <div className="absolute top-[58px] left-0 right-0 z-30 bg-[#075e54] text-white p-4 shadow-xl border-b border-emerald-400/20 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                    Opciones de FinBot
                  </span>
                  <button 
                    onClick={() => setIsMenuOpen(false)}
                    className="p-1 text-emerald-200 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1.5 text-xs">
                  {MAIN_MENU_BUTTONS.map((btn) => (
                    <button
                      key={btn.id}
                      onClick={() => {
                        setIsMenuOpen(false);
                        handleQuickReplyClick('menu_nav', btn);
                      }}
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-left font-semibold flex items-center justify-between cursor-pointer"
                    >
                      <span>{btn.label}</span>
                      <ChevronRight className="w-4 h-4 text-emerald-300" />
                    </button>
                  ))}

                  <div className="pt-2 mt-2 border-t border-white/10">
                    <button
                      onClick={handleResetDemoCompletely}
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-amber-200 text-left font-semibold flex items-center gap-2 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Reiniciar demo (borrar todo)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* PANEL DE PRUEBAS */}
            {isTestPanelOpen && (
              <div className="absolute top-[58px] left-0 right-0 z-30 bg-slate-900 text-white p-4 shadow-2xl border-b border-slate-700 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Panel de Pruebas de Evaluadores
                  </span>
                  <button 
                    onClick={() => setIsTestPanelOpen(false)}
                    className="p-1 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <button
                    onClick={loadScenario1Data}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-200 text-left font-semibold flex items-center justify-between cursor-pointer"
                  >
                    <span>💵 Escenario 1: $120 semanal ($17.14 hoy)</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={loadScenario2Data}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-200 text-left font-semibold flex items-center justify-between cursor-pointer"
                  >
                    <span>⚠️ Escenario 2: Alerta de gasto al 80%</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={loadScenario3Data}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-200 text-left font-semibold flex items-center justify-between cursor-pointer"
                  >
                    <span>📊 Escenario 3: Resumen con Bóveda activa</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      setIsTestPanelOpen(false);
                      executeRegisterExpense(5, 'Alimentación', 'Empanada');
                    }}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-200 text-left font-semibold flex items-center justify-between cursor-pointer"
                  >
                    <span>⚡ Probar gasto sin saldo ($5 → −$5)</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={handleResetDemoCompletely}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-left font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reiniciar demo a cero ($0)</span>
                  </button>
                </div>
              </div>
            )}

            {/* ÁREA DE MENSAJES */}
            <div 
              className="flex-1 overflow-y-auto p-3 space-y-3"
              style={{
                backgroundColor: '#efeae2',
                backgroundImage: 'radial-gradient(#d1d7db 1px, transparent 1px)',
                backgroundSize: '16px 16px'
              }}
            >
              {/* Notificación de cifrado */}
              <div className="flex justify-center my-1">
                <div className="bg-[#ffeecd] border border-amber-200/60 text-amber-900 text-[10px] px-3 py-1 rounded-lg text-center shadow-2xs max-w-[300px]">
                  Conversación privada · FinBot
                </div>
              </div>

              {messages.map((msg) => {
                const isUser = msg.sender === 'user';
                const isAmber = msg.isAmberAlert;
                // D3: Solo los botones del ÚLTIMO mensaje con botones quedan activos
                const isLatestWithReplies = msg.id === lastBotMsgWithRepliesId;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[88%] ${
                      isUser ? 'ml-auto' : 'mr-auto'
                    }`}
                  >
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 text-xs shadow-xs relative leading-relaxed ${
                        isUser
                          ? 'bg-[#d9fdd3] text-slate-900 rounded-tr-xs'
                          : isAmber
                          ? 'bg-[#fffbeb] border border-amber-300 text-amber-950 rounded-tl-xs'
                          : 'bg-white text-slate-900 rounded-tl-xs'
                      }`}
                    >
                      <div className="whitespace-pre-line text-[13px] leading-relaxed">
                        {msg.text.split('\n').map((line, lIdx) => (
                          <React.Fragment key={lIdx}>
                            {line.split(/(\*[^*]+\*|_[^_]+_)/g).map((chunk, cIdx) => {
                              if (chunk.startsWith('*') && chunk.endsWith('*')) {
                                return (
                                  <strong key={cIdx} className="font-bold text-slate-950">
                                    {chunk.slice(1, -1)}
                                  </strong>
                                );
                              }
                              if (chunk.startsWith('_') && chunk.endsWith('_')) {
                                return (
                                  <em key={cIdx} className="italic text-slate-500">
                                    {chunk.slice(1, -1)}
                                  </em>
                                );
                              }
                              return chunk;
                            })}
                            {lIdx < msg.text.split('\n').length - 1 && <br />}
                          </React.Fragment>
                        ))}
                      </div>

                      <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 mt-1 float-right ml-2 select-none">
                        <span>{msg.time}</span>
                        {isUser && <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] inline" />}
                      </div>
                    </div>

                    {/* Botones de respuesta rápida */}
                    {msg.quickReplies && msg.quickReplies.length > 0 && (
                      <div className="w-full mt-2 space-y-1.5">
                        {msg.quickReplies.map((reply) => {
                          const isSelected = msg.selectedReplyId === reply.id;
                          // D3: Inactivo si este mensaje ya no es el último o ya fue seleccionado
                          const isDisabled = !isLatestWithReplies || msg.selectedReplyId !== undefined;

                          return (
                            <button
                              key={reply.id}
                              onClick={() => {
                                if (!isDisabled) {
                                  handleQuickReplyClick(msg.id, reply);
                                }
                              }}
                              disabled={isDisabled}
                              className={`w-full min-h-[44px] py-2 px-3.5 rounded-xl text-left text-xs font-semibold transition-all shadow-xs flex items-center justify-between active:scale-[0.98] ${
                                isSelected
                                  ? 'bg-[#008069] text-white border border-[#00705c]'
                                  : isDisabled
                                  ? 'bg-slate-200 text-slate-400 border border-slate-300 opacity-50 cursor-not-allowed pointer-events-none'
                                  : 'bg-white hover:bg-slate-50 text-[#008069] border border-slate-200 hover:border-[#008069] cursor-pointer'
                              }`}
                            >
                              <span>{reply.label}</span>
                              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex flex-col items-start max-w-[85%] mr-auto animate-in fade-in duration-200">
                  <div className="bg-white rounded-2xl rounded-tl-xs px-4 py-2.5 shadow-xs flex items-center gap-1.5">
                    <span className="text-sm mr-0.5">🤖</span>
                    <span className="text-[11px] text-slate-400 font-medium mr-1">FinBot</span>
                    <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" />
                    <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* MODAL NOTA DE VOZ */}
            {isVoiceModalOpen && (
              <div className="absolute inset-0 z-30 bg-black/50 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-150">
                <div className="bg-[#efeae2] border-t border-slate-300 rounded-t-3xl p-4 shadow-2xl max-h-[80%] flex flex-col">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-300/80 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#008069] text-white flex items-center justify-center">
                        <Mic className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 leading-tight">Simular Nota de Voz</h4>
                        <p className="text-[10px] text-slate-500">Toca un audio para registrar en 2 segundos:</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsVoiceModalOpen(false)}
                      className="p-1 rounded-full text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2 overflow-y-auto pr-1 py-1">
                    {VOICE_SIMULATION_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setIsVoiceModalOpen(false);
                          setMessages((prev) => [
                            ...prev,
                            {
                              id: 'v_' + Date.now(),
                              sender: 'user',
                              text: `🎤 [Nota de voz: "${opt.transcript}"]`,
                              time: getFormattedTime()
                            }
                          ]);
                          executeRegisterExpense(opt.amount, opt.category, opt.desc);
                        }}
                        className="w-full min-h-[48px] p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-[#008069] text-left transition-all shadow-xs flex items-center justify-between gap-2 cursor-pointer active:scale-[0.99]"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className="text-base shrink-0">🎤</span>
                          <div className="truncate">
                            <div className="text-xs font-bold text-slate-900 truncate">"{opt.transcript}"</div>
                            <div className="text-[10px] text-slate-500">{opt.category} · {opt.desc}</div>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[#008069] font-bold text-xs font-mono shrink-0">
                          ${opt.amount}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 mt-2 border-t border-slate-300/60">
                    <button
                      onClick={() => setIsVoiceModalOpen(false)}
                      className="w-full min-h-[40px] py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL FOTO DE RECIBO */}
            {isPhotoModalOpen && (
              <div className="absolute inset-0 z-30 bg-black/50 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-150">
                <div className="bg-[#efeae2] border-t border-slate-300 rounded-t-3xl p-4 shadow-2xl max-h-[80%] flex flex-col">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-300/80 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#008069] text-white flex items-center justify-center">
                        <Camera className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 leading-tight">Simular Foto de Recibo</h4>
                        <p className="text-[10px] text-slate-500">Toca un comprobante para escanear:</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsPhotoModalOpen(false)}
                      className="p-1 rounded-full text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2 overflow-y-auto pr-1 py-1">
                    {PHOTO_SIMULATION_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setIsPhotoModalOpen(false);
                          setMessages((prev) => [
                            ...prev,
                            {
                              id: 'p_' + Date.now(),
                              sender: 'user',
                              text: `📷 [Foto de recibo: ${opt.merchant} - $${opt.amount}]`,
                              time: getFormattedTime()
                            }
                          ]);
                          executeRegisterExpense(opt.amount, opt.category, opt.desc);
                        }}
                        className="w-full min-h-[48px] p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-[#008069] text-left transition-all shadow-xs flex items-center justify-between gap-2 cursor-pointer active:scale-[0.99]"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className="text-base shrink-0">🧾</span>
                          <div className="truncate">
                            <div className="text-xs font-bold text-slate-900 truncate">{opt.merchant}</div>
                            <div className="text-[10px] text-slate-500">{opt.category} · {opt.desc}</div>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[#008069] font-bold text-xs font-mono shrink-0">
                          ${opt.amount}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 mt-2 border-t border-slate-300/60">
                    <button
                      onClick={() => setIsPhotoModalOpen(false)}
                      className="w-full min-h-[40px] py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* BARRA INFERIOR DE INPUT */}
            <footer className="p-2 bg-[#f0f2f5] border-t border-slate-200 flex items-center gap-1.5 shrink-0 z-10">
              <button 
                type="button" 
                onClick={() => setIsPhotoModalOpen(true)}
                disabled={isTyping}
                className="min-w-[44px] min-h-[44px] rounded-full text-slate-600 hover:text-[#008069] hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
                title="Elegir foto de recibo"
              >
                <Camera className="w-5 h-5" />
              </button>

              <button 
                type="button" 
                onClick={() => setIsVoiceModalOpen(true)}
                disabled={isTyping}
                className="min-w-[44px] min-h-[44px] rounded-full text-slate-600 hover:text-[#008069] hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
                title="Elegir nota de voz"
              >
                <Mic className="w-5 h-5" />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUserSendRawText();
                }}
                placeholder="Escribe un mensaje..."
                disabled={isTyping}
                className="flex-1 bg-white text-slate-900 placeholder-slate-400 text-xs rounded-xl px-3.5 py-2.5 border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-[#008069] min-h-[44px] disabled:bg-slate-100"
              />

              <button
                onClick={() => handleUserSendRawText()}
                disabled={isTyping || !inputText.trim()}
                className={`min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center shadow-md transition-all shrink-0 cursor-pointer ${
                  inputText.trim() && !isTyping
                    ? 'bg-[#00a884] hover:bg-[#008f70] text-white active:scale-95'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60'
                }`}
                title="Enviar mensaje"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </footer>

          </div>
        )}

      </div>
    </div>
  );
}
