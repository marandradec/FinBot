import React, { useState } from 'react';
import { Camera, FileText, CheckCircle2, X, Sparkles } from 'lucide-react';
import { formatCurrency } from '../utils/nlpParser';
import { CurrencyCode } from '../types/finbot';

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: CurrencyCode;
  onScanComplete: (receiptData: {
    merchant: string;
    amount: number;
    category: 'comida' | 'gustitos' | 'salud' | 'otros';
    itemsSummary: string;
    imageUrl?: string;
  }) => void;
}

const SAMPLE_RECEIPTS = [
  {
    id: 'rec_1',
    merchant: 'Starbucks Coffee',
    category: 'gustitos' as const,
    amount: 4.80,
    multiplier: 1,
    date: 'Hoy, 10:45 AM',
    items: '1x Caramel Macchiato Venti',
    previewColor: 'from-amber-900/40 to-amber-950/20'
  },
  {
    id: 'rec_2',
    merchant: 'Supermercado Metro / Éxito',
    category: 'comida' as const,
    amount: 32.50,
    multiplier: 1,
    date: 'Hoy, 12:15 PM',
    items: 'Frutas, Leche de avena, Pan integral, Huevos',
    previewColor: 'from-blue-900/40 to-blue-950/20'
  },
  {
    id: 'rec_3',
    merchant: 'Restaurante El Rincón (Almuerzo)',
    category: 'comida' as const,
    amount: 18.50,
    multiplier: 1,
    date: 'Hoy, 01:30 PM',
    items: 'Menú ejecutivo + Bebida natural',
    previewColor: 'from-orange-900/40 to-orange-950/20'
  },
  {
    id: 'rec_4',
    merchant: 'Farmacia San Pablo',
    category: 'salud' as const,
    amount: 15.00,
    multiplier: 1,
    date: 'Hoy, 09:20 AM',
    items: 'Ibuprofeno 400mg + Paracetamol',
    previewColor: 'from-emerald-900/40 to-emerald-950/20'
  }
];

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  isOpen,
  onClose,
  currency,
  onScanComplete
}) => {
  const [selectedReceipt, setSelectedReceipt] = useState(SAMPLE_RECEIPTS[0]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  if (!isOpen) return null;

  const handleSimulateScan = () => {
    setIsScanning(true);
    setScanProgress(0);

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsScanning(false);
            onScanComplete({
              merchant: selectedReceipt.merchant,
              amount: selectedReceipt.amount,
              category: selectedReceipt.category,
              itemsSummary: selectedReceipt.items,
              imageUrl: 'receipt_ticket.png'
            });
            onClose();
          }, 300);
          return 100;
        }
        return prev + 25;
      });
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 text-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-sm">Simulador de Foto de Recibo / Boleta OCR</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-300 mt-3 leading-relaxed">
          Flujo 1 (Registro en &lt; 2s): El usuario toma foto al ticket físico o captura de app de delivery. FinBot detecta comercio y total sin pedir llenar formularios tediosos.
        </p>

        {isScanning ? (
          <div className="my-6 p-6 rounded-xl bg-slate-950 border border-emerald-500/30 relative overflow-hidden flex flex-col items-center justify-center gap-3">
            {/* Laser scanning bar animation */}
            <div
              className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] transition-all duration-200 pointer-events-none"
              style={{ top: `${scanProgress}%` }}
            />
            <FileText className="w-12 h-12 text-emerald-400 animate-pulse" />
            <div className="text-sm font-semibold text-emerald-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>Extrayendo datos de boleta ({scanProgress}%)</span>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Detectado: {selectedReceipt.merchant} · {formatCurrency(selectedReceipt.amount, currency)}
            </div>
          </div>
        ) : (
          <div className="my-4 space-y-3">
            <div className="text-xs font-medium text-slate-400">
              Selecciona un ticket de muestra para probar:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SAMPLE_RECEIPTS.map((receipt) => {
                const isSelected = selectedReceipt.id === receipt.id;
                return (
                  <button
                    key={receipt.id}
                    onClick={() => setSelectedReceipt(receipt)}
                    className={`p-3 rounded-xl border text-left transition-all relative ${
                      isSelected
                        ? 'bg-slate-800 border-emerald-500 shadow-md ring-1 ring-emerald-500/40'
                        : 'bg-slate-800/40 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute top-2.5 right-2.5" />
                    )}
                    <div className="text-xs font-bold text-white truncate pr-5">
                      {receipt.merchant}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      {receipt.items}
                    </div>
                    <div className="mt-2 flex items-baseline justify-between pt-2 border-t border-slate-700/50">
                      <span className="text-[10px] text-slate-400">{receipt.date}</span>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {formatCurrency(receipt.amount, currency)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSimulateScan}
            disabled={isScanning}
            className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 disabled:opacity-50"
          >
            <Camera className="w-4 h-4" />
            <span>Escanear y Enviar a WhatsApp (&lt; 2 seg)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
