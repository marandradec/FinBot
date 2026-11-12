import React, { useState } from 'react';
import { Terminal, Check, AlertCircle, Play, Sparkles } from 'lucide-react';
import { parseLatAmExpenseInput, formatCurrency } from '../utils/nlpParser';
import { VALIDATION_RULES, WHATSAPP_API_CONSTRAINTS } from '../data/uxSpecs';
import { CurrencyCode } from '../types/finbot';

interface ValidationSandboxProps {
  currency: CurrencyCode;
}

const PRESET_TEST_INPUTS = [
  'Gasto $10 en almuerzo',
  'uber 25',
  'Cafecito 3.50',
  '¿Puedo comprar estas zapatillas de $80?',
  '15 lucas en la farmacia',
  'Pagué 45 en supermercado oxxo',
  '¿cuánto me queda de saldo?',
  'deshacer último gasto'
];

export const ValidationSandbox: React.FC<ValidationSandboxProps> = ({ currency }) => {
  const [testInput, setTestInput] = useState<string>('Gasto $10 en almuerzo');
  const parseResult = parseLatAmExpenseInput(testInput, currency);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Terminal className="w-5 h-5 text-emerald-400" />
          <span>Reglas de Validación Rápida y Sandbox NLP</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Prueba en tiempo real cómo el motor de FinBot analiza texto libre, montos, jerga regional y preguntas impulsivas en milisegundos.
        </p>
      </div>

      {/* Interactive Testing Console */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-2">
            Ingresa un mensaje para probar el parser conversacional:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="Ej: gasto 12 en taxi, ¿puedo comprar zapatillas 80?, etc."
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
            <button
              onClick={() => setTestInput(testInput)}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors shrink-0"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Evaluar</span>
            </button>
          </div>
        </div>

        {/* Quick presets */}
        <div>
          <span className="text-[11px] text-slate-400 mr-2">Casos de prueba rápidos:</span>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {PRESET_TEST_INPUTS.map((phrase, idx) => (
              <button
                key={idx}
                onClick={() => setTestInput(phrase)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                  testInput === phrase
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                "{phrase}"
              </button>
            ))}
          </div>
        </div>

        {/* Real-time Parsed Result Output */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Intención Detectada</div>
            <div className="text-sm font-bold text-white mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{parseResult.intent}</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Monto Extraído</div>
            <div className="text-sm font-mono font-bold text-emerald-400 mt-1">
              {parseResult.amount !== null ? formatCurrency(parseResult.amount, currency) : 'No detectado'}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Categoría Asignada</div>
            <div className="text-sm font-bold text-white mt-1 capitalize">
              {parseResult.category}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Latencia Parser</div>
            <div className="text-sm font-mono font-bold text-emerald-300 mt-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>{parseResult.processingTimeMs} ms</span>
              <span className="text-[10px] text-slate-400 font-normal">(&lt;2s SLA)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rules specification table */}
      <div>
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <span>Especificación Formal de Reglas de Extracción</span>
        </h3>
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-slate-400 border-b border-slate-800">
                <th className="py-2.5 px-4 font-semibold">Regla / Caso</th>
                <th className="py-2.5 px-4 font-semibold">Entrada de Ejemplo</th>
                <th className="py-2.5 px-4 font-semibold">Salida Estructurada</th>
                <th className="py-2.5 px-4 font-semibold">SLA Latencia</th>
                <th className="py-2.5 px-4 font-semibold">Acción Fallback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {VALIDATION_RULES.map((rule) => (
                <tr key={rule.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4 font-medium text-white">{rule.name}</td>
                  <td className="py-3 px-4 font-mono text-emerald-300">"{rule.exampleInput}"</td>
                  <td className="py-3 px-4 font-mono text-slate-400">{rule.extractedOutput}</td>
                  <td className="py-3 px-4 font-mono font-semibold text-emerald-400">{rule.latencySLA}</td>
                  <td className="py-3 px-4 text-slate-400">{rule.fallbackAction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* WhatsApp API Constraints reminder */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
        <h3 className="text-sm font-bold text-white mb-3">
          Límites Técnicos Oficiales de la API de WhatsApp Cloud
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {WHATSAPP_API_CONSTRAINTS.map((item, idx) => (
            <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="font-bold text-emerald-400">{item.feature}</div>
              <div className="text-slate-300 mt-1">
                <span className="text-slate-400">Restricción: </span>{item.limit}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                <span className="text-slate-400">Recomendación UX: </span>{item.uxRecommendation}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
