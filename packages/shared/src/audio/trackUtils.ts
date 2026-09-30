import { extractYouTubeVideoId } from './youtubeParser';

export function getTrackUniqueKey(track: {
  provider?: string;
  videoId?: string;
  youtubeId?: string;
  audioUrl?: string;
  id?: string;
  title?: string;
  artist?: string;
}): string {
  const vid =
    track.videoId ||
    track.youtubeId ||
    (track.audioUrl ? extractYouTubeVideoId(track.audioUrl) : null);

  if (track.provider === 'youtube' || vid) {
    if (vid) {
      return `youtube:${vid.trim().toLowerCase()}`;
    }
  }

  if (track.audioUrl && track.audioUrl.trim()) {
    // Standardize URL by removing transient query params where applicable
    try {
      const parsed = new URL(track.audioUrl);
      return `audio:${parsed.origin}${parsed.pathname}`.toLowerCase();
    } catch {
      return `audio:${track.audioUrl.trim().toLowerCase()}`;
    }
  }

  const cleanTitle = (track.title || '').trim().toLowerCase();
  const cleanArtist = (track.artist || '').trim().toLowerCase();
  if (cleanTitle || cleanArtist) {
    return `meta:${cleanArtist}::${cleanTitle}`;
  }

  return `id:${track.id || Math.random().toString(36)}`;
}
