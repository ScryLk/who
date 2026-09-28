'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Youtube, Radio, Volume2 } from 'lucide-react';
import type { Track } from '@who/shared';
import { formatDurationDisplay } from '@who/shared';
import { loadYouTubeIFrameAPI, type YTPlayer } from '@/lib/youtubeLoader';

interface YouTubeRoundPlayerProps {
  track: Track;
  roundNumber: number;
  clipDurationSeconds: number;
}

export const YouTubeRoundPlayer: React.FC<YouTubeRoundPlayerProps> = ({
  track,
  roundNumber,
  clipDurationSeconds,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);

  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(track.startTimeSeconds || 0);

  const startSec = track.startTimeSeconds || 0;
  const endSec = track.endTimeSeconds || startSec + clipDurationSeconds;
  const videoId =
    track.videoId ||
    track.youtubeId ||
    (track.audioUrl.includes('watch?v=')
      ? track.audioUrl.split('watch?v=')[1]?.substring(0, 11)
      : '');

  // Initialize YouTube Round Player
  useEffect(() => {
    let isMounted = true;
    let playerInstance: YTPlayer | null = null;
    const playerId = `yt-round-player-${Math.random().toString(36).substring(2, 9)}`;

    if (!videoId) return;

    if (containerRef.current) {
      containerRef.current.innerHTML = `<div id="${playerId}" class="w-full h-full rounded-2xl overflow-hidden"></div>`;
    }

    loadYouTubeIFrameAPI()
      .then(() => {
        if (!isMounted || !window.YT || !window.YT.Player) return;

        playerInstance = new window.YT.Player(playerId, {
          videoId,
          playerVars: {
            autoplay: 0,
            controls: 1,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            origin: typeof window !== 'undefined' ? window.location.origin : undefined,
          },
          events: {
            onReady: (event) => {
              if (!isMounted) return;
              playerRef.current = event.target;
              setIsPlayerReady(true);
              try {
                event.target.seekTo(startSec, true);
              } catch (e) {}
            },
            onStateChange: (event) => {
              if (!isMounted) return;
              if (window.YT && event.data === window.YT.PlayerState.PAUSED) {
                setIsPlaying(false);
              } else if (window.YT && event.data === window.YT.PlayerState.ENDED) {
                setIsPlaying(false);
                setCurrentTime(startSec);
              }
            },
          },
        });
      })
      .catch((err) => {
        console.warn('[YouTubeRoundPlayer] Failed to load IFrame API:', err);
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
  }, [videoId, startSec]);

  // Monitor playback boundary (startSec to endSec)
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      const player = playerRef.current;
      if (!player) return;

      try {
        const time = player.getCurrentTime();
        setCurrentTime(time);

        if (time >= endSec) {
          player.pauseVideo();
          player.seekTo(startSec, true);
          setIsPlaying(false);
          setCurrentTime(startSec);
        }
      } catch (e) {}
    }, 80);

    return () => clearInterval(interval);
  }, [isPlaying, startSec, endSec]);

  const togglePlay = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;

    if (isPlaying) {
      player.pauseVideo();
      setIsPlaying(false);
    } else {
      player.seekTo(startSec, true);
      player.playVideo();
      setIsPlaying(true);
      setCurrentTime(startSec);
    }
  }, [isPlaying, startSec]);

  const activeProgress = Math.max(0, Math.min(clipDurationSeconds, currentTime - startSec));
  const progressPct = (activeProgress / Math.max(1, clipDurationSeconds)) * 100;

  return (
    <div className="p-4 rounded-3xl bg-gradient-to-r from-red-950/40 via-purple-950/40 to-slate-900/60 border border-red-500/30 flex flex-col md:flex-row items-center gap-4 shadow-xl backdrop-blur-md">
      {/* Video Container (Legitimate, visible player) */}
      <div className="relative w-full md:w-56 aspect-video flex-shrink-0 rounded-2xl overflow-hidden bg-black/80 border border-red-500/30 shadow-lg">
        <div ref={containerRef} className="w-full h-full" />
        {!isPlayerReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-slate-950/90 text-slate-400">
            <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] font-mono">Carregando clipe...</span>
          </div>
        )}
      </div>

      {/* Meta & Gameplay Clip Controls */}
      <div className="flex-1 min-w-0 text-left w-full space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-red-300 uppercase tracking-wider flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 animate-pulse text-red-400" />
            <span>Faixa Secreta da Rodada #{roundNumber}</span>
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-mono font-bold border border-red-500/30 flex items-center gap-1">
              <Youtube className="w-3 h-3 text-red-400" />
              <span>YouTube</span>
            </span>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 font-mono font-bold border border-yellow-400/30">
              Clip de {clipDurationSeconds}s
            </span>
          </div>
        </div>

        <div className="text-sm md:text-base font-extrabold text-white truncate">
          {track.title || 'Faixa Misteriosa'} —{' '}
          <span className="text-yellow-300">{track.artist || 'Artista Oculto'}</span>
        </div>

        {/* Clip Progress Bar & Toggle Button */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            disabled={!isPlayerReady}
            onClick={togglePlay}
            className={`w-9 h-9 rounded-full flex items-center justify-center font-black transition active:scale-95 flex-shrink-0 ${
              isPlaying
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-glow-yellow'
                : 'bg-red-500 hover:bg-red-400 text-white shadow-md'
            }`}
            title={isPlaying ? 'Pausar trecho' : 'Ouvir trecho'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <div className="flex-1 space-y-1">
            <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden relative border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-yellow-400 rounded-full transition-all duration-100"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-400">
              <span>{formatDurationDisplay(activeProgress)}</span>
              <span>{formatDurationDisplay(clipDurationSeconds)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
