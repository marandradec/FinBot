import { CurrencyCode, ExpenseCategory, NLPParseResult } from '../types/finbot';

export const CURRENCY_CONFIGS: Record<CurrencyCode, {
  symbol: string;
  name: string;
  locale: string;
  flag: string;
  defaultDailyBudget: number;
  sampleSlang: string;
}> = {
  USD: { symbol: '$', name: 'Dólar (USD)', locale: 'en-US', flag: '🇺🇸', defaultDailyBudget: 35, sampleSlang: '35 bucks / 35 dólares' },
  MXN: { symbol: '$', name: 'Peso Mexicano', locale: 'es-MX', flag: '🇲🇽', defaultDailyBudget: 600, sampleSlang: '600 varias / varos' },
  COP: { symbol: '$', name: 'Peso Colombiano', locale: 'es-CO', flag: '🇨🇴', defaultDailyBudget: 120000, sampleSlang: '120 lucas' },
  ARS: { symbol: '$', name: 'Peso Argentino', locale: 'es-AR', flag: '🇦🇷', defaultDailyBudget: 35000, sampleSlang: '35 lucas / mangos' },
  CLP: { symbol: '$', name: 'Peso Chileno', locale: 'es-CL', flag: '🇨🇱', defaultDailyBudget: 30000, sampleSlang: '30 lucas' },
  PEN: { symbol: 'S/.', name: 'Sol Peruano', locale: 'es-PE', flag: '🇵🇪', defaultDailyBudget: 120, sampleSlang: '120 soles' },
};

export const CATEGORY_KEYWORDS: Record<ExpenseCategory, string[]> = {
  comida: [
    'almuerzo', 'comida', 'cena', 'desayuno', 'cafecito', 'café', 'cafe', 'starbucks',
    'pizza', 'hamburguesa', 'sushi', 'empanada', 'empanadas', 'tacos', 'arepas',
    'delivery', 'rappi', 'pedidosya', 'uber eats', 'supermercado', 'super', 'oxxo',
    'tiendita', 'panaderia', 'pan', 'mercado', 'chifa', 'completo'
  ],
  transporte: [
    'uber', 'didi', 'cabify', 'taxi', 'colectivo', 'subte', 'metro', 'bus', 'pasaje',
    'gasolina', 'nafta', 'bencina', 'peaje', 'estacionamiento', 'parquímetro', 'recarga bip'
  ],
  gustitos: [
    'zapatillas', 'tenis', 'championes', 'ropa', 'zapatos', 'polo', 'remera', 'polera',
    'zara', 'h&m', 'cerveza', 'birra', 'chela', 'trago', 'boliche', 'joda', 'carrete',
    'antorcha', 'steam', 'playstation', 'videojuego', 'salida', 'cine', 'concierto', 'auriculares', 'audífonos'
  ],
  servicios: [
    'internet', 'wifi', 'luz', 'agua', 'gas', 'netflix', 'spotify', 'disney', 'prime',
    'celular', 'plan', 'teléfono', 'gym', 'gimnasio', 'arriendo', 'alquiler', 'cuota'
  ],
  salud: [
    'farmacia', 'remedio', 'medicina', 'pastillas', 'médico', 'medico', 'consulta',
    'dentista', 'hospital', 'psicólogo', 'óptica', 'lentes'
  ],
  educacion: [
    'universidad', 'libro', 'cuaderno', 'curso', 'udemy', 'fotocopias', 'tutor', 'idiomas'
  ],
  otros: ['varios', 'compra', 'pago', 'gasto', 'transferencia']
};

