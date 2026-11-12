import { CopyItem } from '../types/finbot';

export const COPY_DECK: CopyItem[] = [
  {
    id: 'f1_text_success',
    flow: 'Flujo 1: Registro Rápido',
    trigger: 'El usuario escribe un gasto rápido por texto (ej. "Gasto $10 en almuerzo")',
    botMessage: `¡*Almuerzo* registrado con éxito! 🍔\n\nTu *saldo real gastable* para hoy es de *$25.00*.\n\n_Tip: Vas con buen ritmo para cerrar el día en verde._`,
    userOptions: ['[🔄 Deshacer]', '[🏷 Cambiar categoría]', '[📊 Ver día]'],
    rationale: 'Confirmación instantánea en menos de 2 segundos. Muestra la categoría inferida y el único número cardinal que importa: el saldo real gastable del día.',
    tonePillars: ['Cero fricción (<2s)', 'Feedback inmediato', 'Sin jerga bancaria']
  },
  {
    id: 'f1_voice_note',
    flow: 'Flujo 1: Registro Rápido',
    trigger: 'El usuario envía una nota de voz de 3 segundos ("Pagué 15 dólares en la farmacia")',
    botMessage: `🎧 *Audio procesado (1.4s):*\n"Pagué $15 en la farmacia"\n\n¡*Salud ($15.00)* registrado! 💊\nTu *saldo real gastable* de hoy queda en *$20.00*.\n\nQue te mejores pronto. Si necesitas ajustar algo, dímelo.`,
    userOptions: ['[👍 Todo bien]', '[🔄 Deshacer]', '[📝 Editar monto]'],
    rationale: 'Reconoce que el usuario iba caminando o apurado. Transcribe en una línea para dar confianza sin saturar y actualiza la cifra gastable.',
    tonePillars: ['Empatía situacional', 'Transparencia de transcripción', 'Amabilidad genuina']
  },
  {
    id: 'f1_receipt_photo',
    flow: 'Flujo 1: Registro Rápido',
    trigger: 'El usuario envía una foto o boleta de supermercado o cafetería',
    botMessage: `📸 *Recibo detectado:* Starbucks ($4.80)\n\n☕ ¡Cafecito registrado en *Gustitos*!\nTu *saldo real gastable* para hoy es de *$30.20*.\n\n_Detectado automáticamente: 1x Latte Caramelo ($4.80). ¿Quieres guardar el recibo para tu historial?_`,
    userOptions: ['[📁 Guardar comprobante]', '[✏️ Corregir]', '[👍 Listo]'],
    rationale: 'Elimina el tedio de teclear montos de boletas. El bot extrae total, comercio e ítem sin pedir confirmaciones innecesarias a menos que el usuario quiera editar.',
    tonePillars: ['Automatización silenciosa', 'Validación por omisión', 'Cero cuestionarios']
  },
  {
    id: 'f2_impulse_enquiry',
    flow: 'Flujo 2: Alerta Anti-Impulso',
    trigger: 'El usuario consulta antes de comprar algo caro/impulsivo (ej. "¿Puedo comprar estas zapatillas de $80?")',
    botMessage: `¡Esas *zapatillas* se ven geniales! 🔥👟\n\nPero revisando tus números:\n• Tu saldo gastable de hoy: *$35.00*\n• Costo del antojo: *$80.00*\n\nSi las compras hoy, comprometerías *$15 de tu saldo diario durante los próximos 3 días* y nos dejarías sin colchón para salidas de fin de semana.\n\n💡 *Mi recomendación:* ¿Qué tal si las metemos a la *Bóveda Anti-Impulso por 24 horas*? Si mañana aún las quieres, armamos un plan juntos para comprarlas sin estrés.`,
    userOptions: ['[⏱ Guardar en Bóveda 24h]', '[⚡ Comprar de todos modos]', '[💡 Ver alternativas]'],
    rationale: 'Validación emocional positiva primero ("se ven geniales") para evitar que el usuario se sienta juzgado. Explica el impacto en días futuros, no en números abstractos, y ofrece la salida psicológica de la pausa de 24h.',
    tonePillars: ['Cero culpa o juicio', 'Perspectiva temporal clara', 'Alternativa constructiva']
  },
  {
    id: 'f2_vault_confirmation',
    flow: 'Flujo 2: Alerta Anti-Impulso',
    trigger: 'El usuario decide enviar el ítem a la Bóveda Anti-Impulso de 24 horas',
    botMessage: `🔒 *¡Bóveda Anti-Impulso activada!* 🧘\n\nGuardamos: *Zapatillas ($80.00)*\nTiempo de enfriamiento: *24 horas*\n\nMañana a las *18:30* te avisaré para que decidas con la mente fría.\n\n_Dato curioso: El 74% de las veces, el deseo de compra baja más del 60% después de solo una noche de descanso. ¡Gran decisión de autocontrol hoy!_ 👏`,
    userOptions: ['[📊 Ver mi Bóveda]', '[🛒 Cambié de opinión]', '[✨ Gracias FinBot]'],
    rationale: 'Refuerzo positivo inmediato. Valida la decisión del usuario como un acto de autocontrol y poder personal, respaldado por un dato conductual esperanzador.',
    tonePillars: ['Refuerzo positivo', 'Gamificación psicológica', 'Tranquilidad']
  },
  {
    id: 'f2_vault_unlock_24h',
    flow: 'Flujo 2: Alerta Anti-Impulso',
    trigger: 'Transcurren las 24 horas de la Bóveda Anti-Impulso',
    botMessage: `⏰ *¡Pasaron las 24 horas!* 🔓\n\nTus *Zapatillas ($80.00)* ya están desbloqueadas en la Bóveda.\n\nSé honesto contigo: ¿siguen siendo una prioridad número 1 hoy o el antojo ya pasó un poco?`,
    userOptions: ['[🎉 ¡Aún las quiero! Comprar]', '[💡 Se me pasó el antojo, ¡ahorrado!]', '[⏱ Darme 48h más]'],
    rationale: 'Pregunta neutra y honesta. Permite al usuario celebrar si se le pasó el antojo (ahorro automático sin esfuerzo) o planificar la compra si realmente la desea.',
    tonePillars: ['Autonomía del usuario', 'Celebración del ahorro invisible', 'Cero presión']
  },
  {
    id: 'f3_overspend_rebalance',
    flow: 'Flujo 3: Recálculo Flexible',
    trigger: 'El usuario gasta de más en un día (ej. cena sorpresa de $55 superando los $35 asignados)',
    botMessage: `¡Cena registrada con éxito! 🍕✨\n\nOye, ¡*la vida pasa y para eso es el dinero*! 💛 Hoy gastaste *$20 más* de lo previsto, y está perfecto disfrutarlo.\n\nPara no tocar tus metas de ahorro ni los costos fijos, hice un *recálculo flexible*:\n\n• Próximos 5 días: *$31.00/día* (en vez de $35.00)\n• Tu colchón de emergencia: *Intacto (100%)*\n\n¡Seguimos en balance sin sacrificios raros! 🚀`,
    userOptions: ['[👍 ¡Genial, aceptado!]', '[🔄 Ajustar manualmente]', '[📊 Ver plan semanal]'],
    rationale: 'Elimina de raíz la vergüenza y el "modo castigo". Normaliza que los gastos fluctúan. Distribuye el sobregasto entre los días restantes en cuotas microscópicas (-$4/día) que el usuario casi no nota.',
    tonePillars: ['Comprensión humana total', 'Recálculo suave y matemático', 'Cero gráficos rojos']
  },
  {
    id: 'f3_weekly_health',
    flow: 'Flujo 3: Recálculo Flexible',
    trigger: 'El usuario pide ver cómo va su semana o durante el cierre semanal del domingo',
    botMessage: `🌿 *Tu balance semanal sin filtros:* \n\n• Presupuesto gastable total: *$245.00*\n• Gastado hasta hoy: *$148.00*\n• *Saldo disponible para el fin de semana:* *$97.00*\n\n_Tienes suficiente margen para salir el sábado y pedir delivery el domingo sin culpa._ ¿Quieres que reservemos $15 de una vez para el fin?`,
    userOptions: ['[🔒 Reservar $15 para el finde]', '[👍 Dejar libre]', '[📝 Ver desglose]'],
    rationale: 'En lugar de barras rojas y porcentajes estresantes, traduce el dinero en permisos de vida real ("salir el sábado y pedir delivery sin culpa").',
    tonePillars: ['Enfoque en disfrute responsable', 'Claridad prospectiva', 'Seguridad emocional']
  },
  {
    id: 'f1_gastos_hormiga_soft_alert',
    flow: 'Flujo 1: Registro Rápido',
    trigger: 'El usuario registra su 3er gasto menor a $3 en el mismo día ("Gasto hormiga")',
    botMessage: `¡Registrado el cafecito ($2.50)! ☕\n\nTu *saldo real gastable* de hoy es *$28.50*.\n\n_Ojo de amigo curioso:_ Llevamos 3 pequeños gustitos hoy que suman *$8.20* (gastos hormiga). Nada grave, solo te lo cuento por si prefieres guardar el resto para la noche. 😉`,
    userOptions: ['[👍 Buen dato, gracias]', '[🏷 Cambiar a necesario]', '[📊 Ver mis gustitos]'],
    rationale: 'Alerta cariñosa de "amigo curioso", jamás de auditor fiscal. No bloquea al usuario ni emite advertencias rojas; solo pone un espejo gentil para generar consciencia.',
    tonePillars: ['Voz de compa / amigo', 'Consciencia sin fricción', 'Humor suave']
  }
];
