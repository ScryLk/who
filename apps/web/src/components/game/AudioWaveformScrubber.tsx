'use client';

import React, { useMemo } from 'react';
import { Clock, Flame, Zap, Music, RotateCcw, Play, Pause, Film, ArrowRight } from 'lucide-react';

interface AudioWaveformScrubberProps {
  startTimeSeconds: number;
  onChangeStartTime: (seconds: number) => void;
  windowDurationSeconds?: number;
  maxDurationSeconds?: number;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  currentPlaybackTime?: number;
  selectedTrack?: {
    title: string;
    artist: string;
    albumArt?: string;
  } | null;
}

export const AudioWaveformScrubber: React.FC<AudioWaveformScrubberProps> = ({
  startTimeSeconds,
  onChangeStartTime,
  windowDurationSeconds = 30,
  maxDurationSeconds = 180,
  isPlaying = false,
  onTogglePlay,
  currentPlaybackTime,
  selectedTrack,
}) => {
  // Generate realistic frequency bars (48 bars)
  const bars = useMemo(() => {
    const totalBars = 48;
    const result: number[] = [];
    for (let i = 0; i < totalBars; i++) {
      const heightPercent =
        22 +
        Math.sin(i * 0.45) * 32 +
        Math.cos(i * 0.85) * 26 +
        ((i * 13) % 24);
      result.push(Math.min(95, Math.max(15, Math.round(heightPercent))));
    }
    return result;
  }, []);

  const endTimeSeconds = Math.min(maxDurationSeconds, startTimeSeconds + windowDurationSeconds);

  const formatTime = (secsInput: number) => {
    const m = Math.floor(secsInput / 60);
    const s = secsInput % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const startPercentage = Math.min(100, Math.max(0, (startTimeSeconds / maxDurationSeconds) * 100));
  const endPercentage = Math.min(100, Math.max(0, (endTimeSeconds / maxDurationSeconds) * 100));
  const windowWidthPercentage = Math.max(0, endPercentage - startPercentage);

  const playheadPercentage =
    currentPlaybackTime !== undefined
      ? Math.min(100, Math.max(0, (currentPlaybackTime / maxDurationSeconds) * 100))
      : null;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10) || 0;
    onChangeStartTime(val);
  };

  const handleStep = (delta: number) => {
    const newVal = Math.max(0, Math.min(maxDurationSeconds - windowDurationSeconds, startTimeSeconds + delta));
    onChangeStartTime(newVal);
  };

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 via-indigo-950/85 to-purple-950/90 border border-white/20 space-y-3.5 text-left shadow-2xl backdrop-blur-xl relative overflow-hidden">
      {/* Header Info & Track Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {selectedTrack ? (
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {selectedTrack.albumArt ? (
              <img
                src={selectedTrack.albumArt}
                alt={selectedTrack.title}
                className="w-11 h-11 rounded-xl object-cover shadow-lg border border-white/20 flex-shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center shadow-lg border border-white/20 flex-shrink-0">
                <Music className="w-5 h-5 text-white" />
              </div>
            )}
            <div className="min-w-0 text-left">
              <h4 className="text-sm font-extrabold text-white truncate flex items-center gap-1.5">
                <span className="truncate">{selectedTrack.title}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 font-mono font-bold border border-yellow-400/30 flex-shrink-0">
                  SELEÇÃO
                </span>
              </h4>
              <p className="text-xs text-blue-200/80 font-medium truncate">
                {selectedTrack.artist}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-yellow-400/20 border border-yellow-400/40 flex items-center justify-center text-yellow-300 shadow-glow-yellow">
              <Music className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white tracking-wide">
                Gráfico Sonoro & Janela de Trecho
              </h4>
              <p className="text-[10px] text-blue-200/70 font-medium">
                Pesquise e escolha uma música acima para definir a janela de reprodução
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {/* Botão de Play/Pause Prévia */}
          {onTogglePlay && (
            <button
              type="button"
              onClick={onTogglePlay}
              className="w-9 h-9 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 flex items-center justify-center transition shadow-glow-yellow active:scale-95 flex-shrink-0"
              title={isPlaying ? 'Pausar prévia do áudio' : 'Ouvir a partir do ponto inicial'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>
          )}

          {/* Badge de Janela de Trecho Ativa (Início -> Fim) */}
          <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-400 to-amber-500 text-slate-950 font-mono font-black text-xs flex items-center gap-1.5 shadow-glow-yellow">
            <Clock className="w-3.5 h-3.5 text-slate-950" />
            <span>{formatTime(startTimeSeconds)}</span>
            <ArrowRight className="w-3 h-3 text-slate-950" />
            <span>{formatTime(endTimeSeconds)}</span>
            <span className="text-[9px] opacity-80">({windowDurationSeconds}s)</span>
          </div>
        </div>
      </div>

      {/* Interactive Sound Waveform Visualizer Container */}
      <div className="relative pt-4 pb-2 px-1">
        {/* Highlighted Window Area Background Box */}
        <div
          className="absolute top-1 bottom-1 bg-yellow-400/10 border-x border-yellow-400/40 rounded-lg pointer-events-none transition-all duration-200"
          style={{ left: `${startPercentage}%`, width: `${windowWidthPercentage}%` }}
        />

        {/* Gráfico de Barras de Frequência Sonora */}
        <div className="h-16 w-full flex items-end justify-between gap-1 px-1 py-1 rounded-xl bg-black/50 border border-white/10 relative overflow-hidden">
          {bars.map((barHeight, idx) => {
            const barTime = Math.round((idx / bars.length) * maxDurationSeconds);
            const isInsideWindow = barTime >= startTimeSeconds && barTime <= endTimeSeconds;

            return (
              <div
                key={idx}
                className="flex-1 flex flex-col justify-end h-full group relative cursor-pointer"
                onClick={() => onChangeStartTime(barTime)}
              >
                <div
                  className={`w-full rounded-t-sm transition-all duration-200 ${
                    isInsideWindow
                      ? 'bg-gradient-to-t from-yellow-400 via-amber-300 to-rose-400 shadow-glow-yellow border-t border-yellow-200'
                      : 'bg-white/15 group-hover:bg-cyan-400/40'
                  }`}
                  style={{ height: `${barHeight}%` }}
                />
              </div>
            );
          })}

          {/* Start Pin Indicator */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-yellow-300 shadow-glow-yellow transition-all duration-150 pointer-events-none z-10"
            style={{ left: `${startPercentage}%` }}
          >
            <div className="w-3 h-3 rounded-full bg-yellow-300 border-2 border-slate-950 -ml-1.25 -mt-1 shadow-glow-yellow" />
            <span className="absolute -top-3.5 -left-4 px-1 py-0.2 rounded bg-yellow-400 text-slate-950 text-[8px] font-mono font-black shadow">
              {formatTime(startTimeSeconds)}
            </span>
          </div>

          {/* End Pin Indicator */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-rose-400 shadow-glow-rose transition-all duration-150 pointer-events-none z-10"
            style={{ left: `${endPercentage}%` }}
          >
            <div className="w-3 h-3 rounded-full bg-rose-400 border-2 border-slate-950 -ml-1.25 -mt-1 shadow-glow-rose" />
            <span className="absolute -top-3.5 -left-4 px-1 py-0.2 rounded bg-rose-500 text-white text-[8px] font-mono font-black shadow">
              {formatTime(endTimeSeconds)}
            </span>
          </div>

          {/* Live Audio Playhead Indicator (when playing) */}
          {playheadPercentage !== null && isPlaying && (
            <div
              className="absolute top-0 bottom-0 w-1 bg-white shadow-glow-cyan transition-all duration-75 pointer-events-none z-10"
              style={{ left: `${playheadPercentage}%` }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-300 border-2 border-slate-950 -ml-0.75 -mt-0.5 shadow-glow-cyan" />
            </div>
          )}
        </div>

        {/* Range Slider Interativo Sobreposto */}
        <input
          type="range"
          min={0}
          max={maxDurationSeconds - windowDurationSeconds}
          value={startTimeSeconds}
          onChange={handleSliderChange}
          className="absolute inset-x-1 bottom-1 top-2 opacity-0 cursor-pointer w-full z-20"
          title={`Janela de reprodução: ${formatTime(startTimeSeconds)} -> ${formatTime(endTimeSeconds)}`}
        />
      </div>

      {/* Bottom Presets & Steppers */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2.5">
        {/* Presets Rápidos */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-blue-200/70 mr-1">Atalhos:</span>
          <button
            type="button"
            onClick={() => onChangeStartTime(0)}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 border ${
              startTimeSeconds === 0
                ? 'bg-yellow-400 text-slate-950 border-yellow-300 font-black shadow-glow-yellow'
                : 'bg-white/5 hover:bg-white/15 text-white border-white/10'
            }`}
          >
            <Zap className="w-3 h-3 text-amber-400" /> 00:00 Início
          </button>

          <button
            type="button"
            onClick={() => onChangeStartTime(30)}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 border ${
              startTimeSeconds === 30
                ? 'bg-yellow-400 text-slate-950 border-yellow-300 font-black shadow-glow-yellow'
                : 'bg-white/5 hover:bg-white/15 text-white border-white/10'
            }`}
          >
            <Flame className="w-3 h-3 text-rose-400" /> 00:30 Verso
          </button>

          <button
            type="button"
            onClick={() => onChangeStartTime(60)}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 border ${
              startTimeSeconds === 60
                ? 'bg-yellow-400 text-slate-950 border-yellow-300 font-black shadow-glow-yellow'
                : 'bg-white/5 hover:bg-white/15 text-white border-white/10'
            }`}
          >
            <Flame className="w-3 h-3 text-pink-400" /> 01:00 Refrão
          </button>
        </div>

        {/* Fine Tuning Stepper Buttons */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            type="button"
            onClick={() => handleStep(-5)}
            className="px-2.5 py-1 rounded-lg bg-slate-950/80 hover:bg-slate-900 border border-white/15 text-white text-[10px] font-mono font-bold transition active:scale-95"
            title="Recuar 5s"
          >
            -5s
          </button>

          <button
            type="button"
            onClick={() => handleStep(5)}
            className="px-2.5 py-1 rounded-lg bg-slate-950/80 hover:bg-slate-900 border border-white/15 text-white text-[10px] font-mono font-bold transition active:scale-95"
            title="Avançar 5s"
          >
            +5s
          </button>

          <button
            type="button"
            onClick={() => onChangeStartTime(0)}
            className="p-1 rounded-lg bg-slate-950/80 hover:bg-slate-900 border border-white/15 text-cyan-300 transition active:scale-95"
            title="Resetar para 00:00"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
