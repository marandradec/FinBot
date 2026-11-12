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
// CONSTANTES CONFIGURABLES
// ============================================================================
const SALDO_DIARIO_BASE = 0;   // La app arranca en cero
const DIAS_SEMANA = 7;
const PRESUPUESTO_OCIO_SEMANAL = 15;

type ExpenseCategory = 'Alimentación' | 'Ocio' | 'Transporte' | 'Otros';

interface Expense {
  id: string;
  amount: number;
  category: ExpenseCategory;
  description: string;
  time: string;
}

interface Income {
  id: string;
  amount: number;
  timeframe: 'today' | 'week';
  source: string;
  fixedPayments: number;
  bovedaAmount: number;
  dailyAdded: number;
  time: string;
}

interface BovedaConfig {
  configured: boolean;
  targetAmount: number;
  reason: string;
  deadline: string;
  percentage: number;
}

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  time: string;
  quickReplies?: {
    id: string;
    label: string; // UN solo emoji al inicio del texto
    action: string;
    payload?: any;
  }[];
  selectedReplyId?: string;
  isAmberAlert?: boolean;
}

// Estados finitos para el flujo conversacional
type FlowState = 
  | 'WELCOME'
  | 'MENU'
  | 'AWAITING_INCOME_AMOUNT'
  | 'AWAITING_INCOME_TIMEFRAME'
  | 'AWAITING_INCOME_SOURCE'
  | 'AWAITING_INCOME_CUSTOM_SOURCE'
  | 'AWAITING_INCOME_FIXED_ASK'
  | 'AWAITING_INCOME_FIXED_AMOUNT'
  | 'BOVEDA_ASK_DECISION'
  | 'BOVEDA_ASK_AMOUNT'
  | 'BOVEDA_CUSTOM_AMOUNT'
  | 'BOVEDA_ASK_REASON'
  | 'BOVEDA_CUSTOM_REASON'
  | 'BOVEDA_ASK_DEADLINE'
  | 'BOVEDA_CUSTOM_DEADLINE'
  | 'BOVEDA_ASK_PERCENTAGE'
  | 'BOVEDA_CUSTOM_PERCENTAGE'
  | 'AWAITING_AMOUNT'
  | 'AWAITING_CATEGORY'
  | 'AWAITING_PURCHASE_AMOUNT'
  | 'CONFIRMING_CLOSE_DAY';

// Diccionario semántico de palabras clave para categorización
const CATEGORY_KEYWORDS: Record<ExpenseCategory, string[]> = {
  Alimentación: [
    'empanada', 'empanadas', 'almuerzo', 'comida', 'cena', 'desayuno', 'café', 'cafe', 
    'cafecito', 'pizza', 'hamburguesa', 'sushi', 'tacos', 'pan', 'panaderia', 'panadería', 
    'super', 'supermercado', 'mercado', 'merienda', 'snack', 'restaurante', 'starbucks', 
    'sandwich', 'helado', 'postre', 'delivery', 'rappi', 'pedidosya', 'chuchería', 'galletas',
    'gaseosa', 'refresco', 'jugo', 'agua'
  ],
  Ocio: [
    'cine', 'pelicula', 'película', 'salida', 'fiesta', 'boliche', 'bar', 'chela', 
    'chelas', 'cerveza', 'birra', 'trago', 'ropa', 'shopping', 'compras', 'juego', 
    'videojuego', 'steam', 'playstation', 'netflix', 'spotify', 'concierto', 'evento', 
    'entradas', 'zara', 'h&m', 'zapatillas', 'tenis', 'championes', 'disco', 'discoteca'
  ],
  Transporte: [
    'taxi', 'uber', 'didi', 'cabify', 'bus', 'colectivo', 'subte', 'metro', 'pasaje', 
    'pasajes', 'gasolina', 'nafta', 'combustible', 'peaje', 'estacionamiento', 'micro', 
    'transporte', 'recarga bip', 'parquímetro'
  ],
  Otros: [
    'farmacia', 'medicina', 'remedio', 'pastillas', 'médico', 'dentista', 'fotocopias',
    'impresiones', 'cuaderno', 'libro', 'arriendo', 'luz', 'agua', 'internet', 'celular',
    'regalo', 'varios', 'compra'
  ]
};

// Opciones predefinidas para simular Notas de Voz
const VOICE_SIMULATION_OPTIONS = [
  { id: 'v1', transcript: 'Gasté $10 en almuerzo', amount: 10, category: 'Alimentación' as const, desc: 'Almuerzo' },
  { id: 'v2', transcript: 'pagué 5 de taxi', amount: 5, category: 'Transporte' as const, desc: 'Taxi' },
  { id: 'v3', transcript: 'cine $8 con amigos', amount: 8, category: 'Ocio' as const, desc: 'Cine' },
  { id: 'v4', transcript: 'café con galletas de $3', amount: 3, category: 'Alimentación' as const, desc: 'Café' },
  { id: 'v5', transcript: 'farmacia $7 en medicina', amount: 7, category: 'Otros' as const, desc: 'Farmacia' },
];

// Opciones predefinidas para simular Fotos de Recibos
const PHOTO_SIMULATION_OPTIONS = [
  { id: 'p1', merchant: 'Restaurante Menú', amount: 10, category: 'Alimentación' as const, desc: 'Menú del día' },
  { id: 'p2', merchant: 'Cafetería Starbucks', amount: 4, category: 'Alimentación' as const, desc: 'Latte y snack' },
  { id: 'p3', merchant: 'Farmacia San Pablo', amount: 7, category: 'Otros' as const, desc: 'Medicamentos' },
  { id: 'p4', merchant: 'Supermercado Oxxo', amount: 15, category: 'Alimentación' as const, desc: 'Víveres' },
  { id: 'p5', merchant: 'Cinépolis Entradas', amount: 8, category: 'Ocio' as const, desc: 'Entrada de cine' },
];

// Formato de hora actual HH:MM
const getFormattedTime = (): string => {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
};

// Formato de dinero positivo amigable sin decimales innecesarios
const formatMoney = (val: number): string => {
  if (isNaN(val)) return '0';
  const rounded = Math.round(val * 100) / 100;
  return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(2);
};

// Formato de saldo que soporta saldo negativo permitido con signo menos "−"
const formatBalance = (val: number): string => {
  if (isNaN(val)) return '$0';
  const rounded = Math.round(val * 100) / 100;
  const absVal = Math.abs(rounded);
  const formattedAbs = absVal % 1 === 0 ? absVal.toString() : absVal.toFixed(2);
  if (rounded < 0) {
    return `−$${formattedAbs}`;
  }
  return `$${formattedAbs}`;
};

// Parser robusto y tolerante de montos y categorías
const parseExpenseInput = (input: string) => {
  const clean = input.toLowerCase().trim();

  // Buscar todos los números en el mensaje
  const matches = clean.match(/(?:\$?\s*(\d+(?:[.,]\d{1,2})?)\s*(?:usd|dólares|dolares|bucks)?)/g);
  
  let amount: number | null = null;
  let hasMultipleAmounts = false;

  if (matches && matches.length > 0) {
    if (matches.length > 1) {
      hasMultipleAmounts = true;
    }
    const rawNum = matches[0].replace(/[^\d.,]/g, '').replace(',', '.');
    const parsed = parseFloat(rawNum);
    if (!isNaN(parsed) && parsed > 0) {
      amount = parsed;
    }
  }

  // Detectar categoría por palabras clave
  let category: ExpenseCategory | null = null;
  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS) as [ExpenseCategory, string[]][]) {
    for (const word of words) {
      if (clean.includes(word)) {
        category = cat;
        break;
      }
    }
    if (category) break;
  }

  return { amount, category, hasMultipleAmounts, clean };
};

