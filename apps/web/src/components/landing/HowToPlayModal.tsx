'use client';

import React from 'react';
import { X, HelpCircle, Coins, Music, Target, Flame } from 'lucide-react';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 border-2 border-purple-400/40 shadow-2xl relative text-white">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 transition"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-2xl bg-purple-500 text-white shadow-glow-purple">
            <HelpCircle className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white">Como Jogar Who?</h2>
            <p className="text-xs text-purple-300 font-semibold">Regras & Tabela de Odds</p>
          </div>
        </div>

        <div className="space-y-6 text-sm text-blue-100/90">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <h3 className="font-bold text-yellow-300 text-base flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-400" /> 1. Fichas Iniciais
            </h3>
            <p>
              Cada jogador entra na sala com <strong>1.000 fichas</strong>. O objetivo é terminar todas as rodadas como o jogador mais rico da sala!
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <h3 className="font-bold text-cyan-300 text-base flex items-center gap-2">
              <Music className="w-5 h-5 text-cyan-400" /> 2. Escolha Secreta de Músicas
            </h3>
            <p>
              Em cada partida, os jogadores enviam suas músicas favoritas. Ninguém sabe quem mandou qual faixa!
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h3 className="font-bold text-pink-300 text-base flex items-center gap-2">
              <Target className="w-5 h-5 text-pink-400" /> 3. Rodada de Apostas (30s)
            </h3>
            <ul className="list-disc list-inside space-y-1.5 text-xs text-blue-100">
              <li>
                <strong>Dono da Música:</strong> Define a Categoria/Vibe (ex: Pop, Funk) e faz uma previsão de comportamento da sala (Isolado, Nicho, Óbvio).
              </li>
              <li>
                <strong>Adivinhadores:</strong> Escolhem quem acham que é o dono da faixa e tentam acertar o Combo (Dono + Categoria).
              </li>
            </ul>
          </div>

          {/* Odds Table Matching Specification Page 2 */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-amber-400/40 space-y-3">
            <h3 className="font-bold text-amber-400 text-base flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400" /> Tabela de Odds e Multiplicadores
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/20 text-cyan-300">
                    <th className="py-2 px-2">Tipo de Aposta</th>
                    <th className="py-2 px-2">Papel</th>
                    <th className="py-2 px-2">Condição de Vitória</th>
                    <th className="py-2 px-2 text-right">Multiplicador</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-white">
                  <tr>
                    <td className="py-2 px-2 font-bold text-yellow-300">Adivinhar Dono</td>
                    <td className="py-2 px-2">Adivinhador</td>
                    <td className="py-2 px-2">Acertar o dono da música</td>
                    <td className="py-2 px-2 text-right font-black text-amber-400">2.0x</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2 font-bold text-yellow-300">Combo (Dono+Vibe)</td>
                    <td className="py-2 px-2">Adivinhador</td>
                    <td className="py-2 px-2">Acertar Dono e Categoria simultaneamente</td>
                    <td className="py-2 px-2 text-right font-black text-amber-400">3.5x</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2 font-bold text-pink-300">Previsão: Isolado</td>
                    <td className="py-2 px-2">Dono da Música</td>
                    <td className="py-2 px-2">Ninguém acertar que a música é sua (0 acertos)</td>
                    <td className="py-2 px-2 text-right font-black text-amber-400">4.0x</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2 font-bold text-pink-300">Previsão: Nicho</td>
                    <td className="py-2 px-2">Dono da Música</td>
                    <td className="py-2 px-2">Exatamente 1 pessoa acertar</td>
                    <td className="py-2 px-2 text-right font-black text-amber-400">3.0x</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2 font-bold text-pink-300">Previsão: Óbvio</td>
                    <td className="py-2 px-2">Dono da Música</td>
                    <td className="py-2 px-2">Mais de 50% da sala acertar</td>
                    <td className="py-2 px-2 text-right font-black text-amber-400">1.3x</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-3.5 rounded-xl bg-gradient-button-yellow font-bold text-slate-950 text-base hover:scale-[1.01] transition"
        >
          Entendi, Bora Jogar! 🚀
        </button>
      </div>
    </div>
  );
};
