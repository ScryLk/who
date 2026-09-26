'use client';

import React from 'react';
import { Zap, Heart, Users, Smartphone } from 'lucide-react';

export const FeaturesSection: React.FC = () => {
  return (
    <section className="py-14 px-4 max-w-6xl mx-auto text-center">
      <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-2 tracking-wide">
        Por que jogar <span className="text-cyan-300">Who?</span>
      </h2>
      <p className="text-blue-200 text-lg mb-10">Diversão garantida com seus amigos!</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card glass-card-hover p-6 flex flex-col items-center text-center border-t-4 border-t-amber-400">
          <div className="w-14 h-14 rounded-2xl bg-amber-400 flex items-center justify-center mb-4 shadow-lg">
            <Zap className="w-8 h-8 text-slate-950 fill-current" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Super Rápido</h3>
          <p className="text-sm text-blue-100/80 leading-relaxed">
            Partidas de 5-10 minutos. Perfeito para qualquer momento!
          </p>
        </div>

        <div className="glass-card glass-card-hover p-6 flex flex-col items-center text-center border-t-4 border-t-pink-400">
          <div className="w-14 h-14 rounded-2xl bg-pink-400 flex items-center justify-center mb-4 shadow-lg">
            <Heart className="w-8 h-8 text-white fill-current" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Todos os Gêneros</h3>
          <p className="text-sm text-blue-100/80 leading-relaxed">
            Pop, Rock, Funk, Sertanejo, Internacional e muito mais!
          </p>
        </div>

        <div className="glass-card glass-card-hover p-6 flex flex-col items-center text-center border-t-4 border-t-cyan-400">
          <div className="w-14 h-14 rounded-2xl bg-cyan-400 flex items-center justify-center mb-4 shadow-lg">
            <Users className="w-8 h-8 text-slate-950 fill-current" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Até 12 Jogadores</h3>
          <p className="text-sm text-blue-100/80 leading-relaxed">
            Quanto mais gente, mais divertido fica a competição!
          </p>
        </div>

        <div className="glass-card glass-card-hover p-6 flex flex-col items-center text-center border-t-4 border-t-emerald-400">
          <div className="w-14 h-14 rounded-2xl bg-emerald-400 flex items-center justify-center mb-4 shadow-lg">
            <Smartphone className="w-8 h-8 text-slate-950" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Qualquer Lugar</h3>
          <p className="text-sm text-blue-100/80 leading-relaxed">
            Jogue no celular, tablet ou computador. Sem downloads!
          </p>
        </div>
      </div>
    </section>
  );
};
