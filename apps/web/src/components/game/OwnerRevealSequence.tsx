'use client';

import React, { useEffect } from 'react';
import { RoomState } from '@who/shared';
import { PlayerAvatar } from '@/components/common/PlayerAvatar';
import { Music, Check, X, Sparkles, FastForward, Radio } from 'lucide-react';

interface OwnerRevealSequenceProps {
  room: RoomState;
  myPlayerId: string;
  onSkipStep?: () => void;
  playOwnerSound?: () => void;
}

export const OwnerRevealSequence: React.FC<OwnerRevealSequenceProps> = ({
  room,
  myPlayerId,
  onSkipStep,
  playOwnerSound,
}) => {
  const isHost = room.hostId === myPlayerId;
  const currentTrack = room.currentTrack;
  const actualOwnerId = currentTrack?.submittedByPlayerId;
  const ownerPlayer = room.players.find((p) => p.id === actualOwnerId);

  useEffect(() => {
    if (playOwnerSound) {
      playOwnerSound();
    }
  }, [playOwnerSound]);

  // Evaluate guesser accuracy against the true owner
  const guesserEvaluations = room.players
    .filter((p) => p.id !== actualOwnerId)
    .map((p) => {
      const bet = room.guesserBets?.[p.id];
      const targetPlayer = bet ? room.players.find((tp) => tp.id === bet.targetOwnerId) : undefined;
      const isCorrect = bet ? bet.targetOwnerId === actualOwnerId : false;
      return {
        player: p,
        bet,
        targetPlayer,
        isCorrect,
      };
    });

  const correctGuessersCount = guesserEvaluations.filter((g) => g.isCorrect).length;

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center p-4 space-y-6 animate-in fade-in zoom-in-95 duration-300">
      {/* Sequence Header */}
      <div className="w-full flex items-center justify-between px-2">
        <span className="text-[11px] uppercase tracking-widest font-black text-amber-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Revelação da Rodada</span>
        </span>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>{room.timeRemainingSeconds ?? 4}s</span>
          </div>

          {isHost && onSkipStep && (
            <button
              onClick={onSkipStep}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1 border border-white/15"
              title="Avançar para apuração"
            >
              <span>Avançar</span>
              <FastForward className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Main Dramatic Mystery Owner Card */}
      <div className="w-full rounded-3xl bg-slate-900/90 border border-amber-400/40 p-6 sm:p-8 flex flex-col items-center text-center space-y-4 shadow-2xl relative overflow-hidden">
        <div className="space-y-1">
          <span className="text-xs uppercase font-extrabold text-amber-300 tracking-widest">
            Quem escolheu esta música?
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            <span className="text-amber-400">{ownerPlayer?.nickname || 'Dono Secreto'}</span>
          </h2>
        </div>

        {/* Owner Avatar in Ring of Light */}
        <div className="relative py-2">
          <PlayerAvatar
            avatar={ownerPlayer?.avatar || ''}
            size="lg"
            className="ring-4 ring-amber-400 shadow-glow-yellow"
          />
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-slate-950 border border-amber-400 text-amber-300 text-[10px] font-black uppercase tracking-wider shadow">
            Dono da Música
          </div>
        </div>

        {/* Track Title and Artist */}
        <div className="pt-2 space-y-1">
          <div className="text-base sm:text-lg font-extrabold text-white flex items-center justify-center gap-2">
            <Music className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>{currentTrack?.title}</span>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            {currentTrack?.artist}
          </p>
        </div>

        {/* Result summary banner */}
        <div className="w-full pt-3 border-t border-white/10 flex items-center justify-center gap-2 text-xs font-bold text-slate-300">
          <Radio className="w-3.5 h-3.5 text-amber-400" />
          <span>
            {correctGuessersCount === 0
              ? 'Nenhum jogador acertou o palpite!'
              : correctGuessersCount === 1
              ? '1 jogador reconheceu o gosto musical!'
              : `${correctGuessersCount} jogadores reconheceram o gosto musical!`}
          </span>
        </div>
      </div>

      {/* Accuracy List: Who guessed right / wrong */}
      <div className="w-full space-y-2">
        <span className="text-xs font-bold text-slate-400 px-1 uppercase tracking-wider block">
          Verificação dos Palpites:
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {guesserEvaluations.map(({ player, bet, targetPlayer, isCorrect }) => (
            <div
              key={player.id}
              className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                isCorrect
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-white'
                  : 'bg-slate-900/60 border-white/5 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <PlayerAvatar avatar={player.avatar} size="sm" />
                <div className="min-w-0 text-left">
                  <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                    <span>{player.nickname}</span>
                    {player.id === myPlayerId && (
                      <span className="text-[9px] text-amber-400 font-mono font-bold">(Você)</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    Apostou em: <span className="text-slate-200 font-semibold">{targetPlayer?.nickname || 'Ninguém'}</span>
                  </div>
                </div>
              </div>

              {/* Outcome Badge */}
              <div
                className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase flex items-center gap-1 border ${
                  isCorrect
                    ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                {isCorrect ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Acertou</span>
                  </>
                ) : (
                  <>
                    <X className="w-3.5 h-3.5" />
                    <span>Errou</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