export default function App() {
  // Estado de pantalla
  const [screen, setScreen] = useState<'welcome' | 'chat'>('welcome');
  const [flowState, setFlowState] = useState<FlowState>('WELCOME');

  // Menús modales
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTestPanelOpen, setIsTestPanelOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  // Estados financieros en memoria (inician en cero)
  const [diaActual, setDiaActual] = useState(1);
  const [semanaActual, setSemanaActual] = useState(1);
  const [saldoRealGastable, setSaldoRealGastable] = useState(SALDO_DIARIO_BASE);
  const [saldoSemanalAcumulado, setSaldoSemanalAcumulado] = useState(0); // Acumulador semanal para sobrantes
  const [bovedaTotal, setBovedaTotal] = useState(0);
  const [ahorroActual, setAhorroActual] = useState(0);
  const [incomesWeekly, setIncomesWeekly] = useState<Income[]>([]);
  const [expensesToday, setExpensesToday] = useState<Expense[]>([]);
  const [expensesWeekly, setExpensesWeekly] = useState<Expense[]>([]);
  const [hasAskedFixedPaymentsOnce, setHasAskedFixedPaymentsOnce] = useState(false);

  // Configuración de la Bóveda Anti-Impulso (Opcional, sin forzar al usuario)
  const [bovedaConfig, setBovedaConfig] = useState<BovedaConfig>({
    configured: false,
    targetAmount: 0,
    reason: '',
    deadline: '',
    percentage: 0
  });

  // Datos temporales mientras se configura la bóveda
  const [pendingBovedaData, setPendingBovedaData] = useState<{
    targetAmount?: number;
    reason?: string;
    deadline?: string;
    percentage?: number;
    sourceFlow?: 'income_first_time' | 'menu';
  } | null>(null);

  // Si la bóveda se activa durante el registro del primer ingreso, guardamos los datos del ingreso
  const [pendingIncomeForBoveda, setPendingIncomeForBoveda] = useState<{
    amount: number;
    timeframe: 'today' | 'week';
    source: string;
    fixedPayments: number;
  } | null>(null);

  // Historial para deshacer último gasto o ingreso
  const [lastExpenseSnapshot, setLastExpenseSnapshot] = useState<{
    expense: Expense;
    previousSaldo: number;
  } | null>(null);

  const [lastIncomeSnapshot, setLastIncomeSnapshot] = useState<{
    income: Income;
    previousSaldo: number;
    previousBoveda: number;
    previousSemanal: number;
  } | null>(null);

  // Estados temporales del flujo de ingresos
  const [pendingIncomeData, setPendingIncomeData] = useState<{
    amount?: number;
    timeframe?: 'today' | 'week';
    source?: string;
    fixedPayments?: number;
    isCorrectingAmount?: boolean;
  } | null>(null);

  // Estados temporales de gastos
  const [pendingExpenseData, setPendingExpenseData] = useState<{
    amount?: number;
    category?: ExpenseCategory;
    desc?: string;
  } | null>(null);

  // Estados de entrada del chat
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll automático hacia el último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Lista estricta del Menú Principal
  const MAIN_MENU_BUTTONS = [
    { id: 'btn_inc', label: '💵 Registrar ingreso', action: 'action_income_start' },
    { id: 'btn_reg', label: '➕ Registrar gasto', action: 'action_register' },
    { id: 'btn_sal', label: '💰 Mi saldo de hoy', action: 'action_balance' },
    { id: 'btn_buy', label: '🛍️ ¿Puedo comprar...?', action: 'action_can_i_buy' },
    { id: 'btn_sum', label: '📊 Resumen semanal', action: 'action_summary' },
    { id: 'btn_end', label: '🌙 Finalizar día', action: 'action_end_day' },
    { id: 'btn_bov', label: '🔒 Mi bóveda', action: 'action_boveda_start' }
  ];

  // ==========================================================================
  // INICIAR CHAT Y MENÚ PRINCIPAL
  // ==========================================================================
  const handleStartChat = () => {
    try {
      setScreen('chat');
      setFlowState('MENU');
      if (messages.length === 0) {
        setMessages([
          {
            id: 'msg_welcome_init',
            sender: 'bot',
            text: '¡Hola! 👋 Para calcular cuánto puedes gastar hoy, cuéntame cuánta plata recibiste.',
            time: getFormattedTime(),
            quickReplies: [
              { id: 'w_inc', label: '💵 Registrar ingreso', action: 'action_income_start' },
              { id: 'w_menu', label: '☰ Menú', action: 'action_menu' }
            ]
          }
        ]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Enviar mensaje del bot con animación de "escribiendo..." (máx. 1 seg)
  const sendBotReply = (
    text: string, 
    quickReplies?: Message['quickReplies'], 
    options?: { isAmberAlert?: boolean; delayMs?: number }
  ) => {
    try {
      setIsTyping(true);
      const delay = options?.delayMs !== undefined ? options.delayMs : 950;
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
    } catch (e) {
      setIsTyping(false);
      console.error(e);
    }
  };

  // Mostrar menú principal en el chat
  const showMainMenuInChat = () => {
    setFlowState('MENU');
    setPendingExpenseData(null);
    setPendingIncomeData(null);
    setPendingBovedaData(null);
    setIsMenuOpen(false);
    sendBotReply(
      'Menú principal 🤖 ¿En qué te ayudo ahora?',
      MAIN_MENU_BUTTONS
    );
  };

  // ==========================================================================
  // FLUJO DE INGRESOS (CAMBIO 1: BOTONES EXACTOS)
  // ==========================================================================
  const startIncomeFlow = () => {
    setFlowState('AWAITING_INCOME_AMOUNT');
    setPendingIncomeData({ isCorrectingAmount: false });
    sendBotReply(
      '¿Cuánto recibiste? 💵 Escríbelo normal, por ejemplo: "Me pagaron $120"',
      [
        { id: 'inc_100', label: '💵 Me pagaron $100', action: 'action_income_sample_amount', payload: 100 },
        { id: 'inc_50', label: '💵 Recibí $50', action: 'action_income_sample_amount', payload: 50 },
        { id: 'inc_20', label: '💵 Recibí $20', action: 'action_income_sample_amount', payload: 20 },
        { id: 'inc_otro', label: '✍️ Otro (escribir)', action: 'action_income_custom_amount_prompt' },
        { id: 'inc_back', label: '⬅️ Atrás', action: 'action_menu' }
      ]
    );
  };

  // Paso 1 procesado -> Preguntar Paso 2 (tiempo)
  const handleIncomeAmountEntered = (amount: number) => {
    // Si estaba en corrección de monto, mantener opciones previas y recalcular
    if (pendingIncomeData?.isCorrectingAmount && pendingIncomeData.timeframe) {
      finalizeIncomeRegistration({
        amount,
        timeframe: pendingIncomeData.timeframe,
        source: pendingIncomeData.source || 'Ingreso',
        fixedPayments: pendingIncomeData.fixedPayments || 0
      });
      return;
    }

    setPendingIncomeData({
      amount,
      isCorrectingAmount: false
    });
    setFlowState('AWAITING_INCOME_TIMEFRAME');

    sendBotReply(
      '¿Esta plata es para hoy o para toda la semana?',
      [
        { id: 'tf_today', label: '☀️ Solo hoy', action: 'action_income_timeframe', payload: 'today' },
        { id: 'tf_week', label: '📅 Toda la semana', action: 'action_income_timeframe', payload: 'week' },
        { id: 'tf_back', label: '⬅️ Atrás', action: 'action_income_start' }
      ]
    );
  };

  // Paso 2 procesado -> Preguntar Paso 3 (de dónde viene)
  const handleIncomeTimeframeChosen = (timeframe: 'today' | 'week') => {
    setPendingIncomeData((prev) => ({
      ...prev,
      timeframe
    }));
    setFlowState('AWAITING_INCOME_SOURCE');

    sendBotReply(
      '¿De dónde viene esta plata? (opcional)',
      [
        { id: 'src_trabajo', label: '💼 Trabajo', action: 'action_income_source', payload: 'Trabajo' },
        { id: 'src_venta', label: '🛒 Venta', action: 'action_income_source', payload: 'Venta' },
        { id: 'src_regalo', label: '🎁 Regalo/Apoyo', action: 'action_income_source', payload: 'Regalo/Apoyo' },
        { id: 'src_otro', label: '✍️ Otro', action: 'action_income_custom_source_prompt' },
        { id: 'src_skip', label: '⏩ Omitir', action: 'action_income_source', payload: 'Ingreso' },
        { id: 'src_back', label: '⬅️ Atrás', action: 'action_income_back_to_timeframe' }
      ]
    );
  };

  // Paso 3 procesado -> Verificar si toca Paso 4 (pagos fijos la primera vez)
  const handleIncomeSourceChosen = (source: string) => {
    const updatedData = {
      ...pendingIncomeData,
      source
    };
    setPendingIncomeData(updatedData);

    // Paso 4: solo la primera vez si no se ha preguntado antes
    if (!hasAskedFixedPaymentsOnce) {
      setFlowState('AWAITING_INCOME_FIXED_ASK');
      sendBotReply(
        '¿Tienes pagos fijos esta semana (arriendo, internet)? Si no, omite.',
        [
          { id: 'fix_yes', label: '📝 Sí, poner monto', action: 'action_income_fixed_prompt' },
          { id: 'fix_skip', label: '⏩ Omitir', action: 'action_income_finalize_with_fixed', payload: 0 },
          { id: 'fix_back', label: '⬅️ Atrás', action: 'action_income_back_to_source' }
        ]
      );
    } else {
      finalizeIncomeRegistration({
        amount: updatedData.amount || 0,
        timeframe: updatedData.timeframe || 'week',
        source: updatedData.source || 'Ingreso',
        fixedPayments: 0
      });
    }
  };

  // Paso 4: calcular y confirmar (pregunta antes si quiere ahorrar en la bóveda sin obligar)
  const finalizeIncomeRegistration = (params: {
    amount: number;
    timeframe: 'today' | 'week';
    source: string;
    fixedPayments: number;
  }) => {
    // Si la bóveda nunca ha sido configurada o decidida, pregunta antes de guardar si desea ahorrar
    if (!bovedaConfig.configured) {
      setPendingIncomeForBoveda(params);
      startBovedaFlow('income_first_time');
      return;
    }

    executeIncomeCalculationAndMessage(params, bovedaConfig.percentage / 100);
  };

  const executeIncomeCalculationAndMessage = (
    params: {
      amount: number;
      timeframe: 'today' | 'week';
      source: string;
      fixedPayments: number;
    },
    porcentajeActual: number
  ) => {
    try {
      const { amount, timeframe, source, fixedPayments } = params;
      setHasAskedFixedPaymentsOnce(true);

      const prevSaldo = saldoRealGastable;
      const prevBoveda = bovedaTotal;
      const prevSemanal = saldoSemanalAcumulado;

      let bovedaAmount = 0;
      let dailyAdded = 0;
      let newSaldo = 0;
      let newBoveda = prevBoveda;
      let confirmationText = '';
      let nuevoSemanal = prevSemanal;

      // REGLA: Si el saldo está en negativo cuando entra un ingreso:
      // 1. Resta el saldo negativo del ingreso.
      // 2. Bóveda = porcentaje elegido de lo que queda (si porcentaje es 0, no guarda nada).
      // 3. El saldo de hoy se calcula con el resto, según "Solo hoy" o "Toda la semana".
      if (prevSaldo < 0) {
        const negativoACubrir = Math.abs(prevSaldo);

        if (amount > negativoACubrir) {
          const remanente = Math.round((amount - negativoACubrir) * 100) / 100;
          bovedaAmount = Math.round(remanente * porcentajeActual * 100) / 100;
          const disponible = Math.round((remanente - bovedaAmount) * 100) / 100;

          if (timeframe === 'today') {
            dailyAdded = disponible;
          } else {
            const netoSemana = Math.max(0, disponible - fixedPayments);
            const diasFaltantes = Math.max(1, DIAS_SEMANA - diaActual + 1);
            dailyAdded = Math.round((netoSemana / diasFaltantes) * 100) / 100;
            nuevoSemanal = Math.round((prevSemanal + netoSemana) * 100) / 100;
          }

          newSaldo = dailyAdded;
          newBoveda = Math.round((prevBoveda + bovedaAmount) * 100) / 100;

          if (bovedaAmount > 0) {
            confirmationText = `🎉 ¡Listo! Cubrí tus −$${formatMoney(negativoACubrir)} y guardé $${formatMoney(bovedaAmount)} en tu Bóveda Anti-Impulso 🔒. Hoy puedes gastar $${formatMoney(newSaldo)}.`;
          } else {
            confirmationText = `🎉 ¡Listo! Cubrí tus −$${formatMoney(negativoACubrir)}. Hoy puedes gastar $${formatMoney(newSaldo)}.`;
          }
        } else if (amount === negativoACubrir) {
          bovedaAmount = 0;
          newSaldo = 0;
          confirmationText = `🎉 ¡Listo! Cubrí tus −$${formatMoney(negativoACubrir)}. Tu saldo hoy quedó en $0.`;
        } else {
          bovedaAmount = 0;
          newSaldo = Math.round((prevSaldo + amount) * 100) / 100;
          const restanteNegativo = Math.abs(newSaldo);
          confirmationText = `Sumé tu ingreso. Todavía estás en −$${formatMoney(restanteNegativo)}, pero vas bajando 💪`;
        }
      } else {
        // Saldo previo >= 0: cálculo estándar
        bovedaAmount = Math.round(amount * porcentajeActual * 100) / 100;

        if (timeframe === 'today') {
          dailyAdded = Math.round((amount - bovedaAmount) * 100) / 100;
        } else {
          const netoSemana = Math.max(0, amount - bovedaAmount - fixedPayments);
          const diasFaltantes = Math.max(1, DIAS_SEMANA - diaActual + 1);
          dailyAdded = Math.round((netoSemana / diasFaltantes) * 100) / 100;
          nuevoSemanal = Math.round((prevSemanal + netoSemana) * 100) / 100;
        }

        newSaldo = Math.round((prevSaldo + dailyAdded) * 100) / 100;
        newBoveda = Math.round((prevBoveda + bovedaAmount) * 100) / 100;

        const isFirst = incomesWeekly.length === 0;
        if (bovedaAmount > 0) {
          if (isFirst) {
            confirmationText = `🎉 ¡Listo! Guardé $${formatMoney(bovedaAmount)} en tu Bóveda Anti-Impulso 🔒. Hoy puedes gastar $${formatMoney(newSaldo)}.`;
          } else {
            confirmationText = `💸 Sumé este ingreso. Guardé $${formatMoney(bovedaAmount)} en tu Bóveda Anti-Impulso 🔒. Hoy puedes gastar $${formatMoney(newSaldo)}.`;
          }
        } else {
          if (isFirst) {
            confirmationText = `🎉 ¡Listo! Ingreso registrado. Hoy puedes gastar $${formatMoney(newSaldo)}.`;
          } else {
            confirmationText = `💸 Sumé este ingreso. Hoy puedes gastar $${formatMoney(newSaldo)}.`;
          }
        }
      }

      const newIncome: Income = {
        id: 'inc_' + Date.now(),
        amount,
        timeframe,
        source,
        fixedPayments,
        bovedaAmount,
        dailyAdded,
        time: getFormattedTime()
      };

      setSaldoRealGastable(newSaldo);
      setSaldoSemanalAcumulado(nuevoSemanal);
      setBovedaTotal(newBoveda);
      setAhorroActual(newBoveda);
      setIncomesWeekly((prev) => [newIncome, ...prev]);

      // Guardar snapshot para permitir deshacer o corregir
      setLastIncomeSnapshot({
        income: newIncome,
        previousSaldo: prevSaldo,
        previousBoveda: prevBoveda,
        previousSemanal: prevSemanal
      });

      setFlowState('MENU');
      setPendingIncomeData(null);
      setPendingIncomeForBoveda(null);

      sendBotReply(
        confirmationText,
        [
          { id: 'btn_inc_undo', label: '↩️ Deshacer', action: 'action_income_undo' },
          { id: 'btn_inc_edit', label: '✏️ Corregir monto', action: 'action_income_edit_amount' },
          { id: 'btn_inc_reg', label: '🧾 Registrar gasto', action: 'action_register' },
          { id: 'btn_inc_sal', label: '💰 Mi saldo de hoy', action: 'action_balance' },
          { id: 'btn_inc_menu', label: '⬅️ Menú', action: 'action_menu' }
        ]
      );
    } catch (err) {
      console.error(err);
      sendBotReply('Ocurrió un detalle al guardar el ingreso 😅 ¿Volvemos al menú?', MAIN_MENU_BUTTONS);
    }
  };

  // Deshacer ingreso
  const handleUndoIncome = () => {
    if (!lastIncomeSnapshot) {
      sendBotReply('No hay ningún ingreso reciente para deshacer 👍', MAIN_MENU_BUTTONS);
      return;
    }

    const { income, previousSaldo, previousBoveda, previousSemanal } = lastIncomeSnapshot;
    setSaldoRealGastable(previousSaldo);
    setSaldoSemanalAcumulado(previousSemanal);
    setBovedaTotal(previousBoveda);
    setAhorroActual(previousBoveda);
    setIncomesWeekly((prev) => prev.filter((i) => i.id !== income.id));
    setLastIncomeSnapshot(null);

    sendBotReply(
      `Listo, borré ese ingreso ↩️. Hoy estás en ${formatBalance(previousSaldo)}.`,
      MAIN_MENU_BUTTONS
    );
  };

  // Corregir monto de ingreso
  const handleStartCorrectIncomeAmount = () => {
    if (!lastIncomeSnapshot) {
      startIncomeFlow();
      return;
    }

    const { income, previousSaldo, previousBoveda, previousSemanal } = lastIncomeSnapshot;
    setSaldoRealGastable(previousSaldo);
    setSaldoSemanalAcumulado(previousSemanal);
    setBovedaTotal(previousBoveda);
    setAhorroActual(previousBoveda);
    setIncomesWeekly((prev) => prev.filter((i) => i.id !== income.id));

    setPendingIncomeData({
      timeframe: income.timeframe,
      source: income.source,
      fixedPayments: income.fixedPayments,
      isCorrectingAmount: true
    });
    setFlowState('AWAITING_INCOME_AMOUNT');

    sendBotReply(
      'Escribe el monto correcto de tu ingreso ✏️ (por ejemplo: "150"):',
      [
        { id: 'c_50', label: '💵 $50', action: 'action_income_sample_amount', payload: 50 },
        { id: 'c_100', label: '💵 $100', action: 'action_income_sample_amount', payload: 100 },
        { id: 'c_150', label: '💵 $150', action: 'action_income_sample_amount', payload: 150 },
        { id: 'c_menu', label: '⬅️ Menú', action: 'action_menu' }
      ]
    );
  };

  // ==========================================================================
  // BÓVEDA ANTI-IMPULSO (PREGUNTA ANTES SI QUIERE AHORRAR, SIN OBLIGAR)
  // ==========================================================================
  const startBovedaFlow = (source: 'income_first_time' | 'menu' = 'menu') => {
    setPendingBovedaData({ sourceFlow: source });
    setFlowState('BOVEDA_ASK_DECISION');

    const introText = source === 'income_first_time'
      ? 'Antes de guardar, ¿configuramos tu Bóveda Anti-Impulso? 🔒\n\n¿Quieres apartar un ahorro de tu dinero?'
      : '¿Quieres apartar un ahorro en tu Bóveda Anti-Impulso? 🔒';

    sendBotReply(
      introText,
      [
        { id: 'bov_yes', label: '✅ Sí, quiero ahorrar', action: 'action_boveda_yes' },
        { id: 'bov_no', label: '❌ No quiero ahorrar', action: 'action_boveda_no' },
        { id: 'bov_back_start', label: '⬅️ Atrás', action: 'action_menu' }
      ]
    );
  };

  // Usuario decide que SÍ quiere ahorrar -> le damos las 4 preguntas
  const handleBovedaDecisionYes = () => {
    setFlowState('BOVEDA_ASK_AMOUNT');
    sendBotReply(
      '¿Cuánto quieres ahorrar en total? 🎯',
      [
        { id: 'bov_amt_50', label: '🎯 $50', action: 'action_boveda_amount', payload: 50 },
        { id: 'bov_amt_100', label: '🎯 $100', action: 'action_boveda_amount', payload: 100 },
        { id: 'bov_amt_200', label: '🎯 $200', action: 'action_boveda_amount', payload: 200 },
        { id: 'bov_amt_other', label: '✍️ Otro', action: 'action_boveda_amount_prompt' },
        { id: 'bov_back_decision', label: '⬅️ Atrás', action: 'action_boveda_back_to_decision' }
      ]
    );
  };

  // Usuario decide que NO quiere ahorrar -> cierra y va al menú por defecto (o completa el ingreso con 0% ahorro)
  const handleBovedaDecisionNo = () => {
    setBovedaConfig({
      configured: true,
      targetAmount: 0,
      reason: 'Sin ahorro',
      deadline: '',
      percentage: 0
    });

    if (pendingBovedaData?.sourceFlow === 'income_first_time' && pendingIncomeForBoveda) {
      const incomeToProcess = pendingIncomeForBoveda;
      setPendingIncomeForBoveda(null);
      setPendingBovedaData(null);
      executeIncomeCalculationAndMessage(incomeToProcess, 0);
    } else {
      setFlowState('MENU');
      setPendingBovedaData(null);
      sendBotReply(
        '¡Listo! 👍 No apartaremos nada para la bóveda. Tu dinero queda 100% disponible para gastar.',
        MAIN_MENU_BUTTONS
      );
    }
  };

  const handleBovedaAmountChosen = (targetAmount: number) => {
    setPendingBovedaData((prev) => ({ ...prev, targetAmount }));
    setFlowState('BOVEDA_ASK_REASON');

    sendBotReply(
      '¿Para qué es este ahorro? Cuéntame en una frase 💬',
      [
        { id: 'bov_r_viaje', label: '✈️ Un viaje', action: 'action_boveda_reason', payload: 'Un viaje' },
        { id: 'bov_r_celular', label: '📱 Un celular', action: 'action_boveda_reason', payload: 'Un celular' },
        { id: 'bov_r_emergencia', label: '🛟 Emergencias', action: 'action_boveda_reason', payload: 'Emergencias' },
        { id: 'bov_r_otro', label: '✍️ Otro', action: 'action_boveda_reason_prompt' },
        { id: 'bov_back_amt', label: '⬅️ Atrás', action: 'action_boveda_back_to_amount' }
      ]
    );
  };

  const handleBovedaReasonChosen = (reason: string) => {
    setPendingBovedaData((prev) => ({ ...prev, reason }));
    setFlowState('BOVEDA_ASK_DEADLINE');

    sendBotReply(
      '¿En cuánto tiempo quieres lograrlo? ⏱️',
      [
        { id: 'bov_d_1m', label: '⏱️ 1 mes', action: 'action_boveda_deadline', payload: '1 mes' },
        { id: 'bov_d_3m', label: '⏱️ 3 meses', action: 'action_boveda_deadline', payload: '3 meses' },
        { id: 'bov_d_6m', label: '⏱️ 6 meses', action: 'action_boveda_deadline', payload: '6 meses' },
        { id: 'bov_d_otro', label: '✍️ Otro', action: 'action_boveda_deadline_prompt' },
        { id: 'bov_back_reason', label: '⬅️ Atrás', action: 'action_boveda_back_to_reason' }
      ]
    );
  };

  const handleBovedaDeadlineChosen = (deadline: string) => {
    setPendingBovedaData((prev) => ({ ...prev, deadline }));
    setFlowState('BOVEDA_ASK_PERCENTAGE');

    sendBotReply(
      '¿Qué parte de tu dinero de la semana quieres guardar para esto? 📊',
      [
        { id: 'bov_p_10', label: '📊 10%', action: 'action_boveda_percentage', payload: 10 },
        { id: 'bov_p_20', label: '📊 20%', action: 'action_boveda_percentage', payload: 20 },
        { id: 'bov_p_30', label: '📊 30%', action: 'action_boveda_percentage', payload: 30 },
        { id: 'bov_p_otro', label: '✍️ Otro', action: 'action_boveda_percentage_prompt' },
        { id: 'bov_back_dl', label: '⬅️ Atrás', action: 'action_boveda_back_to_deadline' }
      ]
    );
  };

  const finalizeBovedaConfiguration = (percentage: number) => {
    const targetAmount = pendingBovedaData?.targetAmount || 100;
    const reason = pendingBovedaData?.reason || 'Ahorro anti-impulso';
    const deadline = pendingBovedaData?.deadline || '3 meses';

    const newConfig: BovedaConfig = {
      configured: true,
      targetAmount,
      reason,
      deadline,
      percentage
    };

    setBovedaConfig(newConfig);

    let confirmationText = '';
    if (percentage > 0) {
      confirmationText = `✅ Listo. Tu meta: $${formatMoney(targetAmount)} para ${reason} en ${deadline}. Cada semana guardo el ${percentage}% de lo que recibas 🔒.`;
    } else {
      confirmationText = `✅ Listo. No apartaremos dinero para la bóveda. Todo tu dinero queda libre para gastar 👍.`;
    }

    // Si veníamos del registro del primer ingreso, confirmamos la bóveda e inmediatamente procesamos el ingreso
    if (pendingBovedaData?.sourceFlow === 'income_first_time' && pendingIncomeForBoveda) {
      sendBotReply(confirmationText, undefined, { delayMs: 400 });
      setTimeout(() => {
        executeIncomeCalculationAndMessage(pendingIncomeForBoveda, percentage / 100);
      }, 1100);
    } else {
      setFlowState('MENU');
      setPendingBovedaData(null);
      sendBotReply(
        confirmationText,
        [
          { id: 'bov_change', label: '✏️ Cambiar', action: 'action_boveda_start' },
          { id: 'bov_reg', label: '🧾 Registrar gasto', action: 'action_register' },
          { id: 'bov_menu', label: '⬅️ Menú', action: 'action_menu' }
        ]
      );
    }
  };

  // ==========================================================================
  // FLUJO 1: REGISTRAR GASTO (SALDO NEGATIVO PERMITIDO EN ÁMBAR SIN CULPA)
  // ==========================================================================
  const executeRegisterExpense = (amount: number, category: ExpenseCategory, desc: string) => {
    try {
      const timeStr = getFormattedTime();
      const prevSaldo = saldoRealGastable;
      const formattedAmount = formatMoney(amount);

      // El saldo SÍ puede ser negativo. Se calcula su valor real sin ocultarlo ni forzarlo a $0.
      const newSaldo = Math.round((prevSaldo - amount) * 100) / 100;

      const newExpense: Expense = {
        id: 'exp_' + Date.now(),
        amount,
        category,
        description: desc,
        time: timeStr
      };

      setExpensesToday((prev) => [newExpense, ...prev]);
      setExpensesWeekly((prev) => [newExpense, ...prev]);
      setSaldoRealGastable(newSaldo);

      // Guardar snapshot para permitir deshacer
      setLastExpenseSnapshot({
        expense: newExpense,
        previousSaldo: prevSaldo
      });

      setFlowState('MENU');
      setPendingExpenseData(null);

      // Si el saldo resultante es negativo: mensaje en color ámbar, tono amable y sin culpa
      if (newSaldo < 0) {
        const formattedSaldo = formatBalance(newSaldo); // ej. "−$5"
        const amberMsg = `✅ Gasto registrado: $${formattedAmount} en ${category}. Hoy estás en ${formattedSaldo} 💛 Cuando registres un ingreso, primero cubrimos esto.`;

        sendBotReply(
          amberMsg,
          [
            { id: 'btn_undo', label: '↩️ Deshacer', action: 'action_undo_last' },
            { id: 'btn_inc_from_neg', label: '💵 Registrar ingreso', action: 'action_income_start' },
            { id: 'btn_reg_another', label: '➕ Registrar otro', action: 'action_register' },
            { id: 'btn_menu_after_reg', label: '☰ Menú', action: 'action_menu' }
          ],
          { isAmberAlert: true }
        );
      } else {
        const formattedSaldo = formatMoney(newSaldo);
        const exactMsg = `✅ ¡Listo! Gasto registrado: $${formattedAmount} en ${category} (${timeStr}).\n\nTu saldo real gastable para hoy es de $${formattedSaldo}`;

        sendBotReply(exactMsg, [
          { id: 'btn_undo', label: '↩️ Deshacer', action: 'action_undo_last' },
          { id: 'btn_reg_another', label: '➕ Registrar otro', action: 'action_register' },
          { id: 'btn_menu_after_reg', label: '☰ Menú', action: 'action_menu' }
        ]);
      }

      // Evaluar gatillador automático de ocio al 80%
      const currentOcioTotal = [...expensesWeekly, newExpense]
        .filter((e) => e.category === 'Ocio')
        .reduce((sum, e) => sum + e.amount, 0);

      const ocio80Percent = PRESUPUESTO_OCIO_SEMANAL * 0.8; // $12

      if (category === 'Ocio' && currentOcioTotal >= ocio80Percent) {
        setTimeout(() => {
          triggerNudgeOcio80();
        }, 1200);
      }
    } catch (e) {
      console.error(e);
      sendBotReply('Ocurrió un detalle al registrar 😅 ¿Quieres volver al menú?', MAIN_MENU_BUTTONS);
    }
  };

  // Deshacer el último gasto registrado
  const handleUndoLastExpense = () => {
    if (!lastExpenseSnapshot) {
      sendBotReply('No hay ningún gasto reciente para deshacer 👍', MAIN_MENU_BUTTONS);
      return;
    }

    const { expense, previousSaldo } = lastExpenseSnapshot;
    setSaldoRealGastable(previousSaldo);
    setExpensesToday((prev) => prev.filter((e) => e.id !== expense.id));
    setExpensesWeekly((prev) => prev.filter((e) => e.id !== expense.id));
    setLastExpenseSnapshot(null);

    sendBotReply(
      `Listo ↩️ Cancelé el gasto de $${formatMoney(expense.amount)} en ${expense.category}.\n\nTu saldo volvió a ser ${formatBalance(previousSaldo)}.`,
      MAIN_MENU_BUTTONS
    );
  };

  // Simulación de nota de voz con opciones
  const handleSelectVoiceOption = (option: typeof VOICE_SIMULATION_OPTIONS[0]) => {
    setIsVoiceModalOpen(false);
    const userTime = getFormattedTime();
    setMessages((prev) => [
      ...prev,
      {
        id: 'voice_' + Date.now(),
        sender: 'user',
        text: `🎤 [Nota de voz: "${option.transcript}"]`,
        time: userTime
      }
    ]);

    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      executeRegisterExpense(option.amount, option.category, option.desc);
    }, 900);
  };

  // Simulación de foto de recibo con opciones
  const handleSelectPhotoOption = (option: typeof PHOTO_SIMULATION_OPTIONS[0]) => {
    setIsPhotoModalOpen(false);
    const userTime = getFormattedTime();
    setMessages((prev) => [
      ...prev,
      {
        id: 'photo_' + Date.now(),
        sender: 'user',
        text: `📷 [Foto de recibo: ${option.merchant} - $${option.amount}]`,
        time: userTime
      }
    ]);

    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      executeRegisterExpense(option.amount, option.category, `Recibo ${option.merchant}`);
    }, 900);
  };

  // ==========================================================================
  // CAMBIO 2: FLUJO ¿PUEDO COMPRAR...? (CONSULTA RÁPIDA CON [$5] [$20] [$50])
  // ==========================================================================
  const evaluatePurchaseEnquiry = (amount: number, itemDesc: string = 'esta compra') => {
    try {
      const formattedAmount = formatMoney(amount);

      if (saldoRealGastable > 0 && amount <= saldoRealGastable) {
        const restanteEstimado = formatMoney(saldoRealGastable - amount);
        const msg = `¡Sí puedes! 🟢\n\nSi compras ${itemDesc} por $${formattedAmount}, te quedarían $${restanteEstimado} de saldo gastable hoy. Esta consulta no descuenta nada.`;
        sendBotReply(msg, [
          { id: 'btn_buy_another', label: '🛍️ Consultar otra compra', action: 'action_can_i_buy' },
          { id: 'btn_buy_reg', label: '➕ Registrarla ahora', action: 'action_register_custom', payload: { amount, desc: itemDesc } },
          { id: 'btn_buy_menu', label: '☰ Menú', action: 'action_menu' }
        ]);
      } else {
        // Con saldo negativo o insuficiente: avisa que quedaría más abajo del saldo actual, sin restar nada
        const nuevoEstimado = Math.round((saldoRealGastable - amount) * 100) / 100;
        const formattedNuevo = formatBalance(nuevoEstimado);
        const msg = `Ojo 🟡 Si compras ${itemDesc} por $${formattedAmount}, quedarías en ${formattedNuevo}. Recuerda que esta consulta no resta nada: ¿qué prefieres?`;
        sendBotReply(
          msg,
          [
            { id: 'btn_pause_24', label: '⏳ Pausa de 24 h', action: 'action_vault_pause' },
            { id: 'btn_vault', label: '🔒 Guardar en Bóveda Anti-Impulso', action: 'action_vault_save' },
            { id: 'btn_buy_menu_neg', label: '☰ Menú', action: 'action_menu' }
          ],
          { isAmberAlert: true }
        );
      }
      setFlowState('MENU');
    } catch (e) {
      console.error(e);
      sendBotReply('No pude evaluar la compra 😅 ¿Quieres volver al menú?', MAIN_MENU_BUTTONS);
    }
  };

  // ==========================================================================
  // FLUJO 2B: NUDGE DE AHORRO (RETO)
  // ==========================================================================
  const triggerNudgeOcio80 = () => {
    try {
      const exactMsg = `⚠️ Ya usaste el 80% de tu presupuesto de ocio de la semana. Reto: evita otro gasto hoy y guarda $2 en tu fondo de imprevistos. ¿Te sumas? 💪`;
      sendBotReply(
        exactMsg,
        [
          { id: 'btn_nudge_yes', label: '💪 Me sumo', action: 'action_nudge_accept' },
          { id: 'btn_nudge_no', label: '👋 Ahora no', action: 'action_nudge_decline' }
        ],
        { isAmberAlert: true }
      );
    } catch (e) {
      console.error(e);
    }
  };

  // ==========================================================================
  // FLUJO 3: RESUMEN SEMANAL (CON DETALLES DE LA BÓVEDA SI ESTÁ ACTIVA)
  // ==========================================================================
  const handleShowWeeklySummary = () => {
    try {
      const hasMovements = incomesWeekly.length > 0 || expensesWeekly.length > 0;

      // Si no hay movimientos:
      if (!hasMovements) {
        sendBotReply(
          'Aún no hay movimientos. Registra tu primer ingreso 💵',
          [
            { id: 'sum_inc_first', label: '💵 Registrar ingreso', action: 'action_income_start' },
            { id: 'sum_menu', label: '☰ Menú', action: 'action_menu' }
          ]
        );
        return;
      }

      // 1. Ingresos
      const totalIngresos = incomesWeekly.reduce((sum, i) => sum + i.amount, 0);
      const incomesList = incomesWeekly.length > 0
        ? incomesWeekly.map((i) => `• +$${formatMoney(i.amount)} (${i.source || 'Ingreso'})`).join('\n')
        : 'Sin ingresos registrados aún.';

      // 2. Gastos de hoy
      let todayList = '';
      if (expensesToday.length === 0) {
        todayList = 'Hoy aún no registras gastos.';
      } else {
        todayList = expensesToday
          .map((e) => `• ${e.time} - ${e.description}: $${formatMoney(e.amount)} (${e.category})`)
          .join('\n');
      }

      // 3. Gastos de la semana
      const totalGastadoSemana = expensesWeekly.reduce((sum, e) => sum + e.amount, 0);

      const totalAli = expensesWeekly
        .filter((e) => e.category === 'Alimentación')
        .reduce((sum, e) => sum + e.amount, 0);

      const totalOci = expensesWeekly
        .filter((e) => e.category === 'Ocio')
        .reduce((sum, e) => sum + e.amount, 0);

      const totalTra = expensesWeekly
        .filter((e) => e.category === 'Transporte')
        .reduce((sum, e) => sum + e.amount, 0);

      const totalOtr = expensesWeekly
        .filter((e) => e.category === 'Otros')
        .reduce((sum, e) => sum + e.amount, 0);

      const pctAli = totalGastadoSemana > 0 ? Math.round((totalAli / totalGastadoSemana) * 100) : 0;
      const pctOci = totalGastadoSemana > 0 ? Math.round((totalOci / totalGastadoSemana) * 100) : 0;
      const pctTra = totalGastadoSemana > 0 ? Math.round((totalTra / totalGastadoSemana) * 100) : 0;
      const pctOtr = totalGastadoSemana > 0 ? Math.round((totalOtr / totalGastadoSemana) * 100) : 0;

      // Meta de ahorro real con motivo, meta y plazo si el usuario la activó
      let bovedaLine = '';
      if (bovedaConfig.configured && bovedaConfig.percentage > 0) {
        const motivoStr = bovedaConfig.reason || 'Bóveda';
        const targetBoveda = bovedaConfig.targetAmount || 100;
        const plazoStr = bovedaConfig.deadline || '3 meses';
        const pctAhorro = Math.min(100, Math.round((bovedaTotal / targetBoveda) * 100));
        const bloquesLlenos = Math.round(pctAhorro / 10);
        const progressBar = '█'.repeat(bloquesLlenos) + '░'.repeat(Math.max(0, 10 - bloquesLlenos));
        bovedaLine = `\n\n🔒 ${motivoStr}: $${formatMoney(bovedaTotal)} / $${formatMoney(targetBoveda)} (${pctAhorro}%)\n[${progressBar}]\n⏱️ Meta estimada: en ${plazoStr}`;
      } else {
        bovedaLine = `\n\n🔒 Bóveda: Inactiva (0% de ahorro)`;
      }

      const summaryText = 
        `📊 Resumen de tu semana\n\n` +
        `💵 Ingresos de la semana: $${formatMoney(totalIngresos)}\n${incomesList}\n\n` +
        `📅 Gastos de hoy:\n${todayList}\n\n` +
        `💰 Gastos totales: $${formatMoney(totalGastadoSemana)}\n` +
        `🍽️ Alimentación: $${formatMoney(totalAli)}${totalGastadoSemana > 0 ? ` (${pctAli}%)` : ''}\n` +
        `🎉 Ocio: $${formatMoney(totalOci)}${totalGastadoSemana > 0 ? ` (${pctOci}%)` : ''}\n` +
        `🚌 Transporte: $${formatMoney(totalTra)}${totalGastadoSemana > 0 ? ` (${pctTra}%)` : ''}\n` +
        `📦 Otros: $${formatMoney(totalOtr)}${totalGastadoSemana > 0 ? ` (${pctOtr}%)` : ''}` +
        bovedaLine;

      sendBotReply(summaryText, [
        { id: 'btn_sum_inc', label: '💵 Registrar ingreso', action: 'action_income_start' },
        { id: 'btn_sum_reg', label: '➕ Registrar gasto', action: 'action_register' },
        { id: 'btn_sum_menu', label: '☰ Menú', action: 'action_menu' }
      ]);
    } catch (e) {
      console.error(e);
      sendBotReply('Ocurrió un error al preparar el resumen 😅 ¿Volvemos al menú?', MAIN_MENU_BUTTONS);
    }
  };

  // ==========================================================================
  // CAMBIO 4: SOBRANTE DEL INGRESO DIARIO SE ACUMULA (FINALIZAR DÍA)
  // ==========================================================================
  const handleAskEndDay = () => {
    try {
      const gastadoHoy = expensesToday.reduce((sum, e) => sum + e.amount, 0);
      const queda = saldoRealGastable;

      setFlowState('CONFIRMING_CLOSE_DAY');

      if (queda > 0) {
        sendBotReply(
          `¿Cerramos el día? Gastaste $${formatMoney(gastadoHoy)} y te quedan $${formatMoney(queda)} 🌙`,
          [
            { id: 'btn_rollover', label: '🔒 Pasar a mañana', action: 'action_rollover_leftover' },
            { id: 'btn_send_vault', label: '🎯 Mandar a la bóveda', action: 'action_send_leftover_to_vault' },
            { id: 'btn_close_yes', label: '✅ Sí, cerrar día', action: 'action_rollover_leftover' },
            { id: 'btn_close_no', label: '☀️ Seguir hoy', action: 'action_menu' }
          ]
        );
      } else if (queda < 0) {
        sendBotReply(
          `¿Cerramos el día? Gastaste $${formatMoney(gastadoHoy)} y estás en ${formatBalance(queda)} 🌙`,
          [
            { id: 'btn_close_yes', label: '✅ Sí, cerrar día', action: 'action_confirm_close_day' },
            { id: 'btn_close_no', label: '☀️ Seguir hoy', action: 'action_menu' }
          ]
        );
      } else {
        sendBotReply(
          `¿Cerramos el día? Gastaste $${formatMoney(gastadoHoy)} y cumpliste tu saldo de hoy 🌙`,
          [
            { id: 'btn_close_yes', label: '✅ Sí, cerrar día', action: 'action_confirm_close_day' },
            { id: 'btn_close_no', label: '☀️ Seguir hoy', action: 'action_menu' }
          ]
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Acumular el sobrante al saldo semanal y repartirlo en los días siguientes
  const handleRolloverLeftover = () => {
    const leftover = saldoRealGastable;
    if (leftover <= 0) {
      proceedCloseDay(leftover);
      return;
    }

    const diasRestantes = Math.max(1, DIAS_SEMANA - diaActual);
    const nuevoSemanal = Math.round((saldoSemanalAcumulado + leftover) * 100) / 100;
    setSaldoSemanalAcumulado(nuevoSemanal);

    let nuevoSaldoSiguienteDia = 0;
    if (diaActual < DIAS_SEMANA) {
      nuevoSaldoSiguienteDia = Math.round((nuevoSemanal / diasRestantes) * 100) / 100;
    } else {
      // Si es el último día de la semana, pasa a la semana siguiente
      nuevoSaldoSiguienteDia = Math.round((nuevoSemanal / DIAS_SEMANA) * 100) / 100;
    }

    sendBotReply(
      `🎉 Te sobraron $${formatMoney(leftover)} hoy. Los sumé a tu saldo de la semana. Mañana puedes gastar $${formatMoney(nuevoSaldoSiguienteDia)}.`,
      undefined,
      { delayMs: 600 }
    );

    setTimeout(() => {
      proceedCloseDay(leftover, true, nuevoSaldoSiguienteDia);
    }, 1200);
  };

  // Mandar el sobrante a la Bóveda Anti-Impulso y cerrar día
  const handleSendLeftoverToVault = () => {
    const leftover = saldoRealGastable;
    if (leftover <= 0) {
      proceedCloseDay(leftover);
      return;
    }

    const newBoveda = Math.round((bovedaTotal + leftover) * 100) / 100;
    setBovedaTotal(newBoveda);
    setAhorroActual(newBoveda);
    setSaldoRealGastable(0);

    sendBotReply(
      `¡Genial! 🔒 Mandé $${formatMoney(leftover)} a tu Bóveda Anti-Impulso. Llevas $${formatMoney(newBoveda)} guardados.`,
      undefined,
      { delayMs: 600 }
    );

    setTimeout(() => {
      proceedCloseDay(0, false, 0);
    }, 1200);
  };

  const proceedCloseDay = (saldoSobrante: number, isRollover: boolean = false, precomputedNextSaldo?: number) => {
    try {
      const diasRestantes = Math.max(1, DIAS_SEMANA - diaActual);

      let nuevoSaldoSiguienteDia = 0;
      if (isRollover && precomputedNextSaldo !== undefined) {
        nuevoSaldoSiguienteDia = precomputedNextSaldo;
      } else {
        const semanalTotalNeto = incomesWeekly
          .filter((i) => i.timeframe === 'week')
          .reduce((sum, i) => sum + (i.amount - i.bovedaAmount - i.fixedPayments), 0) + saldoSemanalAcumulado;
        
        const gastosSemanales = expensesWeekly.reduce((sum, e) => sum + e.amount, 0);
        const plataRestanteSemana = semanalTotalNeto - gastosSemanales;

        if (plataRestanteSemana !== 0 && diasRestantes > 0) {
          nuevoSaldoSiguienteDia = Math.round((plataRestanteSemana / diasRestantes) * 100) / 100;
        } else if (saldoSobrante !== 0) {
          nuevoSaldoSiguienteDia = Math.round((saldoSobrante / diasRestantes) * 100) / 100;
        }
      }

      setExpensesToday([]); // Limpia los gastos del día de hoy

      // Si el día cerró en negativo: mensaje sin culpa repartiendo la diferencia
      if (saldoSobrante < 0) {
        sendBotReply(
          'Hoy se gastó un poquito de más, ¡pasa! 💛 Lo reparto en los próximos días.',
          undefined,
          { isAmberAlert: true, delayMs: 400 }
        );
      }

      const delayNextDay = (saldoSobrante < 0 || isRollover) ? 1200 : 800;

      setTimeout(() => {
        if (diaActual < DIAS_SEMANA) {
          const proximoDia = diaActual + 1;
          setDiaActual(proximoDia);
          setSaldoRealGastable(nuevoSaldoSiguienteDia);

          sendBotReply(
            `Día ${proximoDia} iniciado ☀️ Tu saldo real gastable para hoy es de ${formatBalance(nuevoSaldoSiguienteDia)}`,
            MAIN_MENU_BUTTONS,
            { delayMs: 800 }
          );
        } else {
          // Último día de la semana: si hubo sobrante pasa a la siguiente semana
          const nuevaSemana = semanaActual + 1;
          setSemanaActual(nuevaSemana);
          setDiaActual(1);
          setSaldoRealGastable(nuevoSaldoSiguienteDia);
          setExpensesWeekly([]);
          setIncomesWeekly([]);

          sendBotReply(
            `¡Completaste la semana! 🎉 Resumen semanal generado y archivado.\n\nSemana ${nuevaSemana} - Día 1 iniciado ☀️ Tu saldo para hoy es de ${formatBalance(nuevoSaldoSiguienteDia)}`,
            MAIN_MENU_BUTTONS,
            { delayMs: 800 }
          );
        }
        setFlowState('MENU');
      }, delayNextDay);
    } catch (e) {
      console.error(e);
      sendBotReply('Reiniciando al menú principal 👍', MAIN_MENU_BUTTONS);
    }
  };

  const handleConfirmCloseDay = () => {
    if (saldoRealGastable > 0) {
      handleRolloverLeftover();
    } else {
      proceedCloseDay(saldoRealGastable);
    }
  };

  // ==========================================================================
  // PANEL DE PRUEBAS DE EVALUADORES
  // ==========================================================================
  const loadScenarioIncomeTest = () => {
    try {
      setIsTestPanelOpen(false);
      setIsMenuOpen(false);
      finalizeIncomeRegistration({
        amount: 120,
        timeframe: 'week',
        source: 'Trabajo',
        fixedPayments: 0
      });
    } catch (e) {
      console.error(e);
    }
  };

  const loadScenario2Data = () => {
    try {
      setIsTestPanelOpen(false);
      setIsMenuOpen(false);
      const mockOcioExpense: Expense = {
        id: 'mock_ocio_80',
        amount: 12,
        category: 'Ocio',
        description: 'Salida previa de ocio (80%)',
        time: '11:00'
      };
      setExpensesWeekly((prev) => [mockOcioExpense, ...prev]);

      sendBotReply(
        '⚡ [Escenario 2 cargado]: Gasto de ocio al 80% ($12/$15). Lanzando nudge...',
        undefined,
        { delayMs: 400 }
      );

      setTimeout(() => {
        triggerNudgeOcio80();
      }, 1000);
    } catch (e) {
      console.error(e);
    }
  };

  const loadScenario3Data = () => {
    try {
      setIsTestPanelOpen(false);
      setIsMenuOpen(false);

      const mockIncome: Income = {
        id: 'inc_mock_3',
        amount: 120,
        timeframe: 'week',
        source: 'Trabajo',
        fixedPayments: 0,
        bovedaAmount: 24,
        dailyAdded: 13.71,
        time: '09:00'
      };
      const mockExpenses: Expense[] = [
        { id: 'm1', amount: 26, category: 'Alimentación', description: 'Supermercado y comida', time: '13:00' },
        { id: 'm2', amount: 9, category: 'Ocio', description: 'Cine y café', time: '16:30' },
        { id: 'm3', amount: 5, category: 'Transporte', description: 'Uber', time: '18:15' },
        { id: 'm4', amount: 5, category: 'Otros', description: 'Farmacia', time: '19:40' }
      ];

      setIncomesWeekly([mockIncome]);
      setExpensesWeekly(mockExpenses);
      setBovedaTotal(24);
      setAhorroActual(24);

      sendBotReply('⚡ [Datos de prueba cargados]: Ingreso $120 y gastos de la semana. Generando resumen...', undefined, { delayMs: 400 });

      setTimeout(() => {
        handleShowWeeklySummary();
      }, 1000);
    } catch (e) {
      console.error(e);
    }
  };

  // ==========================================================================
  // MANEJADOR CENTRAL DE CLIC EN BOTONES DE RESPUESTA RÁPIDA
  // ==========================================================================
  const handleQuickReplyClick = (msgId: string, reply: { id: string; label: string; action: string; payload?: any }) => {
    try {
      // 1. Desactivar visualmente los botones de este mensaje
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, selectedReplyId: reply.id } : m))
      );

      const userTime = getFormattedTime();

      // 2. Reflejar la respuesta elegida en el chat
      setMessages((prev) => [
        ...prev,
        {
          id: 'user_click_' + Date.now(),
          sender: 'user',
          text: reply.label,
          time: userTime
        }
      ]);

      // 3. Ejecutar acción
      switch (reply.action) {
        case 'action_income_start':
          startIncomeFlow();
          break;

        case 'action_income_sample_amount':
          if (reply.payload) {
            handleIncomeAmountEntered(reply.payload);
          }
          break;

        case 'action_income_custom_amount_prompt':
          setFlowState('AWAITING_INCOME_AMOUNT');
          sendBotReply(
            'Escribe cuánto recibiste en el campo de texto 👇 (por ejemplo: "Me pagaron $120")',
            [
              { id: 'inc_back_to_chips', label: '⬅️ Atrás', action: 'action_income_start' }
            ]
          );
          break;

        case 'action_income_timeframe':
          if (reply.payload) {
            handleIncomeTimeframeChosen(reply.payload);
          }
          break;

        case 'action_income_source':
          if (reply.payload) {
            handleIncomeSourceChosen(reply.payload);
          }
          break;

        case 'action_income_custom_source_prompt':
          setFlowState('AWAITING_INCOME_CUSTOM_SOURCE');
          sendBotReply(
            'Escribe de dónde viene esta plata en una palabra o frase corta ✍️ (ej: Freelance o Beca):',
            [
              { id: 'skip_custom_src', label: '⏩ Omitir', action: 'action_income_source', payload: 'Ingreso' },
              { id: 'back_custom_src', label: '⬅️ Atrás', action: 'action_income_back_to_timeframe' }
            ]
          );
          break;

        case 'action_income_fixed_prompt':
          setFlowState('AWAITING_INCOME_FIXED_AMOUNT');
          sendBotReply(
            '¿Cuánto suman tus pagos fijos de esta semana? 💳 Escribe el valor:',
            [
              { id: 'fix_50', label: '💳 $50', action: 'action_income_finalize_with_fixed', payload: 50 },
              { id: 'fix_100', label: '💳 $100', action: 'action_income_finalize_with_fixed', payload: 100 },
              { id: 'fix_skip_amt', label: '⏩ Omitir', action: 'action_income_finalize_with_fixed', payload: 0 },
              { id: 'fix_back_amt', label: '⬅️ Atrás', action: 'action_income_back_to_source' }
            ]
          );
          break;

        case 'action_income_finalize_with_fixed':
          finalizeIncomeRegistration({
            amount: pendingIncomeData?.amount || 0,
            timeframe: pendingIncomeData?.timeframe || 'week',
            source: pendingIncomeData?.source || 'Ingreso',
            fixedPayments: reply.payload !== undefined ? reply.payload : 0
          });
          break;

        case 'action_income_undo':
          handleUndoIncome();
          break;

        case 'action_income_edit_amount':
          handleStartCorrectIncomeAmount();
          break;

        case 'action_income_back_to_timeframe':
          if (pendingIncomeData?.amount) {
            handleIncomeAmountEntered(pendingIncomeData.amount);
          } else {
            startIncomeFlow();
          }
          break;

        case 'action_income_back_to_source':
          if (pendingIncomeData?.timeframe) {
            handleIncomeTimeframeChosen(pendingIncomeData.timeframe);
          } else {
            startIncomeFlow();
          }
          break;

        // BÓVEDA CONFIGURABLE (PREGUNTAR ANTES SI QUIERE AHORRAR)
        case 'action_boveda_start':
          startBovedaFlow('menu');
          break;

        case 'action_boveda_yes':
          handleBovedaDecisionYes();
          break;

        case 'action_boveda_no':
          handleBovedaDecisionNo();
          break;

        case 'action_boveda_back_to_decision':
          startBovedaFlow(pendingBovedaData?.sourceFlow || 'menu');
          break;

        case 'action_boveda_amount':
          if (reply.payload) {
            handleBovedaAmountChosen(reply.payload);
          }
          break;

        case 'action_boveda_amount_prompt':
          setFlowState('BOVEDA_CUSTOM_AMOUNT');
          sendBotReply(
            'Escribe el monto total que quieres ahorrar en números 🎯 (ej: $150):',
            [
              { id: 'b_back_amt_p', label: '⬅️ Atrás', action: 'action_boveda_yes' }
            ]
          );
          break;

        case 'action_boveda_reason':
          if (reply.payload) {
            handleBovedaReasonChosen(reply.payload);
          }
          break;

        case 'action_boveda_reason_prompt':
          setFlowState('BOVEDA_CUSTOM_REASON');
          sendBotReply(
            'Escribe en una frase para qué es este ahorro 💬 (ej: Para comprar una laptop):',
            [
              { id: 'b_back_r_p', label: '⬅️ Atrás', action: 'action_boveda_back_to_amount' }
            ]
          );
          break;

        case 'action_boveda_deadline':
          if (reply.payload) {
            handleBovedaDeadlineChosen(reply.payload);
          }
          break;

        case 'action_boveda_deadline_prompt':
          setFlowState('BOVEDA_CUSTOM_DEADLINE');
          sendBotReply(
            'Escribe en cuánto tiempo quieres lograrlo ⏱️ (ej: 4 meses o a fin de año):',
            [
              { id: 'b_back_d_p', label: '⬅️ Atrás', action: 'action_boveda_back_to_reason' }
            ]
          );
          break;

        case 'action_boveda_percentage':
          if (reply.payload !== undefined) {
            finalizeBovedaConfiguration(reply.payload);
          }
          break;

        case 'action_boveda_percentage_prompt':
          setFlowState('BOVEDA_CUSTOM_PERCENTAGE');
          sendBotReply(
            'Escribe el porcentaje de tu dinero que quieres guardar 📊 (ej: 15% o 25%):',
            [
              { id: 'b_back_p_p', label: '⬅️ Atrás', action: 'action_boveda_back_to_deadline' }
            ]
          );
          break;

        case 'action_boveda_back_to_amount':
          handleBovedaDecisionYes();
          break;

        case 'action_boveda_back_to_reason':
          if (pendingBovedaData?.targetAmount) {
            handleBovedaAmountChosen(pendingBovedaData.targetAmount);
          } else {
            handleBovedaDecisionYes();
          }
          break;

        case 'action_boveda_back_to_deadline':
          if (pendingBovedaData?.reason) {
            handleBovedaReasonChosen(pendingBovedaData.reason);
          } else {
            handleBovedaDecisionYes();
          }
          break;

        // GASTOS
        case 'action_register':
          setFlowState('MENU');
          sendBotReply(
            'Escribe lo que gastaste como hablas con un amigo 👇\n\n_Ejemplo: "Gasté $3 en empanadas" o "pagué 5 de taxi"_\nSi presionaste por error o te arrepientes, puedes volver:',
            [
              { id: 'eg_emp', label: '🥟 Gasté $3 en empanadas', action: 'action_sample_text', payload: 'Gasté $3 en empanadas' },
              { id: 'eg_tax', label: '🚕 pagué 5 de taxi', action: 'action_sample_text', payload: 'pagué 5 de taxi' },
              { id: 'eg_cin', label: '🍿 cine $8', action: 'action_sample_text', payload: 'cine $8' },
              { id: 'eg_cancel', label: '🔙 Cancelar y no registrar', action: 'action_cancel_register' }
            ]
          );
          break;

        case 'action_cancel_register':
          setFlowState('MENU');
          setPendingExpenseData(null);
          sendBotReply(
            '¡Sin problema! No registramos ningún gasto nuevo 😊 ¿Qué quieres hacer ahora?',
            MAIN_MENU_BUTTONS
          );
          break;

        case 'action_balance':
          {
            const motivoStr = bovedaConfig.configured && bovedaConfig.reason ? bovedaConfig.reason : 'Bóveda';
            const targetStr = formatMoney(bovedaConfig.configured ? bovedaConfig.targetAmount : 100);
            const pctProgress = bovedaConfig.targetAmount > 0 
              ? Math.min(100, Math.round((bovedaTotal / bovedaConfig.targetAmount) * 100))
              : 0;
            const bloquesLlenos = Math.round(pctProgress / 10);
            const progressBar = '█'.repeat(bloquesLlenos) + '░'.repeat(Math.max(0, 10 - bloquesLlenos));
            const plazoStr = bovedaConfig.configured && bovedaConfig.deadline ? bovedaConfig.deadline : '3 meses';

            const bovedaSection = (bovedaConfig.configured && bovedaConfig.percentage > 0)
              ? `\n🔒 ${motivoStr}: *$${formatMoney(bovedaTotal)}* / $${targetStr} (${pctProgress}%)\n[${progressBar}]\n⏱️ Meta estimada: en ${plazoStr}`
              : `\n🔒 Bóveda: Inactiva (0% de ahorro)`;

            if (saldoRealGastable < 0) {
              sendBotReply(
                `💰 Hoy estás en *${formatBalance(saldoRealGastable)}* 💛\n\n📅 Saldo de la semana: *$${formatMoney(saldoSemanalAcumulado)}*${bovedaSection}\n\nCuando registres un ingreso, primero cubrimos esto.`,
                [
                  { id: 'b_inc', label: '💵 Registrar ingreso', action: 'action_income_start' },
                  { id: 'b_men', label: '⬅️ Menú', action: 'action_menu' }
                ],
                { isAmberAlert: true }
              );
            } else {
              sendBotReply(
                `💰 Tu saldo real gastable para hoy es de *$${formatMoney(saldoRealGastable)}*.\n\n📅 Saldo de la semana: *$${formatMoney(saldoSemanalAcumulado)}*${bovedaSection}\n\nEs tu dinero disponible libre de culpa para lo que queda del día 💚`,
                [
                  { id: 'b_inc', label: '💵 Registrar ingreso', action: 'action_income_start' },
                  { id: 'b_reg', label: '➕ Registrar gasto', action: 'action_register' },
                  { id: 'b_buy', label: '🛍️ ¿Puedo comprar algo?', action: 'action_can_i_buy' },
                  { id: 'b_bov', label: '🔒 Mi bóveda', action: 'action_boveda_start' },
                  { id: 'b_men', label: '☰ Menú', action: 'action_menu' }
                ]
              );
            }
          }
          break;

        case 'action_can_i_buy':
          setFlowState('AWAITING_PURCHASE_AMOUNT');
          sendBotReply(
            '¿De cuánto es la compra que estás pensando? 🛍️\n\nEscribe el monto o toca una opción rápida:',
            [
              { id: 'p_5', label: '$5', action: 'action_eval_buy', payload: { amount: 5, item: 'esta compra de $5' } },
              { id: 'p_20', label: '$20', action: 'action_eval_buy', payload: { amount: 20, item: 'esta compra de $20' } },
              { id: 'p_50', label: '$50', action: 'action_eval_buy', payload: { amount: 50, item: 'esta compra de $50' } },
              { id: 'p_cancel', label: '⬅️ Atrás', action: 'action_menu' }
            ]
          );
          break;

        case 'action_summary':
          handleShowWeeklySummary();
          break;

        case 'action_end_day':
          handleAskEndDay();
          break;

        case 'action_rollover_leftover':
          handleRolloverLeftover();
          break;

        case 'action_send_leftover_to_vault':
          handleSendLeftoverToVault();
          break;

        case 'action_menu':
          showMainMenuInChat();
          break;

        case 'action_undo_last':
          handleUndoLastExpense();
          break;

        case 'action_sample_text':
          if (reply.payload) {
            handleUserSendRawText(reply.payload, true);
          }
          break;

        case 'action_eval_buy':
          if (reply.payload) {
            evaluatePurchaseEnquiry(reply.payload.amount, reply.payload.item);
          }
          break;

        case 'action_vault_pause':
        case 'action_vault_save':
          sendBotReply(
            'Hecho 🔒 Te recuerdo mañana. Si lo sigues queriendo, lo planeamos juntos.',
            [
              { id: 'v_reg', label: '➕ Registrar gasto', action: 'action_register' },
              { id: 'v_men', label: '☰ Menú', action: 'action_menu' }
            ]
          );
          break;

        case 'action_nudge_accept':
          const nuevoBoveda = Math.round((bovedaTotal + 2) * 100) / 100;
          setBovedaTotal(nuevoBoveda);
          setAhorroActual(nuevoBoveda);
          sendBotReply(
            `🐷 ¡Buen trabajo! Guardé $2 en tu fondo de imprevistos. Llevas $${formatMoney(nuevoBoveda)} guardados esta semana.`,
            [
              { id: 'n_sal', label: '💰 Mi saldo de hoy', action: 'action_balance' },
              { id: 'n_men', label: '☰ Menú', action: 'action_menu' }
            ]
          );
          break;

        case 'action_nudge_decline':
          sendBotReply(
            '¡Sin problema! Aquí estoy cuando lo necesites 😊',
            MAIN_MENU_BUTTONS
          );
          break;

        case 'action_confirm_close_day':
          handleConfirmCloseDay();
          break;

        case 'action_select_amount':
          if (reply.payload) {
            executeRegisterExpense(reply.payload.amount, reply.payload.category, reply.payload.desc || 'Gasto registrado');
          }
          break;

        case 'action_change_category':
          if (reply.payload) {
            executeRegisterExpense(reply.payload.amount, reply.payload.category, `Gasto de $${reply.payload.amount}`);
          }
          break;

        case 'action_register_custom':
          if (reply.payload) {
            executeRegisterExpense(reply.payload.amount, 'Ocio', reply.payload.desc);
          }
          break;

        default:
          showMainMenuInChat();
          break;
      }
    } catch (e) {
      console.error(e);
      showMainMenuInChat();
    }
  };

  // ==========================================================================
  // MANEJADOR PRINCIPAL DE TEXTO LIBRE DEL USUARIO
  // ==========================================================================
  const handleUserSendRawText = (rawTextToSend?: string, skipAddingUserMessage: boolean = false) => {
    try {
      const text = (rawTextToSend || inputText).trim();
      if (!text || isTyping) return;

      const userTime = getFormattedTime();

      // 1. Agregar mensaje del usuario a la pantalla solo si no fue agregado ya por el botón
      if (!skipAddingUserMessage) {
        setMessages((prev) => [
          ...prev,
          {
            id: 'user_' + Date.now(),
            sender: 'user',
            text,
            time: userTime
          }
        ]);
      }

      if (!rawTextToSend) setInputText('');

      const cleanLower = text.toLowerCase().trim();

      // 2. Palabras globales que funcionan SIEMPRE
      if (['menú', 'menu', 'inicio', 'ayuda', 'opciones'].includes(cleanLower)) {
        showMainMenuInChat();
        return;
      }

      if (['saldo', 'mi saldo', 'cuanto me queda', 'cuánto me queda'].includes(cleanLower)) {
        const motivoStr = bovedaConfig.configured && bovedaConfig.reason ? bovedaConfig.reason : 'Bóveda';
        const targetStr = formatMoney(bovedaConfig.configured ? bovedaConfig.targetAmount : 100);

        const bovedaSection = (bovedaConfig.configured && bovedaConfig.percentage > 0)
          ? `\n🔒 ${motivoStr}: *$${formatMoney(bovedaTotal)}* / $${targetStr}`
          : `\n🔒 Bóveda: Inactiva (0% de ahorro)`;

        if (saldoRealGastable < 0) {
          sendBotReply(
            `💰 Hoy estás en *${formatBalance(saldoRealGastable)}* 💛\n\n📅 Saldo de la semana: *$${formatMoney(saldoSemanalAcumulado)}*${bovedaSection}\n\nCuando registres un ingreso, primero cubrimos esto.`,
            [
              { id: 'b_inc', label: '💵 Registrar ingreso', action: 'action_income_start' },
              { id: 'b_men', label: '⬅️ Menú', action: 'action_menu' }
            ],
            { isAmberAlert: true }
          );
        } else {
          sendBotReply(
            `💰 Tu saldo real gastable para hoy es de *$${formatMoney(saldoRealGastable)}*.\n\n📅 Saldo de la semana: *$${formatMoney(saldoSemanalAcumulado)}*${bovedaSection}\n\nEs tu dinero disponible libre de culpa para lo que queda del día 💚`,
            MAIN_MENU_BUTTONS
          );
        }
        return;
      }

      if (['resumen', 'semana', 'resumen semanal'].includes(cleanLower)) {
        handleShowWeeklySummary();
        return;
      }

      if (['boveda', 'bóveda', 'mi boveda', 'mi bóveda', 'ahorro'].includes(cleanLower)) {
        startBovedaFlow('menu');
        return;
      }

      if (['ingreso', 'ingresos', 'registrar ingreso', 'recibí plata', 'me pagaron'].includes(cleanLower)) {
        startIncomeFlow();
        return;
      }

      if (['cancelar', 'atrás', 'atras'].includes(cleanLower)) {
        showMainMenuInChat();
        return;
      }

      // 3. Flujo de Decisión de Bóveda: ¿Quiere ahorrar o no?
      if (flowState === 'BOVEDA_ASK_DECISION') {
        if (['no', 'nop', 'no quiero', 'nada', 'omitir', 'despues', 'después', 'ahora no', 'cero'].includes(cleanLower)) {
          handleBovedaDecisionNo();
          return;
        }
        if (['si', 'sí', 'sip', 'claro', 'dale', 'quiero', 'quiero ahorrar'].includes(cleanLower)) {
          handleBovedaDecisionYes();
          return;
        }
        // Si escribe un número directo: se toma como monto y avanza
        const { amount } = parseExpenseInput(text);
        if (amount !== null && amount > 0) {
          handleBovedaAmountChosen(amount);
          return;
        }
        sendBotReply(
          '¿Quieres apartar un ahorro en tu Bóveda Anti-Impulso? 🔒',
          [
            { id: 'bov_yes_p', label: '✅ Sí, quiero ahorrar', action: 'action_boveda_yes' },
            { id: 'bov_no_p', label: '❌ No quiero ahorrar', action: 'action_boveda_no' },
            { id: 'bov_back_p', label: '⬅️ Atrás', action: 'action_menu' }
          ]
        );
        return;
      }

      // 4. Flujo de Bóveda: esperando respuestas escritas
      if (flowState === 'BOVEDA_ASK_AMOUNT' || flowState === 'BOVEDA_CUSTOM_AMOUNT') {
        const { amount } = parseExpenseInput(text);
        if (amount !== null && amount > 0) {
          handleBovedaAmountChosen(amount);
        } else {
          sendBotReply('¿Cuánto quieres ahorrar en total? 🎯 Escribe solo el monto o toca una opción:', [
            { id: 'bov_50', label: '🎯 $50', action: 'action_boveda_amount', payload: 50 },
            { id: 'bov_100', label: '🎯 $100', action: 'action_boveda_amount', payload: 100 },
            { id: 'bov_200', label: '🎯 $200', action: 'action_boveda_amount', payload: 200 },
            { id: 'bov_back', label: '⬅️ Atrás', action: 'action_boveda_yes' }
          ]);
        }
        return;
      }

      if (flowState === 'BOVEDA_ASK_REASON' || flowState === 'BOVEDA_CUSTOM_REASON') {
        handleBovedaReasonChosen(text);
        return;
      }

      if (flowState === 'BOVEDA_ASK_DEADLINE' || flowState === 'BOVEDA_CUSTOM_DEADLINE') {
        handleBovedaDeadlineChosen(text);
        return;
      }

      if (flowState === 'BOVEDA_ASK_PERCENTAGE' || flowState === 'BOVEDA_CUSTOM_PERCENTAGE') {
        const { amount } = parseExpenseInput(text);
        const pct = amount !== null && amount >= 0 && amount <= 100 ? amount : 20;
        finalizeBovedaConfiguration(pct);
        return;
      }

      // 5. Flujo de Ingresos: esperando monto
      if (flowState === 'AWAITING_INCOME_AMOUNT') {
        const { amount } = parseExpenseInput(text);
        if (amount !== null && amount > 0) {
          handleIncomeAmountEntered(amount);
          return;
        } else {
          sendBotReply('¿Cuánto fue? 💬 Escribe solo el número o por ejemplo: "120"', [
            { id: 'inc_100_s', label: '💵 Me pagaron $100', action: 'action_income_sample_amount', payload: 100 },
            { id: 'inc_50_s', label: '💵 Recibí $50', action: 'action_income_sample_amount', payload: 50 },
            { id: 'inc_20_s', label: '💵 Recibí $20', action: 'action_income_sample_amount', payload: 20 },
            { id: 'inc_back', label: '⬅️ Atrás', action: 'action_menu' }
          ]);
          return;
        }
      }

      // 6. Flujo de Ingresos: esperando origen personalizado
      if (flowState === 'AWAITING_INCOME_CUSTOM_SOURCE') {
        handleIncomeSourceChosen(text);
        return;
      }

      // 7. Flujo de Ingresos: esperando monto de pagos fijos
      if (flowState === 'AWAITING_INCOME_FIXED_AMOUNT') {
        const { amount } = parseExpenseInput(text);
        const fixedAmt = amount !== null ? amount : 0;
        finalizeIncomeRegistration({
          amount: pendingIncomeData?.amount || 0,
          timeframe: pendingIncomeData?.timeframe || 'week',
          source: pendingIncomeData?.source || 'Ingreso',
          fixedPayments: fixedAmt
        });
        return;
      }

      // 8. Manejo según estado activo: ¿Esperando monto para compra?
      if (flowState === 'AWAITING_PURCHASE_AMOUNT') {
        const { amount } = parseExpenseInput(text);
        if (amount !== null) {
          evaluatePurchaseEnquiry(amount, 'esta compra');
          return;
        }
      }

      // 9. Manejo según estado activo: ¿Esperando monto de gasto pendiente?
      if (flowState === 'AWAITING_AMOUNT' && pendingExpenseData?.category) {
        const { amount } = parseExpenseInput(text);
        if (amount !== null) {
          executeRegisterExpense(amount, pendingExpenseData.category, pendingExpenseData.desc || 'Gasto');
          return;
        }
      }

      // 10. Consulta directa de compra (ej: "¿Puedo comprar estas zapatillas de $80?")
      if (cleanLower.includes('puedo comprar') || cleanLower.includes('me compro') || cleanLower.includes('alcanza para')) {
        const { amount } = parseExpenseInput(text);
        if (amount !== null) {
          evaluatePurchaseEnquiry(amount, 'esas zapatillas');
        } else {
          setFlowState('AWAITING_PURCHASE_AMOUNT');
          sendBotReply('¿De cuánto es la compra que estás pensando? 🛍️ Escribe el monto o toca una opción rápida:', [
            { id: 'b5', label: '$5', action: 'action_eval_buy', payload: { amount: 5, item: 'esta compra de $5' } },
            { id: 'b20', label: '$20', action: 'action_eval_buy', payload: { amount: 20, item: 'esta compra de $20' } },
            { id: 'b50', label: '$50', action: 'action_eval_buy', payload: { amount: 50, item: 'esta compra de $50' } },
            { id: 'bcancel', label: '⬅️ Atrás', action: 'action_menu' }
          ]);
        }
        return;
      }

      // 11. Procesar registro de gasto natural
      const parsed = parseExpenseInput(text);

      // Si hay varios montos en el mismo mensaje, preguntar cuál es el gasto
      if (parsed.hasMultipleAmounts) {
        sendBotReply(
          'Vi más de un número en tu mensaje 🧐 ¿Cuál es el monto exacto del gasto?',
          [
            { id: 'm_cancel', label: '☰ Menú', action: 'action_menu' }
          ]
        );
        return;
      }

      // Monto muy alto (> $500)
      if (parsed.amount !== null && parsed.amount > 500) {
        sendBotReply(
          `¿Confirmas registrar un gasto de *$${parsed.amount}*? ⚠️ Es un monto bastante alto para tu registro diario.`,
          [
            { id: 'c_yes', label: '✅ Sí, registrar', action: 'action_select_amount', payload: { amount: parsed.amount, category: parsed.category || 'Otros', desc: text } },
            { id: 'c_no', label: '❌ Corregir monto', action: 'action_register' }
          ]
        );
        return;
      }

      // Caso A: Monto y categoría reconocidos
      if (parsed.amount !== null && parsed.category !== null) {
        executeRegisterExpense(parsed.amount, parsed.category, text);
        return;
      }

      // Caso B: Falta el monto pero reconoció categoría
      if (parsed.amount === null && parsed.category !== null) {
        setFlowState('AWAITING_AMOUNT');
        setPendingExpenseData({ category: parsed.category, desc: text });
        sendBotReply(
          '¿Cuánto fue? 💵 Toca un monto frecuente o escríbelo:',
          [
            { id: 'amt_2', label: '$2', action: 'action_select_amount', payload: { amount: 2, category: parsed.category, desc: text } },
            { id: 'amt_5', label: '$5', action: 'action_select_amount', payload: { amount: 5, category: parsed.category, desc: text } },
            { id: 'amt_10', label: '$10', action: 'action_select_amount', payload: { amount: 10, category: parsed.category, desc: text } },
            { id: 'amt_cancel', label: '🔙 Cancelar y volver', action: 'action_cancel_register' }
          ]
        );
        return;
      }

      // Caso C: Monto detectado pero falta categoría -> Asigna "Otros" y ofrece cambiar
      if (parsed.amount !== null && parsed.category === null) {
        setFlowState('AWAITING_CATEGORY');
        const amt = parsed.amount;
        sendBotReply(
          `Detecté $${amt} 👍 Lo asigné a "Otros". ¿Quieres cambiar la categoría?`,
          [
            { id: 'c_ali', label: '🍽️ Alimentación', action: 'action_change_category', payload: { amount: amt, category: 'Alimentación' } },
            { id: 'c_oci', label: '🎉 Ocio', action: 'action_change_category', payload: { amount: amt, category: 'Ocio' } },
            { id: 'c_tra', label: '🚌 Transporte', action: 'action_change_category', payload: { amount: amt, category: 'Transporte' } },
            { id: 'c_otr', label: '📦 Dejar en Otros', action: 'action_change_category', payload: { amount: amt, category: 'Otros' } }
          ]
        );
        return;
      }

      // Caso D: Mensaje no entendido
      sendBotReply(
        'No te entendí bien 😅 ¿Quieres registrar un ingreso, un gasto, ver tu saldo o consultar una compra?',
        MAIN_MENU_BUTTONS
      );
    } catch (err) {
      console.error(err);
      sendBotReply('Ups, algo no se entendió bien 😊 ¿Quieres volver al menú?', MAIN_MENU_BUTTONS);
    }
  };

  // Reiniciar demo completa (arranca en cero)
  const handleResetDemoCompletely = () => {
    try {
      setDiaActual(1);
      setSemanaActual(1);
      setSaldoRealGastable(0);
      setSaldoSemanalAcumulado(0);
      setBovedaTotal(0);
      setAhorroActual(0);
      setBovedaConfig({
        configured: false,
        targetAmount: 0,
        reason: '',
        deadline: '',
        percentage: 0
      });
      setPendingBovedaData(null);
      setPendingIncomeForBoveda(null);
      setIncomesWeekly([]);
      setExpensesToday([]);
      setExpensesWeekly([]);
      setHasAskedFixedPaymentsOnce(false);
      setLastExpenseSnapshot(null);
      setLastIncomeSnapshot(null);
      setPendingExpenseData(null);
      setPendingIncomeData(null);
      setInputText('');
      setIsTyping(false);
      setMessages([]);
      setIsMenuOpen(false);
      setIsTestPanelOpen(false);
      setFlowState('WELCOME');
      setScreen('welcome');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-0 sm:p-4 font-sans select-none antialiased">
      {/* Marco mobile-first centrado (máx. 420px como un smartphone) */}
      <div className="w-full max-w-[420px] h-screen sm:h-[740px] bg-[#efeae2] flex flex-col relative sm:rounded-3xl shadow-2xl sm:border sm:border-slate-800 overflow-hidden">
        
        {/* ========================================================================= */}
        {/* PANTALLA DE BIENVENIDA */}
        {/* ========================================================================= */}
        {screen === 'welcome' && (
          <div className="flex-1 flex flex-col justify-between p-6 bg-gradient-to-b from-[#075e54] via-[#008069] to-[#054c44] text-white relative">
            
            {/* Barra estética de estado del móvil */}
            <div className="flex items-center justify-between text-xs text-emerald-100 font-medium">
              <span>9:41</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px]">5G</span>
                <div className="w-4 h-2 border border-current rounded-xs flex items-center p-0.5">
                  <div className="w-full h-full bg-current rounded-2xs" />
                </div>
              </div>
            </div>

            {/* Contenido central de bienvenida */}
            <div className="flex flex-col items-center text-center my-auto py-6">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-md border-2 border-white/20 flex items-center justify-center shadow-xl">
                  <span className="text-5xl" role="img" aria-label="FinBot">🤖</span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#25d366] border-2 border-[#008069] flex items-center justify-center shadow-md">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
                FinBot
              </h1>
              <p className="text-emerald-100 text-base font-semibold max-w-[280px] leading-snug">
                Tu saldo real gastable, directo en el chat
              </p>
            </div>

            {/* Único botón grande: "Iniciar chat" */}
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

        {/* ========================================================================= */}
        {/* PANTALLA DE CHAT (WHATSAPP DE ALTA FIDELIDAD) */}
        {/* ========================================================================= */}
        {screen === 'chat' && (
          <div className="flex-1 flex flex-col h-full bg-[#efeae2] relative overflow-hidden">
            
            {/* ENCABEZADO DE WHATSAPP (Verde oscuro, avatar 🤖, 'en línea', y botón '☰ Menú') */}
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

              {/* Botón '☰ Menú' fijo en el encabezado */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="min-h-[44px] px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Menú principal de FinBot"
                >
                  <MenuIcon className="w-4 h-4" />
                  <span>Menú</span>
                </button>

                <button
                  onClick={() => setIsTestPanelOpen(!isTestPanelOpen)}
                  className="min-h-[44px] p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-emerald-100 transition-all cursor-pointer"
                  title="Panel de pruebas de evaluadores"
                >
                  <Sliders className="w-4 h-4" />
                </button>
              </div>
            </header>

            {/* MENÚ DESPLEGABLE PRINCIPAL */}
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

            {/* PANEL DE PRUEBAS DE EVALUADORES */}
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
                    onClick={() => {
                      setIsTestPanelOpen(false);
                      setIsMenuOpen(false);
                      startBovedaFlow('menu');
                    }}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-200 text-left font-semibold flex items-center justify-between cursor-pointer"
                  >
                    <span>🔒 Probar Configuración de Bóveda</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      setIsTestPanelOpen(false);
                      setIsMenuOpen(false);
                      executeRegisterExpense(5, 'Alimentación', 'Empanada');
                    }}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-200 text-left font-semibold flex items-center justify-between cursor-pointer"
                  >
                    <span>⚡ Probar gasto sin saldo ($5 → −$5)</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      setIsTestPanelOpen(false);
                      setIsMenuOpen(false);
                      finalizeIncomeRegistration({
                        amount: 20,
                        timeframe: 'today',
                        source: 'Trabajo',
                        fixedPayments: 0
                      });
                    }}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-200 text-left font-semibold flex items-center justify-between cursor-pointer"
                  >
                    <span>💵 Probar ingreso cubriendo negativo ($20)</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={loadScenarioIncomeTest}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-100 text-left font-semibold flex items-center justify-between cursor-pointer"
                  >
                    <span>💵 Probar Ingreso ($120 semanal)</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={loadScenario2Data}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/20 text-amber-200 text-left font-semibold flex items-center justify-between cursor-pointer"
                  >
                    <span>⚡ Cargar datos Escenario 2 (Ocio 80%)</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={loadScenario3Data}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-200 text-left font-semibold flex items-center justify-between cursor-pointer"
                  >
                    <span>📊 Cargar datos Escenario 3 (Ingresos + Gastos)</span>
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

            {/* ÁREA DE MENSAJES (Burbujas, hora, doble check azul y scroll) */}
            <div 
              className="flex-1 overflow-y-auto p-3 space-y-3 whatsapp-scroll"
              style={{
                backgroundColor: '#efeae2',
                backgroundImage: 'radial-gradient(#d1d7db 1px, transparent 1px)',
                backgroundSize: '16px 16px'
              }}
            >
              {/* Notificación de cifrado WhatsApp */}
              <div className="flex justify-center my-1">
                <div className="bg-[#ffeecd] border border-amber-200/60 text-amber-900 text-[10px] px-3 py-1 rounded-lg text-center shadow-2xs max-w-[300px]">
                  🔒 Conversación privada · Saldo real gastable del día
                </div>
              </div>

              {/* Lista de mensajes */}
              {messages.map((msg) => {
                const isUser = msg.sender === 'user';
                const isAmber = msg.isAmberAlert;

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
                          ? 'bg-[#d9fdd3] text-slate-900 rounded-tr-xs' // Verde claro usuario
                          : isAmber
                          ? 'bg-[#fffbeb] border border-amber-300 text-amber-950 rounded-tl-xs' // Alerta ámbar sin rojo
                          : 'bg-white text-slate-900 rounded-tl-xs'      // Blanco bot
                      }`}
                    >
                      {/* Texto del mensaje con formato limpio */}
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

                      {/* Hora y doble check azul */}
                      <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 mt-1 float-right ml-2 select-none">
                        <span>{msg.time}</span>
                        {isUser && <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] inline" />}
                      </div>
                    </div>

                    {/* Botones de respuesta rápida (1 por fila, emoji único al inicio, táctiles >= 44px) */}
                    {msg.quickReplies && msg.quickReplies.length > 0 && (
                      <div className="w-full mt-2 space-y-1.5">
                        {msg.quickReplies.map((reply) => {
                          const isSelected = msg.selectedReplyId === reply.id;
                          const isDisabled = msg.selectedReplyId !== undefined;

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
                                  ? 'bg-slate-200 text-slate-400 border border-slate-300 opacity-60 cursor-not-allowed'
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

              {/* Animación de "escribiendo..." de máx. 1 segundo */}
              {isTyping && (
                <div className="flex flex-col items-start max-w-[85%] mr-auto animate-in fade-in duration-200">
                  <div className="bg-white rounded-2xl rounded-tl-xs px-4 py-2.5 shadow-xs flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 font-medium mr-1">FinBot</span>
                    <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" />
                    <div 
                      className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" 
                      style={{ animationDelay: '150ms' }} 
                    />
                    <div 
                      className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" 
                      style={{ animationDelay: '300ms' }} 
                    />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* MODAL / BOTTOM SHEET: OPCIONES PARA NOTA DE VOZ (🎤) */}
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
                        <p className="text-[10px] text-slate-500">Elige un audio para registrar en 2 segundos:</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsVoiceModalOpen(false)}
                      className="p-1 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-200 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2 overflow-y-auto pr-1 py-1">
                    {VOICE_SIMULATION_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => handleSelectVoiceOption(opt)}
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

            {/* MODAL / BOTTOM SHEET: OPCIONES PARA FOTO DE RECIBO (📷) */}
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
                        <p className="text-[10px] text-slate-500">Elige un comprobante para escanear:</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsPhotoModalOpen(false)}
                      className="p-1 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-200 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2 overflow-y-auto pr-1 py-1">
                    {PHOTO_SIMULATION_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => handleSelectPhotoOption(opt)}
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

            {/* BARRA INFERIOR DE WHATSAPP (Input con placeholder fantasma, 🎤 nota de voz y 📷 foto) */}
            <footer className="p-2 bg-[#f0f2f5] border-t border-slate-200 flex items-center gap-1.5 shrink-0 z-10">
              <button 
                type="button" 
                onClick={() => setIsPhotoModalOpen(true)}
                disabled={isTyping}
                className="min-w-[44px] min-h-[44px] rounded-full text-slate-600 hover:text-[#008069] hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
                title="Elegir foto de recibo (📷)"
              >
                <Camera className="w-5 h-5" />
              </button>

              <button 
                type="button" 
                onClick={() => setIsVoiceModalOpen(true)}
                disabled={isTyping}
                className="min-w-[44px] min-h-[44px] rounded-full text-slate-600 hover:text-[#008069] hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
                title="Elegir nota de voz (🎤)"
              >
                <Mic className="w-5 h-5" />
              </button>

              {/* Campo de texto con placeholder fantasma requerido */}
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUserSendRawText();
                }}
                placeholder="Ej: Gasté $3 en empanadas"
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