export function parseLatAmExpenseInput(input: string, currency: CurrencyCode = 'USD'): NLPParseResult {
  const startTime = performance.now();
  const cleanInput = input.trim().toLowerCase();

  // 1. Detect Intent
  let intent: NLPParseResult['intent'] = 'register_expense';
  let matchedRule = 'Auto-detect expense pattern';

  const impulseQuestionRegex = /(\?|¿|puedo|podria|compro|comprarme|alcanza|antojo|vi una|vi unas|quiero comprar|me compro|vale la pena)/i;
  const balanceCheckRegex = /(saldo|cuanto me queda|cuánto me queda|presupuesto|como voy|cómo voy|estado)/i;
  const undoRegex = /(deshacer|borrar|eliminar|me equivoque|me equivoqué|anular|cancelar)/i;

  if (undoRegex.test(cleanInput)) {
    intent = 'undo';
    matchedRule = 'Intent: Undo last operation';
  } else if (impulseQuestionRegex.test(cleanInput) && !cleanInput.startsWith('gasto') && !cleanInput.startsWith('pague')) {
    intent = 'ask_impulse';
    matchedRule = 'Intent: Pre-purchase impulse enquiry';
  } else if (balanceCheckRegex.test(cleanInput) && !/\d+/.test(cleanInput)) {
    intent = 'check_balance';
    matchedRule = 'Intent: Daily safe-to-spend balance check';
  }

  // 2. Extract numeric amount
  let amount: number | null = null;

  // Patterns:
  // e.g. "80", "$80", "80.50", "80,50", "15k", "15 lucas", "120 mil"
  const lucasMatch = cleanInput.match(/(\d+(?:[.,]\d+)?)\s*(k|mil|lucas|palos)/i);
  const standardMatch = cleanInput.match(/(?:[$s\/]?\s*)(\d+(?:[.,]\d+)?)/i);

  if (lucasMatch) {
    const rawNum = parseFloat(lucasMatch[1].replace(',', '.'));
    const unit = lucasMatch[2].toLowerCase();
    if (unit === 'k' || unit === 'mil' || unit === 'lucas') {
      // In COP, ARS, CLP, lucas is often thousands. In USD, 15 lucas is rarely spoken or means 15k
      if (currency === 'COP' || currency === 'ARS' || currency === 'CLP') {
        amount = rawNum * 1000;
      } else {
        amount = rawNum * 1000;
      }
    } else if (unit === 'palos') {
      amount = rawNum * 1000000;
    }
    matchedRule = `Regex: Extracted slang scale (${unit})`;
  } else if (standardMatch) {
    const rawVal = standardMatch[1].replace(',', '.');
    amount = parseFloat(rawVal);
    matchedRule = 'Regex: Standard numeric extraction';
  }

  // 3. Extract Category & Description
  let detectedCategory: ExpenseCategory = 'otros';
  let description = 'Gasto registrado';

  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS) as [ExpenseCategory, string[]][]) {
    for (const w of words) {
      if (cleanInput.includes(w)) {
        detectedCategory = cat;
        description = w.charAt(0).toUpperCase() + w.slice(1);
        break;
      }
    }
    if (detectedCategory !== 'otros') break;
  }

  // If no specific category was found, extract non-numeric words as description
  if (description === 'Gasto registrado') {
    const textWithoutNumbers = cleanInput
      .replace(/[$s\/\d.,]/g, '')
      .replace(/\b(gasto|pague|pagué|en|de|por|un|una|unos|unas|compre|compré|para)\b/gi, '')
      .trim();
    if (textWithoutNumbers.length > 2) {
      description = textWithoutNumbers.charAt(0).toUpperCase() + textWithoutNumbers.slice(1);
    }
  }

  const endTime = performance.now();
  const processingTimeMs = Math.round((endTime - startTime) * 100) / 100;

  return {
    amount,
    currency,
    category: detectedCategory,
    description,
    confidence: amount !== null ? 0.96 : 0.45,
    intent,
    rawInput: input,
    processingTimeMs,
    matchedRule
  };
}

export function formatCurrency(amount: number, currency: CurrencyCode = 'USD'): string {
  const conf = CURRENCY_CONFIGS[currency] || CURRENCY_CONFIGS.USD;
  const isZeroDecimals = currency === 'CLP' || currency === 'COP' || currency === 'ARS';

  const formatted = new Intl.NumberFormat(conf.locale, {
    minimumFractionDigits: isZeroDecimals ? 0 : (amount % 1 === 0 ? 0 : 2),
    maximumFractionDigits: isZeroDecimals ? 0 : 2,
  }).format(amount);

  return `${conf.symbol}${formatted}`;
}
