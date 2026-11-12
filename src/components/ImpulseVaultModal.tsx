import React from 'react';
import { ShieldCheck, Clock, Check, X, Sparkles } from 'lucide-react';
import { ImpulseItem, CurrencyCode } from '../types/finbot';
import { formatCurrency } from '../utils/nlpParser';

interface ImpulseVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ImpulseItem[];
  currency: CurrencyCode;
  onSimulate24hUnlock: (item: ImpulseItem) => void;
  onCancelImpulseSaved: (item: ImpulseItem) => void;
  onPurchaseAnyway: (item: ImpulseItem) => void;
}

export const ImpulseVaultModal: React.FC<ImpulseVaultModalProps> = ({
  isOpen,
  onClose,
  items,
  currency,
  onSimulate24hUnlock,
  onCancelImpulseSaved,
  onPurchaseAnyway
}) => {
  if (!isOpen) return null;

  const totalSaved = items
    .filter((i) => i.status === 'cancelled_saved')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const activeLockedItems = items.filter((i) => i.status === 'locked');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 text-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Bóveda Anti-Impulso (Enfriamiento 24h)</h3>
              <p className="text-[11px] text-slate-400">Estrategia conductual para frenar compras no esenciales sin culpa</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Psychological metric banner */}
        <div className="my-4 p-4 rounded-xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/30 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Poder del Enfriamiento Emocional:</span>
            </div>
            <p className="text-[11px] text-slate-300 mt-1 max-w-sm leading-relaxed">
              El <strong className="text-white">74%</strong> de los jóvenes de 18 a 30 años cancela la compra tras una pausa de 24 horas. Cero gráficos rojos, solo tiempo a tu favor.
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] uppercase text-emerald-400 font-semibold tracking-wider">Ahorro Rescatado</div>
            <div className="text-xl font-bold font-mono text-emerald-400">
              {formatCurrency(totalSaved || 80, currency)}
            </div>
          </div>
        </div>

        {/* Items list */}
        <div className="space-y-3 my-4 max-h-72 overflow-y-auto pr-1">
          <div className="text-xs font-medium text-slate-400">
            Antojos en período de enfriamiento activo ({activeLockedItems.length}):
          </div>

          {activeLockedItems.length === 0 ? (
            <div className="text-center py-8 rounded-xl bg-slate-950/50 border border-slate-800">
              <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">No tienes compras impulsivas en espera actualmente.</p>
              <p className="text-[11px] text-slate-500 mt-1">Prueba preguntar en el chat: "¿Puedo comprar estas zapatillas de $80?"</p>
            </div>
          ) : (
            activeLockedItems.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-slate-800/60 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">{item.item}</span>
                    <span className="text-xs font-mono font-semibold text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded">
                      {formatCurrency(item.amount, currency)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Tiempo restante de enfriamiento: <strong className="text-slate-200">23h 45m</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onCancelImpulseSaved(item)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1"
                    title="Se me pasó el antojo, ¡ahorrado!"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Ahorrado</span>
                  </button>
                  <button
                    onClick={() => onSimulate24hUnlock(item)}
                    className="px-3 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600 border border-amber-500/40 text-amber-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1"
                    title="Simular paso de 24 horas y enviar recordatorio"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Pasaron 24h</span>
                  </button>
                  <button
                    onClick={() => onPurchaseAnyway(item)}
                    className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white text-xs font-medium transition-colors"
                    title="Comprar de todos modos"
                  >
                    Comprar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-3 border-t border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cerrar Bóveda
          </button>
        </div>
      </div>
    </div>
  );
};
