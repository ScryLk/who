'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, RotateCcw, Youtube, Volume2, Clock } from 'lucide-react';
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
  const [totalDuration, setTotalDuration] = useState<number>(
    selectedTrack.durationSeconds && selectedTrack.durationSeconds > 0
      ? selectedTrack.durationSeconds
      : 180
  );
  const [playbackTime, setPlaybackTime] = useState<number>(startTimeSeconds);
  const [isDragging, setIsDragging] = useState(false);

  const videoId =
    selectedTrack.videoId ||
    selectedTrack.youtubeId ||
    (selectedTrack.audioUrl.includes('watch?v=')
      ? selectedTrack.audioUrl.split('watch?v=')[1]?.substring(0, 11)
      : '');

  // Calculate current clamped bounds
  const bounds = calculateClipBounds(startTimeSeconds, windowDurationSeconds, totalDuration);
  const head = bounds.head;
  const tail = bounds.tail;

  // Initialize YouTube Player
  useEffect(() => {
    let isMounted = true;
    let playerInstance: YTPlayer | null = null;
    const playerContainerId = `yt-player-container-${Math.random().toString(36).substring(2, 9)}`;

    if (!videoId) {
      return;
    }

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
            origin: typeof window !== 'undefined' ? window.location.origin : undefined,
          },
          events: {
            onReady: (event) => {
              if (!isMounted) return;
              playerRef.current = event.target;
              setIsPlayerReady(true);

              const duration = event.target.getDuration();
              if (duration && duration > 0) {
                setTotalDuration(duration);
                if (onReady) onReady(duration);
              }

              try {
                event.target.seekTo(head, true);
              } catch (e) {}
            },
            onStateChange: (event) => {
              if (!isMounted) return;
              if (window.YT && event.data === window.YT.PlayerState.PAUSED) {
                setIsPlayingClip(false);
              } else if (window.YT && event.data === window.YT.PlayerState.ENDED) {
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

  // Monitor playback boundary when playing clip preview
  useEffect(() => {
    if (!isPlayingClip) return;

    const interval = setInterval(() => {
      const player = playerRef.current;
      if (!player) return;

      try {
        const current = player.getCurrentTime();
        setPlaybackTime(current);

        // Check if exceeded TAIL
        if (current >= tail) {
          player.pauseVideo();
          player.seekTo(head, true);
          setIsPlayingClip(false);
          setPlaybackTime(head);
        }
      } catch (e) {}
    }, 80);

    return () => clearInterval(interval);
  }, [isPlayingClip, head, tail]);

  // Toggle clip preview play / pause
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

  // Position calculation from timeline click / drag
  const handleTimelineInteraction = useCallback(
    (clientX: number) => {
      if (!timelineRef.current || totalDuration <= 0) return;

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

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleTimelineInteraction(e.clientX);
  };

  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => {
      handleTimelineInteraction(e.clientX);
    };

    const onMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging, handleTimelineInteraction]);

  // Window geometry in percentages
  const safeTotal = Math.max(1, totalDuration);
  const windowLeftPct = (head / safeTotal) * 100;
  const windowWidthPct = ((tail - head) / safeTotal) * 100;
  const playheadPct = (Math.max(head, Math.min(tail, playbackTime)) / safeTotal) * 100;

  // Active progress within window
  const activeClipProgress = Math.max(0, Math.min(windowDurationSeconds, playbackTime - head));

  return (
    <div className="w-full bg-slate-900/90 border border-slate-700/60 rounded-3xl p-4 md:p-5 space-y-4 shadow-2xl backdrop-blur-xl">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
            <Youtube className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>Seletor de Trecho Oficial YouTube</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/20">
                Full-Track
              </span>
            </div>
            <div className="text-sm font-extrabold text-white truncate max-w-md">
              {selectedTrack.title}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-yellow-400" />
            <span>Total: {formatDurationDisplay(totalDuration)}</span>
          </span>
          <span className="text-[11px] font-mono font-black px-2.5 py-1 rounded-lg bg-yellow-400/20 text-yellow-300 border border-yellow-400/40">
            Janela: {windowDurationSeconds}s
          </span>
        </div>
      </div>

      {/* Embedded YouTube Player Container */}
      <div className="relative aspect-video w-full max-w-2xl mx-auto rounded-2xl overflow-hidden bg-black/60 border border-slate-800 shadow-inner">
        <div ref={containerRef} className="w-full h-full" />
        {!isPlayerReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/80 text-slate-400">
            <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono">Carregando player do YouTube...</span>
          </div>
        )}
      </div>

      {/* Timeline Controls & Interactive Track */}
      <div className="space-y-3 pt-1">
        {/* Bounds Badges */}
        <div className="flex items-center justify-between text-xs font-mono font-bold">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">00:00</span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              INICIO: {formatDurationDisplay(head)}
            </span>
          </div>

          <div className="text-center font-sans text-xs font-bold text-slate-300">
            {isPlayingClip ? (
              <span className="text-yellow-300 font-mono animate-pulse">
                Tocando: {formatDurationDisplay(activeClipProgress)} / {formatDurationDisplay(windowDurationSeconds)}
              </span>
            ) : (
              <span className="text-slate-400">
                Trecho de {windowDurationSeconds}s configurado
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
              FIM: {formatDurationDisplay(tail)}
            </span>
            <span className="text-slate-400">{formatDurationDisplay(totalDuration)}</span>
          </div>
        </div>

        {/* Full Track Timeline Bar */}
        <div
          ref={timelineRef}
          onMouseDown={handleMouseDown}
          className="relative h-10 w-full bg-slate-950 border border-slate-800 rounded-xl cursor-pointer select-none overflow-hidden group shadow-inner"
        >
          {/* Subtle background ruler stripes */}
          <div className="absolute inset-0 opacity-15 bg-[repeating-linear-gradient(90deg,transparent,transparent_19px,rgba(255,255,255,0.3)_20px)]" />

          {/* Draggable Selection Window */}
          <div
            className="absolute top-0 bottom-0 bg-yellow-400/25 border-x-2 border-y border-yellow-400 rounded-lg shadow-glow-yellow transition-none pointer-events-none"
            style={{
              left: `${windowLeftPct}%`,
              width: `${windowWidthPct}%`,
            }}
          >
            <div className="w-full h-full flex items-center justify-between px-1.5 text-[9px] font-mono font-black text-yellow-300">
              <span>HEAD</span>
              <span>{windowDurationSeconds}s</span>
              <span>TAIL</span>
            </div>
          </div>

          {/* Playhead Marker */}
          {isPlayingClip && (
            <div
              className="absolute top-0 bottom-0 w-1 bg-white shadow-glow-white z-20 pointer-events-none"
              style={{ left: `${playheadPct}%` }}
            />
          )}
        </div>

        {/* Micro-Adjustment Stepper & Test Preview Action */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {/* Stepper Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => handleShift(-10)}
              className="px-2.5 py-1 text-xs font-mono font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition active:scale-95"
              title="Voltar 10 segundos"
            >
              -10s
            </button>
            <button
              type="button"
              onClick={() => handleShift(-1)}
              className="px-2 py-1 text-xs font-mono font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition active:scale-95"
              title="Voltar 1 segundo"
            >
              -1s
            </button>
            <div className="w-px h-4 bg-slate-800" />
            <button
              type="button"
              onClick={() => handleShift(1)}
              className="px-2 py-1 text-xs font-mono font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition active:scale-95"
              title="Avançar 1 segundo"
            >
              +1s
            </button>
            <button
              type="button"
              onClick={() => handleShift(10)}
              className="px-2.5 py-1 text-xs font-mono font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition active:scale-95"
              title="Avançar 10 segundos"
            >
              +10s
            </button>
          </div>

          {/* Preview Clip Button */}
          <button
            type="button"
            disabled={!isPlayerReady}
            onClick={togglePlayClip}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition active:scale-95 shadow-md ${
              isPlayingClip
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-glow-yellow'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
            }`}
          >
            {isPlayingClip ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pausar Trecho</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                <span>Ouvir Trecho de {windowDurationSeconds}s</span>
              </>
            )}
          </button>
        </div>

        <p className="text-[11px] text-slate-400 text-center font-medium">
          Clique ou arraste na linha do tempo para posicionar o trecho de {windowDurationSeconds}s que tocara na rodada.
        </p>
      </div>
    </div>
  );
};
