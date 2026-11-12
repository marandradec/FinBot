import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Mic, Paperclip, Smile, MoreVertical, Phone, Video, 
  ArrowLeft, CheckCheck, Play, Pause, Shield, RefreshCw, Zap,
  Camera, Sun, Moon, Sparkles, ChevronDown
} from 'lucide-react';
import { 
  WhatsAppMessage, BudgetState, CurrencyCode, 
  ImpulseItem, ExpenseCategory, WhatsAppButton 
} from '../types/finbot';
import { parseLatAmExpenseInput, formatCurrency, CURRENCY_CONFIGS } from '../utils/nlpParser';
import { VoiceNoteRecorder } from './VoiceNoteRecorder';
import { ReceiptScannerModal } from './ReceiptScannerModal';
import { ImpulseVaultModal } from './ImpulseVaultModal';

interface WhatsAppSimulatorProps {
  currency: CurrencyCode;
  onCurrencyChange: (c: CurrencyCode) => void;
  budgetState: BudgetState;
  onUpdateBudget: React.Dispatch<React.SetStateAction<BudgetState>>;
}

export const WhatsAppSimulator: React.FC<WhatsAppSimulatorProps> = ({
  currency,
  onCurrencyChange,
  budgetState,
  onUpdateBudget
}) => {
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isDarkWhatsApp, setIsDarkWhatsApp] = useState(true);
  const [isPlayingAudio, setIsPlayingAudio] = useState<string | null>(null);

  // Modals
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial messages showcasing FinBot persona
  const [messages, setMessages] = useState<WhatsAppMessage[]>([
    {
      id: 'init_1',
      sender: 'bot',
      text: `¡Hola! Soy *FinBot* 🤖✨ Tu compa financiero en WhatsApp.\n\nAquí no hay gráficos rojos que asusten ni sermones bancarios. Tu único número clave para hoy es tu *Saldo Real Gastable*:\n\n👉 *$35.00 disponibles para gastar hoy*.\n\n¿Registramos algo o tienes en mente alguna compra? Mándame un texto, audio o foto de ticket.`,
      timestamp: '09:41',
      status: 'read',
      buttons: [
        { id: 'btn_reg_demo', text: '🍔 Gasto $10 almuerzo', action: 'send_text', payload: 'Gasto $10 en almuerzo' },
        { id: 'btn_impulse_demo', text: '👟 ¿Zapatillas de $80?', action: 'send_text', payload: '¿Puedo comprar estas zapatillas de $80?' },
        { id: 'btn_recalc_demo', text: '🍕 Cena de $55 (Excedí)', action: 'send_text', payload: 'Gasté $55 en una cena inesperada' }
      ]
    }
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const getCurrentTimeStr = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // Process User Message & generate Bot response
  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const userMsgId = 'user_' + Date.now();
    const timeStr = getCurrentTimeStr();

    const newUserMsg: WhatsAppMessage = {
      id: userMsgId,
      sender: 'user',
      text,
      timestamp: timeStr,
      status: 'read'
    };

    setMessages((prev) => [...prev, newUserMsg]);
    if (!textToSend) setInputText('');
    setIsTyping(true);

    // Bot response logic with < 2s response time
    setTimeout(() => {
      const parsed = parseLatAmExpenseInput(text, currency);
      generateBotResponse(parsed, text, timeStr);
      setIsTyping(false);
    }, 450);
  };

  const generateBotResponse = (
    parsed: ReturnType<typeof parseLatAmExpenseInput>,
    rawText: string,
    timeStr: string
  ) => {
    const botMsgId = 'bot_' + Date.now();

    // Flujo 2: Consulta Anti-Impulso
    if (parsed.intent === 'ask_impulse' || rawText.toLowerCase().includes('zapatillas') || rawText.toLowerCase().includes('comprar')) {
      const targetAmount = parsed.amount || (currency === 'USD' ? 80 : 80000);
      const daysImpact = Math.ceil(targetAmount / (budgetState.dailyBudgetOriginal || 35));

      const botReply: WhatsAppMessage = {
        id: botMsgId,
        sender: 'bot',
        text: `¡Ese antojo se ve genial! 🔥👟\n\nPero revisando tus números sin dramas:\n• Tu saldo gastable de hoy: *${formatCurrency(budgetState.saldoRealGastable, currency)}*\n• Costo estimado: *${formatCurrency(targetAmount, currency)}*\n\nSi compras esto hoy, comprometerías *${daysImpact} días de tu saldo diario* y nos dejaría sin margen para el fin de semana.\n\n💡 *Mi recomendación de compa:* ¿Qué tal si lo metemos a la *Bóveda Anti-Impulso por 24 horas*? Si mañana aún lo quieres con el mismo entusiasmo, armamos un plan juntos sin estrés.`,
        timestamp: timeStr,
        status: 'read',
        buttons: [
          {
            id: 'btn_vault_lock',
            text: '⏱ Guardar en Bóveda 24h',
            action: 'lock_vault',
            payload: { item: parsed.description !== 'Gasto registrado' ? parsed.description : 'Zapatillas Deportivas', amount: targetAmount }
          },
          {
            id: 'btn_buy_anyway',
            text: '⚡ Comprar igual',
            action: 'buy_impulse_direct',
            payload: { item: parsed.description, amount: targetAmount }
          },
          {
            id: 'btn_view_alternatives',
            text: '💡 Ver alternativas',
            action: 'send_text',
            payload: '¿Qué alternativas tengo para este gasto?'
          }
        ]
      };

      setMessages((prev) => [...prev, botReply]);
      return;
    }

    // Flujo 3: Sobregasto & Recálculo Flexible
    if (parsed.amount && parsed.amount > budgetState.saldoRealGastable && budgetState.saldoRealGastable > 0) {
      const overspent = parsed.amount - budgetState.saldoRealGastable;
      const daysRemaining = 5;
      const dailyCut = Math.round((overspent / daysRemaining) * 10) / 10;
      const newDailyBudget = Math.max(10, budgetState.dailyBudgetOriginal - dailyCut);

      // Update state without guilt
      onUpdateBudget((prev) => ({
        ...prev,
        todaySpent: prev.todaySpent + (parsed.amount || 0),
        saldoRealGastable: 0,
        dailyBudgetOriginal: newDailyBudget,
        expenses: [
          {
            id: 'exp_' + Date.now(),
            amount: parsed.amount || 0,
            category: parsed.category,
            description: parsed.description,
            timestamp: timeStr,
            inputMethod: 'text'
          },
          ...prev.expenses
        ]
      }));

      const botReply: WhatsAppMessage = {
        id: botMsgId,
        sender: 'bot',
        text: `¡*${parsed.description}* registrada con éxito! ✨\n\nOye, ¡*la vida pasa y para eso es el dinero*! 💛 Hoy gastaste *${formatCurrency(overspent, currency)} más* de lo previsto, y está perfecto disfrutarlo con la gente que quieres.\n\nPara que tus metas de ahorro sigan 100% intactas, hice un *recálculo flexible*:\n\n• Próximos 5 días: *${formatCurrency(newDailyBudget, currency)}/día* (en vez de ${formatCurrency(budgetState.dailyBudgetOriginal, currency)})\n• Tu colchón de emergencia: *Intacto (100%)*\n\n¡Seguimos en balance sin sacrificios raros! 🚀`,
        timestamp: timeStr,
        status: 'read',
        buttons: [
          { id: 'btn_recalc_ok', text: '👍 ¡Aceptado, gracias!', action: 'ack_recalc' },
          { id: 'btn_recalc_week', text: '📊 Ver plan semanal', action: 'send_text', payload: 'Muéstrame el plan de la semana' }
        ]
      };

      setMessages((prev) => [...prev, botReply]);
      return;
    }

    // Deshacer / Undo
    if (parsed.intent === 'undo') {
      onUpdateBudget((prev) => {
        if (prev.expenses.length === 0) return prev;
        const last = prev.expenses[0];
        const newSaldo = prev.saldoRealGastable + last.amount;
        return {
          ...prev,
          saldoRealGastable: newSaldo,
          todaySpent: Math.max(0, prev.todaySpent - last.amount),
          expenses: prev.expenses.slice(1)
        };
      });

      const botReply: WhatsAppMessage = {
        id: botMsgId,
        sender: 'bot',
        text: `¡Listo! Deshecho el último registro. 🔄\n\nTu *saldo real gastable* de hoy volvió a: *${formatCurrency(budgetState.saldoRealGastable + (budgetState.expenses[0]?.amount || 10), currency)}*.`,
        timestamp: timeStr,
        status: 'read'
      };
      setMessages((prev) => [...prev, botReply]);
      return;
    }

    // Flujo 1: Registro Rápido Ordinario (<2s)
    if (parsed.amount !== null && parsed.amount > 0) {
      const expenseAmount = parsed.amount;
      const newSaldo = Math.max(0, budgetState.saldoRealGastable - expenseAmount);
      const isMicroGasto = expenseAmount <= (currency === 'USD' ? 4 : 4000);

      onUpdateBudget((prev) => ({
        ...prev,
        todaySpent: prev.todaySpent + expenseAmount,
        saldoRealGastable: newSaldo,
        gastosHormigaToday: isMicroGasto ? prev.gastosHormigaToday + expenseAmount : prev.gastosHormigaToday,
        expenses: [
          {
            id: 'exp_' + Date.now(),
            amount: expenseAmount,
            category: parsed.category,
            description: parsed.description,
            timestamp: timeStr,
            inputMethod: 'text',
            isHormiga: isMicroGasto
          },
          ...prev.expenses
        ]
      }));

      const botReply: WhatsAppMessage = {
        id: botMsgId,
        sender: 'bot',
        text: `¡*${parsed.description}* registrado con éxito! ${parsed.category === 'comida' ? '🍔' : parsed.category === 'transporte' ? '🚗' : '✨'}\n\nTu *saldo real gastable* para hoy es de *${formatCurrency(newSaldo, currency)}*.\n\n${isMicroGasto ? '_Tip curioso: Sumamos un pequeño gasto hormiga. ¡Vas con excelente ritmo hoy!_' : '_¡Actualizado en menos de 2 segundos!_' }`,
        timestamp: timeStr,
        status: 'read',
        buttons: [
          { id: 'btn_undo', text: '🔄 Deshacer', action: 'undo_last' },
          { id: 'btn_cat', text: '🏷 Cambiar categoría', action: 'send_text', payload: 'Cambiar categoría de este gasto' }
        ]
      };

      setMessages((prev) => [...prev, botReply]);
      return;
    }

    // Fallback conversacional empático
    const fallbackReply: WhatsAppMessage = {
      id: botMsgId,
      sender: 'bot',
      text: `¡Te escucho! 💬 Puedes escribirme:\n• Un gasto rápido: *"Almuerzo $12"* o *"Uber 25"*\n• Una consulta pre-compra: *"¿Puedo comprar unas zapatillas de $80?"*\n• O pedir tu estado: *"¿Cuánto me queda hoy?"*`,
      timestamp: timeStr,
      status: 'read',
      buttons: [
        { id: 'btn_f1', text: 'Gasto $10 almuerzo', action: 'send_text', payload: 'Gasto $10 en almuerzo' },
        { id: 'btn_f2', text: '¿Zapatillas $80?', action: 'send_text', payload: '¿Puedo comprar estas zapatillas de $80?' }
      ]
    };
    setMessages((prev) => [...prev, fallbackReply]);
  };

  // Button Click Handler for WhatsApp Quick Replies
  const handleButtonClick = (button: WhatsAppButton) => {
    if (button.action === 'send_text' && button.payload) {
      handleSendMessage(button.payload);
    } else if (button.action === 'lock_vault' && button.payload) {
      const itemToLock: ImpulseItem = {
        id: 'imp_' + Date.now(),
        item: button.payload.item || 'Zapatillas Deportivas',
        amount: button.payload.amount || 80,
        createdAt: Date.now(),
        unlockAt: Date.now() + 24 * 3600 * 1000,
        status: 'locked'
      };

      onUpdateBudget((prev) => ({
        ...prev,
        impulseVault: [itemToLock, ...prev.impulseVault]
      }));

      const timeStr = getCurrentTimeStr();
      const vaultConfirmation: WhatsAppMessage = {
        id: 'bot_vault_' + Date.now(),
        sender: 'bot',
        text: `🔒 *¡Bóveda Anti-Impulso activada!* 🧘\n\nGuardamos: *${itemToLock.item} (${formatCurrency(itemToLock.amount, currency)})*\nTiempo de enfriamiento: *24 horas*\n\nMañana a esta misma hora te avisaré para que decidas con la mente fría.\n\n_Dato científico: El 74% de las veces, el deseo de compra baja más del 60% tras una noche de descanso. ¡Gran decisión de autocontrol!_ 👏`,
        timestamp: timeStr,
        status: 'read',
        buttons: [
          { id: 'btn_open_vault', text: '📊 Ver mi Bóveda', action: 'open_vault_modal' },
          { id: 'btn_thanks', text: '✨ Gracias FinBot', action: 'send_text', payload: 'Gracias FinBot, me siento en paz' }
        ]
      };

      setMessages((prev) => [
        ...prev,
        {
          id: 'user_action_' + Date.now(),
          sender: 'user',
          text: `[⏱ Guardar en Bóveda 24h]`,
          timestamp: timeStr,
          status: 'read'
        },
        vaultConfirmation
      ]);
    } else if (button.action === 'open_vault_modal') {
      setIsVaultModalOpen(true);
    } else if (button.action === 'undo_last') {
      handleSendMessage('Deshacer');
    } else if (button.action === 'ack_recalc') {
      handleSendMessage('¡Aceptado, gracias por el recálculo flexible!');
    } else if (button.action === 'buy_impulse_direct' && button.payload) {
      handleSendMessage(`Decidí comprar las ${button.payload.item} por $${button.payload.amount}`);
    }
  };

  // Voice Note Handler from modal
  const handleVoiceNoteReceived = (audioTranscript: string, duration: string) => {
    const timeStr = getCurrentTimeStr();
    const voiceMsgId = 'voice_' + Date.now();

    const userVoiceMsg: WhatsAppMessage = {
      id: voiceMsgId,
      sender: 'user',
      text: audioTranscript,
      timestamp: timeStr,
      status: 'read',
      mediaType: 'audio',
      audioDuration: duration
    };

    setMessages((prev) => [...prev, userVoiceMsg]);
    setIsTyping(true);

    setTimeout(() => {
      const parsed = parseLatAmExpenseInput(audioTranscript, currency);
      const amount = parsed.amount || 15;
      const newSaldo = Math.max(0, budgetState.saldoRealGastable - amount);

      onUpdateBudget((prev) => ({
        ...prev,
        todaySpent: prev.todaySpent + amount,
        saldoRealGastable: newSaldo,
        expenses: [
          {
            id: 'exp_' + Date.now(),
            amount,
            category: parsed.category,
            description: parsed.description,
            timestamp: timeStr,
            inputMethod: 'voice'
          },
          ...prev.expenses
        ]
      }));

      const botReply: WhatsAppMessage = {
        id: 'bot_audio_' + Date.now(),
        sender: 'bot',
        text: `🎧 *Audio procesado (1.4s):*\n"${audioTranscript}"\n\n¡*${parsed.description} (${formatCurrency(amount, currency)})* registrado! 💊\nTu *saldo real gastable* de hoy queda en *${formatCurrency(newSaldo, currency)}*.\n\n_Tip: Si vas de camino a algún lugar, ¡ten buen día! Cero estrés._`,
        timestamp: timeStr,
        status: 'read',
        buttons: [
          { id: 'btn_ok', text: '👍 Todo bien', action: 'send_text', payload: 'Todo bien' },
          { id: 'btn_undo', text: '🔄 Deshacer', action: 'undo_last' }
        ]
      };

      setMessages((prev) => [...prev, botReply]);
      setIsTyping(false);
    }, 550);
  };

  // Receipt Scan Handler from modal
  const handleReceiptScanComplete = (receiptData: {
    merchant: string;
    amount: number;
    category: ExpenseCategory;
    itemsSummary: string;
  }) => {
    const timeStr = getCurrentTimeStr();
    const receiptMsgId = 'rec_' + Date.now();

    const userReceiptMsg: WhatsAppMessage = {
      id: receiptMsgId,
      sender: 'user',
      text: `[Foto de comprobante: ${receiptData.merchant}]`,
      timestamp: timeStr,
      status: 'read',
      mediaType: 'image',
      mediaUrl: 'receipt_placeholder'
    };

    setMessages((prev) => [...prev, userReceiptMsg]);
    setIsTyping(true);

    setTimeout(() => {
      const newSaldo = Math.max(0, budgetState.saldoRealGastable - receiptData.amount);

      onUpdateBudget((prev) => ({
        ...prev,
        todaySpent: prev.todaySpent + receiptData.amount,
        saldoRealGastable: newSaldo,
        expenses: [
          {
            id: 'exp_' + Date.now(),
            amount: receiptData.amount,
            category: receiptData.category,
            description: receiptData.merchant,
            timestamp: timeStr,
            inputMethod: 'receipt'
          },
          ...prev.expenses
        ]
      }));

      const botReply: WhatsAppMessage = {
        id: 'bot_receipt_' + Date.now(),
        sender: 'bot',
        text: `📸 *Recibo escaneado (1.2s):* ${receiptData.merchant}\n\n☕ Registrado en *${receiptData.category}*: *${formatCurrency(receiptData.amount, currency)}*\nTu *saldo real gastable* para hoy es de *${formatCurrency(newSaldo, currency)}*.\n\n_Detectado automáticamente: ${receiptData.itemsSummary}._`,
        timestamp: timeStr,
        status: 'read',
        buttons: [
          { id: 'btn_rec_ok', text: '👍 Listo, gracias', action: 'send_text', payload: 'Listo, todo bien' },
          { id: 'btn_rec_undo', text: '🔄 Deshacer', action: 'undo_last' }
        ]
      };

      setMessages((prev) => [...prev, botReply]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Top Phone Chrome / Environment Controls */}
      <div className="w-full max-w-md mb-3 flex items-center justify-between text-xs text-slate-400 px-1">
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold">Simulador WhatsApp</span>
          <span className="text-emerald-400 font-mono text-[10px] bg-emerald-950/60 border border-emerald-800 px-1.5 py-0.5 rounded">
            En línea
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Currency Switcher */}
          <div className="relative">
            <select
              value={currency}
              onChange={(e) => onCurrencyChange(e.target.value as CurrencyCode)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg py-1 px-2 pr-6 appearance-none focus:outline-hidden focus:border-emerald-500 cursor-pointer"
            >
              {Object.entries(CURRENCY_CONFIGS).map(([code, cfg]) => (
                <option key={code} value={code}>
                  {cfg.flag} {code}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-2 pointer-events-none" />
          </div>

          {/* Theme switcher */}
          <button
            onClick={() => setIsDarkWhatsApp(!isDarkWhatsApp)}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:text-white transition-colors"
            title="Alternar modo Claro / Oscuro de WhatsApp"
          >
            {isDarkWhatsApp ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          {/* Impulse Vault trigger */}
          <button
            onClick={() => setIsVaultModalOpen(true)}
            className="p-1.5 rounded-lg bg-amber-950/60 border border-amber-600/40 text-amber-400 hover:bg-amber-900/60 transition-colors flex items-center gap-1 text-[11px]"
            title="Ver Bóveda Anti-Impulso"
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-medium">Bóveda ({budgetState.impulseVault.filter(i => i.status === 'locked').length})</span>
          </button>
        </div>
      </div>

      {/* Quick Scenario Launchers */}
      <div className="w-full max-w-md mb-3 flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
        <button
          onClick={() => handleSendMessage('Gasto $10 en almuerzo')}
          className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500 text-slate-300 hover:text-white whitespace-nowrap flex items-center gap-1 transition-colors"
        >
          <Zap className="w-3 h-3 text-emerald-400" />
          <span>F1: Texto $10</span>
        </button>
        <button
          onClick={() => setIsVoiceModalOpen(true)}
          className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500 text-slate-300 hover:text-white whitespace-nowrap flex items-center gap-1 transition-colors"
        >
          <Mic className="w-3 h-3 text-emerald-400" />
          <span>F1: Audio $15</span>
        </button>
        <button
          onClick={() => setIsReceiptModalOpen(true)}
          className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500 text-slate-300 hover:text-white whitespace-nowrap flex items-center gap-1 transition-colors"
        >
          <Camera className="w-3 h-3 text-emerald-400" />
          <span>F1: Foto $4.80</span>
        </button>
        <button
          onClick={() => handleSendMessage('¿Puedo comprar estas zapatillas de $80?')}
          className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-amber-500 text-slate-300 hover:text-white whitespace-nowrap flex items-center gap-1 transition-colors"
        >
          <Shield className="w-3 h-3 text-amber-400" />
          <span>F2: Anti-Impulso</span>
        </button>
        <button
          onClick={() => handleSendMessage('Gasté $55 en una cena inesperada')}
          className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-blue-500 text-slate-300 hover:text-white whitespace-nowrap flex items-center gap-1 transition-colors"
        >
          <RefreshCw className="w-3 h-3 text-blue-400" />
          <span>F3: Recálculo</span>
        </button>
      </div>

      {/* Main WhatsApp Device Frame */}
      <div
        className={`w-full max-w-md rounded-3xl overflow-hidden border shadow-2xl flex flex-col transition-colors duration-200 ${
          isDarkWhatsApp
            ? 'bg-[#0b141a] border-slate-800 text-slate-100'
            : 'bg-[#efeae2] border-slate-300 text-slate-900'
        }`}
        style={{ height: '640px' }}
      >
        {/* Mobile OS Status Bar */}
        <div
          className={`px-5 py-2 flex items-center justify-between text-[11px] font-semibold tracking-tight ${
            isDarkWhatsApp ? 'bg-[#1f2c34] text-slate-300' : 'bg-[#008069] text-white'
          }`}
        >
          <span>09:41</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px]">5G</span>
            <div className="w-4 h-2 border border-current rounded-xs flex items-center p-0.5">
              <div className="w-full h-full bg-current rounded-2xs" />
            </div>
          </div>
        </div>

        {/* WhatsApp App Header Bar */}
        <div
          className={`px-3 py-2.5 flex items-center justify-between border-b ${
            isDarkWhatsApp
              ? 'bg-[#1f2c34] border-[#222d34] text-white'
              : 'bg-[#008069] border-[#00705c] text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <button className="p-1 -ml-1 text-inherit">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-emerald-700 border border-emerald-400/40 flex items-center justify-center text-white font-bold text-sm shadow-xs">
                🤖
              </div>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 absolute bottom-0 right-0 border-2 border-[#1f2c34]" />
            </div>
            <div>
              <div className="font-semibold text-xs leading-none flex items-center gap-1 text-inherit">
                <span>FinBot</span>
                <span className="text-[10px] text-emerald-300">✓</span>
              </div>
              <div className="text-[10px] text-emerald-200/90 leading-tight mt-0.5">
                {isTyping ? 'escribiendo...' : 'en línea'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-inherit">
            <button className="p-1 hover:opacity-80 transition-opacity">
              <Video className="w-4 h-4" />
            </button>
            <button className="p-1 hover:opacity-80 transition-opacity">
              <Phone className="w-4 h-4" />
            </button>
            <button className="p-1 hover:opacity-80 transition-opacity">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sticky Real-Time Balance HUD Bar */}
        <div
          className={`px-4 py-2 border-b flex items-center justify-between text-xs transition-all ${
            isDarkWhatsApp
              ? 'bg-[#111b21] border-[#222d34] text-slate-300'
              : 'bg-white border-slate-200 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[11px] font-medium">Saldo Real Gastable Hoy:</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-sm text-emerald-500">
              {formatCurrency(budgetState.saldoRealGastable, currency)}
            </span>
            <button
              onClick={() => handleSendMessage('¿Cómo voy hoy?')}
              className="text-[10px] text-slate-400 hover:text-emerald-400 transition-colors"
              title="Actualizar estado"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Chat Message Scroll Area */}
        <div
          className="flex-1 p-3 overflow-y-auto space-y-3 whatsapp-scroll"
          style={{
            backgroundImage: isDarkWhatsApp
              ? 'radial-gradient(#1f2c34 1px, transparent 1px)'
              : 'radial-gradient(#d1d7db 1px, transparent 1px)',
            backgroundSize: '16px 16px'
          }}
        >
          {/* Subtle Encrypted notice */}
          <div className="flex justify-center">
            <div
              className={`px-3 py-1 rounded-lg text-[10px] text-center max-w-xs shadow-xs ${
                isDarkWhatsApp
                  ? 'bg-[#182229] text-amber-300/80'
                  : 'bg-[#ffeecd] text-amber-900'
              }`}
            >
              🔒 Asistente personal FinBot. Sin juicios, 100% privado y seguro.
            </div>
          </div>

          {/* Render Messages */}
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[92%] ${
                  isUser ? 'ml-auto' : 'mr-auto'
                }`}
              >
                {/* Bubble Container */}
                <div
                  className={`rounded-2xl px-3.5 py-2 shadow-xs text-xs relative ${
                    isUser
                      ? isDarkWhatsApp
                        ? 'bg-[#005c4b] text-white rounded-tr-xs'
                        : 'bg-[#d9fdd3] text-slate-900 rounded-tr-xs'
                      : isDarkWhatsApp
                      ? 'bg-[#202c33] text-slate-100 rounded-tl-xs'
                      : 'bg-white text-slate-900 rounded-tl-xs'
                  }`}
                >
                  {/* Media attachment: Audio Note */}
                  {msg.mediaType === 'audio' && (
                    <div className="flex items-center gap-3 py-1 pr-2 min-w-[210px]">
                      <button
                        onClick={() =>
                          setIsPlayingAudio(isPlayingAudio === msg.id ? null : msg.id)
                        }
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-90 ${
                          isUser
                            ? 'bg-emerald-600 text-white'
                            : 'bg-emerald-500 text-white'
                        }`}
                      >
                        {isPlayingAudio === msg.id ? (
                          <Pause className="w-4 h-4 fill-current" />
                        ) : (
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        )}
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-1 h-4">
                          {[30, 60, 40, 80, 50, 90, 70, 40, 85, 35, 65, 45, 95, 30].map(
                            (h, i) => (
                              <div
                                key={i}
                                className={`w-0.5 rounded-full ${
                                  isPlayingAudio === msg.id
                                    ? 'bg-emerald-300 animate-pulse'
                                    : 'bg-slate-400/60'
                                }`}
                                style={{ height: `${h}%` }}
                              />
                            )
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-slate-400 mt-1 font-mono">
                          <span>{msg.audioDuration || '0:03'}</span>
                          <span className="italic">Audio de voz</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Media attachment: Receipt image */}
                  {msg.mediaType === 'image' && (
                    <div className="mb-2 rounded-xl overflow-hidden bg-slate-900/60 p-2.5 border border-slate-700/50 flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <Camera className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-[11px] text-white">Comprobante escaneado</div>
                        <div className="text-[10px] text-emerald-400 font-mono">OCR completado en 1.2s</div>
                      </div>
                    </div>
                  )}

                  {/* Text content with bolding parser */}
                  <div className="whitespace-pre-line leading-relaxed">
                    {msg.text.split('\n').map((line, lIdx) => (
                      <React.Fragment key={lIdx}>
                        {line.split(/(\*[^*]+\*|_[^_]+_)/g).map((chunk, cIdx) => {
                          if (chunk.startsWith('*') && chunk.endsWith('*')) {
                            return (
                              <strong key={cIdx} className="font-bold text-inherit">
                                {chunk.slice(1, -1)}
                              </strong>
                            );
                          }
                          if (chunk.startsWith('_') && chunk.endsWith('_')) {
                            return (
                              <em key={cIdx} className="italic text-slate-400">
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

                  {/* Timestamp and Checkmarks */}
                  <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 mt-1 float-right ml-2">
                    <span>{msg.timestamp}</span>
                    {isUser && <CheckCheck className="w-3.5 h-3.5 text-sky-400 inline" />}
                  </div>
                </div>

                {/* WhatsApp Interactive Quick Reply Buttons */}
                {msg.buttons && msg.buttons.length > 0 && (
                  <div className="w-full mt-1.5 flex flex-col gap-1">
                    {msg.buttons.map((btn) => (
                      <button
                        key={btn.id}
                        onClick={() => handleButtonClick(btn)}
                        className={`w-full py-2 px-3 rounded-xl text-center text-xs font-semibold transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-[0.98] ${
                          isDarkWhatsApp
                            ? 'bg-[#202c33] hover:bg-[#2a3942] text-emerald-400 border border-[#2a3942]'
                            : 'bg-white hover:bg-slate-50 text-[#008069] border border-slate-200'
                        }`}
                      >
                        <span>{btn.text}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <div
              className={`rounded-2xl px-3 py-2 text-xs w-16 shadow-xs flex items-center justify-center gap-1 ${
                isDarkWhatsApp ? 'bg-[#202c33] text-slate-400' : 'bg-white text-slate-500'
              }`}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
              <div
                className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <div
                className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* WhatsApp Bottom Chat Input Bar */}
        <div
          className={`p-2 flex items-center gap-2 border-t ${
            isDarkWhatsApp ? 'bg-[#1f2c34] border-[#222d34]' : 'bg-[#f0f2f5] border-slate-200'
          }`}
        >
          <button
            type="button"
            className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Smile className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => setIsReceiptModalOpen(true)}
            className="p-1.5 text-slate-400 hover:text-emerald-400 transition-colors"
            title="Adjuntar foto de recibo o boleta"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendMessage();
            }}
            placeholder="Escribe un gasto o pregunta..."
            className={`flex-1 rounded-xl px-3 py-2 text-xs focus:outline-hidden transition-colors ${
              isDarkWhatsApp
                ? 'bg-[#2a3942] text-white placeholder-slate-400 focus:ring-1 focus:ring-emerald-500'
                : 'bg-white text-slate-900 placeholder-slate-500 focus:ring-1 focus:ring-[#008069]'
            }`}
          />

          {inputText.trim() ? (
            <button
              onClick={() => handleSendMessage()}
              className="p-2 rounded-full bg-[#00a884] hover:bg-[#008f70] text-white transition-all active:scale-95 shadow-md"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          ) : (
            <button
              onClick={() => setIsVoiceModalOpen(true)}
              className="p-2 rounded-full bg-[#00a884] hover:bg-[#008f70] text-white transition-all active:scale-95 shadow-md"
              title="Grabar o simular nota de voz"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Modals for Voice, Receipt OCR, and Vault */}
      <VoiceNoteRecorder
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onSendVoiceNote={handleVoiceNoteReceived}
      />

      <ReceiptScannerModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        currency={currency}
        onScanComplete={handleReceiptScanComplete}
      />

      <ImpulseVaultModal
        isOpen={isVaultModalOpen}
        onClose={() => setIsVaultModalOpen(false)}
        items={budgetState.impulseVault}
        currency={currency}
        onSimulate24hUnlock={(item) => {
          setIsVaultModalOpen(false);
          const timeStr = getCurrentTimeStr();
          const unlockMessage: WhatsAppMessage = {
            id: 'bot_unfreeze_' + Date.now(),
            sender: 'bot',
            text: `⏰ *¡Pasaron las 24 horas!* 🔓\n\nTus *${item.item} (${formatCurrency(item.amount, currency)})* ya están desbloqueadas en la Bóveda Anti-Impulso.\n\nSé 100% honesto contigo: ¿siguen siendo tu prioridad número 1 hoy o el antojo ya se enfrió un poco?`,
            timestamp: timeStr,
            status: 'read',
            buttons: [
              { id: 'btn_unfreeze_save', text: '💡 Se me pasó, ¡ahorrado!', action: 'send_text', payload: 'Se me pasó el antojo, ¡ahorrado!' },
              { id: 'btn_unfreeze_buy', text: '🎉 Aún las quiero comprar', action: 'send_text', payload: `Aún las quiero comprar por $${item.amount}` }
            ]
          };
          setMessages((prev) => [...prev, unlockMessage]);
        }}
        onCancelImpulseSaved={(item) => {
          onUpdateBudget((prev) => ({
            ...prev,
            impulseVault: prev.impulseVault.map((i) =>
              i.id === item.id ? { ...i, status: 'cancelled_saved' as const } : i
            )
          }));
          setIsVaultModalOpen(false);
          handleSendMessage('Se me pasó el antojo, ¡decidí no comprarlo y ahorrarlo!');
        }}
        onPurchaseAnyway={(item) => {
          onUpdateBudget((prev) => ({
            ...prev,
            impulseVault: prev.impulseVault.map((i) =>
              i.id === item.id ? { ...i, status: 'purchased' as const } : i
            )
          }));
          setIsVaultModalOpen(false);
          handleSendMessage(`Compré ${item.item} por $${item.amount}`);
        }}
      />
    </div>
  );
};
