'use client';

import React from 'react';
import { Headphones, LogIn, HelpCircle, Music, Disc } from 'lucide-react';

interface LandingHeroProps {
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onOpenHowToPlay: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onCreateRoom,
  onJoinRoom,
  onOpenHowToPlay,
}) => {
  return (
    <section className="relative py-12 px-4 text-center overflow-hidden flex flex-col items-center justify-center">
      {/* Floating music note accents */}
      {/* Floating Background Icons */}
      <div className="absolute top-10 left-[10%] text-yellow-300 opacity-70 animate-float">
        <Music className="w-8 h-8" />
      </div>
      <div className="absolute bottom-12 right-[12%] text-cyan-300 opacity-70 animate-float delay-1000">
        <Disc className="w-8 h-8 animate-spin" style={{ animationDuration: '8s' }} />
      </div>
      <div className="absolute top-20 right-[18%] text-purple-300 opacity-60 animate-float delay-500">
        <Headphones className="w-7 h-7" />
      </div>

      <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 border border-white/20 text-cyan-200 text-sm font-semibold mb-6 shadow-inner">
        <Music className="w-4 h-4 text-yellow-300 animate-spin" style={{ animationDuration: '6s' }} />
        <span>The Ultimate Music Guessing Party Game</span>
      </div>

      <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight text-white mb-4 drop-shadow-lg">
        Who<span className="text-yellow-400">?</span>
      </h1>

      <p className="max-w-xl text-lg md:text-xl text-blue-100/90 mb-10 font-medium leading-relaxed">
        Adivinhe quem escolheu a música, aposte suas fichas e descubra quem tem o melhor gosto musical da galera!
      </p>

      {/* Main Action Buttons */}
      <div className="w-full max-w-md flex flex-col gap-5">
        <button
          onClick={onCreateRoom}
          className="group relative w-full py-4 px-8 rounded-2xl bg-gradient-button-yellow hover:scale-[1.02] active:scale-[0.98] transition-all shadow-glow-yellow text-slate-950 font-black text-xl flex flex-col items-center justify-center border-2 border-yellow-200"
        >
          <div className="flex items-center gap-2">
            <Headphones className="w-6 h-6 text-slate-950 group-hover:rotate-12 transition-transform" />
            <span>Criar Sala</span>
          </div>
          <span className="text-xs font-semibold text-slate-800 opacity-90 mt-0.5">
            Seja o DJ da festa!
          </span>
        </button>

        <button
          onClick={onJoinRoom}
          className="group relative w-full py-4 px-8 rounded-2xl bg-gradient-button-cyan hover:scale-[1.02] active:scale-[0.98] transition-all shadow-glow-cyan text-slate-950 font-black text-xl flex flex-col items-center justify-center border-2 border-cyan-200"
        >
          <div className="flex items-center gap-2">
            <LogIn className="w-6 h-6 text-slate-950 group-hover:translate-x-1 transition-transform" />
            <span>Entrar em Sala</span>
          </div>
          <span className="text-xs font-semibold text-slate-800 opacity-90 mt-0.5">
            Junte-se à diversão!
          </span>
        </button>

        <button
          onClick={onOpenHowToPlay}
          className="group relative w-full py-4 px-8 rounded-2xl bg-gradient-button-purple hover:scale-[1.02] active:scale-[0.98] transition-all shadow-glow-purple text-white font-black text-xl flex flex-col items-center justify-center border-2 border-purple-300"
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-white group-hover:rotate-12 transition-transform" />
            <span>Como Jogar</span>
          </div>
          <span className="text-xs font-semibold text-purple-200 mt-0.5">
            Aprenda as regras!
          </span>
        </button>
      </div>
    </section>
  );
};
