'use client';

import React, { useEffect } from 'react';
import { Player, RoomState } from '@who/shared';
import { Trophy, RotateCcw, Home, Share2, Crown, Sparkles, Target, Laugh, Music, Search } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PlayerAvatar } from '@/components/common/PlayerAvatar';

interface GameOverProps {
  room: RoomState;
  onPlayAgain: () => void;
}

export const GameOver: React.FC<GameOverProps> = ({ room, onPlayAgain }) => {
  const sortedPlayers = [...room.players].sort((a, b) => b.chips - a.chips);

  const firstPlace = sortedPlayers[0];
  const secondPlace = sortedPlayers[1];
  const thirdPlace = sortedPlayers[2];
  const remainingPlayers = sortedPlayers.slice(3);

  useEffect(() => {
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.5 },
    });
  }, []);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-900 via-purple-800 to-amber-500 text-white p-4 md:p-8 flex flex-col justify-between font-outfit">
      {/* Header Title matching Image 3 */}
      <header className="w-full text-center py-4">
        <h1 className="text-4xl md:text-6xl font-black tracking-tight drop-shadow-md flex items-center justify-center gap-3">
          Resultado Final 🎉
        </h1>
        <p className="text-blue-100 text-sm font-semibold mt-1">
          Confira quem mandou bem no ritmo!
        </p>
      </header>

      <div className="w-full max-w-5xl mx-auto space-y-8 flex-1 py-4">
        {/* 3-Step Podium Card Grid matching Image 3 */}
        <div className="flex items-end justify-center gap-4 md:gap-8 min-h-[260px] pt-8">
          {/* 2nd Place (Left) */}
          {secondPlace && (
            <div className="w-32 md:w-40 bg-slate-300/30 backdrop-blur-md rounded-3xl p-4 border border-white/40 text-center shadow-xl flex flex-col items-center transform transition hover:scale-105">
              <PlayerAvatar avatar={secondPlace.avatar} size="lg" className="border-2 border-white shadow-md mb-2 bg-gradient-to-tr from-slate-200 to-slate-400" />
              <span className="font-extrabold text-white text-base truncate w-full">
                {secondPlace.nickname}
              </span>
              <span className="text-xs font-mono font-bold text-yellow-300 mt-1">
                {secondPlace.chips} pts
              </span>
              <div className="mt-3 w-8 h-8 rounded-full bg-slate-200 text-slate-900 font-black text-sm flex items-center justify-center shadow">
                2
              </div>
            </div>
          )}

          {/* 1st Place (Center - Elevated) */}
          {firstPlace && (
            <div className="w-36 md:w-48 bg-gradient-to-b from-yellow-400 to-amber-500 rounded-3xl p-5 border-4 border-yellow-200 text-center shadow-glow-yellow flex flex-col items-center transform -translate-y-6 transition hover:scale-105">
              <div className="relative mb-2">
                <PlayerAvatar avatar={firstPlace.avatar} size="xl" className="border-2 border-yellow-300 shadow-2xl bg-white" />
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-amber-900">
                  <Crown className="w-7 h-7 fill-current" />
                </div>
              </div>
              <span className="font-black text-slate-950 text-lg truncate w-full">
                {firstPlace.nickname}
              </span>
              <span className="text-sm font-mono font-black text-slate-900 mt-0.5">
                {firstPlace.chips} pts
              </span>
              <div className="mt-3 w-10 h-10 rounded-full bg-yellow-300 text-slate-950 font-black text-lg flex items-center justify-center shadow-md">
                1
              </div>
            </div>
          )}

          {/* 3rd Place (Right) */}
          {thirdPlace && (
            <div className="w-32 md:w-40 bg-amber-600/40 backdrop-blur-md rounded-3xl p-4 border border-amber-400/50 text-center shadow-xl flex flex-col items-center transform transition hover:scale-105">
              <PlayerAvatar avatar={thirdPlace.avatar} size="lg" className="border-2 border-amber-300 shadow-md mb-2 bg-gradient-to-tr from-amber-600 to-amber-800" />
              <span className="font-extrabold text-white text-base truncate w-full">
                {thirdPlace.nickname}
              </span>
              <span className="text-xs font-mono font-bold text-yellow-300 mt-1">
                {thirdPlace.chips} pts
              </span>
              <div className="mt-3 w-8 h-8 rounded-full bg-amber-700 text-white font-black text-sm flex items-center justify-center shadow">
                3
              </div>
            </div>
          )}
        </div>

        {/* 4th & 5th Ranks Card List */}
        {remainingPlayers.length > 0 && (
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-4 max-w-xl mx-auto space-y-2 border border-white/20">
            {remainingPlayers.map((player, idx) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-white/10 font-bold text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="text-blue-200">{idx + 4}º</span>
                  <PlayerAvatar avatar={player.avatar} size="sm" className="bg-white/10" />
                  <span>{player.nickname}</span>
                </div>
                <span className="text-yellow-300 font-mono">{player.chips} pts</span>
              </div>
            ))}
          </div>
        )}

        {/* Destaques Especiais 2x2 Grid matching Image 3 */}
        <div className="max-w-3xl mx-auto space-y-3">
          <h3 className="text-center font-extrabold text-lg text-yellow-300 flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5" /> Destaques Especiais ⭐️
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/20 flex flex-col items-center text-center">
              <Search className="w-8 h-8 text-cyan-300 mb-1" />
              <span className="font-bold text-sm text-white">Mais Misterioso</span>
              <span className="text-xs text-blue-200 mt-1">
                {secondPlace?.nickname || firstPlace.nickname}
              </span>
            </div>

            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/20 flex flex-col items-center text-center">
              <Target className="w-8 h-8 text-emerald-300 mb-1" />
              <span className="font-bold text-sm text-white">Mais Acertador</span>
              <span className="text-xs text-blue-200 mt-1">{firstPlace.nickname}</span>
            </div>

            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/20 flex flex-col items-center text-center">
              <Music className="w-8 h-8 text-pink-300 mb-1" />
              <span className="font-bold text-sm text-white">Melhor Gosto Musical</span>
              <span className="text-xs text-blue-200 mt-1">
                {thirdPlace?.nickname || firstPlace.nickname}
              </span>
            </div>

            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/20 flex flex-col items-center text-center">
              <Laugh className="w-8 h-8 text-amber-300 mb-1" />
              <span className="font-bold text-sm text-white">Mais Engraçado</span>
              <span className="text-xs text-blue-200 mt-1">
                {secondPlace?.nickname || 'Galera'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons matching Image 3 */}
      <footer className="w-full max-w-xl mx-auto flex flex-col gap-3 py-4 text-center">
        <button
          onClick={onPlayAgain}
          className="w-full py-4 rounded-2xl bg-gradient-button-yellow font-black text-slate-950 text-xl shadow-glow-yellow hover:scale-105 transition flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-6 h-6" />
          <span>Jogar Novamente 🔁</span>
        </button>

        <div className="flex gap-3">
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert('Resultado copiado!');
            }}
            className="flex-1 py-3 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs border border-white/20 transition flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4 text-cyan-300" />
            <span>Compartilhar Resultado 📲</span>
          </button>

          <button
            onClick={() => window.location.reload()}
            className="flex-1 py-3 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs border border-white/20 transition flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4 text-yellow-300" />
            <span>Voltar ao Menu Principal 🏠</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
