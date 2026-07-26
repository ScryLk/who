'use client';

import React from 'react';
import { Volume2, Sparkles, Music } from 'lucide-react';

interface HeaderProps {
  onOpenHowToPlay: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenHowToPlay }) => {
  return (
    <header className="w-full py-6 px-4 md:px-8 flex items-center justify-between border-b border-white/10 backdrop-blur-md sticky top-0 z-40 bg-slate-900/40">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-yellow-400 to-pink-500 flex items-center justify-center shadow-glow-yellow animate-bounce-subtle">
          <Music className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-wider text-white drop-shadow-md flex items-center gap-1">
            Who<span className="text-yellow-400">?</span>
          </h1>
          <p className="text-xs font-semibold text-cyan-300 tracking-wide">MUSIC BETTING GAME</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onOpenHowToPlay}
          className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition border border-white/10"
        >
          <Sparkles className="w-4 h-4 text-yellow-300" />
          Como Jogar
        </button>
        <button
          className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition border border-white/10"
          title="Configurações de Som"
        >
          <Volume2 className="w-5 h-5 text-cyan-300" />
        </button>
      </div>
    </header>
  );
};
