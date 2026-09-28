'use client';

import React from 'react';
import { getBetRisk, BetRiskLevel } from '@who/shared';
import { Shield, AlertCircle, AlertTriangle, Flame, Zap, CheckCircle2 } from 'lucide-react';

interface BetRiskIndicatorProps {
  stake: number;
  balanceBeforeBet: number;
  className?: string;
}

export const BetRiskIndicator: React.FC<BetRiskIndicatorProps> = ({
  stake,
  balanceBeforeBet,
  className = '',
}) => {
  const risk = getBetRisk({ stake, balanceBeforeBet });
  const isOverBalance = !risk.isValid || stake > balanceBeforeBet;
  const remaining = balanceBeforeBet - stake;

  const getRiskIcon = (level: BetRiskLevel) => {
    switch (level) {
      case 'LOW':
        return <Shield className="w-3.5 h-3.5 text-slate-400" />;
      case 'MODERATE':
        return <Zap className="w-3.5 h-3.5 text-sky-400" />;
      case 'HIGH':
        return <AlertCircle className="w-3.5 h-3.5 text-amber-400" />;
      case 'VERY_HIGH':
        return <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />;
      case 'EXTREME':
        return <Flame className="w-3.5 h-3.5 text-orange-500" />;
      case 'ALL_IN':
        return <Flame className="w-3.5 h-3.5 text-rose-400 animate-pulse" />;
      case 'INSUFFICIENT_FUNDS':
        return <AlertCircle className="w-3.5 h-3.5 text-rose-400 animate-bounce" />;
    }
  };

  const getBadgeStyle = (level: BetRiskLevel) => {
    switch (level) {
      case 'LOW':
        return 'bg-slate-800/80 border-slate-700 text-slate-300';
      case 'MODERATE':
        return 'bg-sky-950/60 border-sky-600/40 text-sky-300';
      case 'HIGH':
        return 'bg-amber-950/60 border-amber-500/40 text-amber-300';
      case 'VERY_HIGH':
        return 'bg-orange-950/70 border-orange-500/50 text-orange-300';
      case 'EXTREME':
        return 'bg-orange-950/80 border-orange-500/60 text-orange-300 ring-1 ring-orange-500/30';
      case 'ALL_IN':
        return 'bg-rose-950/90 border-rose-500/70 text-rose-300 ring-2 ring-rose-500/40';
      case 'INSUFFICIENT_FUNDS':
        return 'bg-rose-950 border-rose-500 text-rose-200 ring-2 ring-rose-500/60';
    }
  };

  const getTrackFillStyle = (level: BetRiskLevel) => {
    switch (level) {
      case 'LOW':
        return 'bg-slate-400';
      case 'MODERATE':
        return 'bg-sky-400';
      case 'HIGH':
        return 'bg-amber-400';
      case 'VERY_HIGH':
        return 'bg-orange-500';
      case 'EXTREME':
        return 'bg-orange-600';
      case 'ALL_IN':
        return 'bg-rose-500';
      case 'INSUFFICIENT_FUNDS':
        return 'bg-rose-600';
    }
  };

  return (
    <div
      className={`w-full rounded-2xl bg-slate-900/80 border ${
        isOverBalance ? 'border-rose-500/60 shadow-rose-950/50 shadow-lg' : 'border-white/10'
      } p-3 space-y-2.5 transition-all ${className}`}
      aria-live="polite"
    >
      {/* 3 Pillars: Saldo, Aposta, Restam */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs pb-1 border-b border-white/5">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-slate-400">Saldo</span>
          <span className="font-mono font-black text-white">{balanceBeforeBet}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-amber-300">Aposta</span>
          <span className="font-mono font-black text-amber-400">{stake}</span>
        </div>
        <div className="flex flex-col">
          <span
            className={`text-[10px] uppercase font-bold ${
              remaining < 0 ? 'text-rose-400' : 'text-slate-400'
            }`}
          >
            {remaining < 0 ? 'Faltam' : 'Restam'}
          </span>
          <span
            className={`font-mono font-black ${
              remaining < 0
                ? 'text-rose-400'
                : remaining === 0
                ? 'text-rose-300'
                : 'text-emerald-400'
            }`}
          >
            {remaining < 0 ? Math.abs(remaining) : remaining}
          </span>
        </div>
      </div>

      {/* Exposure Header & Status Badge */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-slate-400 font-medium">Exposição:</span>
          {isOverBalance ? (
            <span className="text-rose-300 font-bold text-xs truncate">
              Excede o saldo disponível
            </span>
          ) : (
            <span className="text-slate-200 font-mono text-xs font-bold">
              {risk.percentage}% do saldo
            </span>
          )}
        </div>

        <div
          className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black tracking-wide uppercase flex items-center gap-1.5 transition-all flex-shrink-0 ${getBadgeStyle(
            risk.level
          )}`}
        >
          {getRiskIcon(risk.level)}
          <span>{risk.label}</span>
        </div>
      </div>

      {/* Linear Exposure Progress Gauge (clamped strictly 0% to 100%) */}
      <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5 relative">
        <div
          className={`h-full rounded-full transition-all duration-200 ${getTrackFillStyle(
            risk.level
          )}`}
          style={{
            width: `${Math.min(100, Math.max(0, balanceBeforeBet > 0 ? (stake / balanceBeforeBet) * 100 : 0))}%`,
          }}
        />
      </div>

      {/* Contextual Description Message */}
      <div className="text-[11px] leading-tight">
        {isOverBalance ? (
          <p className="text-rose-300 font-bold flex items-center gap-1">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            <span>
              Saldo insuficiente. Você precisa de mais {Math.abs(remaining)} fichas para esta aposta.
            </span>
          </p>
        ) : risk.level === 'ALL_IN' ? (
          <p className="text-rose-300 font-bold flex items-center gap-1">
            <Flame className="w-3 h-3 flex-shrink-0 text-rose-400" />
            <span>All-In: Você está colocando 100% das suas fichas nesta rodada!</span>
          </p>
        ) : (
          <p className="text-slate-400">{risk.description}</p>
        )}
      </div>
    </div>
  );
};
