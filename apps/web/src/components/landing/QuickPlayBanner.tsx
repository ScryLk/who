'use client';

import React from 'react';
import { Monitor, Smartphone, Tablet, Gamepad2 } from 'lucide-react';

interface QuickPlayBannerProps {
  onQuickPlay: () => void;
}

export const QuickPlayBanner: React.FC<QuickPlayBannerProps> = ({ onQuickPlay }) => {
  return (
    <section className="py-14 px-4 max-w-5xl mx-auto text-center">
      <h2 className="text-5xl md:text-6xl font-black text-white mb-2 tracking-tight">
        Jogue Agora!
      </h2>
      <p className="text-cyan-200 text-lg md:text-xl mb-8 font-medium">
        Não precisa baixar nada! Jogue direto no seu navegador 🚀
      </p>

      {/* Device Badges */}
      <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mb-10">
        <div className="glass-card p-4 flex flex-col items-center">
          <Monitor className="w-8 h-8 text-cyan-300 mb-2" />
          <span className="font-bold text-white text-sm">Desktop</span>
          <span className="text-xs text-blue-200/70">Chrome, Firefox, Safari</span>
        </div>
        <div className="glass-card p-4 flex flex-col items-center">
          <Smartphone className="w-8 h-8 text-pink-300 mb-2" />
          <span className="font-bold text-white text-sm">Mobile</span>
          <span className="text-xs text-blue-200/70">iOS e Android</span>
        </div>
        <div className="glass-card p-4 flex flex-col items-center border border-cyan-400/50">
          <Tablet className="w-8 h-8 text-amber-300 mb-2" />
          <span className="font-bold text-white text-sm">Tablet</span>
          <span className="text-xs text-blue-200/70">iPad e Android tablets</span>
        </div>
      </div>

      {/* Big Play Button */}
      <button
        onClick={onQuickPlay}
        className="group relative px-10 py-5 rounded-2xl bg-gradient-button-green hover:scale-105 active:scale-95 transition-all shadow-glow-cyan text-slate-950 font-black text-2xl border-2 border-emerald-200"
      >
        <div className="flex items-center gap-3 justify-center">
          <Gamepad2 className="w-8 h-8 text-slate-950 group-hover:rotate-12 transition-transform" />
          <span>🎮 JOGAR AGORA - GRÁTIS!</span>
        </div>
        <p className="text-xs text-slate-900 font-bold opacity-80 mt-1">
          Sem cadastro • Sem download • Diversão instantânea
        </p>
      </button>
    </section>
  );
};
