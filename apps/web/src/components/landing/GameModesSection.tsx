'use client';

import React from 'react';
import { Zap, Flame, Crown, CheckCircle2 } from 'lucide-react';

export const GameModesSection: React.FC = () => {
  return (
    <section className="py-14 px-4 max-w-6xl mx-auto text-center">
      <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-2 tracking-wide">
        Modos de Jogo
      </h2>
      <p className="text-blue-200 text-lg mb-10">Escolha seu estilo de diversão!</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Modo Clássico */}
        <div className="glass-card p-6 flex flex-col items-center border border-amber-400/40 bg-gradient-to-b from-amber-500/20 to-slate-900/60 rounded-3xl relative overflow-hidden">
          <div className="w-16 h-16 rounded-full bg-amber-400 flex items-center justify-center mb-4 shadow-glow-yellow">
            <Zap className="w-8 h-8 text-slate-950 fill-current" />
          </div>
          <h3 className="text-2xl font-black text-amber-300 mb-2">Modo Clássico</h3>
          <p className="text-sm text-blue-100/80 mb-6">
            Adivinhe o artista e a música. O básico que todo mundo ama!
          </p>

          <ul className="w-full space-y-3 text-left text-sm text-blue-100/90 font-medium border-t border-white/10 pt-4">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              <span>30 segundos por música</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              <span>10 rodadas por partida</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              <span>Ranking em tempo real</span>
            </li>
          </ul>
        </div>

        {/* Modo Turbo */}
        <div className="glass-card p-6 flex flex-col items-center border border-pink-400/40 bg-gradient-to-b from-pink-500/20 to-slate-900/60 rounded-3xl relative overflow-hidden">
          <div className="w-16 h-16 rounded-full bg-pink-400 flex items-center justify-center mb-4 shadow-glow-pink">
            <Flame className="w-8 h-8 text-white fill-current" />
          </div>
          <h3 className="text-2xl font-black text-pink-300 mb-2">Modo Turbo</h3>
          <p className="text-sm text-blue-100/80 mb-6">
            Tudo mais rápido! Para quem gosta de adrenalina pura!
          </p>

          <ul className="w-full space-y-3 text-left text-sm text-blue-100/90 font-medium border-t border-white/10 pt-4">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-pink-400" />
              <span>15 segundos por música</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-pink-400" />
              <span>15 rodadas por partida</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-pink-400" />
              <span>Pontuação dupla</span>
            </li>
          </ul>
        </div>

        {/* Modo Épico */}
        <div className="glass-card p-6 flex flex-col items-center border border-cyan-400/40 bg-gradient-to-b from-cyan-500/20 to-slate-900/60 rounded-3xl relative overflow-hidden">
          <div className="w-16 h-16 rounded-full bg-cyan-400 flex items-center justify-center mb-4 shadow-glow-cyan">
            <Crown className="w-8 h-8 text-slate-950 fill-current" />
          </div>
          <h3 className="text-2xl font-black text-cyan-300 mb-2">Modo Épico</h3>
          <p className="text-sm text-blue-100/80 mb-6">
            Desafios especiais e surpresas a cada rodada!
          </p>

          <ul className="w-full space-y-3 text-left text-sm text-blue-100/90 font-medium border-t border-white/10 pt-4">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span>Desafios surpresa</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span>Power-ups especiais</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span>Prêmios exclusivos</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
};
