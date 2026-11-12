export interface ValidationRule {
  id: string;
  name: string;
  pattern: string;
  exampleInput: string;
  extractedOutput: string;
  latencySLA: string;
  fallbackAction: string;
}

export const VALIDATION_RULES: ValidationRule[] = [
  {
    id: 'rule_1',
    name: 'Monto + Categoría implícita simple',
    pattern: `/^(?:gasto|pague|pagué)?\\s*\\$?([0-9]+(?:[.,][0-9]{1,2})?)\\s*(?:en|de)?\\s*([a-zA-ZáéíóúÁÉÍÓÚñÑ ]+)$/i`,
    exampleInput: 'Gasto $10 en almuerzo',
    extractedOutput: '{ amount: 10, category: "comida", desc: "Almuerzo" }',
    latencySLA: '< 200 ms',
    fallbackAction: 'Confirmar registro y dar opción rápida de 1-click para cambiar categoría si difiere.'
  },
  {
    id: 'rule_2',
    name: 'Concepto + Monto invertido',
    pattern: `/^([a-zA-ZáéíóúÁÉÍÓÚñÑ ]+)\\s*\\$?([0-9]+(?:[.,][0-9]{1,2})?)$/i`,
    exampleInput: 'uber 25',
    extractedOutput: '{ amount: 25, category: "transporte", desc: "Uber" }',
    latencySLA: '< 150 ms',
    fallbackAction: 'Reconocer marca o sustantivo en diccionario semántico sin preguntar.'
  },
  {
    id: 'rule_3',
    name: 'Multiplicadores y Jerga LatAm (lucas, k, varos, mangos)',
    pattern: `/([0-9]+(?:[.,][0-9]{1,2})?)\\s*(k|mil|lucas|palos|mangos)/i`,
    exampleInput: '15 lucas en la farmacia',
    extractedOutput: '{ amount: 15000, category: "salud", desc: "Farmacia" }',
    latencySLA: '< 180 ms',
    fallbackAction: 'Ajustar escala según la moneda local seleccionada (ej. COP/CLP/ARS).'
  },
  {
    id: 'rule_4',
    name: 'Detección de Consulta Impulsiva (Pre-compra)',
    pattern: `/(?:¿|\\?)?(?:puedo|me compro|alcanza|antojo|quiero comprar)\\s+([a-zA-ZáéíóúÁÉÍÓÚñÑ ]+)\\s*(?:de|por)?\\s*\\$?([0-9]+)/i`,
    exampleInput: '¿Puedo comprar estas zapatillas de $80?',
    extractedOutput: '{ intent: "ask_impulse", item: "Zapatillas", amount: 80 }',
    latencySLA: '< 300 ms',
    fallbackAction: 'Activar protocolo Alerta Anti-Impulso con validación empática y Bóveda 24h.'
  },
  {
    id: 'rule_5',
    name: 'Nota de Voz (Audio Transcribe)',
    pattern: `VAD (Voice Activity Detection) + Fast Whisper / Gemini Transcriber`,
    exampleInput: 'Nota de voz de 2.5 seg ("Gasté doce con cincuenta en el cafecito")',
    extractedOutput: '{ amount: 12.50, category: "gustitos", desc: "Cafecito" }',
    latencySLA: '< 1.8 segundos',
    fallbackAction: 'Mostrar transcripción textual corta en el encabezado del mensaje de confirmación.'
  },
  {
    id: 'rule_6',
    name: 'Foto de Recibo / Boleta (OCR)',
    pattern: `Vision OCR + Parsing de Total y Nombre de Establecimiento`,
    exampleInput: 'Foto boleta Starbucks por $4.80',
    extractedOutput: '{ amount: 4.80, category: "gustitos", merchant: "Starbucks" }',
    latencySLA: '< 2.0 segundos',
    fallbackAction: 'Extraer el importe mayor o etiqueta "TOTAL". Botón de [✏️ Corregir] visible.'
  }
];

export const WHATSAPP_API_CONSTRAINTS = [
  {
    feature: 'Botones de Respuesta Rápida (Quick Replies)',
    limit: 'Máximo 3 botones por mensaje',
    characterLimit: '20 caracteres por botón',
    uxRecommendation: 'Usar verbos directos precedidos de emojis sencillos (ej. [⏱ Bóveda 24h], [⚡ Comprar igual], [🔄 Deshacer]).'
  },
  {
    feature: 'Mensajes de Lista (List Messages)',
    limit: 'Hasta 10 opciones agrupadas en secciones',
    characterLimit: '24 caracteres en título de fila, 72 en descripción',
    uxRecommendation: 'Ideal para selector de categorías secundarias o revisión de presupuesto semanal.'
  },
  {
    feature: 'Límite de Longitud de Texto',
    limit: 'Hasta 1024 caracteres en mensajes con botones / 4096 sin botones',
    characterLimit: 'Óptimo UX: 120 - 250 caracteres',
    uxRecommendation: 'Evitar bloques de texto monolíticos. Utilizar micro-párrafos con saltos dobles y viñetas limpias.'
  },
  {
    feature: 'Formato Tipográfico',
    limit: 'WhatsApp markdown nativo (*negrita*, _cursiva_, ~tachado~, ```mono```)',
    characterLimit: 'Sin límite',
    uxRecommendation: 'Negrita estricta para el Saldo Real Gastable y nombres de ítems. Cursiva para tips empáticos o metadatos silenciosos.'
  }
];

export const ANTI_ANXIETY_PRINCIPLES = [
  {
    principle: '1. Cero Gráficos Rojos Intimidantes',
    traditionalBanking: 'Gráficos de dona en rojo chillón, alertas que dicen "¡ALERTA! Has superado tu límite en un 140%" generando culpa y abandono de la app.',
    finbotApproach: 'Tono sereno en neutros y verdes menta. La cifra del día es neutral o cálida: "Gastaste un poco más hoy, la vida pasa y para eso es el dinero 💛. Rebalanceamos suavemente en cuotas de -$3."'
  },
  {
    principle: '2. Un Solo Número Cardinal: El Saldo Real Gastable',
    traditionalBanking: 'Tableros con 8 métricas (Ingresos brutos, pasivos corrientes, presupuesto devengado, flujo de caja proyectado) que abruman al usuario de 20 años.',
    finbotApproach: '"Tu saldo real gastable para hoy es de $35". Si te sobra, puedes gastarlo sin culpa alguna. Es un permiso psicológico claro para vivir.'
  },
  {
    principle: '3. La Bóveda Anti-Impulso de 24 Horas',
    traditionalBanking: 'Bloqueo forzado de tarjetas o advertencias paternalistas que el usuario ignora por frustración.',
    finbotApproach: 'Propuesta de pausa consentida: "Esas zapatillas están geniales 🔥👟. ¿Las dejamos 24h en la Bóveda para decidir con la cabeza fría?". El 74% de los impulsos se desvanecen solos sin sensación de castigo.'
  },
  {
    principle: '4. Recálculo Flexible sin Juicio ni Castigo',
    traditionalBanking: 'Mes cerrado con "DÉFICIT". Mensajes que hacen sentir al usuario irresponsable tras un imprevisto o fiesta.',
    finbotApproach: 'Recálculo matemático indoloro: reparte el sobregasto entre los días restantes de la semana en centavos o montos mínimos que no duelen.'
  }
];
