'use client';

import React, { useEffect } from 'react';
import { RoomState } from '@who/shared';
import { PlayerAvatar } from '@/components/common/PlayerAvatar';
import { Coins, TrendingUp, TrendingDown, Minus, FastForward } from 'lucide-react';

interface SettlementRevealProps {
  room: RoomState;
  myPlayerId: string;
  onSkipStep?: () => void;
  playPayoutSound?: () => void;
}

export const SettlementReveal: React.FC<SettlementRevealProps> = ({
  room,
  myPlayerId,
  onSkipStep,
  playPayoutSound,
}) => {
  const isHost = room.hostId === myPlayerId;
  const result = room.lastRoundResult;
  const summaries = result?.playerSummaries || [];

  useEffect(() => {
    if (playPayoutSound) {
      playPayoutSound();
    }
  }, [playPayoutSound]);

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center p-4 space-y-6 animate-in fade-in zoom-in-95 duration-300">
      {/* Header */}
      <div className="w-full flex items-center justify-between px-2">
        <span className="text-[11px] uppercase tracking-widest font-black text-amber-400 flex items-center gap-1.5">
          <Coins className="w-3.5 h-3.5" />
          <span>Apuração e Fichas</span>
        </span>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>{room.timeRemainingSeconds ?? 5}s</span>
          </div>

          {isHost && onSkipStep && (
            <button
              onClick={onSkipStep}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1 border border-white/15"
              title="Avançar para o resumo da rodada"
            >
              <span>Avançar</span>
              <FastForward className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Settlements Grid */}
      <div className="w-full space-y-2">
        {summaries.map((summary) => {
          const player = room.players.find((p) => p.id === summary.playerId);
          const isMe = summary.playerId === myPlayerId;
          const isNetPositive = summary.netChange > 0;
          const isNetNegative = summary.netChange < 0;

          return (
            <div
              key={summary.playerId}
              className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                isMe
                  ? 'bg-amber-950/30 border-amber-500/50 shadow-lg'
                  : 'bg-slate-900/80 border-white/10'
              }`}
            >
              {/* Player Info */}
              <div className="flex items-center gap-3 min-w-0">
                <PlayerAvatar avatar={player?.avatar || ''} size="sm" />
                <div className="text-left min-w-0">
                  <div className="text-xs sm:text-sm font-extrabold text-white truncate flex items-center gap-1.5">
                    <span>{summary.nickname}</span>
                    {isMe && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 text-[9px] font-black uppercase">
                        Você
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {summary.startingChips} →{' '}
                    <span className="font-bold text-white">
                      {summary.endingChips}
                    </span>{' '}
                    fichas
                  </div>
                </div>
              </div>

              {/* Net Delta and Details */}
              <div className="flex items-center gap-3">
                <div
                  className={`px-3 py-1 rounded-xl text-xs font-black font-mono flex items-center gap-1 border ${
                    isNetPositive
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                      : isNetNegative
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  {isNetPositive ? (
                    <>
                      <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>+{summary.netChange}</span>
                    </>
                  ) : isNetNegative ? (
                    <>
                      <TrendingDown className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{summary.netChange}</span>
                    </>
                  ) : (
                    <>
                      <Minus className="w-3 h-3" />
                      <span>0</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
