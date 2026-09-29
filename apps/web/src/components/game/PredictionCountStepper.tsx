'use client';

import React, { useCallback } from 'react';
import { useSoundEffects } from '../../lib/useSoundEffects';

export interface PredictionCountStepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  title?: string;
  contextualLabel?: string;
  sublabel?: string;
  disabled?: boolean;
}

export const PredictionCountStepper: React.FC<PredictionCountStepperProps> = ({
  value,
  min,
  max,
  onChange,
  title = 'Quantidade Prevista',
  contextualLabel,
  sublabel,
  disabled = false,
}) => {
  const { playTickSound } = useSoundEffects();

  const handleDecrement = useCallback(() => {
    if (disabled || value <= min) return;
    playTickSound();
    onChange(value - 1);
  }, [disabled, value, min, onChange, playTickSound]);

  const handleIncrement = useCallback(() => {
    if (disabled || value >= max) return;
    playTickSound();
    onChange(value + 1);
  }, [disabled, value, max, onChange, playTickSound]);

  const canDecrement = !disabled && value > min;
  const canIncrement = !disabled && value < max;

  return (
    <div className="w-full bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col items-center gap-3 select-none">
      <div className="text-center">
        <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
          {title}
        </span>
        {contextualLabel && (
          <p className="text-sm font-bold text-amber-400 mt-0.5">
            {contextualLabel}
          </p>
        )}
      </div>

      <div
        className="flex items-center justify-center gap-4 w-full max-w-xs"
        role="spinbutton"
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-label={title}
      >
        <button
          type="button"
          onClick={handleDecrement}
          disabled={!canDecrement}
          aria-label="Diminuir quantidade"
          className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl transition-all duration-150 border ${
            canDecrement
              ? 'bg-slate-800 hover:bg-slate-700 active:scale-95 text-white border-slate-700 shadow-md cursor-pointer'
              : 'bg-slate-900/40 text-slate-600 border-slate-800/60 cursor-not-allowed opacity-50'
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
          </svg>
        </button>

        <div className="flex-1 flex flex-col items-center justify-center py-2 px-4 rounded-xl bg-slate-950/70 border border-amber-500/20 shadow-inner">
          <span className="text-3xl font-black tracking-tight text-white tabular-nums">
            {value}
          </span>
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
            {value === 1 ? 'jogador' : 'jogadores'}
          </span>
        </div>

        <button
          type="button"
          onClick={handleIncrement}
          disabled={!canIncrement}
          aria-label="Aumentar quantidade"
          className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl transition-all duration-150 border ${
            canIncrement
              ? 'bg-slate-800 hover:bg-slate-700 active:scale-95 text-white border-slate-700 shadow-md cursor-pointer'
              : 'bg-slate-900/40 text-slate-600 border-slate-800/60 cursor-not-allowed opacity-50'
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {sublabel && (
        <span className="text-xs text-slate-500 font-medium text-center">
          {sublabel}
        </span>
      )}
    </div>
  );
};

export default PredictionCountStepper;
