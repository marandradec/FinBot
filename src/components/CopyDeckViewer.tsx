import React, { useState } from 'react';
import { Copy, Check, MessageSquare, Sparkles, Filter } from 'lucide-react';
import { COPY_DECK } from '../data/copyDeck';
import { CopyItem } from '../types/finbot';

export const CopyDeckViewer: React.FC = () => {
  const [selectedFlow, setSelectedFlow] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const flows = [
    { id: 'all', label: 'Todos los Mensajes' },
    { id: 'Flujo 1: Registro Rápido', label: 'Flujo 1: Registro <2s' },
    { id: 'Flujo 2: Alerta Anti-Impulso', label: 'Flujo 2: Anti-Impulso' },
    { id: 'Flujo 3: Recálculo Flexible', label: 'Flujo 3: Recálculo Flexible' }
  ];

  const filteredDeck = selectedFlow === 'all'
    ? COPY_DECK
    : COPY_DECK.filter((item) => item.flow === selectedFlow);

  const handleCopy = (item: CopyItem) => {
    navigator.clipboard.writeText(item.botMessage);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header and filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
            <span>Librería Oficial de Copys Conversacionales</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Mensajes exactos redactados con formato nativo de WhatsApp (*negrita*, _cursiva_, emojis sutiles y saltos de línea optimizados).
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
          {flows.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedFlow(f.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                selectedFlow === f.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Copy Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredDeck.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 flex flex-col justify-between hover:border-slate-700 transition-all shadow-sm"
          >
            <div>
              {/* Card kicker and Flow indicator */}
              <div className="flex items-center justify-between gap-2 text-xs text-slate-400 mb-2">
                <span className="font-semibold text-emerald-400">{item.flow}</span>
                <span className="text-[11px] text-slate-500 font-mono">ID: {item.id}</span>
              </div>

              {/* Trigger */}
              <div className="text-xs font-medium text-slate-300 bg-slate-950/60 border border-slate-800/80 rounded-lg px-3 py-2 mb-3">
                <span className="text-slate-400">Gatillador UX: </span>
                <span className="text-white font-medium">{item.trigger}</span>
              </div>

              {/* WhatsApp Message Preview Box */}
              <div className="relative group p-4 rounded-xl bg-slate-950 border border-slate-800/90 font-sans text-xs text-slate-200 whitespace-pre-line leading-relaxed shadow-inner">
                {item.botMessage}

                <button
                  onClick={() => handleCopy(item)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Copiar texto exacto"
                >
                  {copiedId === item.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Expected User Responses */}
              <div className="mt-3">
                <div className="text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Respuestas esperadas (WhatsApp Quick Replies):
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {item.userOptions.map((opt, i) => (
                    <span
                      key={i}
                      className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-emerald-300 font-medium font-mono"
                    >
                      {opt}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* UX Rationale & Tone pillars */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
              <p className="italic text-slate-300 mb-2">"{item.rationale}"</p>
              <div className="flex items-center gap-2 flex-wrap">
                {item.tonePillars.map((p, i) => (
                  <span
                    key={i}
                    className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800"
                  >
                    • {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
