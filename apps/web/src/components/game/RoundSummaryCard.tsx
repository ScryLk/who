'use client';

import React, { useMemo } from 'react';
import { Player, PlayerRoundSummary, RoomState, getBetRisk } from '@who/shared';
import { PlayerAvatar } from '@/components/common/PlayerAvatar';
import { Trophy, Flame, TrendingUp, Sparkles, ArrowRight, Music } from 'lucide-react';

interface RoundSummaryCardProps {
  room: RoomState;
  myPlayerId: string;
  onNextRound?: () => void;
}

export const RoundSummaryCard: React.FC<RoundSummaryCardProps> = ({
  room,
  myPlayerId,
  onNextRound,
}) => {
  const isHost = room.hostId === myPlayerId;
  const result = room.lastRoundResult;
  const summaries = result?.playerSummaries || [];

  // Find objective highlights:
  // 1. Highest financial risk
  const highestRiskPlayer = useMemo<{
    player?: Player;
    stake: number;
    ratioPercent: number;
    level: string;
  } | null>(() => {
    let best: { player?: Player; stake: number; ratioPercent: number; level: string } | null = null;
    Object.keys(room.guesserBets || {}).forEach((pid) => {
      const bet = room.guesserBets[pid];
      const player = room.players.find((p) => p.id === pid);
      const balance = room.startingBalances?.[pid] ?? player?.chips ?? 1000;
      if (bet && bet.chipAmount > 0) {
        const risk = getBetRisk({ stake: bet.chipAmount, balanceBeforeBet: balance });
        if (!best || risk.percentage > best.ratioPercent) {
          best = {
            player,
            stake: bet.chipAmount,
            ratioPercent: risk.percentage,
            level: risk.label,
          };
        }
      }
    });
    return best;
  }, [room.guesserBets, room.players, room.startingBalances]);

  // 2. Highest net winner this round
  const biggestWinner = useMemo<{
    summary: PlayerRoundSummary;
    player?: Player;
  } | null>(() => {
    let best: { summary: PlayerRoundSummary; player?: Player } | null = null;
    summaries.forEach((s) => {
      if (s.netChange > 0) {
        if (!best || s.netChange > best.summary.netChange) {
          const player = room.players.find((p) => p.id === s.playerId);
          best = { summary: s, player };
        }
      }
    });
    return best;
  }, [summaries, room.players]);

  // Sorted room ranking by current chips
  const sortedPlayers = [...room.players].sort((a, b) => b.chips - a.chips);

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center p-4 space-y-6 animate-in fade-in zoom-in-95 duration-300">
      {/* Header */}
      <div className="w-full flex items-center justify-between px-2">
        <span className="text-[11px] uppercase tracking-widest font-black text-amber-400 flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5" />
          <span>Resumo da Rodada #{room.currentRound}</span>
        </span>

        <span className="text-xs text-slate-400 font-mono">
          Próxima rodada em {room.timeRemainingSeconds ?? 10}s
        </span>
      </div>

      {/* Highlights Grid */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Highest Risk Highlight */}
        {highestRiskPlayer ? (
          <div className="p-4 rounded-2xl bg-orange-950/40 border border-orange-500/40 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 flex-shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div className="min-w-0 text-left">
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-400 block">
                Maior Risco da Rodada
              </span>
              <span className="text-sm font-extrabold text-white truncate block">
                {highestRiskPlayer.player?.nickname}
              </span>
              <span className="text-[11px] text-slate-300 font-mono block">
                {highestRiskPlayer.stake} fichas ({highestRiskPlayer.ratioPercent}% do saldo)
              </span>
            </div>
          </div>
        ) : null}

        {/* Highest Profit Highlight */}
        {biggestWinner ? (
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="min-w-0 text-left">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                Maior Ganho da Rodada
              </span>
              <span className="text-sm font-extrabold text-white truncate block">
                {biggestWinner.player?.nickname}
              </span>
              <span className="text-[11px] text-emerald-300 font-mono font-bold block">
                +{biggestWinner.summary.netChange} fichas
              </span>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 flex-shrink-0">
              <Music className="w-5 h-5" />
            </div>
            <div className="min-w-0 text-left">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Faixa Desafiadora
              </span>
              <span className="text-xs text-slate-300 block">
                Nenhum adivinhador lucrou nesta rodada
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="w-full space-y-2">
        <span className="text-xs font-bold text-slate-400 px-1 uppercase tracking-wider block text-left">
          Classificação Geral:
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {sortedPlayers.map((player, rank) => {
            const isMe = player.id === myPlayerId;
            return (
              <div
                key={player.id}
                className={`p-3 rounded-2xl border flex items-center justify-between ${
                  isMe
                    ? 'bg-amber-950/30 border-amber-500/40'
                    : 'bg-slate-900/70 border-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-5 font-mono text-xs font-bold text-slate-500 text-center">
                    #{rank + 1}
                  </span>
                  <PlayerAvatar avatar={player.avatar} size="sm" />
                  <span className="text-xs font-bold text-white truncate">
                    {player.nickname} {isMe && '(Você)'}
                  </span>
                </div>

                <span className="text-xs font-mono font-bold text-amber-400">
                  {player.chips} fichas
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Host CTA */}
      {isHost && onNextRound && (
        <div className="pt-2 w-full flex justify-center">
          <button
            onClick={onNextRound}
            className="px-8 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm shadow-glow-yellow transition active:scale-95 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {room.currentRound >= room.totalRounds
                ? 'Ver Pontuação Final'
                : 'Avançar para Próxima Rodada'}
            </span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      )}
    </div>
  );
};
