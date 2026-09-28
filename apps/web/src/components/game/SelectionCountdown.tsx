'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Clock, AlertCircle } from 'lucide-react';

interface SelectionCountdownProps {
  selectionDeadlineAt?: number;
  fallbackSeconds?: number;
  isMuted?: boolean;
  onPlayTick?: () => void;
  className?: string;
  variant?: 'compact' | 'actionBar' | 'header';
}

export const SelectionCountdown: React.FC<SelectionCountdownProps> = ({
  selectionDeadlineAt,
  fallbackSeconds = 90,
  isMuted = false,
  onPlayTick,
  className = '',
  variant = 'compact',
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    if (selectionDeadlineAt && selectionDeadlineAt > Date.now()) {
      return Math.max(0, Math.ceil((selectionDeadlineAt - Date.now()) / 1000));
    }
    return fallbackSeconds;
  });

  const lastTickSecondRef = useRef<number | null>(null);

  useEffect(() => {
    const updateTime = () => {
      let secs: number;
      if (selectionDeadlineAt) {
        const remainingMs = Math.max(0, selectionDeadlineAt - Date.now());
        secs = Math.ceil(remainingMs / 1000);
      } else {
        secs = fallbackSeconds;
      }

      setSecondsRemaining(secs);

      // Trigger audio ticks on key seconds without duplicate renders
      if (!isMuted && onPlayTick && lastTickSecondRef.current !== secs) {
        if (secs === 10 || (secs <= 5 && secs >= 1)) {
          lastTickSecondRef.current = secs;
          onPlayTick();
        }
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 250);
    return () => clearInterval(interval);
  }, [selectionDeadlineAt, fallbackSeconds, isMuted, onPlayTick]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Urgency classifications
  const isCritical = secondsRemaining <= 5 && secondsRemaining > 0;
  const isUrgent = secondsRemaining <= 15 && secondsRemaining > 5;
  const isWarning = secondsRemaining <= 30 && secondsRemaining > 15;

  if (variant === 'header') {
    return (
      <div
        className={`flex items-center gap-1.5 font-mono text-xs font-bold transition-colors ${
          isCritical
            ? 'text-rose-400 animate-pulse'
            : isUrgent
            ? 'text-amber-400'
            : isWarning
            ? 'text-yellow-300'
            : 'text-blue-200'
        } ${className}`}
      >
        <Clock className={`w-3.5 h-3.5 ${isCritical ? 'text-rose-400 animate-spin-slow' : ''}`} />
        <span>{formattedTime}</span>
      </div>
    );
  }

  if (variant === 'actionBar') {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
          isCritical
            ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-glow-pink animate-pulse'
            : isUrgent
            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
            : isWarning
            ? 'bg-yellow-400/15 border-yellow-400/30 text-yellow-300'
            : 'bg-white/10 border-white/15 text-slate-200'
        } ${className}`}
      >
        <Clock className={`w-4 h-4 flex-shrink-0 ${isCritical ? 'text-rose-400' : 'text-yellow-400'}`} />
        <div className="flex flex-col text-left">
          <span className="font-mono text-sm font-black leading-tight tracking-wider">
            {formattedTime}
          </span>
          <span className="text-[9px] uppercase tracking-wider font-extrabold opacity-80 leading-none">
            {isCritical
              ? 'Tempo Esgotando!'
              : isUrgent
              ? 'Tempo Restante'
              : 'Tempo de Escolha'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-mono text-xs font-bold transition-all ${
        isCritical
          ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-glow-pink'
          : isUrgent
          ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
          : 'bg-white/10 border-white/15 text-slate-200'
      } ${className}`}
    >
      <Clock className="w-3.5 h-3.5 text-yellow-400" />
      <span>{formattedTime}</span>
    </div>
  );
};
