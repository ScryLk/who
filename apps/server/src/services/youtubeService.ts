import { parseYouTubeDuration } from '@who/shared';
import type { TrackSearchResult } from './musicService';

export type YouTubeErrorCode =
  | 'YOUTUBE_KEY_MISSING'
  | 'YOUTUBE_API_DISABLED'
  | 'YOUTUBE_FORBIDDEN'
  | 'YOUTUBE_QUOTA_EXCEEDED'
  | 'YOUTUBE_NETWORK_ERROR'
  | 'YOUTUBE_NO_RESULTS'
  | 'YOUTUBE_INVALID_RESPONSE';

export interface YouTubeSearchResult {
  success: boolean;
  tracks: TrackSearchResult[];
  errorCode?: YouTubeErrorCode;
  errorMessage?: string;
}

interface CacheEntry<T> {
  timestamp: number;
  data: T;
}

const CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes
const searchCache = new Map<string, CacheEntry<YouTubeSearchResult>>();
const videoCache = new Map<string, CacheEntry<TrackSearchResult>>();

function getFromCache<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setToCache<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T): void {
  if (cache.size > 200) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, { timestamp: Date.now(), data });
}

export function isYouTubeApiKeyConfigured(): boolean {
  const key = process.env.YOUTUBE_API_KEY;
  return Boolean(key && key.trim().length > 0);
}

/**
 * Fetches video details from YouTube Data API v3 given a single video ID.
 * Returns null if the video does not exist, is blocked, or API key is not configured.
 * Does NOT invent 180s duration.
 */
export async function getYouTubeVideo(videoId: string): Promise<TrackSearchResult | null> {
  if (!videoId) return null;

  const cached = getFromCache(videoCache, videoId);
  if (cached) return cached;

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,status&id=${encodeURIComponent(
      videoId
    )}&key=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      if (response.status === 403) {
        console.warn('[YouTubeService] Quota exceeded or access forbidden fetching video details.');
      } else {
        console.warn(`[YouTubeService] Failed to fetch video details (${response.status}): ${errorBody}`);
      }
      return null;
    }

    const data = (await response.json()) as any;
    const item = data.items?.[0];
    if (!item) return null;

    // Check embeddable status if available
    if (item.status && item.status.embeddable === false) {
      console.warn(`[YouTubeService] Video ${videoId} is not embeddable.`);
      return null;
    }

    const parsedSec = parseYouTubeDuration(item.contentDetails?.duration);
    const durationSec = parsedSec > 0 ? parsedSec : undefined;
    const thumbnail =
      item.snippet?.thumbnails?.high?.url ||
      item.snippet?.thumbnails?.medium?.url ||
      item.snippet?.thumbnails?.default?.url ||
      `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    const result: TrackSearchResult = {
      id: `yt-${videoId}`,
      title: item.snippet?.title || `Video ${videoId}`,
      artist: item.snippet?.channelTitle || 'YouTube',
      albumArt: thumbnail,
      audioUrl: `https://www.youtube.com/watch?v=${videoId}`,
      genre: 'YouTube',
      provider: 'youtube',
      durationSeconds: durationSec,
      videoId,
      channelTitle: item.snippet?.channelTitle || 'YouTube',
      isVideo: true,
      youtubeId: videoId,
      startTimeSeconds: 0,
    };

    setToCache(videoCache, videoId, result);
    return result;
  } catch (error) {
    console.error('[YouTubeService] Network error fetching video details:', error);
    return null;
  }
}

/**
 * Searches YouTube videos using YouTube Data API v3 with videoEmbeddable=true.
 * Returns structured result differentiating success, empty results, and specific API errors.
 */
