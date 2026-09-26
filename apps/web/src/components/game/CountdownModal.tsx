'use client';

import React from 'react';
import { Sparkles, Music, Headphones } from 'lucide-react';

interface CountdownModalProps {
  seconds: number;
}

export const CountdownModal: React.FC<CountdownModalProps> = ({ seconds }) => {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-xl animate-fade-in p-4 select-none">
      <div className="relative glass-card p-8 md:p-12 rounded-3xl border-2 border-yellow-400/50 text-center max-w-md w-full space-y-6 shadow-glow-yellow overflow-hidden bg-slate-900/90">
        {/* Background Decorative Pulsing Icons */}
        <div className="absolute -top-10 -left-10 text-yellow-400/10 pointer-events-none animate-pulse">
          <Music className="w-40 h-40" />
        </div>
        <div className="absolute -bottom-10 -right-10 text-cyan-400/10 pointer-events-none animate-pulse">
          <Headphones className="w-40 h-40" />
        </div>

        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-400/20 border border-yellow-400/40 text-yellow-300 font-extrabold text-xs tracking-wider uppercase shadow-glow-yellow">
            <Sparkles className="w-4 h-4 animate-spin" />
            <span>A partida vai começar!</span>
          </div>

          <h2 className="text-xl md:text-2xl font-black text-white leading-snug">
            Prepare-se para a 1ª Rodada
          </h2>

          {/* Animated Countdown Number */}
          <div className="flex items-center justify-center py-4">
            <div className="relative flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-tr from-yellow-400 to-amber-500 text-slate-950 font-black text-6xl shadow-glow-yellow transform transition-all duration-500 animate-bounce">
              {seconds > 0 ? seconds : 1}
            </div>
          </div>

          <p className="text-xs text-blue-200/80 font-medium">
            Em breve os jogadores escolherão suas músicas secretas em sequência!
          </p>
        </div>
      </div>
    </div>
  );
};
