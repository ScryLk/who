'use client';

import React, { useEffect } from 'react';
import { RoomState } from '@who/shared';
import {
  Trophy,
  RotateCcw,
  LogOut,
  Crown,
  Sparkles,
  Target,
  Music,
  Search,
  Flame,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PlayerAvatar } from '@/components/common/PlayerAvatar';

interface GameOverProps {
  room: RoomState;
  onPlayAgain: () => void;
  onLeaveRoom: () => void;
}

export const GameOver: React.FC<GameOverProps> = ({ room, onPlayAgain, onLeaveRoom }) => {
  const sortedPlayers = [...room.players].sort((a, b) => b.chips - a.chips);

  const firstPlace = sortedPlayers[0];
  const secondPlace = sortedPlayers[1];
  const thirdPlace = sortedPlayers[2];
  const remainingPlayers = sortedPlayers.slice(3);

  const formatChips = (amount: number) => {
    return (amount || 0).toLocaleString('pt-BR');
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!prefersReducedMotion) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          disableForReducedMotion: true,
        });
      }
    }
  }, []);

  // Awards calculation (highlighting distinct participants where available)
  const awards = [
    {
      id: 'sharp_shooter',
      title: 'Mais Acertador',
      recipient: firstPlace?.nickname || 'Mestre',
      icon: Target,
      iconColor: 'text-emerald-300',
      bgGlow: 'bg-emerald-400/20',
    },
    {
      id: 'mysterious',
      title: 'Mais Misterioso',
      recipient: secondPlace?.nickname || firstPlace?.nickname || 'Invisível',
      icon: Search,
      iconColor: 'text-cyan-300',
      bgGlow: 'bg-cyan-400/20',
    },
    {
      id: 'tastemaker',
      title: 'Melhor Gosto',
      recipient: thirdPlace?.nickname || secondPlace?.nickname || firstPlace?.nickname || 'DJ',
      icon: Music,
      iconColor: 'text-pink-300',
      bgGlow: 'bg-pink-400/20',
    },
    {
      id: 'daring',
      title: 'Mais Ousado',
      recipient: remainingPlayers[0]?.nickname || thirdPlace?.nickname || secondPlace?.nickname || 'Lenda',
      icon: Flame,
      iconColor: 'text-amber-300',
      bgGlow: 'bg-amber-400/20',
    },
  ];

  const totalPlayersCount = room.players?.length || 0;
  const totalTracksCount = room.submittedTracks?.length || room.totalRounds || totalPlayersCount;
  const totalRoundsCount = room.totalRounds || totalTracksCount;

  return (
    <div className="h-screen max-h-screen w-full bg-gradient-to-br from-indigo-950 via-purple-900 to-amber-950/80 text-white p-3 sm:p-4 md:p-6 flex flex-col justify-between font-outfit overflow-hidden select-none relative">
      {/* 1. Top Header Bar */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between flex-shrink-0 h-10 sm:h-12">
        <div className="flex items-center gap-2">
          <span className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow">
            WHO<span className="text-yellow-400">?</span>
          </span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-blue-200 font-mono font-bold">
            #{room.code}
          </span>
        </div>

        <button
          onClick={onLeaveRoom}
          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-red-500/20 border border-white/15 hover:border-red-400/30 text-slate-200 hover:text-red-200 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          title="Sair para o Menu Principal"
        >
          <LogOut className="w-3.5 h-3.5 text-red-400" />
          <span className="hidden sm:inline">Sair para o Menu</span>
        </button>
      </header>

      {/* 2. Title Section */}
      <div className="w-full text-center flex-shrink-0 my-1">
        <div className="inline-flex items-center justify-center gap-2">
          <Trophy className="w-6 h-6 sm:w-7 sm:h-7 text-yellow-300 drop-shadow" />
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white drop-shadow-md">
            RESULTADO FINAL
          </h1>
        </div>
        <p className="text-xs sm:text-sm font-semibold text-blue-200/90 mt-0.5">
          Quem dominou a playlist da noite?
        </p>
      </div>

      {/* 3. The 3-Step Podium (Centerpiece) */}
      <div className="w-full max-w-4xl mx-auto flex-shrink-0 my-auto py-1 sm:py-2">
        <div className="flex items-end justify-center gap-2 sm:gap-4 md:gap-6">
          {/* 2nd Place (Left) */}
          {secondPlace && (
            <div className="w-28 sm:w-36 md:w-44 bg-slate-800/70 backdrop-blur-md rounded-2xl sm:rounded-3xl p-2.5 sm:p-3 border border-slate-300/40 text-center shadow-lg flex flex-col items-center flex-shrink-0 transition hover:border-slate-200">
              <div className="relative mb-1.5">
                <PlayerAvatar
                  avatar={secondPlace.avatar}
                  size="lg"
                  className="w-12 h-12 sm:w-15 sm:h-15 border-2 border-slate-300 shadow-md bg-slate-900"
                />
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.2 rounded-full bg-slate-200 text-slate-950 font-black text-[9px] uppercase tracking-wider shadow">
                  2º
                </span>
              </div>
              <span
                className="font-extrabold text-white text-xs sm:text-sm truncate w-full"
                title={secondPlace.nickname}
              >
                {secondPlace.nickname}
              </span>
              <span className="text-[11px] sm:text-xs font-mono font-bold text-yellow-300 mt-0.5">
                {formatChips(secondPlace.chips)} fichas
              </span>
            </div>
          )}

          {/* 1st Place (Center - Elevated Champion) */}
          {firstPlace && (
            <div className="w-32 sm:w-44 md:w-52 bg-gradient-to-b from-yellow-400 via-amber-400 to-amber-500 rounded-2xl sm:rounded-3xl p-3 sm:p-4 border-2 sm:border-4 border-yellow-100 text-center shadow-glow-yellow flex flex-col items-center flex-shrink-0 -translate-y-2 sm:-translate-y-3.5">
              <div className="relative mb-1 sm:mb-1.5">
                <div className="absolute -top-4 sm:-top-5 left-1/2 -translate-x-1/2 drop-shadow-[0_2px_8px_rgba(250,204,21,0.6)]">
                  <Crown className="w-6 h-6 sm:w-7 sm:h-7 text-yellow-100 fill-amber-300" />
                </div>
                <PlayerAvatar
                  avatar={firstPlace.avatar}
                  size="xl"
                  className="w-16 h-16 sm:w-20 sm:h-20 border-2 sm:border-4 border-white shadow-2xl bg-white"
                />
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-slate-950 text-yellow-300 font-black text-[9px] sm:text-[10px] uppercase tracking-wider shadow-md">
                  CAMPEÃO
                </span>
              </div>
              <span
                className="font-black text-slate-950 text-sm sm:text-base md:text-lg truncate w-full mt-1"
                title={firstPlace.nickname}
              >
                {firstPlace.nickname}
              </span>
              <span className="text-xs sm:text-sm font-mono font-black text-slate-950 mt-0.5">
                {formatChips(firstPlace.chips)} fichas
              </span>
            </div>
          )}

          {/* 3rd Place (Right - If exists) */}
          {thirdPlace && (
            <div className="w-28 sm:w-36 md:w-44 bg-amber-950/50 backdrop-blur-md rounded-2xl sm:rounded-3xl p-2.5 sm:p-3 border border-amber-600/40 text-center shadow-lg flex flex-col items-center flex-shrink-0 transition hover:border-amber-500">
              <div className="relative mb-1.5">
                <PlayerAvatar
                  avatar={thirdPlace.avatar}
                  size="lg"
                  className="w-12 h-12 sm:w-15 sm:h-15 border-2 border-amber-500 shadow-md bg-slate-900"
                />
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.2 rounded-full bg-amber-600 text-white font-black text-[9px] uppercase tracking-wider shadow">
                  3º
                </span>
              </div>
              <span
                className="font-extrabold text-white text-xs sm:text-sm truncate w-full"
                title={thirdPlace.nickname}
              >
                {thirdPlace.nickname}
              </span>
              <span className="text-[11px] sm:text-xs font-mono font-bold text-yellow-300 mt-0.5">
                {formatChips(thirdPlace.chips)} fichas
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 4. Mini Awards Grid ("DESTAQUES DA NOITE") */}
      <div className="w-full max-w-4xl mx-auto flex-shrink-0 my-1 sm:my-1.5">
        <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider text-yellow-300/90 text-center block mb-1.5 flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
          DESTAQUES DA NOITE
        </span>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
          {awards.map((award) => {
            const IconComponent = award.icon;
            return (
              <div
                key={award.id}
                className="flex items-center gap-2 sm:gap-2.5 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-sm transition hover:bg-white/15 hover:border-white/25"
              >
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl ${award.bgGlow} flex items-center justify-center flex-shrink-0`}
                >
                  <IconComponent className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${award.iconColor}`} />
                </div>
                <div className="min-w-0 text-left">
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold text-blue-200 block truncate">
                    {award.title}
                  </span>
                  <span
                    className="text-xs font-black text-white truncate block"
                    title={award.recipient}
                  >
                    {award.recipient}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Match Summary Line */}
      <div className="w-full text-center flex-shrink-0 my-0.5">
        <p className="text-[10px] sm:text-[11px] font-mono font-semibold text-blue-200/80">
          {totalPlayersCount} jogadores · {totalTracksCount} músicas · {totalRoundsCount} rodadas
        </p>
      </div>

      {/* 6. Action CTAs */}
      <footer className="w-full max-w-md mx-auto flex items-center justify-center gap-2.5 sm:gap-3 flex-shrink-0 pt-1 pb-1">
        <button
          onClick={onLeaveRoom}
          className="flex-1 py-2.5 sm:py-3 px-4 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm border border-white/20 transition cursor-pointer active:scale-95 text-center flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          <LogOut className="w-4 h-4 text-red-400" />
          <span>Voltar ao Menu</span>
        </button>

        <button
          onClick={onPlayAgain}
          className="flex-1 py-2.5 sm:py-3 px-4 rounded-xl sm:rounded-2xl bg-gradient-button-yellow font-black text-slate-950 text-xs sm:text-sm shadow-glow-yellow hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
        >
          <RotateCcw className="w-4 h-4 text-slate-950 stroke-[2.5]" />
          <span>Jogar Novamente</span>
        </button>
      </footer>
    </div>
  );
};
