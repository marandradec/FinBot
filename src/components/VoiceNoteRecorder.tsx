import React, { useState, useEffect } from 'react';
import { Mic, Square, Send, X, Volume2 } from 'lucide-react';

interface VoiceNoteRecorderProps {
  isOpen: boolean;
  onClose: () => void;
  onSendVoiceNote: (audioTranscript: string, audioDuration: string) => void;
}

const PRESET_AUDIOS = [
  {
    title: 'Farmacia urgente',
    duration: '0:03',
    transcript: 'Pagué 15 dólares en la farmacia por unas pastillas',
    category: 'Salud'
  },
  {
    title: 'Almuerzo con amigos',
    duration: '0:02',
    transcript: 'Gasto 12 dólares en almuerzo con los de la facu',
    category: 'Comida'
  },
  {
    title: 'Taxi / Uber tarde',
    duration: '0:03',
    transcript: 'Uber a casa por 9 dólares',
    category: 'Transporte'
  },
  {
    title: 'Cafecito de paso',
    duration: '0:02',
    transcript: 'Me compré un cafecito de 3 dólares con cincuenta',
    category: 'Gustitos'
  }
];

export const VoiceNoteRecorder: React.FC<VoiceNoteRecorderProps> = ({
  isOpen,
  onClose,
  onSendVoiceNote
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [selectedPreset, setSelectedPreset] = useState(PRESET_AUDIOS[0]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  if (!isOpen) return null;

  const handleStartSimulatedRecording = () => {
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      onSendVoiceNote(selectedPreset.transcript, selectedPreset.duration);
      onClose();
    }, 2400);
  };

  const handleSendPresetDirectly = (preset: typeof PRESET_AUDIOS[0]) => {
    onSendVoiceNote(preset.transcript, preset.duration);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 text-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-sm">Simulador de Nota de Voz WhatsApp</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-300 mt-3 leading-relaxed">
          Los jóvenes de 18-30 años suelen registrar gastos en WhatsApp mientras caminan enviando un audio de 2 a 4 segundos. FinBot lo transcribe y extrae monto en &lt; 2s.
        </p>

        {isRecording ? (
          <div className="my-6 p-6 rounded-xl bg-slate-950 border border-emerald-500/30 flex flex-col items-center justify-center gap-3">
            <div className="flex items-center gap-1.5 h-8">
              {[40, 75, 30, 90, 60, 100, 45, 80, 65, 35, 95, 50].map((h, i) => (
                <div
                  key={i}
                  className="w-1 bg-emerald-400 rounded-full animate-pulse"
                  style={{
                    height: `${h}%`,
                    animationDelay: `${i * 80}ms`
                  }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-sm font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span>0:0{seconds}</span>
              <span className="text-xs text-slate-400 font-normal">Grabando audio...</span>
            </div>
            <p className="text-xs text-slate-400 text-center italic">
              "{selectedPreset.transcript}"
            </p>
          </div>
        ) : (
          <div className="my-4 space-y-2">
            <div className="text-xs font-medium text-slate-400 mb-2">
              Selecciona o simula un audio rápido de ejemplo:
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {PRESET_AUDIOS.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendPresetDirectly(item)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                    selectedPreset.title === item.title
                      ? 'bg-emerald-950/40 border-emerald-500/50 text-white'
                      : 'bg-slate-800/40 border-slate-750 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
                      <Volume2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white flex items-center gap-2">
                        {item.title}
                        <span className="text-[10px] text-slate-400 font-normal">({item.duration})</span>
                      </div>
                      <div className="text-[11px] text-slate-300 italic mt-0.5">
                        "{item.transcript}"
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded font-mono shrink-0">
                    Enviar
                  </span>
                </button>
              ))}
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
            onClick={handleStartSimulatedRecording}
            disabled={isRecording}
            className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 disabled:opacity-50"
          >
            <Mic className="w-4 h-4" />
            <span>Simular Grabación En Vivo (2s)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
