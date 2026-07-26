'use client';

import React from 'react';
import { Trophy, Crown, Disc, Radio } from 'lucide-react';

export const HallOfFameSection: React.FC = () => {
  const leaderboard = [
    { rank: 1, name: 'MusicMaster2024', title: 'Rei/Rainha da Música 👑', points: '15,847' },
    { rank: 2, name: 'BeatHunter', title: 'Caçador de Beats 🎯', points: '12,356' },
    { rank: 3, name: 'SoundWizard', title: 'Mago do Som 🧙‍♂️', points: '9,847' },
    { rank: 4, name: 'MelodyMaster', title: 'Mestre da Melodia 🎵', points: '8,234' },
    { rank: 5, name: 'RhythmRocker', title: 'Lenda do Ritmo 🎸', points: '7,891' },
  ];

  return (
    <section className="py-14 px-4 max-w-4xl mx-auto text-center relative">
      <div className="flex items-center justify-center gap-3 mb-2">
        <Trophy className="w-10 h-10 text-yellow-400 animate-bounce-subtle" />
        <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-wide">
          Hall da Fama
        </h2>
      </div>
      <p className="text-blue-200 text-lg mb-10">Os melhores jogadores da semana!</p>

      <div className="glass-card p-4 md:p-6 space-y-3 border border-white/20 shadow-2xl relative overflow-hidden">
        <Radio className="absolute top-4 right-4 w-6 h-6 text-yellow-300 opacity-60" />
        <Disc className="absolute bottom-4 left-4 w-6 h-6 text-cyan-300 opacity-60" />

        {leaderboard.map((item) => {
          let bgStyle = 'bg-white/10 text-white';
          if (item.rank === 1) {
            bgStyle = 'bg-gradient-to-r from-yellow-500 to-amber-600 text-slate-950 shadow-glow-yellow border-2 border-yellow-200';
          } else if (item.rank === 2) {
            bgStyle = 'bg-gradient-to-r from-slate-300 to-slate-400 text-slate-950 border border-white/40';
          } else if (item.rank === 3) {
            bgStyle = 'bg-gradient-to-r from-amber-600 to-amber-700 text-white border border-amber-400/40';
          }

          return (
            <div
              key={item.rank}
              className={`flex items-center justify-between p-3.5 md:p-4 rounded-2xl transition hover:scale-[1.01] ${bgStyle}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-white/20 font-black text-lg flex items-center justify-center">
                  {item.rank === 1 ? <Crown className="w-5 h-5 text-slate-950 fill-current" /> : item.rank}
                </div>
                <div className="text-left">
                  <span className="font-bold text-base md:text-lg block leading-tight">
                    {item.name}
                  </span>
                  <span className="text-xs opacity-90 block">{item.title}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="font-black text-lg md:text-xl block">{item.points}</span>
                <span className="text-xs opacity-80 uppercase tracking-wider font-semibold">
                  pontos
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
