'use client';

import React from 'react';
import { Users, Gamepad2, Disc } from 'lucide-react';

export const StatsSection: React.FC = () => {
  return (
    <section className="py-8 px-4 border-y border-white/10 bg-slate-900/40 backdrop-blur-md">
      <div className="max-w-5xl mx-auto grid grid-cols-3 gap-4 md:gap-8 text-center">
        <div className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center mb-3">
            <Users className="w-7 h-7 text-amber-300" />
          </div>
          <span className="text-2xl md:text-4xl font-black text-white">50K+</span>
          <span className="text-xs md:text-sm font-semibold text-blue-200/80">Jogadores Ativos</span>
        </div>

        <div className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-purple-400/20 border border-purple-400/40 flex items-center justify-center mb-3">
            <Gamepad2 className="w-7 h-7 text-purple-300" />
          </div>
          <span className="text-2xl md:text-4xl font-black text-white">1M+</span>
          <span className="text-xs md:text-sm font-semibold text-blue-200/80">Partidas Jogadas</span>
        </div>

        <div className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-cyan-400/20 border border-cyan-400/40 flex items-center justify-center mb-3">
            <Disc className="w-7 h-7 text-cyan-300" />
          </div>
          <span className="text-2xl md:text-4xl font-black text-white">100K+</span>
          <span className="text-xs md:text-sm font-semibold text-blue-200/80">Músicas no Banco</span>
        </div>
      </div>
    </section>
  );
};