export async function searchYouTubeVideos(
  query: string,
  maxResults = 8
): Promise<YouTubeSearchResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { success: true, tracks: [] };
  }

  const cacheKey = trimmed.toLowerCase();
  const cached = getFromCache(searchCache, cacheKey);
  if (cached) return cached;

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      tracks: [],
      errorCode: 'YOUTUBE_KEY_MISSING',
      errorMessage: 'Chave da API do YouTube não configurada no servidor',
    };
  }

  try {
    // 1. Search for embeddable video IDs
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=${maxResults}&q=${encodeURIComponent(
      trimmed
    )}&key=${apiKey}`;

    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) {
      const errText = await searchRes.text().catch(() => '');
      if (searchRes.status === 403) {
        const isQuota = errText.includes('quotaExceeded') || errText.includes('dailyLimitExceeded');
        const code: YouTubeErrorCode = isQuota ? 'YOUTUBE_QUOTA_EXCEEDED' : 'YOUTUBE_FORBIDDEN';
        console.warn(`[YouTubeService] Search API error (${code}): ${errText}`);
        return {
          success: false,
          tracks: [],
          errorCode: code,
          errorMessage: isQuota ? 'Cota diária da API do YouTube excedida' : 'Acesso à API do YouTube proibido',
        };
      }

      console.warn(`[YouTubeService] Search API error (${searchRes.status}): ${errText}`);
      return {
        success: false,
        tracks: [],
        errorCode: 'YOUTUBE_INVALID_RESPONSE',
        errorMessage: `Erro na busca do YouTube: status ${searchRes.status}`,
      };
    }

    const searchData = (await searchRes.json()) as any;
    const items = searchData.items || [];
    if (items.length === 0) {
      const emptyResult: YouTubeSearchResult = {
        success: true,
        tracks: [],
        errorCode: 'YOUTUBE_NO_RESULTS',
        errorMessage: 'Nenhum vídeo embeddable encontrado no YouTube para esta busca',
      };
      setToCache(searchCache, cacheKey, emptyResult);
      return emptyResult;
    }

    const videoIds = items
      .map((item: any) => item.id?.videoId)
      .filter((id: any): id is string => typeof id === 'string' && id.length > 0);

    if (videoIds.length === 0) {
      const emptyResult: YouTubeSearchResult = {
        success: true,
        tracks: [],
        errorCode: 'YOUTUBE_NO_RESULTS',
      };
      return emptyResult;
    }

    // 2. Fetch contentDetails for duration of each video
    const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds.join(
      ','
    )}&key=${apiKey}`;

    const detailsRes = await fetch(detailsUrl);
    const durationMap = new Map<string, number>();

    if (detailsRes.ok) {
      const detailsData = (await detailsRes.json()) as any;
      const detailsItems = detailsData.items || [];
      for (const dItem of detailsItems) {
        const durationSec = parseYouTubeDuration(dItem.contentDetails?.duration);
        if (durationSec > 0) {
          durationMap.set(dItem.id, durationSec);
        }
      }
    } else {
      console.warn(`[YouTubeService] Videos details API error (${detailsRes.status})`);
    }

    const results: TrackSearchResult[] = items.map((item: any) => {
      const vId = item.id.videoId;
      const durationSec = durationMap.get(vId); // undefined if not recovered, never fake 180
      const thumbnail =
        item.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.medium?.url ||
        item.snippet?.thumbnails?.default?.url ||
        `https://img.youtube.com/vi/${vId}/hqdefault.jpg`;

      const trackItem: TrackSearchResult = {
        id: `yt-${vId}`,
        title: item.snippet?.title || 'Video YouTube',
        artist: item.snippet?.channelTitle || 'YouTube',
        albumArt: thumbnail,
        audioUrl: `https://www.youtube.com/watch?v=${vId}`,
        genre: 'YouTube',
        provider: 'youtube',
        durationSeconds: durationSec,
        videoId: vId,
        channelTitle: item.snippet?.channelTitle || 'YouTube',
        isVideo: true,
        youtubeId: vId,
        startTimeSeconds: 0,
      };

      setToCache(videoCache, vId, trackItem);
      return trackItem;
    });

    const successResult: YouTubeSearchResult = {
      success: true,
      tracks: results,
    };

    setToCache(searchCache, cacheKey, successResult);
    return successResult;
  } catch (error: any) {
    console.error('[YouTubeService] Search operation failed:', error);
    return {
      success: false,
      tracks: [],
      errorCode: 'YOUTUBE_NETWORK_ERROR',
      errorMessage: error?.message || 'Falha de conexão com a API do YouTube',
    };
  }
}
