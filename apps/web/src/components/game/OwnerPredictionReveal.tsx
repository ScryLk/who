'use client';

import React from 'react';
import { RoomState } from '@who/shared';
import { PlayerAvatar } from '@/components/common/PlayerAvatar';
import { Target, Check, X, FastForward, Coins } from 'lucide-react';

interface OwnerPredictionRevealProps {
  room: RoomState;
  myPlayerId: string;
  onSkipStep?: () => void;
}

export const OwnerPredictionReveal: React.FC<OwnerPredictionRevealProps> = ({
  room,
  myPlayerId,
  onSkipStep,
}) => {
  const isHost = room.hostId === myPlayerId;
  const ownerId = room.currentTrack?.submittedByPlayerId;
  const ownerPlayer = room.players.find((p) => p.id === ownerId);
  const ownerBet = room.ownerBet;

  // Count correct guessers
  const correctGuessers = room.players.filter((p) => {
    if (p.id === ownerId) return false;
    const bet = room.guesserBets?.[p.id];
    return bet && bet.targetOwnerId === ownerId;
  });

  const correctCount = correctGuessers.length;

  // Evaluate owner prediction
  let predictionText = 'Nenhuma previsão registrada.';
  let isSuccess = false;

  if (ownerBet) {
    if (ownerBet.predictionKind === 'NONE') {
      predictionText = 'Nenhum jogador vai me reconhecer (0 acertos)';
      isSuccess = correctCount === 0;
    } else if (ownerBet.predictionKind === 'PLAYER_COUNT') {
      const exp = ownerBet.expectedCount ?? 1;
      predictionText = `Exatamente ${exp} ${exp === 1 ? 'pessoa' : 'pessoas'} vão me reconhecer`;
      isSuccess = correctCount === exp;
    } else if (ownerBet.predictionKind === 'SPECIFIC_PLAYERS') {
      const names = (ownerBet.targetPlayerIds || [])
        .map((id) => room.players.find((p) => p.id === id)?.nickname || 'Jogador')
        .join(', ');
      predictionText = `Jogadores específicos: ${names}`;
      isSuccess =
        (ownerBet.targetPlayerIds || []).length > 0 &&
        (ownerBet.targetPlayerIds || []).every((tid) =>
          correctGuessers.some((cg) => cg.id === tid)
        );
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center p-4 space-y-6 animate-in fade-in zoom-in-95 duration-300">
      {/* Header */}
      <div className="w-full flex items-center justify-between px-2">
        <span className="text-[11px] uppercase tracking-widest font-black text-amber-400 flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5" />
          <span>Previsão Secreta do Dono</span>
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
              title="Avançar para distribuição de fichas"
            >
              <span>Avançar</span>
              <FastForward className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Main Prediction Card */}
      <div
        className={`w-full rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center space-y-5 border shadow-2xl transition-all ${
          isSuccess
            ? 'bg-emerald-950/60 border-emerald-500/40'
            : 'bg-slate-900/90 border-white/10'
        }`}
      >
        <PlayerAvatar avatar={ownerPlayer?.avatar || ''} size="lg" />

        <div className="space-y-1">
          <span className="text-xs uppercase font-extrabold text-slate-400 tracking-wider">
            {ownerPlayer?.nickname} previu:
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-white">
            &quot;{predictionText}&quot;
          </h3>
        </div>

        {/* Evaluation and Chip Impact */}
        <div className="pt-3 border-t border-white/10 flex flex-col items-center space-y-2">
          <div className="flex items-center gap-2">
            <div
              className={`px-3 py-1 rounded-full text-xs font-black uppercase flex items-center gap-1.5 border ${
                isSuccess
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {isSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Previsão Correta!</span>
                </>
              ) : (
                <>
                  <X className="w-3.5 h-3.5" />
                  <span>Previsão Não Atingida</span>
                </>
              )}
            </div>
            <span className="text-xs font-mono font-bold text-slate-300">
              {correctCount} {correctCount === 1 ? 'acerto real' : 'acertos reais'}
            </span>
          </div>

          {ownerBet && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>Aposta do Dono: {ownerBet.chipAmount} fichas</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
