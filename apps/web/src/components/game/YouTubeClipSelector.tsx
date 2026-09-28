'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Youtube, Clock, Loader2 } from 'lucide-react';
import type { Track } from '@who/shared';
import {
  clampHead,
  calculateClipBounds,
  shiftClipWindow,
  formatDurationDisplay,
} from '@who/shared';
import { loadYouTubeIFrameAPI, type YTPlayer } from '@/lib/youtubeLoader';

interface YouTubeClipSelectorProps {
  selectedTrack: Track;
  startTimeSeconds: number;
  windowDurationSeconds: number;
  onChangeStartTime: (newStartTime: number) => void;
  onReady?: (durationSeconds: number) => void;
}

export const YouTubeClipSelector: React.FC<YouTubeClipSelectorProps> = ({
  selectedTrack,
  startTimeSeconds,
  windowDurationSeconds,
  onChangeStartTime,
  onReady,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isPlayingClip, setIsPlayingClip] = useState(false);

  // Total duration: null while unknown, NEVER initialized to fake 180s
  const [totalDuration, setTotalDuration] = useState<number | null>(
    selectedTrack.durationSeconds && selectedTrack.durationSeconds > 0
      ? selectedTrack.durationSeconds
      : null
  );

  const [playbackTime, setPlaybackTime] = useState<number>(startTimeSeconds);
  const [isDragging, setIsDragging] = useState(false);

  const videoId =
    selectedTrack.videoId ||
    selectedTrack.youtubeId ||
    (selectedTrack.audioUrl.includes('watch?v=')
      ? selectedTrack.audioUrl.split('watch?v=')[1]?.substring(0, 11)
      : '');

  // Reset states and update duration when selected track changes
  useEffect(() => {
    const knownDuration =
      selectedTrack.durationSeconds && selectedTrack.durationSeconds > 0
        ? selectedTrack.durationSeconds
        : null;

    setTotalDuration(knownDuration);
    setIsPlayerReady(false);
    setIsPlayingClip(false);
    setPlaybackTime(selectedTrack.startTimeSeconds || 0);

    if (knownDuration && onReady) {
      onReady(knownDuration);
    }
  }, [selectedTrack.id]);

  // Calculate current clamped bounds safely
  const safeDuration = totalDuration || windowDurationSeconds;
  const bounds = calculateClipBounds(startTimeSeconds, windowDurationSeconds, safeDuration);
  const head = bounds.head;
  const tail = bounds.tail;

  // Initialize YouTube Player
  useEffect(() => {
    let isMounted = true;
    let playerInstance: YTPlayer | null = null;
    const playerContainerId = `yt-player-container-${Math.random().toString(36).substring(2, 9)}`;

    if (!videoId) return;

    if (containerRef.current) {
      containerRef.current.innerHTML = `<div id="${playerContainerId}" class="w-full h-full rounded-2xl overflow-hidden"></div>`;
    }

    loadYouTubeIFrameAPI()
      .then(() => {
        if (!isMounted || !window.YT || !window.YT.Player) return;

        playerInstance = new window.YT.Player(playerContainerId, {
          videoId,
          playerVars: {
            autoplay: 0,
            controls: 1,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            start: Math.floor(head),
            origin: typeof window !== 'undefined' ? window.location.origin : undefined,
          },
          events: {
            onReady: (event) => {
              if (!isMounted) return;
              playerRef.current = event.target;
              setIsPlayerReady(true);

              const playerDuration = event.target.getDuration();
              if (playerDuration && playerDuration > 0) {
                if (
                  selectedTrack.durationSeconds &&
                  Math.abs(playerDuration - selectedTrack.durationSeconds) > 5
                ) {
                  console.warn(
                    `[YouTubeClipSelector] Divergencia de duracao: API=${selectedTrack.durationSeconds}s vs Player=${playerDuration}s`
                  );
                }
                setTotalDuration(playerDuration);
                if (onReady) onReady(playerDuration);
              } else if (selectedTrack.durationSeconds && selectedTrack.durationSeconds > 0) {
                if (onReady) onReady(selectedTrack.durationSeconds);
              }

              try {
                event.target.seekTo(head, true);
              } catch (e) {}
            },
            onStateChange: (event) => {
              if (!isMounted || !window.YT) return;

              if (event.data === window.YT.PlayerState.PLAYING) {
                setIsPlayingClip(true);
              } else if (event.data === window.YT.PlayerState.PAUSED) {
                setIsPlayingClip(false);
              } else if (event.data === window.YT.PlayerState.ENDED) {
                setIsPlayingClip(false);
                setPlaybackTime(head);
              }
            },
          },
        });
      })
      .catch((err) => {
        console.warn('[YouTubeClipSelector] Failed to initialize YouTube player:', err);
      });

    return () => {
      isMounted = false;
      if (playerInstance) {
        try {
          playerInstance.destroy();
        } catch (e) {}
      }
      playerRef.current = null;
    };
  }, [videoId]);

  // Monitor playback boundary (HEAD to TAIL) when playing clip preview
  useEffect(() => {
    if (!isPlayingClip) return;

    const interval = setInterval(() => {
      const player = playerRef.current;
      if (!player) return;

      try {
        const current = player.getCurrentTime();
        setPlaybackTime(current);

        // If outside window or reached TAIL, pause and rewind to HEAD
        if (current >= tail || (current < head - 1 && isPlayingClip)) {
          player.pauseVideo();
          player.seekTo(head, true);
          setIsPlayingClip(false);
          setPlaybackTime(head);
        }
      } catch (e) {}
    }, 60);

    return () => clearInterval(interval);
  }, [isPlayingClip, head, tail]);

  // Toggle clip preview play / pause with explicit HEAD seek on play
  const togglePlayClip = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;

    if (isPlayingClip) {
      player.pauseVideo();
      setIsPlayingClip(false);
    } else {
      player.seekTo(head, true);
      player.playVideo();
      setIsPlayingClip(true);
      setPlaybackTime(head);
    }
  }, [isPlayingClip, head]);

  // Shift window by delta seconds (-10, -1, +1, +10)
  const handleShift = useCallback(
    (deltaSeconds: number) => {
      if (!totalDuration || totalDuration <= 0) return;

      const shifted = shiftClipWindow(head, deltaSeconds, windowDurationSeconds, totalDuration);
      onChangeStartTime(shifted.head);
      setPlaybackTime(shifted.head);

      const player = playerRef.current;
      if (player) {
        try {
          player.seekTo(shifted.head, true);
        } catch (e) {}
      }
    },
    [head, windowDurationSeconds, totalDuration, onChangeStartTime]
  );

  // Position calculation from timeline pointer interaction (mouse or touch)
  const handleTimelineInteraction = useCallback(
    (clientX: number) => {
      if (!timelineRef.current || !totalDuration || totalDuration <= 0) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const clickRatio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const targetSeconds = clickRatio * totalDuration;
      const clamped = clampHead(targetSeconds, windowDurationSeconds, totalDuration);

      onChangeStartTime(clamped);
      setPlaybackTime(clamped);

      const player = playerRef.current;
      if (player && !isPlayingClip) {
        try {
          player.seekTo(clamped, true);
        } catch (e) {}
      }
    },
    [totalDuration, windowDurationSeconds, onChangeStartTime, isPlayingClip]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!totalDuration) return;
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    handleTimelineInteraction(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    handleTimelineInteraction(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch (err) {}
  };

  // Window geometry in percentages
  const safeTotal = totalDuration && totalDuration > 0 ? totalDuration : 1;
  const windowLeftPct = totalDuration ? (head / safeTotal) * 100 : 0;
  const windowWidthPct = totalDuration ? ((tail - head) / safeTotal) * 100 : 100;
  const playheadPct = totalDuration
    ? (Math.max(head, Math.min(tail, playbackTime)) / safeTotal) * 100
    : 0;

  // Active progress within window
  const activeClipProgress = Math.max(0, Math.min(windowDurationSeconds, playbackTime - head));

  return (
    <div className="w-full lg:grid lg:grid-cols-12 lg:gap-4 items-center">
      {/* Coluna 1: YouTube Player Container (Desktop 5 cols / 12) */}
      <div className="lg:col-span-5 flex flex-col justify-center">
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black/80 border border-white/15 shadow-xl max-h-[220px] sm:max-h-[240px] xl:max-h-[260px] mx-auto">
          <div ref={containerRef} className="w-full h-full" />
          {(!isPlayerReady || totalDuration === null) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/85 text-slate-400 p-2 text-center">
              <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" />
              <span className="text-[11px] font-mono">
                {!isPlayerReady
                  ? 'Conectando ao player do YouTube...'
                  : 'Confirmando duração da faixa...'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Coluna 2: Clip Editor Controls & Timeline (Desktop 7 cols / 12) */}
      <div className="lg:col-span-7 flex flex-col justify-center space-y-2.5 pt-3 lg:pt-0">
        {/* Header da Coluna com Janela e Título */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-yellow-300 flex items-center gap-1.5">
            <span>Escolha o Trecho</span>
          </span>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-yellow-400/20 text-yellow-300 border border-yellow-400/30">
            Trecho de {windowDurationSeconds}s
          </span>
        </div>

        {/* Destaque Tipográfico HEAD -> TAIL */}
        <div className="flex items-center justify-between text-xs font-mono font-bold bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-400">Início: {formatDurationDisplay(head)}</span>
          </div>

          <div className="text-center font-sans font-extrabold text-sm text-yellow-300">
            {formatDurationDisplay(head)} → {formatDurationDisplay(tail)}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-rose-400">Fim: {formatDurationDisplay(tail)}</span>
            <span className="text-slate-400 text-[10px]">
              ({totalDuration !== null ? formatDurationDisplay(totalDuration) : '--:--'})
            </span>
          </div>
        </div>

        {/* Full Track Interactive Timeline Bar */}
        <div
          ref={timelineRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`relative h-10 w-full bg-slate-950 border border-white/20 rounded-xl select-none overflow-hidden group shadow-inner touch-none ${
            totalDuration === null ? 'cursor-wait opacity-60' : 'cursor-pointer'
          }`}
        >
          {/* Background ruler stripes */}
          <div className="absolute inset-0 opacity-15 bg-[repeating-linear-gradient(90deg,transparent,transparent_19px,rgba(255,255,255,0.3)_20px)]" />

          {/* Draggable Selection Window */}
          {totalDuration !== null ? (
            <div
              className="absolute top-0 bottom-0 bg-yellow-400/30 border-x-2 border-y border-yellow-400 rounded-lg shadow-glow-yellow transition-none pointer-events-none"
              style={{
                left: `${windowLeftPct}%`,
                width: `${windowWidthPct}%`,
              }}
            >
              <div className="w-full h-full flex items-center justify-between px-2 text-[9px] font-mono font-black text-yellow-300">
                <span>HEAD</span>
                <span>{windowDurationSeconds}s</span>
                <span>TAIL</span>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs font-mono text-slate-500">
              Calculando escala da timeline...
            </div>
          )}

          {/* Playhead Marker */}
          {isPlayingClip && totalDuration !== null && (
            <div
              className="absolute top-0 bottom-0 w-1 bg-white shadow-glow-white z-20 pointer-events-none"
              style={{ left: `${playheadPct}%` }}
            />
          )}
        </div>

        {/* Micro-Adjustment Stepper & Preview Action */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Nudge Buttons */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
            <button
              type="button"
              disabled={!totalDuration}
              onClick={() => handleShift(-10)}
              className="px-2 py-0.5 text-xs font-mono font-bold text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition active:scale-95 cursor-pointer"
              title="Voltar 10 segundos"
            >
              -10s
            </button>
            <button
              type="button"
              disabled={!totalDuration}
              onClick={() => handleShift(-1)}
              className="px-1.5 py-0.5 text-xs font-mono font-bold text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition active:scale-95 cursor-pointer"
              title="Voltar 1 segundo"
            >
              -1s
            </button>
            <div className="w-px h-3.5 bg-white/10" />
            <button
              type="button"
              disabled={!totalDuration}
              onClick={() => handleShift(1)}
              className="px-1.5 py-0.5 text-xs font-mono font-bold text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition active:scale-95 cursor-pointer"
              title="Avançar 1 segundo"
            >
              +1s
            </button>
            <button
              type="button"
              disabled={!totalDuration}
              onClick={() => handleShift(10)}
              className="px-2 py-0.5 text-xs font-mono font-bold text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition active:scale-95 cursor-pointer"
              title="Avançar 10 segundos"
            >
              +10s
            </button>
          </div>

          {/* Preview Button */}
          <button
            type="button"
            disabled={!isPlayerReady || totalDuration === null}
            onClick={togglePlayClip}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow cursor-pointer ${
              isPlayingClip
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-glow-yellow'
                : 'bg-white/10 hover:bg-white/20 text-slate-100 border border-white/15 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            {isPlayingClip ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pausar</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                <span>Ouvir Trecho</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
