/**
 * Singleton loader for YouTube IFrame Player API.
 * Ensures the script is only injected once and resolves cleanly when window.YT is ready.
 */

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string | HTMLElement,
        options: {
          videoId?: string;
          width?: string | number;
          height?: string | number;
          playerVars?: {
            autoplay?: 0 | 1;
            controls?: 0 | 1;
            disablekb?: 0 | 1;
            fs?: 0 | 1;
            modestbranding?: 0 | 1;
            rel?: 0 | 1;
            start?: number;
            end?: number;
            origin?: string;
            enablejsapi?: 0 | 1;
            playsinline?: 0 | 1;
          };
          events?: {
            onReady?: (event: { target: YTPlayer }) => void;
            onStateChange?: (event: { data: number; target: YTPlayer }) => void;
            onError?: (event: { data: number; target: YTPlayer }) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead?: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  destroy(): void;
}

let apiLoadPromise: Promise<void> | null = null;

export function loadYouTubeIFrameAPI(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window is undefined'));
  }

  if (window.YT && window.YT.Player) {
    return Promise.resolve();
  }

  if (apiLoadPromise) {
    return apiLoadPromise;
  }

  apiLoadPromise = new Promise<void>((resolve, reject) => {
    // If the script is already in the document
    const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
    if (!existingScript) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      tag.onerror = () => {
        apiLoadPromise = null;
        reject(new Error('Failed to load YouTube IFrame API'));
      };
      document.body.appendChild(tag);
    }

    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousCallback === 'function') {
        try {
          previousCallback();
        } catch (e) {
          console.warn('[YouTubeAPI] Previous onYouTubeIframeAPIReady error:', e);
        }
      }
      resolve();
    };

    // Fallback polling in case callback was missed or already triggered
    const checkInterval = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);

    setTimeout(() => {
      clearInterval(checkInterval);
      if (window.YT && window.YT.Player) {
        resolve();
      } else {
        apiLoadPromise = null;
        reject(new Error('Timeout loading YouTube IFrame API'));
      }
    }, 10000);
  });

  return apiLoadPromise;
}
