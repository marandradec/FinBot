import React, { useState } from 'react';
import { GitFork, ArrowRight, Zap, ShieldAlert, RefreshCw, CheckCircle, Clock, HeartHandshake } from 'lucide-react';

export const FlowDiagramViewer: React.FC = () => {
  const [activeFlowIndex, setActiveFlowIndex] = useState<number>(0);

  const flows = [
    {
      title: 'Flujo 1: Registro Rápido (<2 seg)',
      subtitle: 'Entrada multimodal sin fricción (texto, nota de voz o foto)',
      icon: Zap,
      color: 'emerald',
      sla: '< 2.0 segundos totales',
      steps: [
        {
          stage: '1. Entrada del Usuario',
          detail: 'El usuario envía un texto ("Gasto $10 almuerzo"), audio ("15 en farmacia") o foto de boleta.',
          subtext: 'Fricción cero: no hay menús previos ni formularios'
        },
        {
          stage: '2. Procesamiento Silencioso (NLP / OCR)',
          detail: 'Extracción instantánea de: Monto + Categoría + Comercio. Si es ambiguo, asigna la categoría más probable.',
          subtext: 'Tiempo de ejecución: <180ms'
        },
        {
          stage: '3. Actualización Matemática de Saldo',
          detail: 'Resta el monto del "Saldo Real Gastable del Día". Si hay 3+ micro-gastos, marca sutilmente gasto hormiga.',
          subtext: 'Saldo previo - Monto = Nuevo Saldo'
        },
        {
          stage: '4. Respuesta Empática Inmediata',
          detail: 'Mensaje de confirmación en 1 párrafo con la nueva cifra gastable en negrita y botones [🔄 Deshacer] y [🏷 Cambiar].',
          subtext: 'Cierra el bucle de feedback en WhatsApp'
        }
      ]
    },
    {
      title: 'Flujo 2: Alerta Anti-Impulso y Bóveda 24h',
      subtitle: 'Freno psicológico sin prohibición ni reproches',
      icon: ShieldAlert,
      color: 'amber',
      sla: 'Decisión asistida en 24 horas',
      steps: [
        {
          stage: '1. Detección de Intención de Compra',
          detail: 'El usuario consulta: "¿Puedo comprar estas zapatillas de $80?" o "¿Me alcanza para...?"',
          subtext: 'Trigger: Pregunta con signo de interrogación o verbo potencial'
        },
        {
          stage: '2. Evaluación de Impacto Temporal',
          detail: 'Calcula el impacto: ¿cuántos días de saldo gastable compromete la compra? (ej. 3 días a $15/día).',
          subtext: 'Sin gráficos rojos: traduce dinero a días de vida'
        },
        {
          stage: '3. Validación Emocional + Alerta Suave',
          detail: '"¡Se ven geniales! Pero comprometerían 3 días. ¿Qué tal si las metemos a la Bóveda Anti-Impulso 24h?"',
          subtext: 'Opciones: [⏱ Guardar 24h], [⚡ Comprar igual], [💡 Ver alternativas]'
        },
        {
          stage: '4. Descongelamiento Empático a las 24h',
          detail: 'Al cumplirse el enfriamiento: "¿Aún sientes que es prioridad o el antojo pasó?". El 74% no compra y ahorra.',
          subtext: 'Refuerzo positivo del autocontrol'
        }
      ]
    },
    {
      title: 'Flujo 3: Recálculo Flexible sin Culpa',
      subtitle: 'Sobregasto asimilado con rebalanceo matemático suave',
      icon: RefreshCw,
      color: 'blue',
      sla: 'Rebalanceo instantáneo',
      steps: [
        {
          stage: '1. Sobregasto del Día',
          detail: 'El usuario registra un gasto mayor al saldo gastable disponible (ej. $55 en cena cuando el saldo era $35).',
          subtext: 'Diferencia a amortizar: $20'
        },
        {
          stage: '2. Supresión de Alarma y Culpa',
          detail: 'Cero advertencias rojas ni penalizaciones. Mensaje cálido: "¡La vida pasa y para eso es el dinero! 💛"',
          subtext: 'Protección de la salud emocional del usuario'
        },
        {
          stage: '3. Reparto Suave en Días Restantes',
          detail: 'Divide los $20 de sobregasto entre los 5 días que restan de la semana: -$4.00/día ($31/día en vez de $35).',
          subtext: 'Cuotas microscópicas que no comprometen ahorros fijos'
        },
        {
          stage: '4. Confirmación de Nuevo Ritmo',
          detail: 'El usuario confirma con botón [👍 ¡Genial, aceptado!]. El nuevo saldo diario queda actualizado sin fricción.',
          subtext: 'El ciclo semanal se mantiene en orden'
        }
      ]
    }
  ];

  const current = flows[activeFlowIndex];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <GitFork className="w-5 h-5 text-emerald-400" />
            <span>Arquitectura y Diagrama de Flujos Conversacionales</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Lógica paso a paso diseñada para mantener la interacción en menos de 2 toques dentro de WhatsApp.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
          {flows.map((f, idx) => (
            <button
              key={idx}
              onClick={() => setActiveFlowIndex(idx)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeFlowIndex === idx
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <f.icon className="w-3.5 h-3.5" />
              <span>{f.title.split(':')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Active Flow Header Card */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <current.icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{current.title}</h3>
              <p className="text-xs text-slate-300 mt-0.5">{current.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">SLA de velocidad:</span>
            <span className="font-mono font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2.5 py-1 rounded-md">
              {current.sla}
            </span>
          </div>
        </div>

        {/* Horizontal Flow Steps Pipeline */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-6">
          {current.steps.map((step, sIdx) => (
            <div
              key={sIdx}
              className="relative p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between"
            >
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1">
                  Paso {sIdx + 1}
                </div>
                <h4 className="text-xs font-bold text-white mb-2">{step.stage}</h4>
                <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
                  {step.detail}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-850 text-[10px] text-slate-400 italic">
                {step.subtext}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Conversational Decision Tree Notes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs font-bold text-white flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>Principio de No-Fricción</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Nunca preguntar: "¿Estás seguro de que quieres registrar esto?". La confirmación se asume exitosa de inmediato y se ofrece [Deshacer] por 60 segundos.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs font-bold text-white flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Psicología de la Pausa (24h)</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            La corteza prefrontal recupera el control tras una noche de sueño. Al posponer la compra sin prohibirla, el deseo biológico de dopamina desciende naturalmente.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs font-bold text-white flex items-center gap-2 mb-2">
            <HeartHandshake className="w-4 h-4 text-blue-400" />
            <span>Suavizado Matemático</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            El recálculo reparte los desvíos en los días restantes. Por ejemplo, $20 extra hoy equivalen a sólo -$4 diarios durante los siguientes 5 días.
          </p>
        </div>
      </div>
    </div>
  );
};
