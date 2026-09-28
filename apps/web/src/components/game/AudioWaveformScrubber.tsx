'use client';

import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { Clock, Zap, Music, RotateCcw, Play, Pause, ArrowRight } from 'lucide-react';
import { calculateClipBounds, shiftClipWindow } from '@who/shared';

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
  maxDurationSeconds = 30,
  isPlaying = false,
  onTogglePlay,
  currentPlaybackTime,
  selectedTrack,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDraggingWindow, setIsDraggingWindow] = useState(false);
  const dragStartXRef = useRef(0);
  const dragStartHeadRef = useRef(0);

  // Safe duration bound
  const effectiveMaxDuration = Math.max(1, maxDurationSeconds || 30);
  const effectiveWindowDuration = Math.min(windowDurationSeconds, effectiveMaxDuration);

  // Calculate guaranteed valid clip bounds from pure engine
  const clipBounds = useMemo(() => {
    return calculateClipBounds(startTimeSeconds, effectiveWindowDuration, effectiveMaxDuration);
  }, [startTimeSeconds, effectiveWindowDuration, effectiveMaxDuration]);

  const headSeconds = clipBounds.head;
  const tailSeconds = clipBounds.tail;

  // Realistic frequency bars (48 bars)
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

  const formatTime = (secsInput: number) => {
    const safeSecs = Math.max(0, Math.floor(secsInput));
    const m = Math.floor(safeSecs / 60);
    const s = safeSecs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const startPercentage = Math.min(100, Math.max(0, (headSeconds / effectiveMaxDuration) * 100));
  const endPercentage = Math.min(100, Math.max(0, (tailSeconds / effectiveMaxDuration) * 100));
  const windowWidthPercentage = Math.max(0, endPercentage - startPercentage);

  // Smooth playhead position
  const playheadPercentage =
    currentPlaybackTime !== undefined && isPlaying
      ? Math.min(100, Math.max(0, (currentPlaybackTime / effectiveMaxDuration) * 100))
      : null;

  // Handle direct click on timeline
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetSeconds = clickRatio * effectiveMaxDuration;
    const shifted = calculateClipBounds(
      targetSeconds - effectiveWindowDuration / 2,
      effectiveWindowDuration,
      effectiveMaxDuration
    );
    onChangeStartTime(shifted.head);
  };

  // Dragging the selection window
  const handleWindowPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsDraggingWindow(true);
    dragStartXRef.current = e.clientX;
    dragStartHeadRef.current = headSeconds;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleWindowPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingWindow || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const deltaPixels = e.clientX - dragStartXRef.current;
    const deltaSeconds = (deltaPixels / rect.width) * effectiveMaxDuration;
    const updated = shiftClipWindow(
      dragStartHeadRef.current,
      deltaSeconds,
      effectiveWindowDuration,
      effectiveMaxDuration
    );
    onChangeStartTime(updated.head);
  };

  const handleWindowPointerUp = (e: React.PointerEvent) => {
    if (isDraggingWindow) {
      setIsDraggingWindow(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  const handleStep = (delta: number) => {
    const shifted = shiftClipWindow(headSeconds, delta, effectiveWindowDuration, effectiveMaxDuration);
    onChangeStartTime(shifted.head);
  };

  return (
    <div className="p-4 rounded-3xl bg-slate-900/80 border border-white/20 space-y-3.5 text-left shadow-2xl backdrop-blur-xl relative overflow-hidden">
      {/* Header Info & Track Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {selectedTrack ? (
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {selectedTrack.albumArt ? (
              <img
                src={selectedTrack.albumArt}
                alt={selectedTrack.title}
                className="w-12 h-12 rounded-2xl object-cover shadow-lg border border-white/20 flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center shadow-lg border border-white/20 flex-shrink-0">
                <Music className="w-6 h-6 text-white" />
              </div>
            )}
            <div className="min-w-0 text-left">
              <h4 className="text-sm font-extrabold text-white truncate flex items-center gap-1.5">
                <span className="truncate">{selectedTrack.title}</span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 font-mono font-bold border border-yellow-400/30 flex-shrink-0">
                  SEU TRECHO
                </span>
              </h4>
              <p className="text-xs text-blue-200/80 font-medium truncate">
                {selectedTrack.artist}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-yellow-400/20 border border-yellow-400/40 flex items-center justify-center text-yellow-300 shadow-glow-yellow">
              <Music className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white tracking-wide">
                Janela do Trecho Musical
              </h4>
              <p className="text-[10px] text-blue-200/70 font-medium">
                Defina o ponto exato da música que será tocado na rodada
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
              className="w-10 h-10 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 flex items-center justify-center transition shadow-glow-yellow active:scale-95 flex-shrink-0"
              title={isPlaying ? 'Pausar prévia do áudio' : 'Ouvir trecho selecionado'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>
          )}

          {/* Badge de Janela de Trecho Ativa (Início -> Fim) */}
          <div className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-400 to-amber-500 text-slate-950 font-mono font-black text-xs flex items-center gap-1.5 shadow-glow-yellow">
            <Clock className="w-3.5 h-3.5 text-slate-950" />
            <span>{formatTime(headSeconds)}</span>
            <ArrowRight className="w-3 h-3 text-slate-950" />
            <span>{formatTime(tailSeconds)}</span>
            <span className="text-[10px] opacity-80 font-bold">({clipBounds.duration}s)</span>
          </div>
        </div>
      </div>

      {/* Interactive Sound Waveform Visualizer */}
      <div className="relative pt-5 pb-3 px-1">
        <div
          ref={containerRef}
          onClick={handleTimelineClick}
          className="h-20 w-full flex items-end justify-between gap-1 px-1 py-1 rounded-2xl bg-black/60 border border-white/10 relative overflow-hidden cursor-pointer select-none"
        >
          {/* Highlighted Draggable Selection Window */}
          <div
            onPointerDown={handleWindowPointerDown}
            onPointerMove={handleWindowPointerMove}
            onPointerUp={handleWindowPointerUp}
            onPointerCancel={handleWindowPointerUp}
            className={`absolute top-0 bottom-0 bg-yellow-400/15 border-x-2 border-yellow-400/80 rounded-xl cursor-grab active:cursor-grabbing transition-all duration-75 z-10 ${
              isDraggingWindow ? 'bg-yellow-400/25 border-yellow-300 shadow-glow-yellow' : ''
            }`}
            style={{
              left: `${startPercentage}%`,
              width: `${Math.max(4, windowWidthPercentage)}%`,
            }}
            title="Arraste para mover a janela do trecho"
          >
            {/* Top Grip Indicator */}
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-6 h-1 rounded-full bg-yellow-400/60" />
          </div>

          {/* Gráfico de Barras de Frequência Sonora */}
          {bars.map((barHeight, idx) => {
            const barTime = (idx / bars.length) * effectiveMaxDuration;
            const isInsideWindow = barTime >= headSeconds && barTime <= tailSeconds;

            return (
              <div key={idx} className="flex-1 flex flex-col justify-end h-full">
                <div
                  className={`w-full rounded-t-sm transition-all duration-150 ${
                    isInsideWindow
                      ? 'bg-gradient-to-t from-yellow-400 via-amber-300 to-rose-400 shadow-glow-yellow'
                      : 'bg-white/15'
                  }`}
                  style={{ height: `${barHeight}%` }}
                />
              </div>
            );
          })}

          {/* HEAD Pin Indicator */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-yellow-300 shadow-glow-yellow pointer-events-none z-20"
            style={{ left: `${startPercentage}%` }}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-yellow-300 border-2 border-slate-950 -ml-1.5 -mt-1 shadow-glow-yellow" />
            <span className="absolute -top-4 -left-4 px-1 py-0.5 rounded bg-yellow-400 text-slate-950 text-[8px] font-mono font-black shadow">
              {formatTime(headSeconds)}
            </span>
          </div>

          {/* TAIL Pin Indicator */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-rose-400 shadow-glow-rose pointer-events-none z-20"
            style={{ left: `${endPercentage}%` }}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-rose-400 border-2 border-slate-950 -ml-1.5 -mt-1 shadow-glow-rose" />
            <span className="absolute -top-4 -left-4 px-1 py-0.5 rounded bg-rose-500 text-white text-[8px] font-mono font-black shadow">
              {formatTime(tailSeconds)}
            </span>
          </div>

          {/* Live PLAYHEAD Indicator */}
          {playheadPercentage !== null && isPlaying && (
            <div
              className="absolute top-0 bottom-0 w-1 bg-white shadow-glow-cyan pointer-events-none z-30 transition-all duration-75"
              style={{ left: `${playheadPercentage}%` }}
            >
              <div className="w-3 h-3 rounded-full bg-cyan-300 border-2 border-slate-950 -ml-1 -mt-0.5 shadow-glow-cyan" />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Presets & Steppers (No Fake Music Analysis Labels) */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-blue-200/70 mr-1">Atalhos:</span>
          <button
            type="button"
            onClick={() => onChangeStartTime(0)}
            className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition flex items-center gap-1 border ${
              headSeconds === 0
                ? 'bg-yellow-400 text-slate-950 border-yellow-300 font-black shadow-glow-yellow'
                : 'bg-white/5 hover:bg-white/15 text-white border-white/10'
            }`}
          >
            <Zap className="w-3 h-3 text-amber-400" /> 00:00 Início
          </button>

          {effectiveMaxDuration >= 20 && (
            <button
              type="button"
              onClick={() => onChangeStartTime(Math.min(10, Math.max(0, effectiveMaxDuration - effectiveWindowDuration)))}
              className="px-2.5 py-1 rounded-xl text-[10px] font-bold transition flex items-center gap-1 bg-white/5 hover:bg-white/15 text-white border border-white/10"
            >
              00:10
            </button>
          )}

          {effectiveMaxDuration >= 30 && (
            <button
              type="button"
              onClick={() => onChangeStartTime(Math.min(15, Math.max(0, effectiveMaxDuration - effectiveWindowDuration)))}
              className="px-2.5 py-1 rounded-xl text-[10px] font-bold transition flex items-center gap-1 bg-white/5 hover:bg-white/15 text-white border border-white/10"
            >
              00:15
            </button>
          )}
        </div>

        {/* Fine Tuning Stepper Buttons */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            type="button"
            onClick={() => handleStep(-2)}
            className="px-2.5 py-1 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-white/15 text-white text-[10px] font-mono font-bold transition active:scale-95"
            title="Recuar 2s"
          >
            -2s
          </button>

          <button
            type="button"
            onClick={() => handleStep(2)}
            className="px-2.5 py-1 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-white/15 text-white text-[10px] font-mono font-bold transition active:scale-95"
            title="Avançar 2s"
          >
            +2s
          </button>

          <button
            type="button"
            onClick={() => onChangeStartTime(0)}
            className="p-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-white/15 text-cyan-300 transition active:scale-95"
            title="Resetar para o início"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
