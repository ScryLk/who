'use client';

import React, { useEffect } from 'react';
import { Player, RoomState, getBetRisk, BetRiskLevel } from '@who/shared';
import { PlayerAvatar } from '@/components/common/PlayerAvatar';
import { ArrowRight, Coins, Shield, Zap, AlertCircle, AlertTriangle, Flame, FastForward } from 'lucide-react';

interface BetRevealStepperProps {
  room: RoomState;
  myPlayerId: string;
  onSkipStep?: () => void;
  playStepSound?: (isHighRisk?: boolean) => void;
}

export const BetRevealStepper: React.FC<BetRevealStepperProps> = ({
  room,
  myPlayerId,
  onSkipStep,
  playStepSound,
}) => {
  const isHost = room.hostId === myPlayerId;
  const revealOrder = room.revealOrder || [];
  const currentIndex = room.revealIndex ?? 0;
  const currentPlayerId = revealOrder[currentIndex];

  const currentBet = currentPlayerId ? room.guesserBets?.[currentPlayerId] : undefined;
  const guesserPlayer = room.players.find((p) => p.id === currentPlayerId);
  const targetPlayer = currentBet ? room.players.find((p) => p.id === currentBet.targetOwnerId) : undefined;

  const startingBalance = currentPlayerId
    ? room.startingBalances?.[currentPlayerId] ?? guesserPlayer?.chips ?? 1000
    : 1000;

  const stake = currentBet?.chipAmount ?? 0;
  const riskInfo = getBetRisk({ stake, balanceBeforeBet: startingBalance });
  const isHighRisk = riskInfo.level === 'VERY_HIGH' || riskInfo.level === 'EXTREME';

  // Play reveal step sound on step change
  useEffect(() => {
    if (playStepSound && currentBet) {
      playStepSound(isHighRisk);
    }
  }, [currentIndex, currentBet?.chipAmount, isHighRisk, playStepSound]);

  const getRiskIcon = (level: BetRiskLevel) => {
    switch (level) {
      case 'LOW':
        return <Shield className="w-4 h-4 text-slate-400" />;
      case 'MODERATE':
        return <Zap className="w-4 h-4 text-sky-400" />;
      case 'HIGH':
        return <AlertCircle className="w-4 h-4 text-amber-400" />;
      case 'VERY_HIGH':
        return <AlertTriangle className="w-4 h-4 text-orange-400" />;
      case 'EXTREME':
        return <Flame className="w-4 h-4 text-rose-500 animate-pulse" />;
    }
  };

  const getCardBorder = (level: BetRiskLevel) => {
    switch (level) {
      case 'LOW':
        return 'border-white/10 shadow-lg';
      case 'MODERATE':
        return 'border-sky-500/30 shadow-sky-950/40 shadow-xl';
      case 'HIGH':
        return 'border-amber-500/40 shadow-amber-950/50 shadow-2xl';
      case 'VERY_HIGH':
        return 'border-orange-500/60 shadow-orange-950/60 shadow-2xl ring-1 ring-orange-500/40';
      case 'EXTREME':
        return 'border-rose-500/80 shadow-rose-950/80 shadow-2xl ring-2 ring-rose-500/60 animate-pulse';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center p-4 space-y-5 animate-in fade-in zoom-in-95 duration-200">
      {/* Stepper Header / Progress */}
      <div className="w-full flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-widest font-black text-amber-400">
            Palpites da Mesa
          </span>
          <span className="px-2 py-0.5 rounded-full bg-white/10 text-white font-mono text-xs font-bold border border-white/10">
            {currentIndex + 1} de {revealOrder.length}
          </span>
        </div>

        {/* Step countdown & Host Skip */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>{room.timeRemainingSeconds ?? 3}s</span>
          </div>

          {isHost && onSkipStep && (
            <button
              onClick={onSkipStep}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1 border border-white/15"
              title="Avançar para o próximo palpite"
            >
              <span>Avançar</span>
              <FastForward className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Dots / Bar */}
      <div className="w-full flex gap-1.5 px-2">
        {revealOrder.map((id, idx) => (
          <div
            key={id}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              idx < currentIndex
                ? 'bg-amber-400'
                : idx === currentIndex
                ? 'bg-white'
                : 'bg-white/15'
            }`}
          />
        ))}
      </div>

      {/* Main Reveal Card */}
      <div
        className={`w-full rounded-3xl bg-slate-900/90 backdrop-blur-md p-6 sm:p-8 flex flex-col items-center text-center space-y-6 transition-all duration-300 ${getCardBorder(
          riskInfo.level
        )}`}
      >
        {/* Opponents Matchup Visual: Who bet on Whom */}
        <div className="w-full flex items-center justify-center gap-4 sm:gap-8">
          {/* Guesser */}
          <div className="flex flex-col items-center space-y-2 flex-1 max-w-[160px]">
            <div className="relative">
              <PlayerAvatar
                avatar={guesserPlayer?.avatar || ''}
                size="lg"
                className="ring-4 ring-white/15 shadow-xl"
              />
              {guesserPlayer?.id === myPlayerId && (
                <span className="absolute -bottom-2 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] uppercase tracking-wider shadow">
                  Você
                </span>
              )}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Apostador
              </span>
              <span className="text-base sm:text-lg font-black text-white truncate block">
                {guesserPlayer?.nickname || 'Jogador'}
              </span>
            </div>
          </div>

          {/* Directional Arrow */}
          <div className="flex flex-col items-center justify-center space-y-1">
            <span className="text-[10px] uppercase font-extrabold text-amber-400 tracking-widest">
              Apostou Em
            </span>
            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/15 flex items-center justify-center text-amber-300">
              <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            </div>
          </div>

          {/* Suspect Target */}
          <div className="flex flex-col items-center space-y-2 flex-1 max-w-[160px]">
            <div className="relative">
              <PlayerAvatar
                avatar={targetPlayer?.avatar || ''}
                size="lg"
                className="ring-4 ring-amber-400/40 shadow-xl"
              />
              <span className="absolute -bottom-2 px-2 py-0.5 rounded-full bg-slate-950 border border-amber-400/60 text-amber-300 font-black text-[9px] uppercase tracking-wider shadow">
                Suspeito
              </span>
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Suposto Dono
              </span>
              <span className="text-base sm:text-lg font-black text-yellow-300 truncate block">
                {targetPlayer?.nickname || 'Suspeito'}
              </span>
            </div>
          </div>
        </div>

        {/* Stake & Risk Metric Block */}
        <div className="w-full pt-4 border-t border-white/10 flex flex-col items-center space-y-3">
          <div className="flex items-center gap-2 text-2xl sm:text-3xl font-black text-white">
            <Coins className="w-6 h-6 text-amber-400" />
            <span>{stake} Fichas</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-400">
              {riskInfo.percentage}% do saldo em jogo
            </span>
            <span className="text-slate-600">·</span>
            <div
              className={`px-3 py-1 rounded-full border text-xs font-black tracking-wide uppercase flex items-center gap-1.5 ${
                riskInfo.level === 'LOW'
                  ? 'bg-slate-800 text-slate-300 border-slate-700'
                  : riskInfo.level === 'MODERATE'
                  ? 'bg-sky-950/70 text-sky-300 border-sky-600/40'
                  : riskInfo.level === 'HIGH'
                  ? 'bg-amber-950/70 text-amber-300 border-amber-500/50'
                  : riskInfo.level === 'VERY_HIGH'
                  ? 'bg-orange-950/80 text-orange-300 border-orange-500/60'
                  : 'bg-rose-950/90 text-rose-300 border-rose-500/70 shadow-glow-rose'
              }`}
            >
              {getRiskIcon(riskInfo.level)}
              <span>{riskInfo.label}</span>
            </div>
          </div>

          {/* High risk dramatic note */}
          {isHighRisk && (
            <p className="text-xs font-semibold text-amber-200/90 pt-1">
              Uma das maiores exposições financeiras desta rodada.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
