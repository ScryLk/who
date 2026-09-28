import { parseYouTubeDuration, extractYouTubeVideoId, extractYouTubeStartTime } from '@who/shared';
import type { TrackSearchResult } from './musicService';

interface CacheEntry<T> {
  timestamp: number;
  data: T;
}

const CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes
const searchCache = new Map<string, CacheEntry<TrackSearchResult[]>>();
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
  // Prune cache if it gets too large
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
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${encodeURIComponent(
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

    const durationSec = parseYouTubeDuration(item.contentDetails?.duration) || 180;
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
    console.error('[YouTubeService] Network or parsing error fetching video details:', error);
    return null;
  }
}

/**
 * Searches YouTube videos using YouTube Data API v3 search.list and videos.list for durations.
 */
export async function searchYouTubeVideos(
  query: string,
  maxResults = 8
): Promise<TrackSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const cacheKey = trimmed.toLowerCase();
  const cached = getFromCache(searchCache, cacheKey);
  if (cached) return cached;

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return [];
  }

  try {
    // 1. Search for video IDs matching the query
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${maxResults}&q=${encodeURIComponent(
      trimmed
    )}&key=${apiKey}`;

    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) {
      const errText = await searchRes.text().catch(() => '');
      if (searchRes.status === 403) {
        console.warn('[YouTubeService] Quota exceeded or access forbidden during search.list.');
      } else {
        console.warn(`[YouTubeService] Search API error (${searchRes.status}): ${errText}`);
      }
      return [];
    }

    const searchData = (await searchRes.json()) as any;
    const items = searchData.items || [];
    if (items.length === 0) {
      setToCache(searchCache, cacheKey, []);
      return [];
    }

    const videoIds = items
      .map((item: any) => item.id?.videoId)
      .filter((id: any): id is string => typeof id === 'string' && id.length > 0);

    if (videoIds.length === 0) {
      return [];
    }

    // 2. Fetch contentDetails for duration of each video
    const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds.join(
      ','
    )}&key=${apiKey}`;

    const detailsRes = await fetch(detailsUrl);
    if (!detailsRes.ok) {
      console.warn(`[YouTubeService] Videos details API error (${detailsRes.status})`);
      // Build results with fallback duration if details endpoint fails
      const fallbackList: TrackSearchResult[] = items.map((item: any) => {
        const vId = item.id.videoId;
        return {
          id: `yt-${vId}`,
          title: item.snippet?.title || 'Video YouTube',
          artist: item.snippet?.channelTitle || 'YouTube',
          albumArt:
            item.snippet?.thumbnails?.high?.url ||
            item.snippet?.thumbnails?.medium?.url ||
            `https://img.youtube.com/vi/${vId}/hqdefault.jpg`,
          audioUrl: `https://www.youtube.com/watch?v=${vId}`,
          genre: 'YouTube',
          provider: 'youtube',
          durationSeconds: 180,
          videoId: vId,
          channelTitle: item.snippet?.channelTitle || 'YouTube',
          isVideo: true,
          youtubeId: vId,
          startTimeSeconds: 0,
        };
      });
      setToCache(searchCache, cacheKey, fallbackList);
      return fallbackList;
    }

    const detailsData = (await detailsRes.json()) as any;
    const detailsItems = detailsData.items || [];

    const durationMap = new Map<string, number>();
    for (const dItem of detailsItems) {
      const durationSec = parseYouTubeDuration(dItem.contentDetails?.duration);
      durationMap.set(dItem.id, durationSec);
    }

    const results: TrackSearchResult[] = items.map((item: any) => {
      const vId = item.id.videoId;
      const durationSec = durationMap.get(vId) || 180;
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

      // Also prime individual videoCache
      setToCache(videoCache, vId, trackItem);
      return trackItem;
    });

    setToCache(searchCache, cacheKey, results);
    return results;
  } catch (error) {
    console.error('[YouTubeService] Search operation failed:', error);
    return [];
  }
}
