import React from 'react';
import { HeartHandshake, ShieldCheck, Smile, ThumbsDown, ThumbsUp, AlertTriangle, Sparkles } from 'lucide-react';
import { ANTI_ANXIETY_PRINCIPLES } from '../data/uxSpecs';

export const ToneMatrixViewer: React.FC = () => {
  const VOCABULARY_COMPARISON = [
    {
      banned: '¡Límite superado! Estás en déficit',
      finbot: '¡La vida pasa y para eso es el dinero! 💛 Ajustamos suave los próximos días y seguimos en pista.',
      reason: 'Evita la parálisis por culpa (el 68% de los jóvenes abandona apps que los hacen sentir juzgados).'
    },
    {
      banned: 'Fondos insuficientes para esta compra',
      finbot: 'Ese antojo se ve genial 🔥👟 ¿Lo guardamos 24h en la Bóveda Anti-Impulso para ver si sigue siendo prioridad?',
      reason: 'Valida la emoción positiva de querer comprar algo antes de proponer una pausa saludable.'
    },
    {
      banned: 'Presupuesto mensual devengado',
      finbot: 'Saldo real gastable para hoy: $35.00',
      reason: 'Cero jerga bancaria contable. Un único número simple que autoriza a gastar sin remordimientos.'
    },
    {
      banned: 'Desglose categórico de pasivos hormiga',
      finbot: 'Ojo de compa curioso: llevamos 3 gustitos de $2.50 hoy 😉',
      reason: 'Tono de amigo cómplice y empático en lugar de auditor fiscal intimidante.'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <HeartHandshake className="w-5 h-5 text-emerald-400" />
          <span>Matriz de Tono y Manifiesto Sin Culpa (Anti-Ansiedad)</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Por qué la juventud latinoamericana de 18 a 30 años rechaza los gráficos rojos y cómo FinBot construye hábitos financieros sostenibles.
        </p>
      </div>

      {/* 4 Core Anti-Anxiety Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ANTI_ANXIETY_PRINCIPLES.map((pillar, idx) => (
          <div key={idx} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-emerald-400 mb-3">{pillar.principle}</h3>
              
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-red-950/20 border border-red-900/30 text-xs">
                  <div className="flex items-center gap-1.5 text-red-400 font-semibold mb-1">
                    <ThumbsDown className="w-3.5 h-3.5" />
                    <span>Banca Tradicional (Genera Ansiedad):</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-[11px]">{pillar.traditionalBanking}</p>
                </div>

                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-900/40 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-300 font-semibold mb-1">
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>Enfoque FinBot (Empático y Sostenible):</span>
                  </div>
                  <p className="text-slate-200 leading-relaxed text-[11px]">{pillar.finbotApproach}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Vocabulary Lexicon comparison table */}
      <div>
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <span>Glosario de Microcopy: Qué Evitar vs. Qué Decir</span>
        </h3>
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-slate-400 border-b border-slate-800">
                <th className="py-2.5 px-4 font-semibold text-red-400">❌ Microcopy Castigador (Prohibido)</th>
                <th className="py-2.5 px-4 font-semibold text-emerald-400">✅ Microcopy FinBot (Aprobado)</th>
                <th className="py-2.5 px-4 font-semibold text-slate-300">Justificación Psicológica</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {VOCABULARY_COMPARISON.map((row, i) => (
                <tr key={i} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4 text-red-300 font-medium">"{row.banned}"</td>
                  <td className="py-3 px-4 text-emerald-300 font-medium">"{row.finbot}"</td>
                  <td className="py-3 px-4 text-slate-400 text-[11px]">{row.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Youth LatAm Persona Callout */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/20">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">
              Arquetipo de Usuario: Joven Latinoamericano (18 a 30 años)
            </h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Estudiantes, freelancers y recién graduados en urbes de México, Colombia, Argentina, Chile o Perú. Viven en WhatsApp, usan apps de delivery y transporte, tienen ingresos variables o presupuestos ajustados y detestan los reportes bancarios que parecen auditorías de impuestos. FinBot les devuelve la sensación de control en 2 segundos diarios.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
