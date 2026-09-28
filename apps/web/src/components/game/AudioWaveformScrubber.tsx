'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin, { Region } from 'wavesurfer.js/dist/plugins/regions.js';
import {
  Clock,
  Zap,
  Music,
  RotateCcw,
  Play,
  Pause,
  ArrowRight,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { clampSelectionStart } from '@who/shared';

export interface AudioWaveformScrubberProps {
  selectedTrack?: {
    id?: string;
    title: string;
    artist: string;
    albumArt?: string;
    audioUrl?: string;
  } | null;
  startTimeSeconds: number;
  onChangeStartTime: (seconds: number) => void;
  windowDurationSeconds?: number;
  maxDurationSeconds?: number;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  currentPlaybackTime?: number;
  onReady?: (duration: number) => void;
  onError?: (err: Error) => void;
}

export const AudioWaveformScrubber: React.FC<AudioWaveformScrubberProps> = ({
  selectedTrack,
  startTimeSeconds,
  onChangeStartTime,
  windowDurationSeconds = 30,
  onReady,
  onError,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsPluginRef = useRef<RegionsPlugin | null>(null);
  const regionRef = useRef<Region | null>(null);

  // Guard against race conditions during fast track switching
  const activeUrlRef = useRef<string | null>(null);
  const isDraggingRef = useRef<boolean>(false);

  const [isMounted, setIsMounted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState<number>(30);
  const [headDisplay, setHeadDisplay] = useState<number>(startTimeSeconds);
  const [tailDisplay, setTailDisplay] = useState<number>(startTimeSeconds + windowDurationSeconds);

  // Mark client hydration complete
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const formatTime = (secsInput: number) => {
    const safeSecs = Math.max(0, Math.floor(secsInput));
    const m = Math.floor(safeSecs / 60);
    const s = safeSecs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Main WaveSurfer & Regions initialization effect
  useEffect(() => {
    if (!isMounted) return;

    const audioUrl = selectedTrack?.audioUrl;
    if (!audioUrl || !containerRef.current) return;

    activeUrlRef.current = audioUrl;
    setIsLoading(true);
    setHasError(false);
    setIsReady(false);
    setIsPlaying(false);

    // Clean up any previous instance
    if (wavesurferRef.current) {
      try {
        wavesurferRef.current.destroy();
      } catch (_) {}
      wavesurferRef.current = null;
      regionsPluginRef.current = null;
      regionRef.current = null;
    }

    // Clear previous canvas artifacts
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }

    // 1. Create Regions Plugin instance
    const regionsPlugin = RegionsPlugin.create();
    regionsPluginRef.current = regionsPlugin;

    // 2. Create WaveSurfer v7 instance
    const ws = WaveSurfer.create({
      container: containerRef.current,
      url: audioUrl,
      waveColor: 'rgba(148, 163, 184, 0.4)', // Slate muted for unselected audio
      progressColor: '#FBBF24',                // Warm golden amber for played waveform
      cursorColor: '#FFFFFF',                  // Crisp playhead
      cursorWidth: 2,
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
      height: 72,
      normalize: true,
      plugins: [regionsPlugin],
    });
    wavesurferRef.current = ws;

    // 3. Setup event listeners
    ws.on('ready', (duration) => {
      // Race condition check: discard if user already selected another track
      if (activeUrlRef.current !== audioUrl) return;

      setIsLoading(false);
      setIsReady(true);
      setAudioDuration(duration);
      onReady?.(duration);

      const effectiveClipDur = Math.min(windowDurationSeconds, duration);
      const safeHead = clampSelectionStart(startTimeSeconds, duration, effectiveClipDur);
      const safeTail = Math.min(duration, safeHead + effectiveClipDur);

      setHeadDisplay(safeHead);
      setTailDisplay(safeTail);

      // Single non-resizable region representing the active snippet
      regionsPlugin.clearRegions();
      const canDrag = duration > windowDurationSeconds + 0.1;

      const reg = regionsPlugin.addRegion({
        id: 'who-selection',
        start: safeHead,
        end: safeTail,
        drag: canDrag,
        resize: false, // Strictly non-resizable window
        resizeStart: false,
        resizeEnd: false,
        color: 'rgba(250, 204, 21, 0.16)', // Transparent WHO? gold
      });
      regionRef.current = reg;

      // Visual styling for the region DOM element
      if (reg.element) {
        reg.element.style.borderRadius = '12px';
        reg.element.style.border = '2px solid rgba(250, 204, 21, 0.85)';
        reg.element.style.boxShadow = '0 0 16px rgba(250, 204, 21, 0.35)';
        reg.element.style.cursor = canDrag ? 'grab' : 'default';
        reg.element.style.transition = 'border-color 150ms ease, background-color 150ms ease';
      }

      // Initial playhead position set to HEAD
      ws.setTime(safeHead);
    });

    ws.on('play', () => {
      setIsPlaying(true);
    });

    ws.on('pause', () => {
      setIsPlaying(false);
    });

    // Timeupdate: Pause and rewind to HEAD when reaching TAIL
    ws.on('timeupdate', (currentTime) => {
      const reg = regionRef.current;
      if (!reg) return;

      if (currentTime >= reg.end) {
        ws.pause();
        ws.setTime(reg.start);
        setIsPlaying(false);
      }
    });

    // Click/seek interaction on waveform: keep playhead strictly inside the clip
    ws.on('interaction', (newTime) => {
      const reg = regionRef.current;
      if (!reg) return;

      if (newTime < reg.start || newTime > reg.end) {
        ws.setTime(reg.start);
      }
    });

    ws.on('error', (err) => {
      if (activeUrlRef.current !== audioUrl) return;
      console.error('WaveSurfer audio preview error:', err);
      setIsLoading(false);
      setHasError(true);
      setErrorMessage('Não foi possível carregar a prévia desta faixa.');
      onError?.(err instanceof Error ? err : new Error(String(err)));
    });

    // Drag events from RegionsPlugin
    regionsPlugin.on('region-update', (reg) => {
      isDraggingRef.current = true;
      if (reg.element) {
        reg.element.style.cursor = 'grabbing';
      }

      const totalDur = ws.getDuration() || 30;
      const clipDur = Math.min(windowDurationSeconds, totalDur);

      const safeStart = clampSelectionStart(reg.start, totalDur, clipDur);
      const safeEnd = Math.min(totalDur, safeStart + clipDur);

      if (Math.abs(reg.start - safeStart) > 0.01 || Math.abs(reg.end - safeEnd) > 0.01) {
        reg.setOptions({ start: safeStart, end: safeEnd });
      }

      setHeadDisplay(safeStart);
      setTailDisplay(safeEnd);
    });

    regionsPlugin.on('region-updated', (reg) => {
      isDraggingRef.current = false;
      if (reg.element) {
        const canDrag = (ws.getDuration() || 30) > windowDurationSeconds + 0.1;
        reg.element.style.cursor = canDrag ? 'grab' : 'default';
      }

      const totalDur = ws.getDuration() || 30;
      const clipDur = Math.min(windowDurationSeconds, totalDur);
      const finalStart = clampSelectionStart(reg.start, totalDur, clipDur);

      onChangeStartTime(finalStart);
    });

    return () => {
      try {
        ws.destroy();
      } catch (_) {}
      wavesurferRef.current = null;
      regionsPluginRef.current = null;
      regionRef.current = null;
    };
  }, [isMounted, selectedTrack?.audioUrl, windowDurationSeconds]);

  // Sync selectionStart changes from external controls (-2s, +2s, shortcuts) to the region
  useEffect(() => {
    if (isDraggingRef.current) return;
    const reg = regionRef.current;
    const ws = wavesurferRef.current;
    if (!reg || !ws || !isReady) return;

    const totalDur = ws.getDuration() || audioDuration || 30;
    const clipDur = Math.min(windowDurationSeconds, totalDur);
    const clampedHead = clampSelectionStart(startTimeSeconds, totalDur, clipDur);
    const clampedTail = Math.min(totalDur, clampedHead + clipDur);

    // Only update if difference > 0.05 to prevent feedback loops
    if (Math.abs(reg.start - clampedHead) > 0.05) {
      reg.setOptions({ start: clampedHead, end: clampedTail });
      setHeadDisplay(clampedHead);
      setTailDisplay(clampedTail);

      // If paused, move playhead to the new HEAD so the user sees the position
      if (!ws.isPlaying()) {
        ws.setTime(clampedHead);
      }
    }
  }, [startTimeSeconds, isReady, windowDurationSeconds, audioDuration]);

  // Play / Pause Toggle
  const handleTogglePlay = useCallback(() => {
    const ws = wavesurferRef.current;
    const reg = regionRef.current;
    if (!ws || !isReady) return;

    if (ws.isPlaying()) {
      ws.pause();
    } else {
      const cur = ws.getCurrentTime();
      const head = reg ? reg.start : headDisplay;
      const tail = reg ? reg.end : tailDisplay;

      // If outside [head, tail], seek to head
      if (cur < head || cur >= tail - 0.05) {
        ws.setTime(head);
      }
      ws.play();
    }
  }, [isReady, headDisplay, tailDisplay]);

  // Step -2s / +2s
  const handleStep = useCallback(
    (deltaSeconds: number) => {
      const ws = wavesurferRef.current;
      const totalDur = ws ? ws.getDuration() : audioDuration;
      const newStart = clampSelectionStart(
        headDisplay + deltaSeconds,
        totalDur,
        windowDurationSeconds
      );
      onChangeStartTime(newStart);
    },
    [headDisplay, audioDuration, windowDurationSeconds, onChangeStartTime]
  );

  // Shortcut jumps (00:00, 00:10, 00:15)
  const handleShortcut = useCallback(
    (targetSeconds: number) => {
      const ws = wavesurferRef.current;
      const totalDur = ws ? ws.getDuration() : audioDuration;
      const newStart = clampSelectionStart(
        targetSeconds,
        totalDur,
        windowDurationSeconds
      );
      onChangeStartTime(newStart);
    },
    [audioDuration, windowDurationSeconds, onChangeStartTime]
  );

  const isFullPreviewTrack = audioDuration <= windowDurationSeconds + 0.1;

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
          {/* Play/Pause Button */}
          <button
            type="button"
            onClick={handleTogglePlay}
            disabled={!isReady || isLoading || hasError}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition flex-shrink-0 ${
              !isReady || isLoading || hasError
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-yellow-400 hover:bg-yellow-300 text-slate-950 shadow-glow-yellow active:scale-95'
            }`}
            title={isPlaying ? 'Pausar prévia do áudio' : 'Ouvir trecho selecionado'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          {/* HEAD -> TAIL Badge */}
          <div className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-400 to-amber-500 text-slate-950 font-mono font-black text-xs flex items-center gap-1.5 shadow-glow-yellow">
            <Clock className="w-3.5 h-3.5 text-slate-950" />
            <span>{formatTime(headDisplay)}</span>
            <ArrowRight className="w-3 h-3 text-slate-950" />
            <span>{formatTime(tailDisplay)}</span>
            <span className="text-[10px] opacity-80 font-bold">
              ({Math.round(tailDisplay - headDisplay)}s)
            </span>
          </div>
        </div>
      </div>

      {/* Main Real WaveSurfer Container */}
      <div className="relative pt-4 pb-2 px-1">
        <div className="relative rounded-2xl bg-black/70 border border-white/10 p-2 overflow-hidden min-h-[92px] flex items-center justify-center">
          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-30 flex items-center justify-center gap-2 text-yellow-300 text-xs font-bold font-mono">
              <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
              <span>PREPARANDO AUDIO...</span>
            </div>
          )}

          {/* Error Banner */}
          {hasError && (
            <div className="absolute inset-0 bg-red-950/85 z-30 flex flex-col items-center justify-center gap-1.5 p-3 text-center">
              <div className="flex items-center gap-1 text-red-300 text-xs font-bold">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const ws = wavesurferRef.current;
                  if (ws && selectedTrack?.audioUrl) {
                    setIsLoading(true);
                    setHasError(false);
                    ws.load(selectedTrack.audioUrl);
                  }
                }}
                className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold border border-white/20 transition"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {/* WaveSurfer DOM Mount Target */}
          <div
            ref={containerRef}
            className="w-full h-full relative cursor-pointer select-none"
            style={{ minHeight: '72px' }}
          />
        </div>

        {/* Drag Hint / Full Preview notice */}
        <div className="flex items-center justify-between px-1 mt-1 text-[10px] font-mono text-slate-400">
          {isFullPreviewTrack ? (
            <span className="text-blue-300 font-semibold">
              Previa completa ({Math.round(audioDuration)}s) - trecho fixo da faixa
            </span>
          ) : (
            <span className="text-yellow-300/80 font-medium">
              Arraste a janela amarela para escolher o trecho da partida
            </span>
          )}
          <span>Duracao total: {formatTime(audioDuration)}</span>
        </div>
      </div>

      {/* Bottom Shortcuts & Steppers */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-blue-200/70 mr-1">Atalhos:</span>
          <button
            type="button"
            disabled={!isReady || isFullPreviewTrack}
            onClick={() => handleShortcut(0)}
            className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition flex items-center gap-1 border ${
              headDisplay === 0
                ? 'bg-yellow-400 text-slate-950 border-yellow-300 font-black shadow-glow-yellow'
                : 'bg-white/5 hover:bg-white/15 text-white border-white/10 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            <Zap className="w-3 h-3 text-amber-400" /> 00:00 Inicio
          </button>

          {audioDuration >= 20 && (
            <button
              type="button"
              disabled={!isReady || isFullPreviewTrack}
              onClick={() => handleShortcut(10)}
              className="px-2.5 py-1 rounded-xl text-[10px] font-bold transition flex items-center gap-1 bg-white/5 hover:bg-white/15 text-white border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              00:10
            </button>
          )}

          {audioDuration >= 30 && (
            <button
              type="button"
              disabled={!isReady || isFullPreviewTrack}
              onClick={() => handleShortcut(15)}
              className="px-2.5 py-1 rounded-xl text-[10px] font-bold transition flex items-center gap-1 bg-white/5 hover:bg-white/15 text-white border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              00:15
            </button>
          )}
        </div>

        {/* Fine Tuning Stepper Buttons */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            type="button"
            disabled={!isReady || isFullPreviewTrack}
            onClick={() => handleStep(-2)}
            className="px-2.5 py-1 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-white/15 text-white text-[10px] font-mono font-bold transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Recuar 2s"
          >
            -2s
          </button>

          <button
            type="button"
            disabled={!isReady || isFullPreviewTrack}
            onClick={() => handleStep(2)}
            className="px-2.5 py-1 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-white/15 text-white text-[10px] font-mono font-bold transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Avancar 2s"
          >
            +2s
          </button>

          <button
            type="button"
            disabled={!isReady || isFullPreviewTrack}
            onClick={() => handleShortcut(0)}
            className="p-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-white/15 text-cyan-300 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Resetar para o inicio"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
